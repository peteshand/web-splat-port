// camera.ts
// 1:1 port of camera.rs to TS/gl-matrix with camelCase method aliases used by your renderer.

import { mat4, mat3, vec3, vec2, quat } from 'gl-matrix';
import type { Aabb } from './pointcloud';

// ---- logging helper ----
function clog(...args: any[]) {
  // Prefixed so you can filter easily in DevTools
  // (kept unconditional per your request for instrumentation)
  console.log('[camera]', ...args);
}

// ---- Constants ----
export const VIEWPORT_Y_FLIP: mat4 = mat4.fromValues(
  1,  0, 0, 0,
  0, -1, 0, 0,
  0,  0, 1, 0,
  0,  0, 0, 1
);

// ---- Helpers equivalent to Rust free functions ----
export function world2view(r: mat3, t: vec3): mat4 {
  const world = mat4.create();

  // embed rotation (columns)
  world[0] = r[0]; world[1] = r[1]; world[2]  = r[2];
  world[4] = r[3]; world[5] = r[4]; world[6]  = r[5];
  world[8] = r[6]; world[9] = r[7]; world[10] = r[8];

  // last column is [0,0,0,1]
  world[12] = 0; world[13] = 0; world[14] = 0; world[15] = 1;

  // ⬅ translation in the *bottom row*, like cgmath does before transpose
  world[3]  = t[0];
  world[7]  = t[1];
  world[11] = t[2];

  const view = mat4.create();
  mat4.invert(view, world);
  mat4.transpose(view, view); // inverse().transpose() — matches Rust
  return view;
}

export function build_proj(znear: number, zfar: number, fov_x: number, fov_y: number): mat4 {
  const tanHalfY = Math.tan(fov_y * 0.5);
  const tanHalfX = Math.tan(fov_x * 0.5);

  const top = tanHalfY * znear, bottom = -top;
  const right = tanHalfX * znear, left = -right;

  const m = mat4.create();
  m[0]  = (2 * znear) / (right - left);
  m[5]  = (2 * znear) / (top - bottom);
  m[8]  = (right + left) / (right - left);
  m[9]  = (top + bottom) / (top - bottom);
  m[10] = zfar / (zfar - znear);
  m[14] = -(zfar * znear) / (zfar - znear);
  m[11] = 1;
  m[15] = 0;
  return m;                // ← no transpose here
}

export function focal2fov(focal: number, pixels: number): number {
  const out = 2 * Math.atan(pixels / (2 * focal));
  clog('focal2fov()', { focal, pixels, out });
  return out;
}

export function fov2focal(fov: number, pixels: number): number {
  const out = pixels / (2 * Math.tan(fov * 0.5));
  clog('fov2focal()', { fov, pixels, out });
  return out;
}

// ---- Interfaces / Types ----
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
  // 1:1 aliases (Rust-style names), kept for parity:
  view_matrix?(): mat4;
  proj_matrix?(): mat4;

  // ❌ remove this — conflicts with the field on PerspectiveCamera
  // position?(): vec3;

  frustum_planes?(): FrustumPlanes;
}

// ---- PerspectiveProjection ----
export class PerspectiveProjection {
  fovx: number;   // radians
  fovy: number;   // radians
  znear: number;
  zfar: number;
  /** fov ratio to viewport ratio (fov2view_ratio) */
  fov2view_ratio: number;

  constructor(fovx: number, fovy: number, znear: number, zfar: number, fov2view_ratio = 1) {
    this.fovx = fovx;
    this.fovy = fovy;
    this.znear = znear;
    this.zfar = zfar;
    this.fov2view_ratio = fov2view_ratio;
    clog('PerspectiveProjection.ctor', { fovx, fovy, znear, zfar, fov2view_ratio });
  }

  static new(viewport: vec2, fov: vec2, znear: number, zfar: number): PerspectiveProjection {
    const vr = viewport[0] / viewport[1];
    const fr = fov[0] / fov[1];
    clog('PerspectiveProjection.new()', { viewport: Array.from(viewport), fov: Array.from(fov), znear, zfar, vr, fr });
    return new PerspectiveProjection(fov[0], fov[1], znear, zfar, vr / fr);
  }

  projection_matrix(): mat4 { return this.projectionMatrix(); }
  projectionMatrix(): mat4 {
    const m = build_proj(this.znear, this.zfar, this.fovx, this.fovy);
    clog('projectionMatrix()', { fovx: this.fovx, fovy: this.fovy, znear: this.znear, zfar: this.zfar });
    return m;
  }

  resize(width: number, height: number): void {
    const prev = { fovx: this.fovx, fovy: this.fovy };
    const ratio = width / height;
    if (width > height) {
      this.fovy = (this.fovx / ratio) * this.fov2view_ratio;
    } else {
      this.fovx = this.fovy * ratio * this.fov2view_ratio;
    }
    clog('PerspectiveProjection.resize()', { width, height, ratio, before: prev, after: { fovx: this.fovx, fovy: this.fovy }, fov2view_ratio: this.fov2view_ratio });
  }

