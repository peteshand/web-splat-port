/**
 * TypeScript port of camera.rs
 * Camera system with perspective projection and view matrices
 */

import { mat3, mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import { Aabb, getAabbCenter, getAabbRadius } from './pointcloud.js';

// Forward declaration for Lerp trait (will be defined in animation.ts)
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
export class PerspectiveProjection implements Lerp<PerspectiveProjection> {
    public fovx: number; // Radians
    public fovy: number; // Radians
    public znear: number;
    public zfar: number;
    public fov2viewRatio: number; // fov ratio to viewport ratio

    constructor(
        fovx: number,
        fovy: number,
        znear: number,
        zfar: number,
        fov2viewRatio: number = 1.0
    ) {
        this.fovx = fovx;
        this.fovy = fovy;
        this.znear = znear;
        this.zfar = zfar;
        this.fov2viewRatio = fov2viewRatio;
    }

    static new(
        viewport: Vector2f32,
        fov: Vector2f32,
        znear: number,
        zfar: number
    ): PerspectiveProjection {
        const vr = viewport.x / viewport.y;
        const fr = fov.x / fov.y;
        return new PerspectiveProjection(
            fov.x,
            fov.y,
            znear,
            zfar,
            vr / fr
        );
    }

    projectionMatrix(): mat4 {
        return buildProj(this.znear, this.zfar, this.fovx, this.fovy);
    }

    resize(width: number, height: number): void {
        const ratio = width / height;
        if (width > height) {
            this.fovy = this.fovx / ratio * this.fov2viewRatio;
        } else {
            this.fovx = this.fovy * ratio * this.fov2viewRatio;
        }
    }

    focal(viewport: Vector2f32): Vector2f32 {
        return {
            x: fov2focal(this.fovx, viewport.x),
            y: fov2focal(this.fovy, viewport.y)
        };
    }

    lerp(other: PerspectiveProjection, amount: number): PerspectiveProjection {
        return new PerspectiveProjection(
            this.fovx * (1 - amount) + other.fovx * amount,
            this.fovy * (1 - amount) + other.fovy * amount,
            this.znear * (1 - amount) + other.znear * amount,
            this.zfar * (1 - amount) + other.zfar * amount,
            this.fov2viewRatio * (1 - amount) + other.fov2viewRatio * amount
        );
    }

    hash(): number {
        // Simple hash implementation
        let hash = 0;
        const values = [this.fovx, this.fovy, this.znear, this.zfar, this.fov2viewRatio];
        for (const value of values) {
            const bits = new Float32Array([value])[0];
            hash = ((hash << 5) - hash) + bits;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }
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
export class PerspectiveCamera implements Camera, Lerp<PerspectiveCamera> {
    public position: Point3f32;
    public rotation: quat;
    public projection: PerspectiveProjection;

    constructor(
        position: Point3f32,
        rotation: quat,
        projection: PerspectiveProjection
    ) {
        this.position = position;
        this.rotation = quat.clone(rotation);
        this.projection = projection;
    }

    static createDefault(): PerspectiveCamera {
        return new PerspectiveCamera(
            { x: 0, y: 0, z: -1 },
            quat.fromValues(0, 0, 0, 1), // Identity quaternion
            new PerspectiveProjection(
                Math.PI / 4, // 45 degrees in radians
                Math.PI / 4,
                0.1,
                100.0,
                1.0
            )
        );
    }

    fitNearFar(aabb: Aabb): void {
        // Set camera near and far plane
        const center = getAabbCenter(aabb);
        const radius = getAabbRadius(aabb);
        const distance = vec3.distance(
            [this.position.x, this.position.y, this.position.z],
            [center.x, center.y, center.z]
        );
        const zfar = distance + radius;
        const znear = Math.max(distance - radius, zfar / 1000);
        this.projection.zfar = zfar;
        this.projection.znear = znear;
    }

    viewMatrix(): mat4 {
        const rotation = mat3.create();
        mat3.fromQuat(rotation, this.rotation);
        const translation = vec3.fromValues(this.position.x, this.position.y, this.position.z);
        return world2view(rotation, translation);
    }

    projMatrix(): mat4 {
        return this.projection.projectionMatrix();
    }

    getPosition(): Point3f32 {
        return this.position;
    }

    frustumPlanes(): FrustumPlanes {
        const p = this.projMatrix();
        const v = this.viewMatrix();
        const pv = mat4.create();
        mat4.multiply(pv, p, v);

        const planes: vec4[] = new Array(6);
        for (let i = 0; i < 6; i++) {
            planes[i] = vec4.create();
        }

        // Extract frustum planes from projection-view matrix
        // Left plane
        vec4.set(planes[0], pv[3] + pv[0], pv[7] + pv[4], pv[11] + pv[8], pv[15] + pv[12]);
        // Right plane  
        vec4.set(planes[1], pv[3] - pv[0], pv[7] - pv[4], pv[11] - pv[8], pv[15] - pv[12]);
        // Bottom plane
        vec4.set(planes[2], pv[3] + pv[1], pv[7] + pv[5], pv[11] + pv[9], pv[15] + pv[13]);
        // Top plane
        vec4.set(planes[3], pv[3] - pv[1], pv[7] - pv[5], pv[11] - pv[9], pv[15] - pv[13]);
        // Near plane
        vec4.set(planes[4], pv[3] + pv[2], pv[7] + pv[6], pv[11] + pv[10], pv[15] + pv[14]);
        // Far plane
        vec4.set(planes[5], pv[3] - pv[2], pv[7] - pv[6], pv[11] - pv[10], pv[15] - pv[14]);

        // Normalize planes
        for (let i = 0; i < 6; i++) {
            vec4.normalize(planes[i], planes[i]);
        }

        return {
            near: { x: planes[4][0], y: planes[4][1], z: planes[4][2], w: planes[4][3] },
            far: { x: planes[5][0], y: planes[5][1], z: planes[5][2], w: planes[5][3] },
            left: { x: planes[0][0], y: planes[0][1], z: planes[0][2], w: planes[0][3] },
            right: { x: planes[1][0], y: planes[1][1], z: planes[1][2], w: planes[1][3] },
            top: { x: planes[3][0], y: planes[3][1], z: planes[3][2], w: planes[3][3] },
            bottom: { x: planes[2][0], y: planes[2][1], z: planes[2][2], w: planes[2][3] }
        };
    }

    lerp(other: PerspectiveCamera, amount: number): PerspectiveCamera {
        // Using SLERP interpolation for quaternions
        const newRotation = quat.create();
        quat.slerp(newRotation, this.rotation, other.rotation, amount);

        const newPosition: Point3f32 = {
            x: this.position.x * (1 - amount) + other.position.x * amount,
            y: this.position.y * (1 - amount) + other.position.y * amount,
            z: this.position.z * (1 - amount) + other.position.z * amount
        };

        const newProjection = this.projection.lerp(other.projection, amount);

        return new PerspectiveCamera(newPosition, newRotation, newProjection);
    }

    hash(): number {
        const viewMatrix = this.viewMatrix();
        const projMatrix = this.projMatrix();
        
        let hash = 0;
        // Hash view matrix
        for (let i = 0; i < 16; i++) {
            const bits = new Float32Array([viewMatrix[i]])[0];
            hash = ((hash << 5) - hash) + bits;
            hash = hash & hash;
        }
        // Hash projection matrix
        for (let i = 0; i < 16; i++) {
            const bits = new Float32Array([projMatrix[i]])[0];
            hash = ((hash << 5) - hash) + bits;
            hash = hash & hash;
        }
        return hash;
    }
}

// Viewport Y-flip matrix constant
export const VIEWPORT_Y_FLIP: mat4 = mat4.fromValues(
    1.0, 0.0, 0.0, 0.0,
    0.0, -1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
);

/**
 * Convert world space to view space
 */
export function world2view(r: mat3, t: vec3): mat4 {
    const rt = mat4.create();
    
    // Set rotation part
    rt[0] = r[0]; rt[1] = r[1]; rt[2] = r[2]; rt[3] = 0;
    rt[4] = r[3]; rt[5] = r[4]; rt[6] = r[5]; rt[7] = 0;
    rt[8] = r[6]; rt[9] = r[7]; rt[10] = r[8]; rt[11] = 0;
    
    // Set translation part
    rt[12] = t[0]; rt[13] = t[1]; rt[14] = t[2]; rt[15] = 1;
    
    // Invert and transpose
    const inverted = mat4.create();
    mat4.invert(inverted, rt);
    mat4.transpose(inverted, inverted);
    
    return inverted;
}

/**
 * Build projection matrix
 */
export function buildProj(znear: number, zfar: number, fovX: number, fovY: number): mat4 {
    const tanHalfFovY = Math.tan(fovY / 2);
    const tanHalfFovX = Math.tan(fovX / 2);

    const top = tanHalfFovY * znear;
    const bottom = -top;
    const right = tanHalfFovX * znear;
    const left = -right;

    const p = mat4.create();
    p[0] = 2.0 * znear / (right - left);
    p[5] = 2.0 * znear / (top - bottom);
    p[8] = (right + left) / (right - left);
    p[9] = (top + bottom) / (top - bottom);
    p[10] = zfar / (zfar - znear);
    p[11] = -(zfar * znear) / (zfar - znear);
    p[14] = 1.0;
    p[15] = 0.0;

    // Transpose the matrix
    mat4.transpose(p, p);
    return p;
}

/**
 * Convert focal length to field of view
 */
export function focal2fov(focal: number, pixels: number): number {
    return 2 * Math.atan(pixels / (2 * focal));
}

/**
 * Convert field of view to focal length
 */
export function fov2focal(fov: number, pixels: number): number {
    return pixels / (2 * Math.tan(fov * 0.5));
}
