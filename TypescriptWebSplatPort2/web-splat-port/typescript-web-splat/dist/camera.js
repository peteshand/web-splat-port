// camera.ts
// 1:1 port of camera.rs to TS/gl-matrix with camelCase method aliases used by your renderer.
import { mat4, vec3, vec2, quat } from 'gl-matrix';
// ---- Constants ----
export const VIEWPORT_Y_FLIP = mat4.fromValues(1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
// ---- Helpers equivalent to Rust free functions ----
export function world2view(r, t) {
    // World matrix from rotation+translation, then invert (cgmath code does inverse().transpose()).
    // gl-matrix uses column-major, so an inverse is the right equivalent here.
    const world = mat4.create();
    // embed r (mat3) into mat4
    world[0] = r[0];
    world[1] = r[1];
    world[2] = r[2];
    world[4] = r[3];
    world[5] = r[4];
    world[6] = r[5];
    world[8] = r[6];
    world[9] = r[7];
    world[10] = r[8];
    world[12] = t[0];
    world[13] = t[1];
    world[14] = t[2];
    world[15] = 1;
    const view = mat4.create();
    mat4.invert(view, world);
    return view;
}
export function build_proj(znear, zfar, fov_x, fov_y) {
    // Mirrors camera.rs build_proj(), taking its final transpose into account for column-major.
    const tanHalfY = Math.tan(fov_y * 0.5);
    const tanHalfX = Math.tan(fov_x * 0.5);
    const top = tanHalfY * znear;
    const bottom = -top;
    const right = tanHalfX * znear;
    const left = -right;
    const m = mat4.create();
    // After transpose in Rust, the resulting column-major layout is:
    m[0] = (2 * znear) / (right - left); // m00
    m[5] = (2 * znear) / (top - bottom); // m11
    m[8] = (right + left) / (right - left); // m20
    m[9] = (top + bottom) / (top - bottom); // m21
    m[10] = zfar / (zfar - znear); // m22
    m[11] = -(zfar * znear) / (zfar - znear); // m23
    m[14] = 1; // m32
    m[15] = 0; // m33
    return m;
}
export function focal2fov(focal, pixels) {
    return 2 * Math.atan(pixels / (2 * focal));
}
export function fov2focal(fov, pixels) {
    return pixels / (2 * Math.tan(fov * 0.5));
}
// ---- PerspectiveProjection ----
export class PerspectiveProjection {
    fovx; // radians
    fovy; // radians
    znear;
    zfar;
    /** fov ratio to viewport ratio (fov2view_ratio) */
    fov2view_ratio;
    constructor(fovx, fovy, znear, zfar, fov2view_ratio = 1) {
        this.fovx = fovx;
        this.fovy = fovy;
        this.znear = znear;
        this.zfar = zfar;
        this.fov2view_ratio = fov2view_ratio;
    }
    static new(viewport, fov, znear, zfar) {
        const vr = viewport[0] / viewport[1];
        const fr = fov[0] / fov[1];
        return new PerspectiveProjection(fov[0], fov[1], znear, zfar, vr / fr);
    }
    projection_matrix() { return this.projectionMatrix(); }
    projectionMatrix() { return build_proj(this.znear, this.zfar, this.fovx, this.fovy); }
    resize(width, height) {
        const ratio = width / height;
        if (width > height) {
            this.fovy = (this.fovx / ratio) * this.fov2view_ratio;
        }
        else {
            this.fovx = this.fovy * ratio * this.fov2view_ratio;
        }
    }
    /** Focal lengths in pixels for a given viewport */
    focal(viewport) {
        return vec2.fromValues(fov2focal(this.fovx, viewport[0]), fov2focal(this.fovy, viewport[1]));
    }
    lerp(other, amount) {
        const a = amount, b = 1 - amount;
        return new PerspectiveProjection(this.fovx * b + other.fovx * a, this.fovy * b + other.fovy * a, this.znear * b + other.znear * a, this.zfar * b + other.zfar * a, this.fov2view_ratio * b + other.fov2view_ratio * a);
    }
}
// ---- PerspectiveCamera ----
export class PerspectiveCamera {
    position; // Point3<f32>
    rotation; // Quaternion<f32>
    projection;
    constructor(position, rotation, projection) {
        this.position = vec3.clone(position);
        this.rotation = quat.clone(rotation);
        this.projection = projection;
    }
    static default() {
        return new PerspectiveCamera(vec3.fromValues(0, 0, -1), quat.fromValues(1, 0, 0, 0), new PerspectiveProjection((45 * Math.PI) / 180, (45 * Math.PI) / 180, 0.1, 100, 1));
    }
    fit_near_far(aabb) {
        const c = aabb.center();
        const r = aabb.radius();
        const d = Math.hypot(this.position[0] - c.x, this.position[1] - c.y, this.position[2] - c.z);
        const zfar = d + r;
        const znear = Math.max(d - r, zfar / 1000.0);
        this.projection.zfar = zfar;
        this.projection.znear = znear;
    }
    // ---- Camera trait methods (camelCase + 1:1 aliases) ----
    viewMatrix() {
        const w = mat4.create();
        mat4.fromRotationTranslation(w, this.rotation, this.position);
        const v = mat4.create();
        mat4.invert(v, w);
        return v;
    }
    view_matrix() { return this.viewMatrix(); }
    projMatrix() { return this.projection.projectionMatrix(); }
    proj_matrix() { return this.projMatrix(); }
    positionVec() { return vec3.clone(this.position); }
    // ❌ remove this method; it collides with the field name
    // position(): vec3 { return this.positionVec(); }
    frustum_planes() {
        const p = this.projMatrix();
        const v = this.viewMatrix();
        const pv = mat4.create();
        mat4.multiply(pv, p, v);
        // rows of pv (convert from column-major)
        const row = (r) => [
            pv[0 + r], pv[4 + r], pv[8 + r], pv[12 + r]
        ];
        const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
        const add = (a, b) => [
            a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]
        ];
        const sub = (a, b) => [
            a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]
        ];
        const normalize = (p) => {
            const n = Math.hypot(p[0], p[1], p[2]);
            return (n > 0) ? [p[0] / n, p[1] / n, p[2] / n, p[3] / n] : p;
        };
        const left = normalize(add(r3, r0));
        const right = normalize(sub(r3, r0));
        const bottom = normalize(add(r3, r1));
        const top = normalize(sub(r3, r1));
        const near = normalize(add(r3, r2));
        const far = normalize(sub(r3, r2));
        return { near, far, left, right, top, bottom };
    }
    // SPLIT interpolation (Slerp for rotation, linear for others)
    lerp(other, amount) {
        const outPos = vec3.create();
        vec3.lerp(outPos, this.position, other.position, amount);
        const outRot = quat.create();
        quat.slerp(outRot, this.rotation, other.rotation, amount);
        const proj = this.projection.lerp(other.projection, amount);
        return new PerspectiveCamera(outPos, outRot, proj);
    }
}
//# sourceMappingURL=camera.js.map