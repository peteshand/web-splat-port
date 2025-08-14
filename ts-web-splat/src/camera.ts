// Mirrors camera.rs
import { mat4, quat, vec3 } from "gl-matrix";
export interface FrustumPlanes {
  near: Float32Array; // vec4
  far: Float32Array;
  left: Float32Array;
  right: Float32Array;
  top: Float32Array;
  bottom: Float32Array;
}

export interface Camera {
  view_matrix(): Float32Array; // 4x4
  proj_matrix(): Float32Array; // 4x4
  position?(): [number, number, number];
}

export class PerspectiveProjection {
  constructor(
    public fovx: number,
    public fovy: number,
    public znear: number,
    public zfar: number,
    public fov2view_ratio: number
  ) {}

  projection_matrix(): Float32Array {
    // Build a perspective matrix using independent fovx/fovy.
    // gl-matrix expects fovy; we can compute from fovy directly and adjust for aspect.
    // Here we trust fovx/fovy are consistent and let gl-matrix handle standard perspective.
    // If fovx differs from implied aspect, the shader must accommodate; for now, use fovy + aspect.
    const aspect = Math.tan(this.fovx * 0.5) / Math.tan(this.fovy * 0.5);
    const out = mat4.create();
    mat4.perspective(out, this.fovy, aspect, Math.max(this.znear, 1e-4), Math.max(this.zfar, this.znear + 1e-3));
    return out as Float32Array;
  }

  resize(_width: number, _height: number): void {
    // Keep vertical FOV fixed; recompute fovx from aspect
    const aspect = _width / Math.max(1, _height);
    const fx = fov2focal(this.fovy, 1); // focal in normalized units for fovy
    // compute fovx from aspect so that pixels scale with width
    const px = 1 * aspect;
    this.fovx = focal2fov(fx, px);
  }

  focal(_viewport: [number, number]): [number, number] {
    const [vw, vh] = _viewport;
    return [fov2focal(this.fovx, vw), fov2focal(this.fovy, vh)];
  }

  lerp(_other: PerspectiveProjection, _amount: number): PerspectiveProjection {
    const t = Math.min(1, Math.max(0, _amount));
    return new PerspectiveProjection(
      this.fovx * (1 - t) + _other.fovx * t,
      this.fovy * (1 - t) + _other.fovy * t,
      this.znear * (1 - t) + _other.znear * t,
      this.zfar * (1 - t) + _other.zfar * t,
      this.fov2view_ratio * (1 - t) + _other.fov2view_ratio * t
    );
  }
}

export class PerspectiveCamera implements Camera {
  constructor(
    public positionVec: [number, number, number],
    public rotationQuat: [number, number, number, number],
    public projection: PerspectiveProjection
  ) {}

  fit_near_far(_aabb: unknown): void {
    // TODO
  }

  view_matrix(): Float32Array {
    // Model matrix from rotation and translation, then invert for view
    const r = quat.fromValues(
      this.rotationQuat[0],
      this.rotationQuat[1],
      this.rotationQuat[2],
      this.rotationQuat[3]
    );
    quat.normalize(r, r);
    const t = vec3.fromValues(this.positionVec[0], this.positionVec[1], this.positionVec[2]);

    const model = mat4.create();
    mat4.fromRotationTranslation(model, r, t);
    const view = mat4.create();
    mat4.invert(view, model);
    return view as Float32Array;
  }

  proj_matrix(): Float32Array {
    return this.projection.projection_matrix();
  }

  position(): [number, number, number] {
    return this.positionVec;
  }
}

export function focal2fov(focal: number, pixels: number): number {
  return 2 * Math.atan(pixels / (2 * focal));
}
export function fov2focal(fov: number, pixels: number): number {
  return pixels / (2 * Math.tan(fov * 0.5));
}
