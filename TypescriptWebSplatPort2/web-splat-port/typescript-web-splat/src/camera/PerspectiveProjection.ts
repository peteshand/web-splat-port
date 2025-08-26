import { vec2 } from 'gl-matrix';
import { build_proj, fov2focal } from './helpers';
import { clog } from './internal';

export class PerspectiveProjection {
  fovx: number;
  fovy: number;
  znear: number;
  zfar: number;
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

  projection_matrix() { return this.projectionMatrix(); }
  projectionMatrix() {
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
