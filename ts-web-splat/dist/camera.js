// Mirrors camera.rs
import { mat4, quat, vec3 } from "gl-matrix";
export class PerspectiveProjection {
    fovx;
    fovy;
    znear;
    zfar;
    fov2view_ratio;
    constructor(fovx, fovy, znear, zfar, fov2view_ratio) {
        this.fovx = fovx;
        this.fovy = fovy;
        this.znear = znear;
        this.zfar = zfar;
        this.fov2view_ratio = fov2view_ratio;
    }
    projection_matrix() {
        // Build a perspective matrix using independent fovx/fovy.
        // gl-matrix expects fovy; we can compute from fovy directly and adjust for aspect.
        // Here we trust fovx/fovy are consistent and let gl-matrix handle standard perspective.
        // If fovx differs from implied aspect, the shader must accommodate; for now, use fovy + aspect.
        const aspect = Math.tan(this.fovx * 0.5) / Math.tan(this.fovy * 0.5);
        const out = mat4.create();
        mat4.perspective(out, this.fovy, aspect, Math.max(this.znear, 1e-4), Math.max(this.zfar, this.znear + 1e-3));
        return out;
    }
    resize(_width, _height) {
        // Keep vertical FOV fixed; recompute fovx from aspect
        const aspect = _width / Math.max(1, _height);
        const fx = fov2focal(this.fovy, 1); // focal in normalized units for fovy
        // compute fovx from aspect so that pixels scale with width
        const px = 1 * aspect;
        this.fovx = focal2fov(fx, px);
    }
    focal(_viewport) {
        const [vw, vh] = _viewport;
        return [fov2focal(this.fovx, vw), fov2focal(this.fovy, vh)];
    }
    lerp(_other, _amount) {
        const t = Math.min(1, Math.max(0, _amount));
        return new PerspectiveProjection(this.fovx * (1 - t) + _other.fovx * t, this.fovy * (1 - t) + _other.fovy * t, this.znear * (1 - t) + _other.znear * t, this.zfar * (1 - t) + _other.zfar * t, this.fov2view_ratio * (1 - t) + _other.fov2view_ratio * t);
    }
}
export class PerspectiveCamera {
    positionVec;
    rotationQuat;
    projection;
    constructor(positionVec, rotationQuat, projection) {
        this.positionVec = positionVec;
        this.rotationQuat = rotationQuat;
        this.projection = projection;
    }
    fit_near_far(_aabb) {
        // TODO
    }
    view_matrix() {
        // Model matrix from rotation and translation, then invert for view
        const r = quat.fromValues(this.rotationQuat[0], this.rotationQuat[1], this.rotationQuat[2], this.rotationQuat[3]);
        quat.normalize(r, r);
        const t = vec3.fromValues(this.positionVec[0], this.positionVec[1], this.positionVec[2]);
        const model = mat4.create();
        mat4.fromRotationTranslation(model, r, t);
        const view = mat4.create();
        mat4.invert(view, model);
        return view;
    }
    proj_matrix() {
        return this.projection.projection_matrix();
    }
    position() {
        return this.positionVec;
    }
}
export function focal2fov(focal, pixels) {
    return 2 * Math.atan(pixels / (2 * focal));
}
export function fov2focal(fov, pixels) {
    return pixels / (2 * Math.tan(fov * 0.5));
}
