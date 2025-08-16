import { mat4, vec2, vec4 } from 'gl-matrix';
import { Camera, PerspectiveCamera, VIEWPORT_Y_FLIP } from './camera.js';
import { PointCloud, Aabb } from './pointcloud.js';
import { UniformBuffer } from './uniform.js';
import { GPUStopwatch } from './utils.js';

// Placeholder for GPURSSorter - will be implemented when porting gpu_rs.ts
interface GPURSSorter {
    createSortStuff(device: GPUDevice, numPoints: number): PointCloudSortStuff;
    recordResetIndirectBuffer(sorterDis: GPUBindGroup, sorterUni: GPUBuffer, queue: GPUQueue): void;
    recordSortIndirect(sorterBg: GPUBindGroup, sorterDis: GPUBindGroup, encoder: GPUCommandEncoder): void;
    bindGroupLayoutPreprocess(device: GPUDevice): GPUBindGroupLayout;
    bindGroupLayoutRendering(device: GPUDevice): GPUBindGroupLayout;
}

interface PointCloudSortStuff {
    numPoints: number;
    sorterBgPre: GPUBindGroup;
    sorterBg: GPUBindGroup;
    sorterDis: GPUBindGroup;
    sorterUni: GPUBuffer;
    sorterRenderBg: GPUBindGroup;
}

/**
 * Camera uniform data structure for GPU
 */
export class CameraUniform {
    public viewMatrix: mat4;
    public viewInvMatrix: mat4;
    public projMatrix: mat4;
    public projInvMatrix: mat4;
    public viewport: vec2;
    public focal: vec2;

    constructor() {
        this.viewMatrix = mat4.create();
        this.viewInvMatrix = mat4.create();
        this.projMatrix = mat4.create();
        this.projInvMatrix = mat4.create();
        this.viewport = vec2.fromValues(1.0, 1.0);
        this.focal = vec2.fromValues(1.0, 1.0);
    }

    setViewMat(viewMatrix: mat4): void {
        mat4.copy(this.viewMatrix, viewMatrix);
        mat4.invert(this.viewInvMatrix, viewMatrix);
    }

    setProjMat(projMatrix: mat4): void {
        const temp = mat4.create();
        mat4.multiply(temp, VIEWPORT_Y_FLIP, projMatrix);
        mat4.copy(this.projMatrix, temp);
        mat4.invert(this.projInvMatrix, projMatrix);
    }

    setCamera(camera: Camera): void {
        this.setProjMat(camera.projMatrix());
        this.setViewMat(camera.viewMatrix());
    }

    setViewport(viewport: vec2): void {
        vec2.copy(this.viewport, viewport);
    }

    setFocal(focal: vec2): void {
        vec2.copy(this.focal, focal);
    }
}

/**
 * Splatting arguments for rendering
 */
export interface SplattingArgs {
    camera: PerspectiveCamera;
    viewport: vec2;
    gaussianScaling: number;
    maxShDeg: number;
    showEnvMap: boolean;
    mipSplatting?: boolean;
    kernelSize?: number;
    clippingBox?: Aabb;
    walltime: number; // Duration in seconds
    sceneCenter?: [number, number, number];
    sceneExtend?: number;
    backgroundColor: GPUColor;
    resolution: vec2;
}

export const DEFAULT_KERNEL_SIZE = 0.3;

/**
 * Splatting arguments uniform data for GPU
 */
export class SplattingArgsUniform {
    public clippingBoxMin: vec4;
    public clippingBoxMax: vec4;
    public gaussianScaling: number;
    public maxShDeg: number;
    public showEnvMap: number;
    public mipSplatting: number;
    public kernelSize: number;
    public walltime: number;
    public sceneExtend: number;
    public _pad: number;
    public sceneCenter: vec4;

