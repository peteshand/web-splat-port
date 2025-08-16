// Mirrors camera.rs
import { mat4, quat, vec3 } from "gl-matrix";

// Y-flip matrix to match Rust VIEWPORT_Y_FLIP
const VIEWPORT_Y_FLIP = mat4.fromValues(
  1.0, 0.0, 0.0, 0.0,
  0.0, -1.0, 0.0, 0.0,
  0.0, 0.0, 1.0, 0.0,
  0.0, 0.0, 0.0, 1.0
);

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
    // Build perspective with gl-matrix (GL clip z: -1..1), then remap to WebGPU (z: 0..1)
    const aspect = Math.tan(this.fovx * 0.5) / Math.tan(this.fovy * 0.5);
    const projGL = mat4.create();
    mat4.perspective(projGL, this.fovy, aspect, Math.max(this.znear, 1e-4), Math.max(this.zfar, this.znear + 1e-3));
    
    // Apply Y-flip and Z remap for WebGPU
    const VIEWPORT_Y_FLIP = mat4.fromValues(
      1, 0, 0, 0,
      0, -1, 0, 0,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1
    );
    const projWG = mat4.create();
    mat4.multiply(projWG, VIEWPORT_Y_FLIP, projGL);
    return projWG as Float32Array;
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

  fit_near_far(_aabb: { min: [number, number, number]; max: [number, number, number] } | undefined): void {
    if (!_aabb) return;
    // Transform AABB corners to camera space using view matrix and derive z extents
    const view = this.view_matrix();
    const corners: [number, number, number][] = [];
    const { min, max } = _aabb;
    for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) corners.push([x, y, z]);
    let zmin = Number.POSITIVE_INFINITY;
    let zmax = Number.NEGATIVE_INFINITY;
    for (const c of corners) {
      const x = c[0], y = c[1], z = c[2];
      const vx = view[0]*x + view[4]*y + view[8]*z + view[12];
      const vy = view[1]*x + view[5]*y + view[9]*z + view[13];
      const vz = view[2]*x + view[6]*y + view[10]*z + view[14];
      // Camera looks down -Z in view space; depths are positive if -vz
      const depth = -vz;
      zmin = Math.min(zmin, depth);
      zmax = Math.max(zmax, depth);
    }
    const padNear = 0.05 * (zmax - zmin + 1e-6);
    const padFar = 0.2 * (zmax - zmin + 1e-6);
    const near = Math.max(1e-3, zmin - padNear);
    const far = Math.max(near + 1e-2, zmax + padFar);
    this.projection.znear = near;
    this.projection.zfar = far;
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
    const proj = this.projection.projection_matrix();
    const flipped = mat4.create();
    mat4.multiply(flipped, VIEWPORT_Y_FLIP, proj as unknown as mat4);
    return flipped as Float32Array;
  }

  position(): [number, number, number] {
    return this.positionVec;
  }

  // Lerp implementation - matches Rust SLERP interpolation
  lerp(other: PerspectiveCamera, amount: number): PerspectiveCamera {
    const t = Math.min(1, Math.max(0, amount));
    
    // Interpolate position
    const newPos: [number, number, number] = [
      this.positionVec[0] * (1 - t) + other.positionVec[0] * t,
      this.positionVec[1] * (1 - t) + other.positionVec[1] * t,
      this.positionVec[2] * (1 - t) + other.positionVec[2] * t
    ];

    // SLERP rotation quaternions
    const q1 = quat.fromValues(this.rotationQuat[0], this.rotationQuat[1], this.rotationQuat[2], this.rotationQuat[3]);
    const q2 = quat.fromValues(other.rotationQuat[0], other.rotationQuat[1], other.rotationQuat[2], other.rotationQuat[3]);
    const newRot = quat.create();
    quat.slerp(newRot, q1, q2, t);
    const newRotQuat: [number, number, number, number] = [newRot[0], newRot[1], newRot[2], newRot[3]];

    // Interpolate projection
    const newProjection = this.projection.lerp(other.projection, t);

    return new PerspectiveCamera(newPos, newRotQuat, newProjection);
  }

  // Frustum planes calculation - matches Rust Camera trait
  frustumPlanes(): FrustumPlanes {
    const p = this.proj_matrix();
    const v = this.view_matrix();
    const pv = mat4.create();
    mat4.multiply(pv, p as unknown as mat4, v as unknown as mat4);
    
    const planes: Float32Array[] = [];
    for (let i = 0; i < 6; i++) {
      planes.push(new Float32Array(4));
    }
    
    // Extract frustum planes from combined projection-view matrix
    // Left plane: pv.row(3) + pv.row(0)
    planes[0][0] = pv[12] + pv[0]; planes[0][1] = pv[13] + pv[1]; planes[0][2] = pv[14] + pv[2]; planes[0][3] = pv[15] + pv[3];
    // Right plane: pv.row(3) - pv.row(0)  
    planes[1][0] = pv[12] - pv[0]; planes[1][1] = pv[13] - pv[1]; planes[1][2] = pv[14] - pv[2]; planes[1][3] = pv[15] - pv[3];
    // Bottom plane: pv.row(3) + pv.row(1)
    planes[2][0] = pv[12] + pv[4]; planes[2][1] = pv[13] + pv[5]; planes[2][2] = pv[14] + pv[6]; planes[2][3] = pv[15] + pv[7];
    // Top plane: pv.row(3) - pv.row(1)
    planes[3][0] = pv[12] - pv[4]; planes[3][1] = pv[13] - pv[5]; planes[3][2] = pv[14] - pv[6]; planes[3][3] = pv[15] - pv[7];
    // Near plane: pv.row(3) + pv.row(2)
    planes[4][0] = pv[12] + pv[8]; planes[4][1] = pv[13] + pv[9]; planes[4][2] = pv[14] + pv[10]; planes[4][3] = pv[15] + pv[11];
    // Far plane: pv.row(3) - pv.row(2)
    planes[5][0] = pv[12] - pv[8]; planes[5][1] = pv[13] - pv[9]; planes[5][2] = pv[14] - pv[10]; planes[5][3] = pv[15] - pv[11];
    
    // Normalize planes
    for (let i = 0; i < 6; i++) {
      const len = Math.sqrt(planes[i][0] * planes[i][0] + planes[i][1] * planes[i][1] + planes[i][2] * planes[i][2]);
      if (len > 0) {
        planes[i][0] /= len; planes[i][1] /= len; planes[i][2] /= len; planes[i][3] /= len;
      }
    }
    
    return {
      near: planes[4],
      far: planes[5], 
      left: planes[0],
      right: planes[1],
      top: planes[3],
      bottom: planes[2]
    };
  }
}

export function focal2fov(focal: number, pixels: number): number {
  return 2 * Math.atan(pixels / (2 * focal));
}
export function fov2focal(fov: number, pixels: number): number {
  return pixels / (2 * Math.tan(fov * 0.5));
}
