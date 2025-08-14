// Mirrors renderer.rs (skeleton)
import { PointCloud } from "./pointcloud";

export interface SplattingArgs {
  // Subset; extend later to match Rust SplattingArgs
  gaussian_scaling: number;
  max_sh_deg: number;
  show_env_map: boolean;
  mip_splatting?: boolean;
  kernel_size?: number;
}

export class GaussianRenderer {
  constructor(/* device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, sh_deg: number, compressed: boolean */) {}

  static async new(
    _device: GPUDevice,
    _queue: GPUQueue,
    _color_format: GPUTextureFormat,
    _sh_deg: number,
    _compressed: boolean
  ): Promise<GaussianRenderer> {
    // TODO: create pipeline, bind groups, etc. Load WGSL from src-rust path.
    return new GaussianRenderer();
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
}
