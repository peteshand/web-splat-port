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
    // TODO: create bind group layouts and pipeline layout mirroring Rust
    // r.pipeline = r.createPipeline();
    return r;
  }

  preprocess(/* encoder: GPUCommandEncoder, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */): void {
    // TODO
  }

  prepare(/* encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */): void {
    // TODO
  }

  render(/* pass: GPURenderPassEncoder, pc: PointCloud */): void {
    // TODO
  }

  private createPipeline(): GPURenderPipeline {
    // Placeholder: entry point names must match WGSL; we'll wire exact names during implementation.
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
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
