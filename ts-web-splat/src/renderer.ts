// Mirrors renderer.rs (skeleton)
import { PointCloud } from "./pointcloud";
import { loadWGSL, SHADERS } from "./shaders/loader";

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
    return r;
  }

  preprocess(/* encoder: GPUCommandEncoder, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */): void {
    // TODO
  }

  prepare(/* encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */ pc: PointCloud): void {
    // Create bind groups from point cloud buffers
    this.bindGroup0 = this.device.createBindGroup({
      layout: this.bgLayout0,
      entries: [
        { binding: 2, resource: { buffer: pc.gaussiansBuffer } },
      ],
    });
    this.bindGroup1 = this.device.createBindGroup({
      layout: this.bgLayout1,
      entries: [
        { binding: 4, resource: { buffer: pc.indicesBuffer } },
      ],
    });
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
      primitive: { topology: "triangle-list" },
    });
    return pipeline;
  }
}
