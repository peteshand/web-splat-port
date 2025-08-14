// Mirrors pointcloud.rs (skeleton)
import { GenericGaussianPointCloud } from "./io.js";
export type Vec3 = [number, number, number];

export interface Aabb<T = number> { min: [T, T, T]; max: [T, T, T]; }

export class PointCloud {
  public gaussiansBuffer!: GPUBuffer;
  public shCoefsBuffer!: GPUBuffer;
  public indicesBuffer!: GPUBuffer;
  public num_points: number;
  public sh_deg: number;

  private constructor(num_points: number, sh_deg: number) {
    this.num_points = num_points;
    this.sh_deg = sh_deg;
  }

  static async new(device: GPUDevice, pc: GenericGaussianPointCloud): Promise<PointCloud> {
    const self = new PointCloud(pc.num_points, pc.sh_deg);
    // Create storage buffers for gaussians and SH coefficients
    self.gaussiansBuffer = createAndUploadBuffer(device, pc.gaussians, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    self.shCoefsBuffer = createAndUploadBuffer(device, pc.sh_coefs, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    // Create a default indices buffer 0..num_points-1
    const idx = new Uint32Array(self.num_points);
    for (let i = 0; i < self.num_points; i++) idx[i] = i >>> 0;
    self.indicesBuffer = createAndUploadBuffer(device, idx.buffer, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    return self;
  }

  compressed(): boolean { return false; }
  bbox(): Aabb<number> { return { min: [0,0,0], max: [0,0,0] }; }
  center(): Vec3 { return [0,0,0]; }
  up(): Vec3 | undefined { return undefined; }
}

function createAndUploadBuffer(device: GPUDevice, data: ArrayBuffer, usage: GPUBufferUsageFlags): GPUBuffer {
  const buffer = device.createBuffer({
    size: alignTo(data.byteLength, 4), // 4-byte alignment for safety
    usage,
    mappedAtCreation: true,
  });
  const dst = new Uint8Array(buffer.getMappedRange());
  dst.set(new Uint8Array(data));
  buffer.unmap();
  return buffer;
}

function alignTo(n: number, alignment: number): number {
  const r = n % alignment;
  return r === 0 ? n : n + (alignment - r);
}
