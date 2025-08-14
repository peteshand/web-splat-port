// Minimal IO definitions to satisfy PointCloud.new
export interface GenericGaussianPointCloud {
  num_points: number;
  sh_deg: number;
  gaussians: ArrayBuffer; // raw bytes for gaussians storage buffer
  sh_coefs: ArrayBuffer;  // raw bytes for spherical harmonics coefficients storage buffer
}

export function createDummyPointCloud(num_points: number, sh_deg: number): GenericGaussianPointCloud {
  // Sizes here are placeholders sufficient to run preprocess without OOB. Adjust as shaders require.
  // Assume gaussian struct ~ 64 bytes (position, scale, color, etc.). Overallocate to be safe.
  const gaussianStride = 64;
  const gaussians = new ArrayBuffer(num_points * gaussianStride);
  // SH coefficients: per point coefficients count varies with degree; overallocate a bit.
  const shCount = (sh_deg + 1) * (sh_deg + 1) * 3; // RGB per basis
  const shStride = shCount * 4; // f32
  const sh_coefs = new ArrayBuffer(num_points * shStride);
  return { num_points, sh_deg, gaussians, sh_coefs };
}
