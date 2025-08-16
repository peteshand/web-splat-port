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
  // Additional properties to match Rust GenericGaussianPointCloud
  compressed(): boolean;
  covars?: ArrayBuffer;
  quantization?: { zero_point: number; scale: number };
  aabb: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  center: { x: number; y: number; z: number };
  up?: { x: number; y: number; z: number };
}

export * from "./ply.js";
export * from "./npz.js";

// Convenience: create a dummy cloud with safe overallocation
export function createDummyPointCloud(num_points: number, sh_deg: number): GenericGaussianPointCloud {
  const gaussianStride = 20; // match packed size (but overallocate minimally)
  const gaussians = new ArrayBuffer(Math.max(1, num_points) * gaussianStride);
  const shCount = (sh_deg + 1) * (sh_deg + 1) * 3; // RGB per basis
  // Pack as halfs in u32 pairs → 2 halfs per u32, round up
  const halfsPerPoint = shCount; // if using f16 per channel
  const u32PerPoint = Math.max(1, Math.ceil(halfsPerPoint / 2));
  const sh_coefs = new ArrayBuffer(Math.max(1, num_points) * u32PerPoint * 4);
  return { 
    num_points, 
    sh_deg, 
    gaussians, 
    sh_coefs,
    compressed: () => false,
    aabb: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
    center: { x: 0, y: 0, z: 0 }
  };
}

// Loader for binary little-endian PLY 3DGS files
import { PlyReader } from "./ply.js";
export async function loadGaussianPLY(url: string): Promise<GenericGaussianPointCloud> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch PLY: ${resp.status} ${resp.statusText}`);
  const buf = await resp.arrayBuffer();
  const reader = new PlyReader(buf);
  return reader.read();
}
