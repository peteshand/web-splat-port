// Mirrors renderer.rs (skeleton)
import { PointCloud } from "./pointcloud";
import { loadWGSL, SHADERS } from "./shaders/loader";
import { PerspectiveCamera } from "./camera";

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
    r.preprocessPipeline = r.device.createComputePipeline({
      layout: r.device.createPipelineLayout({ bindGroupLayouts: [r.cBgLayout0, r.cBgLayout1, r.cBgLayout2, r.cBgLayout3] }),
      compute: { module: r.preprocessModule, entryPoint: "preprocess" },
    });
    return r;
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
        { binding: 4, resource: { buffer: pc.indicesBuffer } },
      ],
    });

    // Allocate preprocess buffers sized by num_points
    const n = pc.num_points >>> 0;
    const splatStride = 4 * 4; // conservative placeholder; actual packed size is 4 u32 per Splat
    const points2DSize = n * splatStride;
    if (!this.points2DBuffer || this.points2DBuffer.size < points2DSize) {
      this.points2DBuffer = this.device.createBuffer({ size: Math.max(points2DSize, 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    }
    const u32Size = n * 4;
    if (!this.sortDepthsBuffer || this.sortDepthsBuffer.size < u32Size) {
      this.sortDepthsBuffer = this.device.createBuffer({ size: Math.max(u32Size, 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    }
    if (!this.sortIndicesBuffer || this.sortIndicesBuffer.size < u32Size) {
      this.sortIndicesBuffer = this.device.createBuffer({ size: Math.max(u32Size, 16), usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
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
      this.cameraUniformBuffer = this.device.createBuffer({ size: 16 * 4 * 4 + 16 * 4 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); // over-alloc; we'll refine
    }
    if (!this.renderSettingsBuffer) {
      this.renderSettingsBuffer = this.device.createBuffer({ size: 16 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); // rough size
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
