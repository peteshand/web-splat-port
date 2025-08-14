// Mirrors io/mod.rs (skeleton)
export interface PointCloudReader {
  read(): Promise<GenericGaussianPointCloud>;
  // magic_bytes and file_ending are Rust concepts; we'll infer by sniffing headers
}

export interface GenericGaussianPointCloud {
  gaussians: ArrayBuffer;
  sh_coefs: ArrayBuffer;
  sh_deg: number;
  num_points: number;
  kernel_size?: number;
  mip_splatting?: boolean;
  background_color?: [number, number, number];
}

export * from "./ply";
export * from "./npz";
