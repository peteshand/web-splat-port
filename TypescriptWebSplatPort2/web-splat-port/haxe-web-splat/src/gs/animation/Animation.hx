package gs.animation;

import gl_matrix.Vec3;
import gl_matrix.Quat;
import gs.camera.PerspectiveCamera;
import gs.camera.PerspectiveProjection;

/** 1:1 with the Rust trait */
interface Lerp<T> {
  public function lerp(other:T, amount:Float):T;
}

/** 1:1 with the Rust trait */
interface Sampler<T> {
  public function sample(v:Float):T;
}

/** 1:1 with the Rust struct */
class Transition<T:(Lerp<T>)> implements Sampler<T> {
  var from:T;
  var to:T;
  var interp_fn:Float->Float;

  public function new(from:T, to:T, interp_fn:Float->Float) {
    this.from = from;
    this.to = to;
    this.interp_fn = interp_fn;
  }

  public static function create<T:(Lerp<T>)>(from:T, to:T, interp_fn:Float->Float):Transition<T> {
    return new Transition(from, to, interp_fn);
  }

  public function sample(v:Float):T {
    return from.lerp(to, interp_fn(v));
  }
}

/** Minimal internal key structure to mirror splines::Key */
typedef Key<T> = { t:Float, v:T };

/** 1:1 with the Rust struct; Catmull–Rom spline over PerspectiveCamera */
class TrackingShot implements Sampler<PerspectiveCamera> {
  var keys:Array<Key<PerspectiveCamera>>;

  private function new(keys:Array<Key<PerspectiveCamera>>) {
    this.keys = keys;
  }

  /** Rust: TrackingShot::from_cameras */
  public static function from_cameras(cameras:Array<PerspectiveCamera>):TrackingShot {
    final n = cameras.length;
    if (n < 2) throw 'TrackingShot requires at least 2 cameras';

    // last_two, cameras, first_two (closed loop like the Rust code)
    final last_two = [cameras[n - 2], cameras[n - 1]];
    final first_two = [cameras[0], cameras[1]];
    final seq = last_two.concat(cameras).concat(first_two);

    // times: t = (i - 1) / n
    final keys:Array<Key<PerspectiveCamera>> = [];
    for (i in 0...seq.length) keys.push({ t: (i - 1) / n, v: seq[i] });

    return new TrackingShot(keys);
  }

  /** Rust: num_control_points() */
  public inline function num_control_points():Int {
    return keys.length;
  }

  public function sample(v:Float):PerspectiveCamera {
    // Wrap v into [0,1)
    final n = segment_count();
    final u = ((v % 1) + 1) % 1;
    // map u in [0,1) to segment index i in [0..n-1], local t in [0,1)
    final s:Float = u * n + 1; // +1 because keys are shifted by one
    final i:Int = Std.int(Math.floor(s));
    final t = s - i;

    final x = keys[i - 1].v; // P(i-1)
    final a = keys[i].v;     // P(i)
    final b = keys[i + 1].v; // P(i+1)
    final y = keys[i + 2].v; // P(i+2)

    return AnimationHelpers.cubicHermiteCamera(x, a, b, y, t);
  }

  inline function segment_count():Int {
    // original camera count == keys.length - 4
    return keys.length - 4;
  }
}

/** 1:1 with the Rust struct (seconds, like Duration::as_secs_f32) */
class Animation<T> {
  var duration_s:Float;
  var time_left_s:Float;
  var looping:Bool;
  var sampler:Sampler<T>;

  public function new(duration:Float, looping:Bool, sampler:Sampler<T>) {
    this.duration_s = duration;
    this.time_left_s = duration;
    this.looping = looping;
    this.sampler = sampler;
  }

  public static function create<T>(duration:Float, looping:Bool, sampler:Sampler<T>):Animation<T> {
    return new Animation(duration, looping, sampler);
  }

  public inline function done():Bool {
    return looping ? false : time_left_s <= 0;
  }

  /** dt is in seconds */
  public function update(dt:Float):T {
    final new_left = time_left_s - dt;
    if (new_left >= 0) {
      time_left_s = new_left;
    } else {
      if (looping) {
        // duration + time_left - dt  (Rust behavior)
        time_left_s = duration_s + time_left_s - dt;
        // keep it in [0,duration]
        time_left_s = ((time_left_s % duration_s) + duration_s) % duration_s;
      } else {
        time_left_s = 0;
      }
    }
    return sampler.sample(progress());
  }

  public inline function progress():Float {
    return 1 - time_left_s / duration_s;
  }

