// Optional NPZ reader (feature-gated in Rust). Placeholder for parity.
import { GenericGaussianPointCloud, PointCloudReader } from ".";

export class NpzReader implements PointCloudReader {
  constructor(private _file: ArrayBuffer) {}
  static magic_bytes(): Uint8Array { return new Uint8Array([0x50,0x4b,0x03,0x04]); }
  static file_ending(): string { return ".npz"; }
  async read(): Promise<GenericGaussianPointCloud> { throw new Error("unimplemented"); }
}
