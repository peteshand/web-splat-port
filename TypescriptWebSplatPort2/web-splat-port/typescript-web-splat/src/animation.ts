// animation.ts
import { quat, vec3 } from 'gl-matrix';
import { PerspectiveCamera, PerspectiveProjection } from './camera';

/** 1:1 with the Rust trait */
export interface Lerp<T = any> {
  lerp(other: T, amount: number): T;
}

/** 1:1 with the Rust trait */
export interface Sampler<T> {
  sample(v: number): T;
}

/** 1:1 with the Rust struct */
export class Transition<T extends Lerp<T>> implements Sampler<T> {
  private from: T;
  private to: T;
  private interp_fn: (x: number) => number;

  constructor(from: T, to: T, interp_fn: (x: number) => number) {
    this.from = from;
    this.to = to;
    this.interp_fn = interp_fn;
  }

  static new<T extends Lerp<T>>(from: T, to: T, interp_fn: (x: number) => number) {
    return new Transition(from, to, interp_fn);
  }

  sample(v: number): T {
    return this.from.lerp(this.to, this.interp_fn(v));
  }
}

/** Minimal internal key structure to mirror splines::Key */
type Key<T> = { t: number; v: T };

/** 1:1 with the Rust struct; Catmull–Rom spline over PerspectiveCamera */
export class TrackingShot implements Sampler<PerspectiveCamera> {
  private keys: Key<PerspectiveCamera>[];

  private constructor(keys: Key<PerspectiveCamera>[]) {
    this.keys = keys;
  }

  /** Rust: TrackingShot::from_cameras */
  static from_cameras(cameras: PerspectiveCamera[]): TrackingShot {
    const n = cameras.length;
    if (n < 2) {
      throw new Error('TrackingShot requires at least 2 cameras');
    }

    // last_two, cameras, first_two (closed loop like the Rust code)
    const last_two = [cameras[n - 2], cameras[n - 1]];
    const first_two = [cameras[0], cameras[1]];
    const seq = [...last_two, ...cameras, ...first_two];

    // times: v = (i as f32 - 1.) / len
    const keys: Key<PerspectiveCamera>[] = seq.map((cam, i) => ({
      t: (i - 1) / n,
      v: cam,
    }));

    return new TrackingShot(keys);
  }

  /** Rust: num_control_points() */
  num_control_points(): number {
    return this.keys.length;
  }

  /** Rust: impl Sampler for TrackingShot { fn sample(&self, v: f32) -> PerspectiveCamera } */
  sample(v: number): PerspectiveCamera {
    // Wrap v into [0,1)
    const n = this.segment_count();
    const u = ((v % 1) + 1) % 1;
    // map u in [0,1) to segment index i in [0..n-1], local t in [0,1)
    const s = u * n + 1; // +1 because keys are shifted by one (see Rust construction)
    const i = Math.floor(s);
    const t = s - i;

    const x = this.keys[i - 1].v; // P(i-1)
    const a = this.keys[i].v;     // P(i)
    const b = this.keys[i + 1].v; // P(i+1)
    const y = this.keys[i + 2].v; // P(i+2)

    return cubicHermiteCamera(x, a, b, y, t);
  }

  private segment_count(): number {
    // original camera count == keys.length - 4
    return this.keys.length - 4;
  }
}

/** 1:1 with the Rust struct (seconds, like Duration::as_secs_f32) */
export class Animation<T> {
  private duration_s: number;
  private time_left_s: number;
  private looping: boolean;
  private sampler: Sampler<T>;

  constructor(duration: number, looping: boolean, sampler: Sampler<T>) {
    this.duration_s = duration;
    this.time_left_s = duration;
    this.looping = looping;
    this.sampler = sampler;
  }

  static new<T>(duration: number, looping: boolean, sampler: Sampler<T>): Animation<T> {
    return new Animation(duration, looping, sampler);
  }

  done(): boolean {
    return this.looping ? false : this.time_left_s <= 0;
  }

  /** dt is in seconds */
  update(dt: number): T {
    const new_left = this.time_left_s - dt;
    if (new_left >= 0) {
      this.time_left_s = new_left;
    } else {
      if (this.looping) {
        // duration + time_left - dt  (Rust behavior)
        this.time_left_s = this.duration_s + this.time_left_s - dt;
        // keep it in [0,duration]
        this.time_left_s = ((this.time_left_s % this.duration_s) + this.duration_s) % this.duration_s;
      } else {
        this.time_left_s = 0;
      }
    }
    return this.sampler.sample(this.progress());
  }

