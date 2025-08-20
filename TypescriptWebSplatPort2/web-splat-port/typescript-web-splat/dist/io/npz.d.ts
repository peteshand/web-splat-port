import { GenericGaussianPointCloud, PointCloudReader } from './mod.js';
export interface INpzArray<T = number> {
    data: ArrayLike<T>;
    shape: number[];
}
export interface INpzArchive {
    byName<T = number>(name: string): INpzArray<T> | undefined;
}
export declare class NpzReader implements PointCloudReader {
    private npzFile;
    private sh_deg;
    private kernel_size;
    private mip_splatting;
    private background_color;
    constructor(reader: INpzArchive);
    static magic_bytes(): Uint8Array;
    static file_ending(): string;
    read(): GenericGaussianPointCloud;
    static magic_bytes_ts(): Uint8Array;
    static file_ending_ts(): string;
}
//# sourceMappingURL=npz.d.ts.map