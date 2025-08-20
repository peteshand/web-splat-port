import { mat4, mat3, vec3, vec2, quat } from 'gl-matrix';
import type { Aabb } from './pointcloud.js';
export declare const VIEWPORT_Y_FLIP: mat4;
export declare function world2view(r: mat3, t: vec3): mat4;
export declare function build_proj(znear: number, zfar: number, fov_x: number, fov_y: number): mat4;
export declare function focal2fov(focal: number, pixels: number): number;
export declare function fov2focal(fov: number, pixels: number): number;
export interface FrustumPlanes {
    near: [number, number, number, number];
    far: [number, number, number, number];
    left: [number, number, number, number];
    right: [number, number, number, number];
    top: [number, number, number, number];
    bottom: [number, number, number, number];
}
export interface Camera {
    viewMatrix(): mat4;
    projMatrix(): mat4;
    view_matrix?(): mat4;
    proj_matrix?(): mat4;
    frustum_planes?(): FrustumPlanes;
}
export declare class PerspectiveProjection {
    fovx: number;
    fovy: number;
    znear: number;
    zfar: number;
    /** fov ratio to viewport ratio (fov2view_ratio) */
    fov2view_ratio: number;
    constructor(fovx: number, fovy: number, znear: number, zfar: number, fov2view_ratio?: number);
    static new(viewport: vec2, fov: vec2, znear: number, zfar: number): PerspectiveProjection;
    projection_matrix(): mat4;
    projectionMatrix(): mat4;
    resize(width: number, height: number): void;
    /** Focal lengths in pixels for a given viewport */
    focal(viewport: vec2): vec2;
    lerp(other: PerspectiveProjection, amount: number): PerspectiveProjection;
}
export declare class PerspectiveCamera implements Camera {
    position: vec3;
    rotation: quat;
    projection: PerspectiveProjection;
    constructor(position: vec3, rotation: quat, projection: PerspectiveProjection);
    static default(): PerspectiveCamera;
    fit_near_far(aabb: Aabb): void;
    viewMatrix(): mat4;
    view_matrix(): mat4;
    projMatrix(): mat4;
    proj_matrix(): mat4;
    positionVec(): vec3;
    frustum_planes(): FrustumPlanes;
    lerp(other: PerspectiveCamera, amount: number): PerspectiveCamera;
}
//# sourceMappingURL=camera.d.ts.map