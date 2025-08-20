import { GenericGaussianPointCloud, PointCloudReader } from './mod.js';
export declare class PlyReader implements PointCloudReader {
    private header;
    private dv;
    private offset;
    private sh_deg;
    private num_points;
    private mip_splatting;
    private kernel_size;
    private background_color;
    constructor(reader: ArrayBuffer);
    static new(reader: ArrayBuffer): PlyReader;
    static magic_bytes(): Uint8Array;
    static file_ending(): string;
    read(): GenericGaussianPointCloud;
    private read_line;
    private readF32;
    static magic_bytes_ts(): Uint8Array;
}
//# sourceMappingURL=ply.d.ts.map