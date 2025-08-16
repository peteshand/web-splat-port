// Mirrors renderer.rs (skeleton)
import { PointCloud } from "./pointcloud.js";
import { GPURSSorter } from './gpu_rs.js';
import { UniformBuffer } from './uniform.js';
import { loadWGSL, SHADERS } from './shaders.js';
// Simple renderer to fix syntax errors
export class GaussianRenderer {
    device;
    queue;
    pipeline;
    camera;
    renderSettings;
    drawIndirectBuffer;
    bindGroup0;
    bindGroup1;
    sorter;
    constructor(device, queue, colorFormat) {
        this.device = device;
        this.queue = queue;
        this.camera = new UniformBuffer(device, {
            viewMatrix: new Float32Array(16),
            projMatrix: new Float32Array(16),
            viewport: new Float32Array(2),
            focal: new Float32Array(2)
        }, "camera");
        this.renderSettings = new UniformBuffer(device, {
            gaussianScaling: 1.0,
            maxShDeg: 3,
            showEnvMap: false
        }, "render settings");
    }
    static async new(device, queue, colorFormat, shDeg, compressed) {
        const renderer = new GaussianRenderer(device, queue, colorFormat);
        // Initialize draw indirect buffer
        renderer.drawIndirectBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
        });
        const defaultArgs = new Uint32Array([4, 1000, 0, 0]);
        queue.writeBuffer(renderer.drawIndirectBuffer, 0, defaultArgs);
        return renderer;
    }
    updateUniformsFromCamera(camera, viewport) {
        const cameraData = this.camera.getData();
        const viewMatrix = camera.view_matrix();
        const projMatrix = camera.proj_matrix();
        cameraData.viewMatrix.set(viewMatrix);
        cameraData.projMatrix.set(projMatrix);
        if (viewport) {
            cameraData.viewport[0] = viewport[0];
            cameraData.viewport[1] = viewport[1];
        }
        this.camera.sync(this.queue);
    }
    encodePreprocessAndSort(pc, camera, viewport) {
        this.updateUniformsFromCamera(camera, viewport);
        const encoder = this.device.createCommandEncoder();
        if (!this.bindGroup0 && pc.renderBindGroup) {
            this.bindGroup0 = pc.renderBindGroup;
        }
        if (!this.bindGroup1 && pc.indicesBuffer) {
            const layout = this.device.createBindGroupLayout({
                entries: [{
                        binding: 4,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: "read-only-storage" },
                    }],
            });
            this.bindGroup1 = this.device.createBindGroup({
                layout,
                entries: [{ binding: 4, resource: { buffer: pc.indicesBuffer } }],
            });
        }
        return encoder;
    }
    render(pass, pc) {
        if (!this.pipeline || !this.bindGroup0 || !this.bindGroup1) {
            return;
        }
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup0);
        pass.setBindGroup(1, this.bindGroup1);
        if (this.drawIndirectBuffer) {
            pass.drawIndirect(this.drawIndirectBuffer, 0);
        }
        else {
            pass.draw(4, Math.min(pc.numPoints, 1000), 0, 0);
        }
    }
}
class PreprocessPipeline {
    pipeline;
    constructor(device, shDeg, compressed) {
        const pipelineLayout = device.createPipelineLayout({
            label: "preprocess pipeline layout",
            bindGroupLayouts: [
                UniformBuffer.bindGroupLayout(device), // CameraUniform
                compressed ? PointCloud.bindGroupLayoutCompressed(device) : PointCloud.bindGroupLayout(device),
                GPURSSorter.bindGroupLayoutPreprocess(device),
                UniformBuffer.bindGroupLayout(device), // SplattingArgsUniform
            ],
        });
        const shaderSource = this.buildShader(shDeg, compressed);
        const shader = device.createShaderModule({
            label: "preprocess shader",
            code: shaderSource,
        });
        this.pipeline = device.createComputePipeline({
            label: "preprocess pipeline",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "preprocess",
            },
        });
    }
    buildShader(shDeg, compressed) {
        const shaderPath = compressed ? "preprocess_compressed.wgsl" : "preprocess.wgsl";
        // This would need to load the actual shader content
        return `const MAX_SH_DEG: u32 = ${shDeg}u;\n// Shader content would go here`;
    }
    run(encoder, pc, camera, renderSettings, sortBg) {
        const pass = encoder.beginComputePass({ label: "preprocess compute pass" });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, camera.getBindGroup());
        pass.setBindGroup(1, pc.bindGroup);
        pass.setBindGroup(2, sortBg);
        pass.setBindGroup(3, renderSettings.getBindGroup());
        const wgsX = Math.ceil(pc.numPoints / 256);
        pass.dispatchWorkgroups(wgsX, 1, 1);
        pass.end();
    }
}
export class GaussianRenderer {
    pipeline;
    device;
    queue;
    colorFormat;
    camera;
    renderSettings;
    preprocess;
    drawIndirectBuffer;
    drawIndirect;
    sorter;
    sorterStuff;
    // Legacy properties for compatibility
    gaussianModule;
    maxSHDeg = 0;
    sortEnabled = false;
    userInput = false;
    bgLayout0; // group(0)
    bgLayout1; // group(1)
    bindGroup0;
    bindGroup1;
    // Preprocess compute
    preprocessModule;
    preprocessPipeline;
    cBgLayout0; // camera uniforms
    cBgLayout1; // gaussians, sh_coefs, points_2d
    cBgLayout2; // sort infos/depths/indices/dispatch
    cBgLayout3; // render settings
    cBindGroup0;
    cBindGroup1;
    cBindGroup2;
    cBindGroup3;
    // Buffers produced/used by preprocess (legacy)
    points2DBuffer; // array<Splat>
    sortDepthsBuffer; // array<u32>
    sortIndicesBuffer; // array<u32>
    sortInfosBuffer; // SortInfos struct
    sortDispatchBuffer; // DispatchIndirect
    cameraUniformBuffer;
    renderSettingsBuffer;
    // Radix sorter
    legacySorter;
    sortPlan; // PointCloudSortStuff from gpu_rs.ts
    constructor( /* device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, sh_deg: number, compressed: boolean */) { }
    static async new(device, queue, colorFormat, shDeg, compressed) {
        const r = new GaussianRenderer();
        r.device = device;
        r.queue = queue;
        r.colorFormat = colorFormat;
        r.maxSHDeg = shDeg >>> 0;
        // Create render pipeline layout matching Rust
        const pipelineLayout = device.createPipelineLayout({
            label: "render pipeline layout",
            bindGroupLayouts: [
                PointCloud.bindGroupLayoutRender(device), // points_2d at binding 2
                GPURSSorter.bindGroupLayoutRendering(device), // indices at binding 4
            ],
        });
        // Load and create shader module
        const gaussianSrc = await loadWGSL(SHADERS.gaussian);
        const shader = device.createShaderModule({
            label: "gaussian shader",
            code: gaussianSrc
        });
        // Create render pipeline matching Rust configuration
        r.pipeline = device.createRenderPipeline({
            label: "render pipeline",
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: "vs_main",
                buffers: [],
            },
            fragment: {
                module: shader,
                entryPoint: "fs_main",
                targets: [{
                        format: colorFormat,
                        blend: {
                            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
                            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
                        },
                        writeMask: GPUColorWrite.ALL,
                    }],
            },
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: undefined,
                frontFace: "ccw",
                cullMode: "none",
            },
            depthStencil: undefined,
            multisample: { count: 1 },
        });
        // Create draw indirect buffer
        r.drawIndirectBuffer = device.createBuffer({
            label: "indirect draw buffer",
            size: 16, // DrawIndirectArgs: 4 u32s
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        // Create bind group for draw indirect (matches Rust)
        const indirectLayout = GaussianRenderer.bindGroupLayout(device);
        r.drawIndirect = device.createBindGroup({
            label: "draw indirect buffer",
            layout: indirectLayout,
            entries: [{ binding: 0, resource: { buffer: r.drawIndirectBuffer } }],
        });
        // Initialize sorter
        r.sorter = await GPURSSorter.new(device, queue);
        // Initialize uniform buffers
        r.camera = UniformBuffer.newDefault(device, {
            viewMatrix: mat4.create(),
            viewInvMatrix: mat4.create(),
            projMatrix: mat4.create(),
            projInvMatrix: mat4.create(),
            viewport: [1.0, 1.0],
            focal: [1.0, 1.0],
        }, "camera uniform buffer");
        r.renderSettings = UniformBuffer.newDefault(device, {
            gaussianScaling: 1.0,
            maxShDeg: shDeg,
            showEnvMap: false,
        }, "render settings uniform buffer");
        // Initialize preprocess pipeline
        r.preprocess = new PreprocessPipeline(device, shDeg, compressed);
        return r;
    }
    // Rust-style bindGroupLayout method
    static bindGroupLayout(device) {
        return device.createBindGroupLayout({
            label: "draw indirect",
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                        hasDynamicOffset: false,
                        minBindingSize: 16, // DrawIndirectArgs size
                    },
                }],
        });
    }
    // Rust-style camera accessor
    getCamera() {
        return this.camera;
    }
    // Rust-style render settings accessor  
    getRenderSettings() {
        return this.renderSettings;
    }
    // Rust-style color format accessor
    getColorFormat() {
        return this.colorFormat;
    }
    // Rust-style prepare method
    prepare(encoder, device, queue, pc, renderSettings, stopwatch) {
        // Check if sorter stuff needs to be created/recreated
        if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints) {
            console.log(`Created sort buffers for ${pc.numPoints} points`);
            this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints);
        }
        // Reset indirect buffer (matches Rust GPURSSorter::record_reset_indirect_buffer)
        GPURSSorter.recordResetIndirectBuffer(this.sorterStuff.sorterDis, this.sorterStuff.sorterUni, queue);
        // Run preprocess with timing
        if (stopwatch)
            stopwatch.start(encoder, "preprocess");
        this.preprocessInternal(encoder, queue, pc, renderSettings);
        if (stopwatch)
            stopwatch.stop(encoder, "preprocess");
        // Run sorting with timing
        if (stopwatch)
            stopwatch.start(encoder, "sorting");
        this.sorter.recordSortIndirect(this.sorterStuff.sorterBg, this.sorterStuff.sorterDis, encoder);
        if (stopwatch)
            stopwatch.stop(encoder, "sorting");
        // Copy keys_size to draw indirect instance count
        encoder.copyBufferToBuffer(this.sorterStuff.sorterUni, 0, this.drawIndirectBuffer, 4, // offset 4 for instanceCount field
        4 // copy 4 bytes (u32)
        );
    }
    // Rust-style render method
    render(renderPass, pc) {
        if (!this.sorterStuff)
            return;
        renderPass.setBindGroup(0, pc.renderBindGroup());
        renderPass.setBindGroup(1, this.sorterStuff.sorterRenderBg);
        renderPass.setPipeline(this.pipeline);
        renderPass.drawIndirect(this.drawIndirectBuffer, 0);
    }
    // Legacy methods for compatibility
    init(device, queue, colorFormat, sh_deg, compressed) {
        // Legacy initialization - use static new() instead
    }
    async initAsync(device, queue, colorFormat, sh_deg, compressed) {
        const r = await GaussianRenderer.new(device, queue, colorFormat, sh_deg, compressed);
        Object.assign(this, r);
    }
    encodePreprocessAndSort(pc, camera, viewport) {
        // Legacy method - kept for compatibility
        this.legacyPrepare(pc);
        this.updateUniformsFromCamera(camera, viewport);
        // Zero atomic counters and initialize drawIndirect
        if (this.sortInfosBuffer) {
            const zeroInfos = new Uint32Array(5);
            this.queue.writeBuffer(this.sortInfosBuffer, 0, zeroInfos.buffer);
        }
        const encoder = this.device.createCommandEncoder();
        this.runPreprocess(encoder, pc);
        // CRITICAL FIX: Ensure proper GPU synchronization like Rust version
        if (this.sortEnabled && this.legacySorter && this.sortPlan) {
            this.legacySorter.sort(encoder, this.sortPlan, pc.numPoints);
            // Copy sorted results to draw indirect buffer (matches Rust implementation)
            if (this.drawIndirectBuffer && this.sortInfosBuffer) {
                encoder.copyBufferToBuffer(this.sortInfosBuffer, 4, // Skip first u32 (visible count is at offset 4)
                this.drawIndirectBuffer, 4, // Write to vertex count field
                4 // Copy 4 bytes (one u32)
                );
            }
            this.bindGroup1 = this.device.createBindGroup({
                layout: this.bgLayout1,
                entries: [{ binding: 4, resource: { buffer: this.sortPlan.payload_a } }],
            });
        }
        else {
            const buf = this.sortIndicesBuffer ?? pc.indicesBuffer;
            if (buf) {
                this.bindGroup1 = this.device.createBindGroup({
                    layout: this.bgLayout1,
                    entries: [{ binding: 4, resource: { buffer: buf } }],
                });
            }
        }
        return encoder;
    }
    legacyPrepare(pc) {
        // Legacy prepare method - create bind group layouts
        this.bgLayout0 = this.device.createBindGroupLayout({
            entries: [{
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                },
            ],
        });
        // group(1) binding(4): indices storage read
        this.bgLayout1 = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                },
            ],
        });
        // Create pipeline with explicit layout order [group0, group1]
        this.pipeline = this.createPipeline([this.bgLayout0, this.bgLayout1]);
        // Compute bind group layouts (match preprocess.wgsl)
        // group(0) binding(0): camera uniforms (matches Rust ShaderStages::all())
        this.cBgLayout0 = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            ],
        });
        // group(1): gaussians, sh_coefs, points_2d
        this.cBgLayout1 = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            ],
        });
        // group(2): sort infos/depths/indices/dispatch
        this.cBgLayout2 = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            ],
        });
        // group(3): render settings uniform (matches Rust ShaderStages::all())
        r.cBgLayout3 = r.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
            ],
        });
        // Note: sorter initialization moved to async constructor
        return r;
    }
    legacyPrepare(pc) {
        // Legacy prepare method - create bind group layouts
        this.bgLayout0 = this.device.createBindGroupLayout({
            entries: [{
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                }],
        });
        this.bgLayout1 = this.device.createBindGroupLayout({
            entries: [{
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                }],
        });
        this.bgLayout2 = this.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" },
                }, {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" },
                }],
        });
        this.bgLayout3 = this.device.createBindGroupLayout({
            entries: [{
                    binding: 3,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                }],
        });
    }
    // Encodes preprocess then radix sort; caller should submit encoder and then begin render pass and call render()
    encodePreprocessAndSort(pc, camera, viewport) {
        // Ensure resources and bind groups exist for current point cloud
        this.prepare(pc);
        // Update camera uniforms BEFORE encoding compute pass (matches Rust timing)
        this.updateUniformsFromCamera(camera, viewport);
        // Zero atomic counters in infos/dispatch before preprocess writes
        if (this.sortInfosBuffer) {
            const zeroInfos = new Uint32Array(5); // keys_size, padded_size, passes, even, odd
            this.queue.writeBuffer(this.sortInfosBuffer, 0, zeroInfos.buffer);
        }
        if (this.sortDispatchBuffer) {
            const zeroDispatch = new Uint32Array(3); // dispatch_x, dispatch_y, dispatch_z
            this.queue.writeBuffer(this.sortDispatchBuffer, 0, zeroDispatch.buffer);
        }
        if (this.drawIndirectBuffer) {
            const drawArgs = new Uint32Array([4, pc.numPoints, 0, 0]); // vertexCount, instanceCount, firstVertex, firstInstance
            this.queue.writeBuffer(this.drawIndirectBuffer, 0, drawArgs.buffer);
        }
        const encoder = this.device.createCommandEncoder();
        // Preprocess to fill points_2d, depths, indices
        this.runPreprocess(encoder, pc);
        // Copy keys_size to drawIndirect instanceCount
        if (this.sortInfosBuffer && this.drawIndirectBuffer) {
            encoder.copyBufferToBuffer(this.sortInfosBuffer, 0, // source: keys_size at offset 0
            this.drawIndirectBuffer, 4, // dest: instanceCount at offset 4
            4 // copy 4 bytes (u32)
            );
        }
        // Run radix sort if enabled
        if (this.sortEnabled && this.sorter && this.sortPlan) {
            this.sorter.sort(encoder, this.sortPlan, pc.numPoints);
            // Rebind render indices to sorted payload_a (final output after full passes)
            this.bindGroup1 = this.device.createBindGroup({
                layout: this.bgLayout1,
                entries: [{ binding: 4, resource: { buffer: this.sortPlan.payload_a } }],
            });
        }
        else {
            // Use preprocess-produced compact index order to match points_2d writes
            const buf = this.sortIndicesBuffer ?? pc.indicesBuffer;
            if (buf) {
                this.bindGroup1 = this.device.createBindGroup({
                    layout: this.bgLayout1,
                    entries: [{ binding: 4, resource: { buffer: buf } }],
                });
            }
        }
        return encoder;
    }
    // Rust-style preprocess method
    preprocessInternal(encoder, queue, pc, renderSettings) {
        // Update camera uniforms
        // TODO: Implement camera uniform updates
        // Update render settings uniforms  
        // TODO: Implement render settings updates
        // Initialize draw indirect buffer
        const drawArgs = new Uint32Array([4, 0, 0, 0]); // vertexCount, instanceCount, firstVertex, firstInstance
        queue.writeBuffer(this.drawIndirectBuffer, 0, drawArgs.buffer);
        // Run preprocess pipeline
        if (this.sorterStuff) {
            this.preprocess.run(encoder, pc, this.camera, this.renderSettings, this.sorterStuff.sorterBgPre);
        }
    }
    prepare(/* encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */ pc) {
        // Allocate preprocess buffers sized by num_points
        const n = pc.numPoints >>> 0;
        // Splat has 5 x u32 fields => 20 bytes per element
        const splatStride = 20;
        const points2DSize = Math.max(4, n * splatStride);
        if (!this.points2DBuffer || this.points2DBuffer.size < points2DSize) {
            this.points2DBuffer = this.device.createBuffer({ size: points2DSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        }
        const u32Size = Math.max(4, n * 4);
        if (!this.sortDepthsBuffer || this.sortDepthsBuffer.size < u32Size) {
            this.sortDepthsBuffer = this.device.createBuffer({ size: u32Size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        }
        if (!this.sortIndicesBuffer || this.sortIndicesBuffer.size < u32Size) {
            this.sortIndicesBuffer = this.device.createBuffer({
                size: u32Size,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });
        }
        // SortInfos (5 u32 -> pad to 32 bytes) and DispatchIndirect (3 u32 -> pad to 16 bytes)
        if (!this.sortInfosBuffer) {
            this.sortInfosBuffer = this.device.createBuffer({
                size: 32, // keys_size, padded_size, passes, even, odd
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            });
        }
        if (!this.sortDispatchBuffer) {
            this.sortDispatchBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        }
        if (!this.drawIndirectBuffer) {
            this.drawIndirectBuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            });
        }
        // Camera and render settings uniforms (caller should update via setters)
        if (!this.cameraUniformBuffer) {
            // CameraUniforms size: 272 bytes (multiple of 16)
            this.cameraUniformBuffer = this.device.createBuffer({ size: 272, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        if (!this.renderSettingsBuffer) {
            // RenderSettings size: 80 bytes (multiple of 16)
            this.renderSettingsBuffer = this.device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        // Plan radix sort buffers (uses our existing depths/indices as keys/payload)
        if (this.sorter && (!this.sortPlan || this.sortPlan.keys !== this.sortDepthsBuffer)) {
            this.sortPlan = this.sorter.planBuffers(pc.numPoints, this.sortDepthsBuffer, this.sortIndicesBuffer);
        }
        // Create bind groups from prepared buffers
        if (!this.points2DBuffer)
            throw new Error("points2DBuffer not allocated");
        this.bindGroup0 = this.device.createBindGroup({
            layout: this.bgLayout0,
            entries: [
                // gaussian.wgsl expects points_2d at group(0), binding(2)
                { binding: 2, resource: { buffer: this.points2DBuffer } },
            ],
        });
        const indicesBuf = (this.sortPlan?.payload_a ?? pc.indicesBuffer);
        if (!indicesBuf)
            throw new Error("indices buffer not available");
        this.bindGroup1 = this.device.createBindGroup({
            layout: this.bgLayout1,
            entries: [
                // Use sorted indices if sorter is planned; otherwise fallback to original indices
                { binding: 4, resource: { buffer: indicesBuf } },
            ],
        });
        // Compute bind groups
        if (!this.cameraUniformBuffer)
            throw new Error("cameraUniformBuffer not allocated");
        this.cBindGroup0 = this.device.createBindGroup({
            layout: this.cBgLayout0,
            entries: [{ binding: 0, resource: { buffer: this.cameraUniformBuffer } }],
        });
        this.cBindGroup1 = this.device.createBindGroup({
            layout: this.cBgLayout1,
            entries: [
                { binding: 0, resource: { buffer: pc.gaussiansBuffer } },
                { binding: 1, resource: { buffer: pc.shCoefsBuffer } },
                { binding: 2, resource: { buffer: this.points2DBuffer } },
            ],
        });
        if (!this.sortInfosBuffer || !this.sortDepthsBuffer || !this.sortIndicesBuffer || !this.sortDispatchBuffer) {
            throw new Error("sort buffers not allocated");
        }
        this.cBindGroup2 = this.device.createBindGroup({
            layout: this.cBgLayout2,
            entries: [
                { binding: 0, resource: { buffer: this.sortInfosBuffer } },
                { binding: 1, resource: { buffer: this.sortDepthsBuffer } },
                { binding: 2, resource: { buffer: this.sortIndicesBuffer } },
                { binding: 3, resource: { buffer: this.sortDispatchBuffer } },
            ],
        });
        if (!this.renderSettingsBuffer)
            throw new Error("renderSettingsBuffer not allocated");
        this.cBindGroup3 = this.device.createBindGroup({
            layout: this.cBgLayout3,
            entries: [{ binding: 0, resource: { buffer: this.renderSettingsBuffer } }],
        });
    }
    runPreprocess(encoder, pc) {
        if (!this.preprocessPipeline || !this.cBindGroup0 || !this.cBindGroup1 || !this.cBindGroup2 || !this.cBindGroup3)
            return;
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.preprocessPipeline);
        pass.setBindGroup(0, this.cBindGroup0);
        pass.setBindGroup(1, this.cBindGroup1);
        pass.setBindGroup(2, this.cBindGroup2);
        pass.setBindGroup(3, this.cBindGroup3);
        const wgSize = 256;
        const groups = Math.ceil(pc.numPoints / wgSize);
        pass.dispatchWorkgroups(groups, 1, 1);
        pass.end();
    }
    // Minimal default uniforms writer to enable preprocess without full camera plumbing
    // Writes identity matrices and viewport into CameraUniforms, and sane defaults into RenderSettings
    updateUniforms(viewport) {
        // Ensure buffers exist
        if (!this.cameraUniformBuffer) {
            this.cameraUniformBuffer = this.device.createBuffer({ size: 272, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        if (!this.renderSettingsBuffer) {
            this.renderSettingsBuffer = this.device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        // CameraUniforms layout (272 bytes)
        const camBuf = new ArrayBuffer(272);
        const cam = new DataView(camBuf);
        const writeMat4 = (base) => {
            for (let i = 0; i < 16; i++)
                cam.setFloat32(base + i * 4, i % 5 === 0 ? 1 : 0, true);
        };
        writeMat4(0); // view
        writeMat4(64); // view_inv
        writeMat4(128); // proj
        writeMat4(192); // proj_inv
        cam.setFloat32(256, viewport[0], true); // viewport.x
        cam.setFloat32(260, viewport[1], true); // viewport.y
        cam.setFloat32(264, 1.0, true); // focal.x
        cam.setFloat32(268, 1.0, true); // focal.y
        this.queue.writeBuffer(this.cameraUniformBuffer, 0, camBuf);
        // RenderSettings layout (80 bytes)
        const rsBuf = new ArrayBuffer(80);
        const rs = new DataView(rsBuf);
        // clipping_box_min (vec4)
        rs.setFloat32(0, -1e6, true);
        rs.setFloat32(4, -1e6, true);
        rs.setFloat32(8, -1e6, true);
        rs.setFloat32(12, 0, true);
        // clipping_box_max (vec4)
        rs.setFloat32(16, 1e6, true);
        rs.setFloat32(20, 1e6, true);
        rs.setFloat32(24, 1e6, true);
        rs.setFloat32(28, 0, true);
        // gaussian_scaling f32 at 32
        rs.setFloat32(32, 1.0, true);
        // max_sh_deg u32 at 36
        rs.setUint32(36, this.maxSHDeg >>> 0, true);
        // show_env_map u32 at 40
        rs.setUint32(40, 0, true);
        // mip_splatting u32 at 44
        rs.setUint32(44, 0, true);
        // kernel_size f32 at 48
        rs.setFloat32(48, 1.0, true);
        // walltime f32 at 52
        // Set large walltime so scale_mod ~= 1 and splats are visible
        rs.setFloat32(52, 1e6, true);
        // scene_extend f32 at 56
        // Increase scene extent to keep dd small
        rs.setFloat32(56, 1e3, true);
        // center vec3 at 64
        rs.setFloat32(64, 0.0, true);
        rs.setFloat32(68, 0.0, true);
        rs.setFloat32(72, 0.0, true);
        this.queue.writeBuffer(this.renderSettingsBuffer, 0, rsBuf);
    }
    render(pass, pc) {
        if (!this.pipeline || !this.bindGroup0 || !this.bindGroup1)
            return;
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup0);
        pass.setBindGroup(1, this.bindGroup1);
        // CRITICAL FIX: Always use drawIndirect with proper buffer synchronization
        // This matches the Rust implementation exactly
        if (this.drawIndirectBuffer) {
            pass.drawIndirect(this.drawIndirectBuffer, 0);
        }
        else {
            // Create emergency fallback buffer if missing
            console.warn("Missing drawIndirectBuffer - creating emergency fallback");
            const fallbackArgs = new Uint32Array([4, pc.numPoints, 0, 0]);
            const fallbackBuffer = this.device.createBuffer({
                size: fallbackArgs.byteLength,
                usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
            });
            this.queue.writeBuffer(fallbackBuffer, 0, fallbackArgs);
            pass.drawIndirect(fallbackBuffer, 0);
        }
    }
    createPipeline(layouts) {
        // Placeholder: entry point names must match WGSL; we'll wire exact names during implementation.
        const pipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: layouts }),
            vertex: {
                module: this.gaussianModule,
                entryPoint: "vs_main", // TODO: confirm with gaussian.wgsl
                buffers: [],
            },
            fragment: {
                module: this.gaussianModule,
                entryPoint: "fs_main", // TODO: confirm with gaussian.wgsl
                targets: [{
                        format: this.colorFormat,
                        // Premultiplied alpha blending: fragment outputs rgb premultiplied by alpha
                        blend: {
                            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
                        },
                        writeMask: GPUColorWrite.ALL,
                    }],
            },
            primitive: {
                topology: "triangle-strip",
                stripIndexFormat: undefined,
                frontFace: "ccw",
                cullMode: "none",
                unclippedDepth: false,
            },
            depthStencil: undefined,
            multisample: {
                count: 1,
                mask: 0xFFFFFFFF,
                alphaToCoverageEnabled: false,
            },
        });
        return pipeline;
    }
    // Write camera and render settings from a PerspectiveCamera
    updateUniformsFromCamera(cam, viewport) {
        if (!this.cameraUniformBuffer) {
            this.cameraUniformBuffer = this.device.createBuffer({ size: 272, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        if (!this.renderSettingsBuffer) {
            this.renderSettingsBuffer = this.device.createBuffer({ size: 80, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        }
        const camBuf = new ArrayBuffer(272);
        const dv = new DataView(camBuf);
        const writeMat4 = (base, m) => {
            for (let i = 0; i < 16; i++)
                dv.setFloat32(base + i * 4, m[i], true);
        };
        const view = cam.view_matrix();
        const proj = cam.proj_matrix();
        const viewInv = mat4.create();
        const projInv = mat4.create();
        // Check for valid matrix inversion
        const viewInvResult = mat4.invert(viewInv, view);
        const projInvResult = mat4.invert(projInv, proj);
        if (!viewInvResult || !projInvResult) {
            console.warn("Matrix inversion failed, using identity matrices");
            mat4.identity(viewInv);
            mat4.identity(projInv);
        }
        writeMat4(0, view);
        writeMat4(64, viewInv);
        writeMat4(128, proj);
        writeMat4(192, projInv);
        dv.setFloat32(256, viewport[0], true);
        dv.setFloat32(260, viewport[1], true);
        const [fx, fy] = cam.projection.focal(viewport);
        dv.setFloat32(264, fx, true);
        dv.setFloat32(268, fy, true);
        this.queue.writeBuffer(this.cameraUniformBuffer, 0, camBuf);
        // Log camera position for debugging
        if (Math.random() < 0.01) { // 1% chance to avoid spam
            const pos = [viewInv[12], viewInv[13], viewInv[14]];
            // Check for invalid values
            if (pos.some(p => !isFinite(p) || Math.abs(p) > 1e6)) {
                console.warn(`Invalid camera position detected: [${pos[0]}, ${pos[1]}, ${pos[2]}]`);
            }
            else {
                console.log(`Camera pos: [${pos[0].toFixed(2)}, ${pos[1].toFixed(2)}, ${pos[2].toFixed(2)}]`);
            }
        }
        const rsBuf = new ArrayBuffer(80);
        const rs = new DataView(rsBuf);
        rs.setFloat32(0, -1e6, true);
        rs.setFloat32(4, -1e6, true);
        rs.setFloat32(8, -1e6, true);
        rs.setFloat32(12, 0, true);
        rs.setFloat32(16, 1e6, true);
        rs.setFloat32(20, 1e6, true);
        rs.setFloat32(24, 1e6, true);
        rs.setFloat32(28, 0, true);
        rs.setFloat32(32, 1.0, true); // gaussian_scaling
        rs.setUint32(36, this.maxSHDeg >>> 0, true); // max_sh_deg
        rs.setUint32(40, 0, true); // show_env_map
        rs.setUint32(44, 0, true); // mip_splatting
        rs.setFloat32(48, 1.0, true); // kernel_size
        rs.setFloat32(52, 1e6, true); // walltime (large so splats are visible)
        rs.setFloat32(56, 1e3, true); // scene_extend (increase to reduce dd)
        rs.setFloat32(64, 0.0, true);
        rs.setFloat32(68, 0.0, true);
        rs.setFloat32(72, 0.0, true); // center
        this.queue.writeBuffer(this.renderSettingsBuffer, 0, rsBuf);
    }
    async debugLogBuffers() {
        if (!this.sortInfosBuffer || !this.drawIndirectBuffer)
            return;
        try {
            // Read sortInfos buffer to check keys_size
            const sortInfosReadBuffer = this.device.createBuffer({
                size: 32,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const encoder = this.device.createCommandEncoder();
            encoder.copyBufferToBuffer(this.sortInfosBuffer, 0, sortInfosReadBuffer, 0, 32);
            this.device.queue.submit([encoder.finish()]);
            await sortInfosReadBuffer.mapAsync(GPUMapMode.READ);
            const sortInfosData = new Uint32Array(sortInfosReadBuffer.getMappedRange());
            const keysSize = sortInfosData[0];
            sortInfosReadBuffer.unmap();
            sortInfosReadBuffer.destroy();
            // Read drawIndirect buffer to check instance count
            const drawIndirectReadBuffer = this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const encoder2 = this.device.createCommandEncoder();
            encoder2.copyBufferToBuffer(this.drawIndirectBuffer, 0, drawIndirectReadBuffer, 0, 16);
            this.device.queue.submit([encoder2.finish()]);
            await drawIndirectReadBuffer.mapAsync(GPUMapMode.READ);
            const drawData = new Uint32Array(drawIndirectReadBuffer.getMappedRange());
            console.log(`Debug: keys_size=${keysSize}, drawIndirect=[${drawData[0]}, ${drawData[1]}, ${drawData[2]}, ${drawData[3]}]`);
            drawIndirectReadBuffer.unmap();
            drawIndirectReadBuffer.destroy();
        }
        catch (e) {
            console.warn("Debug logging failed:", e);
        }
    }
}
