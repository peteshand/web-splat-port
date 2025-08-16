/**
 * TypeScript port of pointcloud.rs
 * Point cloud data structures and GPU buffer management
 */
export interface Point3f16 {
    x: number;
    y: number;
    z: number;
}
export interface Point3f32 {
    x: number;
    y: number;
    z: number;
}
export interface Vector3f32 {
    x: number;
    y: number;
    z: number;
}
export interface Vector2f16 {
    x: number;
    y: number;
}
export interface Vector4f16 {
    x: number;
    y: number;
    z: number;
    w: number;
}
/**
 * Compressed Gaussian representation
 * #[repr(C)] equivalent
 */
export interface GaussianCompressed {
    xyz: Point3f16;
    opacity: number;
    scaleFactor: number;
    geometryIdx: number;
    shIdx: number;
}
export declare function createDefaultGaussianCompressed(): GaussianCompressed;
/**
 * Uncompressed Gaussian representation
 * #[repr(C)] equivalent
 */
export interface Gaussian {
    xyz: Point3f16;
    opacity: number;
    cov: [number, number, number, number, number, number];
}
export declare function createDefaultGaussian(): Gaussian;
/**
 * 3D Covariance matrix (upper triangular)
 * #[repr(C)] equivalent
 */
export interface Covariance3D {
    data: [number, number, number, number, number, number];
}
export declare function createDefaultCovariance3D(): Covariance3D;
/**
 * 2D Splat for rendering
 * #[repr(C)] equivalent
 */
export interface Splat {
    v: Vector4f16;
    pos: Vector2f16;
    color: Vector4f16;
}
/**
 * Quantization parameters
 * #[repr(C)] equivalent
 */
export interface Quantization {
    zeroPoint: number;
    scale: number;
    _pad: [number, number];
}
export declare function createDefaultQuantization(): Quantization;
export declare function createQuantization(zeroPoint: number, scale: number): Quantization;
/**
 * Gaussian quantization parameters
 * #[repr(C)] equivalent
 */
export interface GaussianQuantization {
    colorDc: Quantization;
    colorRest: Quantization;
    opacity: Quantization;
    scalingFactor: Quantization;
}
export declare function createDefaultGaussianQuantization(): GaussianQuantization;
/**
 * Axis-Aligned Bounding Box
 */
export interface Aabb<T extends number = number> {
    min: Point3f32;
    max: Point3f32;
}
export declare function createAabb(min: Point3f32, max: Point3f32): Aabb;
export declare function createUnitAabb(): Aabb;
export declare function growAabb(aabb: Aabb, pos: Point3f32): void;
export declare function getAabbCorners(aabb: Aabb): Point3f32[];
export declare function getAabbCenter(aabb: Aabb): Point3f32;
export declare function getAabbRadius(aabb: Aabb): number;
export declare function getAabbSize(aabb: Aabb): Vector3f32;
export declare function growAabbUnion(aabb: Aabb, other: Aabb): void;
export interface GenericGaussianPointCloud {
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
    gaussianBuffer(): Uint8Array;
    shCoefsBuffer(): Uint8Array;
    isCompressed(): boolean;
}
/**
 * Main PointCloud class for GPU rendering
 */
export declare class PointCloud {
    private splat2dBuffer;
    private bindGroup;
    private renderBindGroup;
    private numPointsValue;
    private shDegValue;
    private bboxValue;
    private compressedValue;
    private centerValue;
    private upValue?;
    private mipSplattingValue?;
    private kernelSizeValue?;
    private backgroundColorValue?;
    constructor(device: GPUDevice, pc: GenericGaussianPointCloud);
    compressed(): boolean;
    numPoints(): number;
    bbox(): Aabb;
    getBindGroup(): GPUBindGroup;
    getRenderBindGroup(): GPUBindGroup;
    mipSplatting(): boolean | undefined;
    dilationKernelSize(): number | undefined;
    center(): Point3f32;
    up(): Vector3f32 | undefined;
    private getSplatSize;
    static bindGroupLayoutCompressed(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayoutRender(device: GPUDevice): GPUBindGroupLayout;
}
//# sourceMappingURL=pointcloud.d.ts.map