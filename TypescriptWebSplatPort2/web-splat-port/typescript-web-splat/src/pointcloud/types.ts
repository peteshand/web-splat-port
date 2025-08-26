// ---- Types mirroring the Rust structs (for clarity; buffers are passed as bytes) ----
export type Vec3 = { x: number; y: number; z: number };
export type Color3 = [number, number, number];

// ---- 1:1 Rust type mirrors we need to export ----
export type Point3f32 = { x: number; y: number; z: number };
export type Vector3f32 = { x: number; y: number; z: number };

export type Gaussian = {
  xyz: Point3f32;                 // f16 triplet in source
  opacity: number;                // f16
  cov: [number, number, number, number, number, number]; // [f16; 6]
};

export type GaussianCompressed = {
  xyz: Point3f32;       // f16
  opacity: number;      // i8
  scale_factor: number; // i8
  geometry_idx: number; // u32
  sh_idx: number;       // u32
};

export type Covariance3D = {
  v: [number, number, number, number, number, number];
};

// ---- Minimal interface your loader should satisfy (mirrors GenericGaussianPointCloud) ----
export interface GenericGaussianPointCloud {
  num_points: number;
  sh_deg: number;
  compressed(): boolean;

  gaussian_buffer(): ArrayBuffer | ArrayBufferView; // 3D gaussian source buffer
  sh_coefs_buffer(): ArrayBuffer | ArrayBufferView; // SH buffer

  // only for compressed:
  covars?: ArrayBuffer | ArrayBufferView;                 // covariance blocks
  quantization?: ArrayBufferView | import('./quantization').GaussianQuantization;  // accept bytes or struct

  aabb: { min: Vec3; max: Vec3 };
  center: Vec3;
  up?: Vec3;
  mip_splatting?: boolean;
  kernel_size?: number;
  background_color?: Color3;
}
