package;

import gl_matrix.Quat;
import gl_matrix.Vec3;
import camera.PerspectiveCamera;
import camera.PerspectiveProjection;





// animation.ts

/** 1:1 with the Rust trait */
interface Lerp<T = any> {
  lerp(other: T, amount: number): T;
}

/** 1:1 with the Rust trait */
interface Sampler<T> {
  sample(v: number): T;
}

/** 1:1 with the Rust struct */
class Transition<T extends Lerp<T>> implements Sampler<T> {
  private var from;
  private var to;
  private var interp_fn;

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
class TrackingShot implements Sampler<PerspectiveCamera> {
  private var keys;

  private function constructor() {
    this.keys = keys;
  }

  /** Rust: TrackingShot::from_cameras */
  static from_cameras(cameras: PerspectiveCamera[]): TrackingShot {
    final n = cameras.length;
    function if() {
      throw new Error('TrackingShot requires at least 2 cameras');
    }

    // last_two, cameras, first_two (closed loop like the Rust code)
    final last_two = [cameras[n - 2], cameras[n - 1]];
    final first_two = [cameras[0], cameras[1]];
    final seq = [...last_two, ...cameras, ...first_two];

    // times: v = (i as f32 - 1.) / len
    final keys = seq.map((cam, i) => ({
       var t;

    return new TrackingShot(keys);
  }

  /** Rust: num_control_points() */
  num_control_points(): number {
    return this.keys.length;
  }

  /** Rust: impl Sampler for TrackingShot { fn sample(&self, v: f32) -> PerspectiveCamera } */
  sample(v: number): PerspectiveCamera {
    // Wrap v into [0,1)
    final n = this.segment_count();
    final u = ((v % 1) + 1) % 1;
    // map u in [0,1) to segment index i in [0..n-1], local t in [0,1)
    final s = u * n + 1; // +1 because keys are shifted by one (see Rust construction)
    final i = Math.floor(s);
    final t = s - i;

    final x = this.keys[i - 1].v; // P(i-1)
    final a = this.keys[i].v;     // P(i)
    final b = this.keys[i + 1].v; // P(i+1)
    final y = this.keys[i + 2].v; // P(i+2)

    return cubicHermiteCamera(x, a, b, y, t);
  }

  private segment_count(): number {
    // original camera count == keys.length - 4
    return this.keys.length - 4;
  }
}

/** 1:1 with the Rust struct (seconds, like Duration::as_secs_f32) */
class Animation<T> {
  private var duration_s;
  private var time_left_s;
  private var looping;
  private var sampler;

  function constructor() {
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
    final new_left = this.time_left_s - dt;
    function if() {
      this.time_left_s = new_left;
    } else {
      function if() {
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

  set_progress(v: number): Void {
    this.time_left_s = this.duration_s * (1 - v);
  }

  duration(): number {
    return this.duration_s;
  }

  set_duration(duration: number): Void {
    final p = this.progress();
    this.duration_s = duration;
    this.set_progress(p);
  }
}

/* ------------------------- Helpers to mirror Rust impls ------------------------- */

/** Unroll quaternion sequence to ensure shortest path (sign flip if dot < 0). */
function unroll(unroll): [Quat, Quat, Quat, Quat] {
  final r0 = Quat.clone(rot[0]);
  if (r0[3] < 0) Quat.scale(r0, r0, -1);

  final out = [r0, Quat.clone(rot[1]), Quat.clone(rot[2]), Quat.clone(rot[3])];
  function for() {
    if (Quat.dot(out[i], out[i - 1]) < 0) {
      Quat.scale(out[i], out[i], -1);
    }
  }
  return out;
}

/** Catmull–Rom (uniform) cubic Hermite for scalars */
function cr1(cr1): number {
  final t2 = t * t;
  final t3 = t2 * t;
  final m0 = (c - a) * 0.5;
  final m1 = (d - b) * 0.5;
  return (2 * t3 - 3 * t2 + 1) * b + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * c + (t3 - t2) * m1;
}

/** Catmull–Rom for Vec3 (component-wise) */
function crVec3(crVec3): Vec3 {
  final out = Vec3.create();
  out[0] = cr1(a[0], b[0], c[0], d[0], t);
  out[1] = cr1(a[1], b[1], c[1], d[1], t);
  out[2] = cr1(a[2], b[2], c[2], d[2], t);
  return out;
}

/** Catmull–Rom for Quat (component-wise Hermite + normalize), after unroll */
function crQuat(crQuat): Quat {
  final out = Quat.create();
  out[0] = cr1(a[0], b[0], c[0], d[0], t);
  out[1] = cr1(a[1], b[1], c[1], d[1], t);
  out[2] = cr1(a[2], b[2], c[2], d[2], t);
  out[3] = cr1(a[3], b[3], c[3], d[3], t);
  return Quat.normalize(out, out);
}

/** Catmull–Rom for PerspectiveProjection(component-wise) */
function crProjection(crProjection): PerspectiveProjection {
  // fields: fovx, fovy, znear, zfar, fov2view_ratio
  final fovx = cr1(x.fovx, a.fovx, b.fovx, y.fovx, t);
  final fovy = cr1(x.fovy, a.fovy, b.fovy, y.fovy, t);
  final znear = cr1(x.znear, a.znear, b.znear, y.znear, t);
  final zfar = cr1(x.zfar, a.zfar, b.zfar, y.zfar, t);
  final ratio = cr1(x.fov2view_ratio, a.fov2view_ratio, b.fov2view_ratio, y.fov2view_ratio, t);
  return new PerspectiveProjection(fovx, fovy, znear, zfar, ratio);
}

/** Mirror of the Rust `Interpolate::cubic_hermite` for PerspectiveCamera */
function cubicHermiteCamera(cubicHermiteCamera): PerspectiveCamera {
  // position CR
  final pos = crVec3(x.position, a.position, b.position, y.position, t);

  // quaternion unroll + CR (component-wise) + normalize
  final [q0, q1, q2, q3] = unroll([x.rotation, a.rotation, b.rotation, y.rotation]);
  final rot = crQuat(q0, q1, q2, q3, t);

  // projection CR
  final proj = crProjection(x.projection, a.projection, b.projection, y.projection, t);

  return new PerspectiveCamera(pos, rot, proj);
}