  /** Focal lengths in pixels for a given viewport */
  focal(viewport: vec2): vec2 {
    const fx = fov2focal(this.fovx, viewport[0]);
    const fy = fov2focal(this.fovy, viewport[1]);
    const out = vec2.fromValues(fx, fy);
    clog('PerspectiveProjection.focal()', { viewport: Array.from(viewport), fx, fy });
    return out;
  }

  lerp(other: PerspectiveProjection, amount: number): PerspectiveProjection {
    const a = amount, b = 1 - amount;
    const out = new PerspectiveProjection(
      this.fovx * b + other.fovx * a,
      this.fovy * b + other.fovy * a,
      this.znear * b + other.znear * a,
      this.zfar * b + other.zfar * a,
      this.fov2view_ratio * b + other.fov2view_ratio * a
    );
    clog('PerspectiveProjection.lerp()', { amount, from: { fovx: this.fovx, fovy: this.fovy, znear: this.znear, zfar: this.zfar, r: this.fov2view_ratio }, to: { fovx: other.fovx, fovy: other.fovy, znear: other.znear, zfar: other.zfar, r: other.fov2view_ratio }, out: { fovx: out.fovx, fovy: out.fovy, znear: out.znear, zfar: out.zfar, r: out.fov2view_ratio } });
    return out;
  }
}

// ---- PerspectiveCamera ----
export class PerspectiveCamera implements Camera {
  position: vec3;            // Point3<f32>
  rotation: quat;            // Quaternion<f32>
  projection: PerspectiveProjection;

  constructor(position: vec3, rotation: quat, projection: PerspectiveProjection) {
    this.position = vec3.clone(position);
    this.rotation = quat.clone(rotation);
    this.projection = projection;
    clog('PerspectiveCamera.ctor', { position: Array.from(this.position), rotation: Array.from(this.rotation) });
  }

  static default(): PerspectiveCamera {
    clog('PerspectiveCamera.default()');
    return new PerspectiveCamera(
      vec3.fromValues(0, 0, -1),
      quat.create(),
      new PerspectiveProjection(
        (45 * Math.PI) / 180,
        (45 * Math.PI) / 180,
        0.1,
        100,
        1
      )
    );
  }

  fit_near_far(aabb: Aabb): void {
    const c = aabb.center();
    const r = aabb.radius();
    const d = Math.hypot(
      this.position[0] - c.x,
      this.position[1] - c.y,
      this.position[2] - c.z
    );
    const zfar = d + r;
    const znear = Math.max(d - r, zfar / 1000.0);
    this.projection.zfar = zfar;
    this.projection.znear = znear;
  }

  // ---- Camera trait methods (camelCase + 1:1 aliases) ----
  viewMatrix(): mat4 {
    const world = mat4.create();
    mat4.fromRotationTranslation(world, this.rotation, this.position);
    const view = mat4.create();
    mat4.invert(view, world);
    return view;
  }
  view_matrix(): mat4 { return this.viewMatrix(); }

  projMatrix(): mat4 {
    const m = this.projection.projectionMatrix();
    clog('PerspectiveCamera.projMatrix()');
    return m;
  }
  proj_matrix(): mat4 { return this.projMatrix(); }

  positionVec(): vec3 { return vec3.clone(this.position); }

  // ❌ remove this method; it collides with the field name
  // position(): vec3 { return this.positionVec(); }

  frustum_planes(): FrustumPlanes {
    const p = this.projMatrix();
    const v = this.viewMatrix();
    const pv = mat4.create();
    mat4.multiply(pv, p, v);

    // rows of pv (convert from column-major)
    const row = (r: number): [number, number, number, number] => [
      pv[0 + r], pv[4 + r], pv[8 + r], pv[12 + r]
    ];

    const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);

    const add = (a: number[], b: number[]) => ([
      a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]
    ] as [number, number, number, number]);
    const sub = (a: number[], b: number[]) => ([
      a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]
    ] as [number, number, number, number]);

    const normalize = (p: [number, number, number, number]) => {
      const n = Math.hypot(p[0], p[1], p[2]);
      return (n > 0) ? ([p[0] / n, p[1] / n, p[2] / n, p[3] / n] as [number, number, number, number]) : p;
    };

    const left   = normalize(add(r3, r0));
    const right  = normalize(sub(r3, r0));
    const bottom = normalize(add(r3, r1));
    const top    = normalize(sub(r3, r1));
    const near   = normalize(add(r3, r2));
    const far    = normalize(sub(r3, r2));

    clog('PerspectiveCamera.frustum_planes() computed');
    return { near, far, left, right, top, bottom };
  }

  // SPLIT interpolation (Slerp for rotation, linear for others)
  lerp(other: PerspectiveCamera, amount: number): PerspectiveCamera {
    const outPos = vec3.create();
    vec3.lerp(outPos, this.position, other.position, amount);
    const outRot = quat.create();
    quat.slerp(outRot, this.rotation, other.rotation, amount);
    const proj = this.projection.lerp(other.projection, amount);
    const out = new PerspectiveCamera(outPos, outRot, proj);
    clog('PerspectiveCamera.lerp()', { amount, fromPos: Array.from(this.position), toPos: Array.from(other.position) });
    return out;
  }
}