    constructor() {
        this.clippingBoxMin = vec4.fromValues(
            Number.NEGATIVE_INFINITY,
            Number.NEGATIVE_INFINITY, 
            Number.NEGATIVE_INFINITY,
            0.0
        );
        this.clippingBoxMax = vec4.fromValues(
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            0.0
        );
        this.gaussianScaling = 1.0;
        this.maxShDeg = 3;
        this.showEnvMap = 1;
        this.mipSplatting = 0;
        this.kernelSize = DEFAULT_KERNEL_SIZE;
        this.walltime = 0.0;
        this.sceneCenter = vec4.fromValues(0.0, 0.0, 0.0, 0.0);
        this.sceneExtend = 1.0;
        this._pad = 0;
    }

    static fromArgsAndPc(args: SplattingArgs, pc: PointCloud): SplattingArgsUniform {
        const uniform = new SplattingArgsUniform();
        
        uniform.gaussianScaling = args.gaussianScaling;
        uniform.maxShDeg = args.maxShDeg;
        uniform.showEnvMap = args.showEnvMap ? 1 : 0;
        uniform.mipSplatting = (args.mipSplatting ?? (pc.mipSplatting ? pc.mipSplatting() : false) ?? false) ? 1 : 0;
        uniform.kernelSize = args.kernelSize ?? (pc.dilationKernelSize ? pc.dilationKernelSize() : DEFAULT_KERNEL_SIZE) ?? DEFAULT_KERNEL_SIZE;
        
        const bbox = pc.bbox();
        const clippingBox = args.clippingBox ?? bbox;
        vec4.set(uniform.clippingBoxMin, clippingBox.min.x, clippingBox.min.y, clippingBox.min.z, 0.0);
        vec4.set(uniform.clippingBoxMax, clippingBox.max.x, clippingBox.max.y, clippingBox.max.z, 0.0);
        
        uniform.walltime = args.walltime;
        const center = pc.center();
        vec4.set(uniform.sceneCenter, center.x, center.y, center.z, 0.0);
        uniform.sceneExtend = Math.max(args.sceneExtend ?? 1.0, 1.0);
        
        return uniform;
    }
}

/**
 * Preprocess pipeline for converting 3D gaussians to 2D
 */
class PreprocessPipeline {
    private pipeline: GPUComputePipeline;

    constructor(device: GPUDevice, shDeg: number, compressed: boolean) {
        const pipelineLayout = device.createPipelineLayout({
            label: 'preprocess pipeline layout',
            bindGroupLayouts: [
                UniformBuffer.bindGroupLayout(device), // Camera uniform
                compressed ? PointCloud.bindGroupLayoutCompressed(device) : PointCloud.bindGroupLayout(device),
                // GPURSSorter.bindGroupLayoutPreprocess(device), // Will be added when gpu_rs is ported
                UniformBuffer.bindGroupLayout(device), // Render settings uniform
            ]
        });

        const shaderCode = this.buildShader(shDeg, compressed);
        const shader = device.createShaderModule({
            label: 'preprocess shader',
            code: shaderCode
        });

        this.pipeline = device.createComputePipeline({
            label: 'preprocess pipeline',
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: 'preprocess'
            }
        });
    }

    private buildShader(shDeg: number, compressed: boolean): string {
        // For now, return a placeholder shader
        // In a full implementation, this would read from the WGSL files
        const shaderTemplate = compressed ? 'preprocess_compressed.wgsl' : 'preprocess.wgsl';
        return `
            const MAX_SH_DEG: u32 = ${shDeg}u;
            // Shader code would be loaded from ${shaderTemplate}
            @compute @workgroup_size(256)
            fn preprocess(@builtin(global_invocation_id) global_id: vec3<u32>) {
                // Placeholder implementation
            }
        `;
    }

    run(
        encoder: GPUCommandEncoder,
        pc: PointCloud,
        camera: UniformBuffer<CameraUniform>,
        renderSettings: UniformBuffer<SplattingArgsUniform>,
        sortBg: GPUBindGroup
    ): void {
        const pass = encoder.beginComputePass({
            label: 'preprocess compute pass'
        });

        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, camera.getBindGroup());
        pass.setBindGroup(1, pc.getBindGroup());
        pass.setBindGroup(2, sortBg);
        pass.setBindGroup(3, renderSettings.getBindGroup());

        const wgsX = Math.ceil(pc.numPoints() / 256);
        pass.dispatchWorkgroups(wgsX, 1, 1);
        pass.end();
    }
}

