/**
 * TypeScript port of io/mod.rs
 * Point cloud I/O system for loading Gaussian splat data
 */
import { Aabb, Covariance3D, Gaussian, GaussianCompressed, GaussianQuantization, Point3f32, Vector3f32 } from '../pointcloud.js';
/**
 * Point cloud reader interface
 */
export interface PointCloudReader {
    read(): GenericGaussianPointCloud;
}
/**
 * Generic Gaussian point cloud data structure
 */
export declare class GenericGaussianPointCloud {
    gaussians: Uint8Array;
    shCoefs: Uint8Array;
    compressed: boolean;
    covars?: Covariance3D[];
    quantization?: GaussianQuantization;
    shDeg: number;
    numPoints: number;
    kernelSize?: number;
    mipSplatting?: boolean;
    backgroundColor?: [number, number, number];
    up?: Vector3f32;
    center: Point3f32;
    aabb: Aabb;
    constructor(gaussians: Uint8Array, shCoefs: Uint8Array, compressed: boolean, shDeg: number, numPoints: number, center: Point3f32, aabb: Aabb, options?: {
        covars?: Covariance3D[];
        quantization?: GaussianQuantization;
        kernelSize?: number;
        mipSplatting?: boolean;
        backgroundColor?: [number, number, number];
        up?: Vector3f32;
    });
    /**
     * Load point cloud from file data
     */
    static load(fileData: ArrayBuffer): Promise<GenericGaussianPointCloud>;
    private static arrayStartsWith;
    /**
     * Create from uncompressed Gaussian data
     */
    static fromGaussians(gaussians: Gaussian[], shCoefs: number[][][], // [point][coef][rgb]
    shDeg: number, options?: {
        kernelSize?: number;
        mipSplatting?: boolean;
        backgroundColor?: [number, number, number];
        covars?: Covariance3D[];
        quantization?: GaussianQuantization;
    }): GenericGaussianPointCloud;
    /**
     * Create from compressed Gaussian data
     */
    static fromCompressedGaussians(gaussians: GaussianCompressed[], shCoefs: Uint8Array, shDeg: number, options?: {
        kernelSize?: number;
        mipSplatting?: boolean;
        backgroundColor?: [number, number, number];
        covars?: Covariance3D[];
        quantization?: GaussianQuantization;
    }): GenericGaussianPointCloud;
    /**
     * Get uncompressed Gaussians
     */
    getGaussians(): Gaussian[];
    /**
     * Get compressed Gaussians
     */
    getGaussiansCompressed(): GaussianCompressed[];
    /**
     * Get SH coefficients buffer
     */
    shCoefsBuffer(): Uint8Array;
    /**
     * Get Gaussian buffer
     */
    gaussianBuffer(): Uint8Array;
    /**
     * Check if compressed
     */
    isCompressed(): boolean;
}
//# sourceMappingURL=mod.d.ts.map