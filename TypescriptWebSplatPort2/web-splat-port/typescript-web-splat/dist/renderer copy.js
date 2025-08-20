import { mat4, vec2, vec4 } from 'gl-matrix';
import { VIEWPORT_Y_FLIP } from './camera.js';
import { PointCloud } from './pointcloud.js';
import { UniformBuffer, UnifiedUniformBuffer } from './uniform.js';
/**
 * Camera uniform data structure for GPU
 */
export class CameraUniform {
    viewMatrix;
    viewInvMatrix;
    projMatrix;
    projInvMatrix;
    viewport;
    focal;
    constructor() {
        this.viewMatrix = mat4.create();
        this.viewInvMatrix = mat4.create();
        this.projMatrix = mat4.create();
        this.projInvMatrix = mat4.create();
        this.viewport = vec2.fromValues(1.0, 1.0);
        this.focal = vec2.fromValues(1.0, 1.0);
    }
    setViewMat(viewMatrix) {
        mat4.copy(this.viewMatrix, viewMatrix);
        mat4.invert(this.viewInvMatrix, viewMatrix);
    }
    setProjMat(projMatrix) {
        const temp = mat4.create();
        mat4.multiply(temp, VIEWPORT_Y_FLIP, projMatrix);
        mat4.copy(this.projMatrix, temp);
        mat4.invert(this.projInvMatrix, projMatrix);
    }
    setCamera(camera) {
        this.setProjMat(camera.projMatrix());
        this.setViewMat(camera.viewMatrix());
    }
    setViewport(viewport) {
        vec2.copy(this.viewport, viewport);
    }
    setFocal(focal) {
        vec2.copy(this.focal, focal);
    }
}
export const DEFAULT_KERNEL_SIZE = 0.3;
/**
 * Splatting arguments uniform data for GPU
 */
export class SplattingArgsUniform {
    clippingBoxMin;
    clippingBoxMax;
    gaussianScaling;
    maxShDeg;
    showEnvMap;
    mipSplatting;
    kernelSize;
    walltime;
    sceneExtend;
    _pad;
    sceneCenter;
    constructor() {
        this.clippingBoxMin = vec4.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.0);
        this.clippingBoxMax = vec4.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0.0);
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
    static fromArgsAndPc(args, pc) {
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
async function loadWGSL(path, header) {
    const resp = await fetch(path);
    const body = await resp.text();
    return (header ?? "") + "\n" + body;
}
/**
 * Preprocess pipeline for converting 3D gaussians to 2D
 */
class PreprocessPipeline {
    pipeline;
    constructor(pipeline) {
        this.pipeline = pipeline;
    }
    static async create(device, shDeg, compressed) {
        const pipelineLayout = device.createPipelineLayout({
            label: 'preprocess pipeline layout',
            bindGroupLayouts: [
                // group(0): unified (camera @0, settings @1)
                UnifiedUniformBuffer.bindGroupLayout(device),
                // group(1): point cloud (compressed or not)
                (compressed ? PointCloud.bindGroupLayoutCompressed(device)
                    : PointCloud.bindGroupLayout(device)),
                // group(2): sort-pre (stub for now; swap to real sorter later)
                GaussianRenderer.sortPreBindGroupLayout(device),
                // NOTE: group(3) not needed if WGSL uses unified g0
            ]
        });
        const url = `./shaders/${compressed ? 'preprocess_compressed.wgsl' : 'preprocess.wgsl'}`;
        let code = await (await fetch(url)).text();
        const shader = device.createShaderModule({ label: 'preprocess shader', code });
        const pipeline = device.createComputePipeline({
            label: 'preprocess pipeline',
            layout: pipelineLayout,
            compute: { module: shader, entryPoint: 'preprocess' }
        });
        return new PreprocessPipeline(pipeline);
    }
    run(encoder, pc, unifiedBG, // group(0) — combined camera+settings
    sortPreBG // group(2)
    ) {
        const pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, unifiedBG); // camera+settings at g0
        pass.setBindGroup(1, pc.getBindGroup());
        pass.setBindGroup(2, sortPreBG);
        const wgsX = Math.ceil(pc.numPoints() / 256);
        pass.dispatchWorkgroups(wgsX, 1, 1);
        pass.end();
    }
}
/**
 * Main Gaussian renderer
 */
