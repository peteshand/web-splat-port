// Skeleton PLY reader to match io/ply.rs role
import { GenericGaussianPointCloud, PointCloudReader } from ".";

export class PlyReader implements PointCloudReader {
  constructor(private file: ArrayBuffer) {}

  static magic_bytes(): Uint8Array { return new TextEncoder().encode("ply\n"); }
  static file_ending(): string { return ".ply"; }

  async read(): Promise<GenericGaussianPointCloud> {
    // TODO: parse PLY; for skeleton, throw
    throw new Error("unimplemented");
  }
}
