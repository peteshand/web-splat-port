export type Vec3 = {
    x: number;
    y: number;
    z: number;
};
export type Color3 = [number, number, number];
export type Point3f32 = {
    x: number;
    y: number;
    z: number;
};
export type Vector3f32 = {
    x: number;
    y: number;
    z: number;
};
export type Gaussian = {
    xyz: Point3f32;
    opacity: number;
    cov: [number, number, number, number, number, number];
};
export type GaussianCompressed = {
    xyz: Point3f32;
    opacity: number;
    scale_factor: number;
    geometry_idx: number;
    sh_idx: number;
};
export type Covariance3D = {
    v: [number, number, number, number, number, number];
};
export declare class Quantization {
    zero_point: number;
    scale: number;
    _pad: [number, number];
    constructor(zero_point?: number, scale?: number);
    static new(zero_point: number, scale: number): Quantization;
}
export declare class GaussianQuantization {
    color_dc: Quantization;
    color_rest: Quantization;
    opacity: Quantization;
    scaling_factor: Quantization;
    constructor(color_dc?: Quantization, color_rest?: Quantization, opacity?: Quantization, scaling_factor?: Quantization);
}
export declare class Aabb {
    min: Vec3;
    max: Vec3;
    constructor(min: Vec3, max: Vec3);
    static unit(): Aabb;
    static zeroed(): Aabb;
    center(): Vec3;
    radius(): number;
    size(): Vec3;
    grow(pos: Vec3): void;
    grow_union(other: Aabb): void;
}
export declare const BYTES_PER_SPLAT = 20;
export interface GenericGaussianPointCloud {
    num_points: number;
    sh_deg: number;
    compressed(): boolean;
    gaussian_buffer(): ArrayBuffer;
    sh_coefs_buffer(): ArrayBuffer;
    covars?: ArrayBuffer;
    quantization?: ArrayBufferView;
    aabb: {
        min: Vec3;
        max: Vec3;
    };
    center: Vec3;
    up?: Vec3;
    mip_splatting?: boolean;
    kernel_size?: number;
    background_color?: Color3;
}
export declare class PointCloud {
    private splat_2d_buffer;
    private _bind_group;
    private _render_bind_group;
    private num_points;
    private sh_deg;
    private bbox_;
    private compressed_;
    private center_;
    private up_?;
    private mip_splatting_?;
    private kernel_size_?;
    private background_color_?;
    private vertex_buffer;
    private sh_buffer;
    private covars_buffer?;
    private quantization_uniform?;
    static new(device: GPUDevice, pc: GenericGaussianPointCloud): PointCloud;
    private constructor();
    compressed(): boolean;
    numPoints(): number;
    shDeg(): number;
    bbox(): Aabb;
    bind_group(): GPUBindGroup;
    render_bind_group(): GPUBindGroup;
    getBindGroup(): GPUBindGroup;
    getRenderBindGroup(): GPUBindGroup;
    mipSplatting(): boolean | undefined;
    dilationKernelSize(): number | undefined;
    center(): Vec3;
    up(): Vec3 | undefined;
    static bind_group_layout_compressed(device: GPUDevice): GPUBindGroupLayout;
    static bind_group_layout(device: GPUDevice): GPUBindGroupLayout;
    static bind_group_layout_render(device: GPUDevice): GPUBindGroupLayout;
}
//# sourceMappingURL=pointcloud.d.ts.map