export class GaussianRenderer {
    pipeline;
    unifiedUniform;
    preprocess;
    drawIndirectBuffer;
    drawIndirect;
    _colorFormat;
    sorter = null; // Will be initialized when gpu_rs is ported
    sorterStuff = null;
    indicesBuffer = null;
    indicesBindGroup = null;
    sortPreBuffer = null;
    sortPreBindGroup = null;
    constructor(device, queue, colorFormat, shDeg, compressed, pipeline, unifiedUniform, preprocess, drawIndirectBuffer, drawIndirect) {
        this.pipeline = pipeline;
        this.unifiedUniform = unifiedUniform;
        this.preprocess = preprocess;
        this.drawIndirectBuffer = drawIndirectBuffer;
        this.drawIndirect = drawIndirect;
        this._colorFormat = colorFormat;
    }
    ensureSortPre(device, count) {
        const needed = Math.max(4, count * 4); // one f32 per point (adjust if WGSL needs different)
        if (!this.sortPreBuffer || this.sortPreBuffer.size < needed) {
            this.sortPreBuffer?.destroy?.();
            this.sortPreBuffer = device.createBuffer({
                label: 'preprocess sort-pre buffer (stub)',
                size: needed,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.sortPreBindGroup = device.createBindGroup({
                label: 'preprocess sort-pre BG (stub)',
                layout: GaussianRenderer.sortPreBindGroupLayout(device),
                entries: [{ binding: 0, resource: { buffer: this.sortPreBuffer } }]
            });
        }
    }
    static sortPreBindGroupLayout(device) {
        return device.createBindGroupLayout({
            label: 'sort-pre bind group layout (stub)',
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
            ]
        });
    }
    static async create(device, queue, colorFormat, shDeg, compressed) {
        // gaussian.wgsl expects:
        //   @group(0) @binding(2) points_2d
        //   @group(1) @binding(4) indices
        const renderPipelineLayout = device.createPipelineLayout({
            label: 'render pipeline layout',
            bindGroupLayouts: [
                PointCloud.bindGroupLayoutRender(device), // group(0): provides binding(2) points_2d
                GaussianRenderer.renderBindGroupLayout(device), // group(1): provides binding(4) indices
            ],
        });
        const shaderResponse = await fetch('./shaders/gaussian.wgsl');
        const shaderCode = await shaderResponse.text();
        const shader = device.createShaderModule({
            label: 'gaussian shader',
            code: shaderCode
        });
        const pipeline = device.createRenderPipeline({
            label: 'render pipeline',
            layout: renderPipelineLayout,
            vertex: { module: shader, entryPoint: 'vs_main' },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{
                        format: colorFormat,
                        blend: {
                            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        },
                        writeMask: GPUColorWrite.ALL,
                    }],
            },
            primitive: { topology: 'triangle-strip', frontFace: 'ccw' },
        });
        const drawIndirectBuffer = device.createBuffer({
            label: 'indirect draw buffer',
            size: 16, // DrawIndirectArgs
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        const indirectLayout = GaussianRenderer.bindGroupLayout(device);
        const drawIndirect = device.createBindGroup({
            label: 'draw indirect buffer',
            layout: indirectLayout,
            entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
        });
        const unifiedUniform = new UnifiedUniformBuffer(device);
        const preprocess = await PreprocessPipeline.create(device, shDeg, compressed);
        return new GaussianRenderer(device, queue, colorFormat, shDeg, compressed, pipeline, unifiedUniform, preprocess, drawIndirectBuffer, drawIndirect);
    }
    ensureFallbackIndices(device, queue, count) {
        const neededSize = count * 4;
        if (!this.indicesBuffer || this.indicesBuffer.size < neededSize) {
            this.indicesBuffer?.destroy?.();
            this.indicesBuffer = device.createBuffer({
                label: 'fallback indices',
                size: neededSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            // Fill 0..N-1 on CPU and upload once
            const arr = new Uint32Array(count);
            for (let i = 0; i < count; i++)
                arr[i] = i;
            queue.writeBuffer(this.indicesBuffer, 0, arr);
            this.indicesBindGroup = device.createBindGroup({
                label: 'indices bind group',
                layout: GaussianRenderer.renderBindGroupLayout(device),
                entries: [{ binding: 4, resource: { buffer: this.indicesBuffer } }]
            });
        }
    }
    static renderBindGroupLayout(device) {
        // Matches gaussian.wgsl: @group(1) @binding(4) indices : array<u32>
        return device.createBindGroupLayout({
            label: 'render indices bind group layout',
            entries: [
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage' }
                }
            ]
        });
    }
    getDrawIndirectBuffer() {
        return this.drawIndirectBuffer;
    }
    getUnifiedUniform() {
        return this.unifiedUniform;
    }
    serializeCameraUniform(camera) {
        const buf = new ArrayBuffer(272); // CAMERA_SIZE
        const f32 = new Float32Array(buf);
        // view_matrix [0..16)
        f32.set(camera.viewMatrix, 0);
        // view_inv_matrix [16..32)
        f32.set(camera.viewInvMatrix, 16);
        // proj_matrix [32..48)
        f32.set(camera.projMatrix, 32);
        // proj_inv_matrix [48..64)
        f32.set(camera.projInvMatrix, 48);
        // viewport (vec2) [64..66)
        f32[64] = camera.viewport[0];
        f32[65] = camera.viewport[1];
        // focal (vec2) [66..68)
        f32[66] = camera.focal[0];
        f32[67] = camera.focal[1];
        return new Uint8Array(buf);
    }
    serializeSettingsUniform(settings) {
        const buf = new ArrayBuffer(80); // SETTINGS_SIZE
        const dv = new DataView(buf);
        let off = 0;
        // clipping_box_min (vec4)
        for (let i = 0; i < 4; i++)
            dv.setFloat32(off + i * 4, settings.clippingBoxMin[i], true);
        off += 16;
        // clipping_box_max (vec4)
        for (let i = 0; i < 4; i++)
            dv.setFloat32(off + i * 4, settings.clippingBoxMax[i], true);
        off += 16;
        // gaussian_scaling f32
        dv.setFloat32(off, settings.gaussianScaling, true);
        off += 4;
        // max_sh_deg u32
        dv.setUint32(off, settings.maxShDeg >>> 0, true);
        off += 4;
        // show_env_map u32
        dv.setUint32(off, settings.showEnvMap >>> 0, true);
        off += 4;
        // mip_splatting u32
        dv.setUint32(off, settings.mipSplatting >>> 0, true);
        off += 4;
        // kernel_size, walltime, scene_extend (3 * f32)
        dv.setFloat32(off, settings.kernelSize, true);
        off += 4;
        dv.setFloat32(off, settings.walltime, true);
        off += 4;
        dv.setFloat32(off, settings.sceneExtend, true);
        off += 4;
        // _pad u32
        dv.setUint32(off, 0, true);
        off += 4;
        // scene_center vec4
        for (let i = 0; i < 4; i++)
            dv.setFloat32(off + i * 4, settings.sceneCenter[i] ?? 0, true);
        return new Uint8Array(buf);
    }
    preprocessStep(encoder, queue, pc, renderSettings) {
        // Update unified uniform buffer with camera and settings data
        const cameraUniform = new CameraUniform();
        cameraUniform.setCamera(renderSettings.camera);
        cameraUniform.setViewport(renderSettings.viewport);
        // Calculate focal length from projection parameters
        const focalX = renderSettings.viewport[0] / (2.0 * Math.tan(renderSettings.camera.projection.fovx / 2.0));
        const focalY = renderSettings.viewport[1] / (2.0 * Math.tan(renderSettings.camera.projection.fovy / 2.0));
        cameraUniform.setFocal(vec2.fromValues(focalX, focalY));
        const settingsUniform = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
        // Convert uniform objects to byte arrays
        const cameraBytes = this.serializeCameraUniform(cameraUniform);
        const settingsBytes = this.serializeSettingsUniform(settingsUniform);
        this.unifiedUniform.updateCamera(queue, cameraBytes);
        this.unifiedUniform.updateSettings(queue, settingsBytes);
        // Setup draw indirect buffer
        const drawArgs = new ArrayBuffer(16);
        const view = new DataView(drawArgs);
        view.setUint32(0, 4, true); // vertex_count
        view.setUint32(4, pc.numPoints(), true); // instance_count
        view.setUint32(8, 0, true); // first_vertex
        view.setUint32(12, 0, true); // first_instance
        queue.writeBuffer(this.drawIndirectBuffer, 0, drawArgs);
    }
    prepare(encoder, device, queue, pc, renderSettings, stopwatch) {
        // Initialize sorter stuff if needed
        if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints()) {
            console.log(`Created sort buffers for ${pc.numPoints()} points`);
            if (this.sorter) {
                this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
            }
        }
        if (this.sorter && this.sorterStuff) {
            this.sorter.recordResetIndirectBuffer(this.sorterStuff.sorterDis, this.sorterStuff.sorterUni, queue);
        }
        // Preprocess step
        if (stopwatch) {
            stopwatch.start(encoder, 'preprocess');
        }
        this.preprocessStep(encoder, queue, pc, renderSettings);
        this.ensureSortPre(device, pc.numPoints());
        this.preprocess.run(encoder, pc, this.unifiedUniform.getCombinedBindGroup(), // g0: combined camera+settings
        (this.sorterStuff ? this.sorterStuff.sorterBgPre
            : this.sortPreBindGroup) // g2: real or stub
        );
        /*this.preprocess.run(
            encoder,
            pc,
            this.unifiedUniform.getCameraBindGroup(),
            this.unifiedUniform.getSettingsBindGroup()
          );*/
        if (stopwatch) {
            stopwatch.stop(encoder, 'preprocess');
        }
        // Sorting step
        if (stopwatch) {
            stopwatch.start(encoder, 'sorting');
        }
        if (this.sorter && this.sorterStuff) {
            this.sorter.recordSortIndirect(this.sorterStuff.sorterBg, this.sorterStuff.sorterDis, encoder);
        }
        if (stopwatch) {
            stopwatch.stop(encoder, 'sorting');
        }
        // Copy buffer
        if (this.sorterStuff) {
            encoder.copyBufferToBuffer(this.sorterStuff.sorterUni, 0, this.drawIndirectBuffer, 4, // offset to instance_count
            4 // size of u32
            );
        }
        if (!this.sorterStuff) {
            this.ensureFallbackIndices(device, queue, pc.numPoints());
        }
    }
    render(renderPass, pc) {
        // group(0): point cloud (provides points_2d at binding 2)
        renderPass.setBindGroup(0, pc.getRenderBindGroup());
        // group(1): indices (binding 4): sorter if present, fallback otherwise
        if (this.sorterStuff) {
            renderPass.setBindGroup(1, this.sorterStuff.sorterRenderBg);
        }
        else {
            renderPass.setBindGroup(1, this.indicesBindGroup);
        }
        renderPass.setPipeline(this.pipeline);
        renderPass.drawIndirect(this.drawIndirectBuffer, 0);
    }
    static bindGroupLayout(device) {
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
    getColorFormat() {
        return this._colorFormat;
    }
}
/**
 * Display pipeline for final rendering to screen
 */
export class Display {
    pipeline;
    bindGroup;
    format;
    view;
    envBg;
    hasEnvMap;
    constructor(device, sourceFormat, targetFormat, width, height) {
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
    texture() {
        return this.view;
    }
    static envMapBindGroupLayout(device) {
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
    static createEnvMapBg(device, envTexture) {
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
    setEnvMap(device, envTexture) {
        this.envBg = Display.createEnvMapBg(device, envTexture);
        this.hasEnvMap = envTexture !== null;
    }
    hasEnvMapSet() {
        return this.hasEnvMap;
    }
    static createRenderTarget(device, format, width, height) {
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
    static bindGroupLayout(device) {
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
    resize(device, width, height) {
        const [view, bindGroup] = Display.createRenderTarget(device, this.format, width, height);
        this.bindGroup = bindGroup;
        this.view = view;
    }
    render(encoder, target, backgroundColor, camera, renderSettings) {
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
//# sourceMappingURL=renderer%20copy.js.map