  public inline function set_progress(v:Float):Void {
    time_left_s = duration_s * (1 - v);
  }

  public inline function duration():Float {
    return duration_s;
  }

  public function set_duration(duration:Float):Void {
    final p = progress();
    duration_s = duration;
    set_progress(p);
  }
}

/* ------------------------- Helpers to mirror Rust impls ------------------------- */
class AnimationHelpers {
  /** Unroll quaternion sequence to ensure shortest path (sign flip if dot < 0). */
  public static function unroll(rot:Array<Quat>):Array<Quat> {
    var r0 = Quat.fromValues(rot[0][0], rot[0][1], rot[0][2], rot[0][3]);
    if (r0[3] < 0) Quat.scale(r0, r0, -1);

    var out = [
      r0,
      Quat.fromValues(rot[1][0], rot[1][1], rot[1][2], rot[1][3]),
      Quat.fromValues(rot[2][0], rot[2][1], rot[2][2], rot[2][3]),
      Quat.fromValues(rot[3][0], rot[3][1], rot[3][2], rot[3][3])
    ];
    for (i in 1...4) {
      if (Quat.dot(out[i], out[i - 1]) < 0) Quat.scale(out[i], out[i], -1);
    }
    return out;
  }

  /** Catmull–Rom (uniform) cubic Hermite for scalars */
  public static inline function cr1(a:Float, b:Float, c:Float, d:Float, t:Float):Float {
    final t2 = t * t;
    final t3 = t2 * t;
    final m0 = (c - a) * 0.5;
    final m1 = (d - b) * 0.5;
    return (2 * t3 - 3 * t2 + 1) * b
         + (t3 - 2 * t2 + t) * m0
         + (-2 * t3 + 3 * t2) * c
         + (t3 - t2) * m1;
  }

  /** Catmull–Rom for vec3 (component-wise) */
  public static function crVec3(a:Vec3, b:Vec3, c:Vec3, d:Vec3, t:Float):Vec3 {
    var out = Vec3.create();
    out[0] = cr1(a[0], b[0], c[0], d[0], t);
    out[1] = cr1(a[1], b[1], c[1], d[1], t);
    out[2] = cr1(a[2], b[2], c[2], d[2], t);
    return out;
  }

  /** Catmull–Rom for quat (component-wise Hermite + normalize), after unroll */
  public static function crQuat(a:Quat, b:Quat, c:Quat, d:Quat, t:Float):Quat {
    var out = Quat.create();
    out[0] = cr1(a[0], b[0], c[0], d[0], t);
    out[1] = cr1(a[1], b[1], c[1], d[1], t);
    out[2] = cr1(a[2], b[2], c[2], d[2], t);
    out[3] = cr1(a[3], b[3], c[3], d[3], t);
    Quat.normalize(out, out);
    return out;
  }

  /** Catmull–Rom for PerspectiveProjection (component-wise) */
  public static function crProjection(x:PerspectiveProjection, a:PerspectiveProjection, b:PerspectiveProjection, y:PerspectiveProjection, t:Float):PerspectiveProjection {
    final fovx  = cr1(x.fovx,  a.fovx,  b.fovx,  y.fovx,  t);
    final fovy  = cr1(x.fovy,  a.fovy,  b.fovy,  y.fovy,  t);
    final znear = cr1(x.znear, a.znear, b.znear, y.znear, t);
    final zfar  = cr1(x.zfar,  a.zfar,  b.zfar,  y.zfar,  t);
    final ratio = cr1(x.fov2view_ratio, a.fov2view_ratio, b.fov2view_ratio, y.fov2view_ratio, t);
    return new PerspectiveProjection(fovx, fovy, znear, zfar, ratio);
  }

  /** Mirror of the Rust `Interpolate::cubic_hermite` for PerspectiveCamera */
  public static function cubicHermiteCamera(x:PerspectiveCamera, a:PerspectiveCamera, b:PerspectiveCamera, y:PerspectiveCamera, t:Float):PerspectiveCamera {
    // position CR
    final pos:Vec3 = crVec3(cast x.position, cast a.position, cast b.position, cast y.position, t);

    // quaternion unroll + CR (component-wise) + normalize
    final ur = unroll([cast x.rotation, cast a.rotation, cast b.rotation, cast y.rotation]);
    final rot:Quat = crQuat(ur[0], ur[1], ur[2], ur[3], t);

    // projection CR
    final proj = crProjection(x.projection, a.projection, b.projection, y.projection, t);

    return new PerspectiveCamera(pos, rot, proj);
  }
}
