// Mirrors renderer.rs (skeleton)
import { PointCloud } from "./pointcloud";
import { loadWGSL, SHADERS } from "./shaders/loader";
import { PerspectiveCamera } from "./camera";
import { GPURSSorter } from "./gpu_rs";

export interface SplattingArgs {
  // Subset; extend later to match Rust SplattingArgs
  gaussian_scaling: number;
  max_sh_deg: number;
  show_env_map: boolean;
  mip_splatting?: boolean;
  kernel_size?: number;
}

export class GaussianRenderer {
  private gaussianModule!: GPUShaderModule;
  private device!: GPUDevice;
  private queue!: GPUQueue;
  private colorFormat!: GPUTextureFormat;
  private pipeline?: GPURenderPipeline;
  private bgLayout0!: GPUBindGroupLayout; // group(0)
  private bgLayout1!: GPUBindGroupLayout; // group(1)
  private bindGroup0?: GPUBindGroup;
  private bindGroup1?: GPUBindGroup;

  // Preprocess compute
  private preprocessModule!: GPUShaderModule;
  private preprocessPipeline!: GPUComputePipeline;
  private cBgLayout0!: GPUBindGroupLayout; // camera uniforms
  private cBgLayout1!: GPUBindGroupLayout; // gaussians, sh_coefs, points_2d
  private cBgLayout2!: GPUBindGroupLayout; // sort infos/depths/indices/dispatch
  private cBgLayout3!: GPUBindGroupLayout; // render settings
  private cBindGroup0?: GPUBindGroup;
  private cBindGroup1?: GPUBindGroup;
  private cBindGroup2?: GPUBindGroup;
  private cBindGroup3?: GPUBindGroup;

  // Buffers produced/used by preprocess
  private points2DBuffer?: GPUBuffer; // array<Splat>
  private sortInfosBuffer?: GPUBuffer; // SortInfos struct size
  private sortDepthsBuffer?: GPUBuffer; // array<u32>
  private sortIndicesBuffer?: GPUBuffer; // array<u32>
  private sortDispatchBuffer?: GPUBuffer; // DispatchIndirect
  private cameraUniformBuffer?: GPUBuffer;
  private renderSettingsBuffer?: GPUBuffer;
  // Radix sorter
  private sorter?: GPURSSorter;
  private sortPlan?: ReturnType<GPURSSorter["planBuffers"]>;

  constructor(/* device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, sh_deg: number, compressed: boolean */) {}