/**
 * Main Gaussian renderer
 */
export class GaussianRenderer {
    private pipeline: GPURenderPipeline;
    private camera: UniformBuffer<CameraUniform>;
    private renderSettings: UniformBuffer<SplattingArgsUniform>;
    private preprocess: PreprocessPipeline;
    private drawIndirectBuffer: GPUBuffer;
    private drawIndirect: GPUBindGroup;
    private _colorFormat: GPUTextureFormat;
    private sorter: GPURSSorter | null = null; // Will be initialized when gpu_rs is ported
    private sorterStuff: PointCloudSortStuff | null = null;

    constructor(
        device: GPUDevice,
        queue: GPUQueue,
        colorFormat: GPUTextureFormat,
        shDeg: number,
        compressed: boolean,
        pipeline: GPURenderPipeline,
        camera: UniformBuffer<CameraUniform>,
        renderSettings: UniformBuffer<SplattingArgsUniform>,
        preprocess: PreprocessPipeline,
        drawIndirectBuffer: GPUBuffer,
        drawIndirect: GPUBindGroup
    ) {
        this.pipeline = pipeline;
        this.camera = camera;
        this.renderSettings = renderSettings;
        this.preprocess = preprocess;
        this.drawIndirectBuffer = drawIndirectBuffer;
        this.drawIndirect = drawIndirect;
        this._colorFormat = colorFormat;
    }