  progress(): number {
    return 1 - this.time_left_s / this.duration_s;
  }

  set_progress(v: number): void {
    this.time_left_s = this.duration_s * (1 - v);
  }

  duration(): number {
    return this.duration_s;
  }

  set_duration(duration: number): void {
    const p = this.progress();
    this.duration_s = duration;
    this.set_progress(p);
  }
}

/* ------------------------- Helpers to mirror Rust impls ------------------------- */

/** Unroll quaternion sequence to ensure shortest path (sign flip if dot < 0). */
export function unroll(rot: [quat, quat, quat, quat]): [quat, quat, quat, quat] {
  const r0 = quat.clone(rot[0]);
  if (r0[3] < 0) quat.scale(r0, r0, -1);

  const out: [quat, quat, quat, quat] = [r0, quat.clone(rot[1]), quat.clone(rot[2]), quat.clone(rot[3])];
  for (let i = 1; i < 4; i++) {
    if (quat.dot(out[i], out[i - 1]) < 0) {
      quat.scale(out[i], out[i], -1);
    }
  }
  return out;
}

/** Catmull–Rom (uniform) cubic Hermite for scalars */
function cr1(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const m0 = (c - a) * 0.5;
  const m1 = (d - b) * 0.5;
  return (2 * t3 - 3 * t2 + 1) * b + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * c + (t3 - t2) * m1;
}

/** Catmull–Rom for vec3 (component-wise) */
function crVec3(a: vec3, b: vec3, c: vec3, d: vec3, t: number): vec3 {
  const out = vec3.create();
  out[0] = cr1(a[0], b[0], c[0], d[0], t);
  out[1] = cr1(a[1], b[1], c[1], d[1], t);
  out[2] = cr1(a[2], b[2], c[2], d[2], t);
  return out;
}

/** Catmull–Rom for quat (component-wise Hermite + normalize), after unroll */
function crQuat(a: quat, b: quat, c: quat, d: quat, t: number): quat {
  const out = quat.create();
  out[0] = cr1(a[0], b[0], c[0], d[0], t);
  out[1] = cr1(a[1], b[1], c[1], d[1], t);
  out[2] = cr1(a[2], b[2], c[2], d[2], t);
  out[3] = cr1(a[3], b[3], c[3], d[3], t);
  return quat.normalize(out, out);
}

/** Catmull–Rom for PerspectiveProjection (component-wise) */
function crProjection(x: PerspectiveProjection, a: PerspectiveProjection, b: PerspectiveProjection, y: PerspectiveProjection, t: number): PerspectiveProjection {
  // fields: fovx, fovy, znear, zfar, fov2view_ratio
  const fovx = cr1(x.fovx, a.fovx, b.fovx, y.fovx, t);
  const fovy = cr1(x.fovy, a.fovy, b.fovy, y.fovy, t);
  const znear = cr1(x.znear, a.znear, b.znear, y.znear, t);
  const zfar = cr1(x.zfar, a.zfar, b.zfar, y.zfar, t);
  const ratio = cr1(x.fov2view_ratio, a.fov2view_ratio, b.fov2view_ratio, y.fov2view_ratio, t);
  return new PerspectiveProjection(fovx, fovy, znear, zfar, ratio);
}

/** Mirror of the Rust `Interpolate::cubic_hermite` for PerspectiveCamera */
function cubicHermiteCamera(x: PerspectiveCamera, a: PerspectiveCamera, b: PerspectiveCamera, y: PerspectiveCamera, t: number): PerspectiveCamera {
  // position CR
  const pos = crVec3(x.position, a.position, b.position, y.position, t);

  // quaternion unroll + CR (component-wise) + normalize
  const [q0, q1, q2, q3] = unroll([x.rotation, a.rotation, b.rotation, y.rotation]);
  const rot = crQuat(q0, q1, q2, q3, t);

  // projection CR
  const proj = crProjection(x.projection, a.projection, b.projection, y.projection, t);

  return new PerspectiveCamera(pos, rot, proj);
}