  static async new(
    _device: GPUDevice,
    _queue: GPUQueue,
    _color_format: GPUTextureFormat,
    _sh_deg: number,
    _compressed: boolean
  ): Promise<GaussianRenderer> {
    const r = new GaussianRenderer();
    r.device = _device;
    r.queue = _queue;
    r.colorFormat = _color_format;
    // Load WGSL from local shaders directory (copied from Rust project)
    const gaussianSrc = await loadWGSL(SHADERS.gaussian);
    r.gaussianModule = _device.createShaderModule({ code: gaussianSrc });
    const preprocessSrc = await loadWGSL(SHADERS.preprocess);
    r.preprocessModule = _device.createShaderModule({ code: preprocessSrc });
    // Create bind group layouts matching gaussian.wgsl usage
    // group(0) binding(2): points_2d storage read
    r.bgLayout0 = r.device.createBindGroupLayout({
      entries: [
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    // group(1) binding(4): indices storage read
    r.bgLayout1 = r.device.createBindGroupLayout({
      entries: [
        {
          binding: 4,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    // Create pipeline with explicit layout order [group0, group1]
    r.pipeline = r.createPipeline([r.bgLayout0, r.bgLayout1]);

    // Compute bind group layouts (match preprocess.wgsl)
    // group(0) binding(0): camera uniforms
    r.cBgLayout0 = r.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ],
    });
    // group(1): gaussians, sh_coefs, points_2d
    r.cBgLayout1 = r.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    // group(2): sort infos/depths/indices/dispatch
    r.cBgLayout2 = r.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      ],
    });
    // group(3): render settings uniform
    r.cBgLayout3 = r.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      ],
    });

    // Instantiate radix sorter
    r.sorter = await GPURSSorter.new(_device, _queue);
    r.preprocessPipeline = r.device.createComputePipeline({
      layout: r.device.createPipelineLayout({ bindGroupLayouts: [r.cBgLayout0, r.cBgLayout1, r.cBgLayout2, r.cBgLayout3] }),
      compute: { module: r.preprocessModule, entryPoint: "preprocess" },
    });
    return r;
  }

  // Encodes preprocess then radix sort; caller should submit encoder and then begin render pass and call render()
  encodePreprocessAndSort(pc: PointCloud): GPUCommandEncoder {
    // Ensure resources and bind groups exist for current point cloud
    this.prepare(pc);
    const encoder = this.device.createCommandEncoder();
    // Preprocess to fill points_2d, depths, indices
    this.runPreprocess(encoder, pc);
    // Run radix sort if available and planned
    if (this.sorter && this.sortPlan) {
      this.sorter.sort(encoder, this.sortPlan, pc.num_points);
      // Rebind render indices to sorted payload_a (final output after full passes)
      this.bindGroup1 = this.device.createBindGroup({
        layout: this.bgLayout1,
        entries: [ { binding: 4, resource: { buffer: this.sortPlan.payload_a } } ],
      });
    }
    return encoder;
  }

  preprocess(/* encoder: GPUCommandEncoder, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */): void {
    // Deprecated in favor of runPreprocess(encoder, pc, settings)
  }

  prepare(/* encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */ pc: PointCloud): void {
    // Create bind groups from point cloud buffers
    this.bindGroup0 = this.device.createBindGroup({
      layout: this.bgLayout0,
      entries: [
        // gaussian.wgsl expects points_2d at group(0), binding(2)
        { binding: 2, resource: { buffer: this.points2DBuffer! } },
      ],
    });
    this.bindGroup1 = this.device.createBindGroup({
      layout: this.bgLayout1,
      entries: [
        // Use sorted indices if sorter is planned; otherwise fallback to original indices
        { binding: 4, resource: { buffer: (this.sortPlan?.payload_a ?? pc.indicesBuffer) } },
      ],
    });

    // Allocate preprocess buffers sized by num_points
    const n = pc.num_points >>> 0;
    // Splat has 5 x u32 fields => 20 bytes per element
    const splatStride = 20;
    const points2DSize = n * splatStride;
    if (!this.points2DBuffer || this.points2DBuffer.size < points2DSize) {
      this.points2DBuffer = this.device.createBuffer({ size: points2DSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    }
    const u32Size = n * 4;
    if (!this.sortDepthsBuffer || this.sortDepthsBuffer.size < u32Size) {
      this.sortDepthsBuffer = this.device.createBuffer({ size: u32Size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    }
    if (!this.sortIndicesBuffer || this.sortIndicesBuffer.size < u32Size) {
      this.sortIndicesBuffer = this.device.createBuffer({ size: u32Size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    }
    // SortInfos (5 u32 -> pad to 32 bytes) and DispatchIndirect (3 u32 -> pad to 16 bytes)
    if (!this.sortInfosBuffer) {
      this.sortInfosBuffer = this.device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    }
    if (!this.sortDispatchBuffer) {
      this.sortDispatchBuffer = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
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
      this.sortPlan = this.sorter.planBuffers(pc.num_points, this.sortDepthsBuffer!, this.sortIndicesBuffer!);
    }

    // Compute bind groups
    this.cBindGroup0 = this.device.createBindGroup({
      layout: this.cBgLayout0,
      entries: [ { binding: 0, resource: { buffer: this.cameraUniformBuffer } } ],
    });
    this.cBindGroup1 = this.device.createBindGroup({
      layout: this.cBgLayout1,
      entries: [
        { binding: 0, resource: { buffer: pc.gaussiansBuffer } },
        { binding: 1, resource: { buffer: pc.shCoefsBuffer } },
        { binding: 2, resource: { buffer: this.points2DBuffer } },
      ],
    });
    this.cBindGroup2 = this.device.createBindGroup({
      layout: this.cBgLayout2,
      entries: [
        { binding: 0, resource: { buffer: this.sortInfosBuffer } },
        { binding: 1, resource: { buffer: this.sortDepthsBuffer } },
        { binding: 2, resource: { buffer: this.sortIndicesBuffer } },
        { binding: 3, resource: { buffer: this.sortDispatchBuffer } },
      ],
    });
    this.cBindGroup3 = this.device.createBindGroup({
      layout: this.cBgLayout3,
      entries: [ { binding: 0, resource: { buffer: this.renderSettingsBuffer } } ],
    });
  }

  runPreprocess(encoder: GPUCommandEncoder, pc: PointCloud): void {
    if (!this.preprocessPipeline || !this.cBindGroup0 || !this.cBindGroup1 || !this.cBindGroup2 || !this.cBindGroup3) return;
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.preprocessPipeline);
    pass.setBindGroup(0, this.cBindGroup0);
    pass.setBindGroup(1, this.cBindGroup1);
    pass.setBindGroup(2, this.cBindGroup2);
    pass.setBindGroup(3, this.cBindGroup3);
    const wgSize = 256;
    const groups = Math.ceil(pc.num_points / wgSize);
    pass.dispatchWorkgroups(groups, 1, 1);
    pass.end();
  }

  // Minimal default uniforms writer to enable preprocess without full camera plumbing
  // Writes identity matrices and viewport into CameraUniforms, and sane defaults into RenderSettings
  public updateUniforms(viewport: [number, number]): void {
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
    const writeMat4 = (base: number) => {
      for (let i = 0; i < 16; i++) cam.setFloat32(base + i * 4, i % 5 === 0 ? 1 : 0, true);
    };
    writeMat4(0);    // view
    writeMat4(64);   // view_inv
    writeMat4(128);  // proj
    writeMat4(192);  // proj_inv
    cam.setFloat32(256, viewport[0], true); // viewport.x
    cam.setFloat32(260, viewport[1], true); // viewport.y
    cam.setFloat32(264, 1.0, true);        // focal.x
    cam.setFloat32(268, 1.0, true);        // focal.y
    this.queue.writeBuffer(this.cameraUniformBuffer, 0, camBuf);

    // RenderSettings layout (80 bytes)
    const rsBuf = new ArrayBuffer(80);
    const rs = new DataView(rsBuf);
    // clipping_box_min (vec4)
    rs.setFloat32(0, -1e6, true); rs.setFloat32(4, -1e6, true); rs.setFloat32(8, -1e6, true); rs.setFloat32(12, 0, true);
    // clipping_box_max (vec4)
    rs.setFloat32(16, 1e6, true); rs.setFloat32(20, 1e6, true); rs.setFloat32(24, 1e6, true); rs.setFloat32(28, 0, true);
    // gaussian_scaling f32 at 32
    rs.setFloat32(32, 1.0, true);
    // max_sh_deg u32 at 36
    rs.setUint32(36, 0, true);
    // show_env_map u32 at 40
    rs.setUint32(40, 0, true);
    // mip_splatting u32 at 44
    rs.setUint32(44, 0, true);
    // kernel_size f32 at 48
    rs.setFloat32(48, 1.0, true);
    // walltime f32 at 52
    rs.setFloat32(52, 0.0, true);
    // scene_extend f32 at 56
    rs.setFloat32(56, 1.0, true);
    // center vec3 at 64
    rs.setFloat32(64, 0.0, true); rs.setFloat32(68, 0.0, true); rs.setFloat32(72, 0.0, true);
    this.queue.writeBuffer(this.renderSettingsBuffer, 0, rsBuf);
  }

  render(pass: GPURenderPassEncoder, pc: PointCloud): void {
    if (!this.pipeline || !this.bindGroup0 || !this.bindGroup1) return;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup0);
    pass.setBindGroup(1, this.bindGroup1);
    // Quad with 4 verts, instance per point
    pass.draw(4, pc.num_points, 0, 0);
  }

  private createPipeline(layouts: GPUBindGroupLayout[]): GPURenderPipeline {
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
        targets: [{ format: this.colorFormat }],
      },
      primitive: { topology: "triangle-strip" },
    });
    return pipeline;
  }
}