    static async create(
        device: GPUDevice,
        queue: GPUQueue,
        colorFormat: GPUTextureFormat,
        shDeg: number,
        compressed: boolean
    ): Promise<GaussianRenderer> {
        const pipelineLayout = device.createPipelineLayout({
            label: 'render pipeline layout',
            bindGroupLayouts: [
                PointCloud.bindGroupLayoutRender(device),
                // GPURSSorter.bindGroupLayoutRendering(device), // Will be added when gpu_rs is ported
            ]
        });

        // Load shader from WGSL file
        const shaderResponse = await fetch('/src/shaders/gaussian.wgsl');
        const shaderCode = await shaderResponse.text();
        const shader = device.createShaderModule({
            label: 'gaussian shader',
            code: shaderCode
        });

        const pipeline = device.createRenderPipeline({
            label: 'render pipeline',
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{
                    format: colorFormat,
                    blend: {
                        color: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha', 
                            operation: 'add'
                        }
                    },
                    writeMask: GPUColorWrite.ALL
                }]
            },
            primitive: {
                topology: 'triangle-strip',
                frontFace: 'ccw'
            }
        });

        const drawIndirectBuffer = device.createBuffer({
            label: 'indirect draw buffer',
            size: 16, // Size of DrawIndirectArgs
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });

        const indirectLayout = GaussianRenderer.bindGroupLayout(device);
        const drawIndirect = device.createBindGroup({
            label: 'draw indirect buffer',
            layout: indirectLayout,
            entries: [{
                binding: 0,
                resource: { buffer: drawIndirectBuffer }
            }]
        });

        const camera = new UniformBuffer<CameraUniform>(device, new CameraUniform(), 'camera uniform buffer');
        const renderSettings = new UniformBuffer<SplattingArgsUniform>(device, new SplattingArgsUniform(), 'render settings uniform buffer');
        const preprocess = new PreprocessPipeline(device, shDeg, compressed);

        return new GaussianRenderer(
            device,
            queue,
            colorFormat,
            shDeg,
            compressed,
            pipeline,
            camera,
            renderSettings,
            preprocess,
            drawIndirectBuffer,
            drawIndirect
        );
    }

    getCamera(): UniformBuffer<CameraUniform> {
        return this.camera;
    }

    getRenderSettings(): UniformBuffer<SplattingArgsUniform> {
        return this.renderSettings;
    }

    private preprocessStep(
        encoder: GPUCommandEncoder,
        queue: GPUQueue,
        pc: PointCloud,
        renderSettings: SplattingArgs
    ): void {
        const camera = renderSettings.camera;
        const uniform = this.camera.getData();
        const focal = camera.projection.focal({ x: renderSettings.viewport[0], y: renderSettings.viewport[1] });
        uniform.setFocal(vec2.fromValues(focal.x, focal.y));
        uniform.setViewport(vec2.fromValues(renderSettings.viewport[0], renderSettings.viewport[1]));
        uniform.setCamera(camera);
        this.camera.sync(queue);

        const settingsUniform = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
        // Update render settings data - simplified for now
        // this.renderSettings.setData(settingsUniform);
        this.renderSettings.sync(queue);

        // Write indirect draw args
        const drawArgs = new ArrayBuffer(16);
        const view = new DataView(drawArgs);
        view.setUint32(0, 4, true); // vertex_count
        view.setUint32(4, 0, true); // instance_count
        view.setUint32(8, 0, true); // first_vertex
        view.setUint32(12, 0, true); // first_instance
        queue.writeBuffer(this.drawIndirectBuffer, 0, drawArgs);

        if (this.sorterStuff) {
            this.preprocess.run(
                encoder,
                pc,
                this.camera,
                this.renderSettings,
                this.sorterStuff.sorterBgPre
            );
        }
    }

    prepare(
        encoder: GPUCommandEncoder,
        device: GPUDevice,
        queue: GPUQueue,
        pc: PointCloud,
        renderSettings: SplattingArgs,
        stopwatch?: GPUStopwatch
    ): void {
        // Initialize sorter stuff if needed
        if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints()) {
            console.log(`Created sort buffers for ${pc.numPoints()} points`);
            if (this.sorter) {
                this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
            }
        }

        if (this.sorter && this.sorterStuff) {
            this.sorter.recordResetIndirectBuffer(
                this.sorterStuff.sorterDis,
                this.sorterStuff.sorterUni,
                queue
            );
        }

        // Preprocess step
        if (stopwatch) {
            stopwatch.start(encoder, 'preprocess');
        }
        this.preprocessStep(encoder, queue, pc, renderSettings);
        if (stopwatch) {
            stopwatch.stop(encoder, 'preprocess');
        }

        // Sorting step
        if (stopwatch) {
            stopwatch.start(encoder, 'sorting');
        }
        if (this.sorter && this.sorterStuff) {
            this.sorter.recordSortIndirect(
                this.sorterStuff.sorterBg,
                this.sorterStuff.sorterDis,
                encoder
            );
        }
        if (stopwatch) {
            stopwatch.stop(encoder, 'sorting');
        }

        // Copy buffer
        if (this.sorterStuff) {
            encoder.copyBufferToBuffer(
                this.sorterStuff.sorterUni,
                0,
                this.drawIndirectBuffer,
                4, // offset to instance_count
                4  // size of u32
            );
        }
    }

    render(renderPass: GPURenderPassEncoder, pc: PointCloud): void {
        renderPass.setBindGroup(0, pc.getRenderBindGroup());
        if (this.sorterStuff) {
            renderPass.setBindGroup(1, this.sorterStuff.sorterRenderBg);
        }
        renderPass.setPipeline(this.pipeline);
        renderPass.drawIndirect(this.drawIndirectBuffer, 0);
    }

    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: 'draw indirect',
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage'
                }
            }]
        });
    }

    getColorFormat(): GPUTextureFormat {
        return this._colorFormat;
    }
}

/**
 * Display pipeline for final rendering to screen
 */
export class Display {
    private pipeline: GPURenderPipeline;
    private bindGroup: GPUBindGroup;
    private format: GPUTextureFormat;
    private view: GPUTextureView;
    private envBg: GPUBindGroup;
    private hasEnvMap: boolean;

