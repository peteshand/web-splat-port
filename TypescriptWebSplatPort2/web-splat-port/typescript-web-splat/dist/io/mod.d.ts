import { Aabb, Gaussian, GaussianCompressed, Covariance3D, GaussianQuantization, Point3f32, Vector3f32 } from '../pointcloud.js';
/** One SH coefficient triplet (r,g,b) */
type SHTriplet = [number, number, number];
/** Exactly 16 SH triplets, fixed-length tuple */
type SHBlock16 = [
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet,
    SHTriplet
];
export interface PointCloudReader {
    read(): GenericGaussianPointCloud;
}
export declare class GenericGaussianPointCloud {
    private gaussiansBytes;
    private shCoefsBytes;
    private _compressed;
    covars: Covariance3D[] | null;
    quantization: GaussianQuantization | null;
    sh_deg: number;
    num_points: number;
    kernel_size: number | null;
    mip_splatting: boolean | null;
    background_color: [number, number, number] | null;
    up: Vector3f32 | null;
    center: Point3f32;
    aabb: Aabb;
    private _gaussiansParsed;
    static load(data: ArrayBuffer): GenericGaussianPointCloud;
    static new(gaussians: Gaussian[], sh_coefs: SHBlock16[], sh_deg: number, num_points: number, kernel_size: number | null, mip_splatting: boolean | null, background_color: [number, number, number] | null, covars: Covariance3D[] | null, quantization: GaussianQuantization | null): GenericGaussianPointCloud;
    static new_compressed(gaussians: GaussianCompressed[], sh_coefs_packed: Uint8Array, sh_deg: number, num_points: number, kernel_size: number | null, mip_splatting: boolean | null, background_color: [number, number, number] | null, covars: Covariance3D[] | null, quantization: GaussianQuantization | null): GenericGaussianPointCloud;
    private constructor();
    gaussians(): Gaussian[];
    gaussians_compressed(): GaussianCompressed[];
    sh_coefs_buffer(): Uint8Array;
    gaussian_buffer(): Uint8Array;
    compressed(): boolean;
}
export {};
//# sourceMappingURL=mod.d.ts.map