/**
 * TypeScript port of camera.rs
 * Camera system with perspective projection and view matrices
 */
import { mat3, mat4, quat, vec3 } from 'gl-matrix';
import { Aabb } from './pointcloud.js';
export interface Lerp<T> {
    lerp(other: T, amount: number): T;
}
export interface Point3f32 {
    x: number;
    y: number;
    z: number;
}
export interface Vector2f32 {
    x: number;
    y: number;
}
export interface Vector3f32 {
    x: number;
    y: number;
    z: number;
}
export interface Vector4f32 {
    x: number;
    y: number;
    z: number;
    w: number;
}
/**
 * Perspective projection parameters
 */
export declare class PerspectiveProjection implements Lerp<PerspectiveProjection> {
    fovx: number;
    fovy: number;
    znear: number;
    zfar: number;
    fov2viewRatio: number;
    constructor(fovx: number, fovy: number, znear: number, zfar: number, fov2viewRatio?: number);
    static new(viewport: Vector2f32, fov: Vector2f32, znear: number, zfar: number): PerspectiveProjection;
    projectionMatrix(): mat4;
    resize(width: number, height: number): void;
    focal(viewport: Vector2f32): Vector2f32;
    lerp(other: PerspectiveProjection, amount: number): PerspectiveProjection;
    hash(): number;
}
/**
 * Frustum planes for culling
 */
export interface FrustumPlanes {
    near: Vector4f32;
    far: Vector4f32;
    left: Vector4f32;
    right: Vector4f32;
    top: Vector4f32;
    bottom: Vector4f32;
}
/**
 * Camera trait interface
 */
export interface Camera {
    getPosition(): Point3f32;
    viewMatrix(): mat4;
    projMatrix(): mat4;
    frustumPlanes(): FrustumPlanes;
}
/**
 * Perspective camera implementation
 */
export declare class PerspectiveCamera implements Camera, Lerp<PerspectiveCamera> {
    position: Point3f32;
    rotation: quat;
    projection: PerspectiveProjection;
    constructor(position: Point3f32, rotation: quat, projection: PerspectiveProjection);
    static createDefault(): PerspectiveCamera;
    fitNearFar(aabb: Aabb): void;
    viewMatrix(): mat4;
    projMatrix(): mat4;
    getPosition(): Point3f32;
    frustumPlanes(): FrustumPlanes;
    lerp(other: PerspectiveCamera, amount: number): PerspectiveCamera;
    hash(): number;
}
export declare const VIEWPORT_Y_FLIP: mat4;
/**
 * Convert world space to view space
 */
export declare function world2view(r: mat3, t: vec3): mat4;
/**
 * Build projection matrix
 */
export declare function buildProj(znear: number, zfar: number, fovX: number, fovY: number): mat4;
/**
 * Convert focal length to field of view
 */
export declare function focal2fov(focal: number, pixels: number): number;
/**
 * Convert field of view to focal length
 */
export declare function fov2focal(fov: number, pixels: number): number;
//# sourceMappingURL=camera.d.ts.map