// Mirrors pointcloud.rs (skeleton)
import { GenericGaussianPointCloud } from "./io";
export type Vec3 = [number, number, number];

export interface Aabb<T = number> { min: [T, T, T]; max: [T, T, T]; }

export class PointCloud {
  constructor(public num_points: number, public sh_deg: number) {}

  static async new(device: GPUDevice, pc: GenericGaussianPointCloud): Promise<PointCloud> {
    // TODO: create buffers and bind groups
    return new PointCloud(pc.num_points, pc.sh_deg);
  }

  compressed(): boolean { return false; }
  bbox(): Aabb<number> { return { min: [0,0,0], max: [0,0,0] }; }
  center(): Vec3 { return [0,0,0]; }
  up(): Vec3 | undefined { return undefined; }
}