    constructor(
        device: GPUDevice,
        sourceFormat: GPUTextureFormat,
        targetFormat: GPUTextureFormat,
        width: number,
        height: number
    ) {
        const pipelineLayout = device.createPipelineLayout({
            label: 'display pipeline layout',
            bindGroupLayouts: [
                Display.bindGroupLayout(device),
                Display.envMapBindGroupLayout(device),
                UniformBuffer.bindGroupLayout(device), // Camera uniform
                UniformBuffer.bindGroupLayout(device), // Render settings uniform
            ]
        });

        // Load display shader
        const shader = device.createShaderModule({
            label: 'display shader',
            code: `
                // Placeholder display shader
                @vertex
                fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
                    var pos = array<vec2<f32>, 4>(
                        vec2<f32>(-1.0, -1.0),
                        vec2<f32>( 1.0, -1.0),
                        vec2<f32>(-1.0,  1.0),
                        vec2<f32>( 1.0,  1.0)
                    );
                    return vec4<f32>(pos[vertex_index], 0.0, 1.0);
                }

                @fragment
                fn fs_main() -> @location(0) vec4<f32> {
                    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
                }
            `
        });

        this.pipeline = device.createRenderPipeline({
            label: 'display pipeline',
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{
                    format: targetFormat,
                    blend: {
                        color: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        }
                    },
                    writeMask: GPUColorWrite.ALL
                }]
            },
            primitive: {
                topology: 'triangle-strip'
            }
        });

        this.envBg = Display.createEnvMapBg(device, null);
        const [view, bindGroup] = Display.createRenderTarget(device, sourceFormat, width, height);
        
        this.format = sourceFormat;
        this.view = view;
        this.bindGroup = bindGroup;
        this.hasEnvMap = false;
    }

    texture(): GPUTextureView {
        return this.view;
    }

    private static envMapBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: 'env map bind group layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'float',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'filtering'
                    }
                }
            ]
        });
    }

    private static createEnvMapBg(device: GPUDevice, envTexture: GPUTextureView | null): GPUBindGroup {
        const placeholderTexture = device.createTexture({
            label: 'placeholder',
            size: { width: 1, height: 1 },
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING
        }).createView();

        const textureView = envTexture || placeholderTexture;
        const sampler = device.createSampler({
            label: 'env map sampler',
            magFilter: 'linear',
            minFilter: 'linear'
        });

        return device.createBindGroup({
            label: 'env map bind group',
            layout: Display.envMapBindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: textureView
                },
                {
                    binding: 1,
                    resource: sampler
                }
            ]
        });
    }

    setEnvMap(device: GPUDevice, envTexture: GPUTextureView | null): void {
        this.envBg = Display.createEnvMapBg(device, envTexture);
        this.hasEnvMap = envTexture !== null;
    }

    hasEnvMapSet(): boolean {
        return this.hasEnvMap;
    }

    private static createRenderTarget(
        device: GPUDevice,
        format: GPUTextureFormat,
        width: number,
        height: number
    ): [GPUTextureView, GPUBindGroup] {
        const texture = device.createTexture({
            label: 'display render image',
            size: { width, height },
            format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });

        const textureView = texture.createView();
        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });

        const bindGroup = device.createBindGroup({
            label: 'render target bind group',
            layout: Display.bindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: textureView
                },
                {
                    binding: 1,
                    resource: sampler
                }
            ]
        });

        return [textureView, bindGroup];
    }

    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: 'display bind group layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'float',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'filtering'
                    }
                }
            ]
        });
    }

    resize(device: GPUDevice, width: number, height: number): void {
        const [view, bindGroup] = Display.createRenderTarget(device, this.format, width, height);
        this.bindGroup = bindGroup;
        this.view = view;
    }

    render(
        encoder: GPUCommandEncoder,
        target: GPUTextureView,
        backgroundColor: GPUColor,
        camera: UniformBuffer<CameraUniform>,
        renderSettings: UniformBuffer<SplattingArgsUniform>
    ): void {
        const renderPass = encoder.beginRenderPass({
            label: 'render pass',
            colorAttachments: [{
                view: target,
                clearValue: backgroundColor,
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setBindGroup(1, this.envBg);
        renderPass.setBindGroup(2, camera.getBindGroup());
        renderPass.setBindGroup(3, renderSettings.getBindGroup());
        renderPass.setPipeline(this.pipeline);
        renderPass.draw(4, 1);
        renderPass.end();
    }
}
