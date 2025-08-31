package controller;

import gl_matrix.Vec2;
import gl_matrix.Vec3;
import gl_matrix.Mat3;
import gl_matrix.Quat;
import camera.PerspectiveCamera; // (was camera.js.PerspectiveCamera in TS)

/** Toggle to log input + updates without changing behavior. */
final DEBUG_INPUT = false;

private inline function dlog(tag:String, ?data:Dynamic):Void {
  if (DEBUG_INPUT) {
    if (data == null) console.debug('[controller] ' + tag) else console.debug('[controller] ' + tag, data);
  }
}

/** Minimal KeyCode union to mirror Rust winit::keyboard::KeyCode variants used. */
enum abstract KeyCode(String) from String to String {
  var KeyW       = "KeyW";
  var KeyS       = "KeyS";
  var KeyA       = "KeyA";
  var KeyD       = "KeyD";
  var ArrowUp    = "ArrowUp";
  var ArrowDown  = "ArrowDown";
  var ArrowLeft  = "ArrowLeft";
  var ArrowRight = "ArrowRight";
  var KeyQ       = "KeyQ";
  var KeyE       = "KeyE";
  var Space      = "Space";
  var ShiftLeft  = "ShiftLeft";
}

class CameraController {
  public var center:js.lib.Float32Array;
  public var up:Null<js.lib.Float32Array>;

  // accumulators
  var amount:js.lib.Float32Array;
  var shift:js.lib.Float32Array;
  var rotation:js.lib.Float32Array;
  var scroll:Float;

  public var speed:Float;
  public var sensitivity:Float;

  public var left_mouse_pressed:Bool;
  public var right_mouse_pressed:Bool;
  public var alt_pressed:Bool;
  public var user_input:Bool;

  public function new(speed:Float, sensitivity:Float) {
    this.center = Vec3.fromValues(0, 0, 0);
    this.up = null;

    this.amount = Vec3.fromValues(0, 0, 0);
    this.shift = Vec2.fromValues(0, 0);
    this.rotation = Vec3.fromValues(0, 0, 0);
    this.scroll = 0.0;

    this.speed = speed;
    this.sensitivity = sensitivity;

    this.left_mouse_pressed = false;
    this.right_mouse_pressed = false;
    this.alt_pressed = false;
    this.user_input = false;
  }

  /** Returns true if the key was handled (matches Rust’s bool). */
  public function process_keyboard(key:KeyCode, pressed:Bool):Bool {
    final amt = pressed ? 1.0 : 0.0;
    var processed = false;

    switch (key) {
      case KeyW, ArrowUp:
        this.amount[2] += amt; processed = true;
      case KeyS, ArrowDown:
        this.amount[2] += -amt; processed = true;
      case KeyA, ArrowLeft:
        this.amount[0] += -amt; processed = true;
      case KeyD, ArrowRight:
        this.amount[0] += amt; processed = true;
      case KeyQ:
        this.rotation[2] += amt / this.sensitivity; processed = true;
      case KeyE:
        this.rotation[2] += -amt / this.sensitivity; processed = true;
      case Space:
        this.amount[1] += amt; processed = true;
      case ShiftLeft:
        this.amount[1] += -amt; processed = true;
      default:
        processed = false;
    }

    this.user_input = processed;
    if (processed) dlog('process_keyboard', { key:key, pressed:pressed, amount:this.amount, rotation:this.rotation });
    return processed;
  }

  /** mouse_dx/mouse_dy in pixels (same semantics as Rust). */
  public function process_mouse(mouse_dx:Float, mouse_dy:Float):Void {
    if (this.left_mouse_pressed) {
      this.rotation[0] += mouse_dx;
      this.rotation[1] += mouse_dy;
      this.user_input = true;
      dlog('process_mouse rotate', { dx:mouse_dx, dy:mouse_dy, rotation:this.rotation });
    }
    if (this.right_mouse_pressed) {
      this.shift[1] += -mouse_dx;
      this.shift[0] += mouse_dy;
      this.user_input = true;
      dlog('process_mouse pan', { dx:mouse_dx, dy:mouse_dy, shift:this.shift });
    }
  }

  public function process_scroll(dy:Float):Void {
    this.scroll += -dy;
    this.user_input = true;
    dlog('process_scroll', { dy:dy, scroll:this.scroll });
  }

  /** Align controller to the camera’s current line of sight and adjust up. */
  public function reset_to_camera(camera:PerspectiveCamera):Void {
    final invView = Quat.invert(Quat.create(), camera.rotation);
    final forward = Vec3.transformQuat(Vec3.create(), Vec3.fromValues(0, 0, 1), invView);
    final right   = Vec3.transformQuat(Vec3.create(), Vec3.fromValues(1, 0, 0), invView);

    // Move center to closest point on the camera ray
    this.center = closest_point(camera.position, forward, this.center);

    // Adjust up vector by projecting it onto plane orthogonal to right
    if (this.up != null) {
      final projLen = Vec3.dot(this.up, right) / Vec3.dot(right, right);
      final proj = Vec3.scale(Vec3.create(), right, projLen);
      final newUp = Vec3.normalize(Vec3.create(), Vec3.subtract(Vec3.create(), this.up, proj));
      this.up = newUp;
    }
    dlog('reset_to_camera', { center:this.center, up:this.up });
  }

  /**
   * Update camera given dt in seconds (1:1 with Duration semantics).
   * Mutates camera position/rotation.
   */
  public function update_camera(camera:PerspectiveCamera, dt_seconds:Float):Void {
    final dt = dt_seconds;

    // Vector from center to camera
    final dir = Vec3.subtract(Vec3.create(), camera.position, this.center);
    final distance = Math.max(1e-12, Vec3.length(dir));

    // Dolly via scroll
    final newDist = Math.exp(Math.log(distance) + this.scroll * dt * 10.0 * this.speed);
    final dirNorm = Vec3.scale(Vec3.create(), Vec3.normalize(Vec3.create(), dir), newDist);

    // Fixed up (no roll): use custom up if present, else world up
    final worldUp:js.lib.Float32Array = (this.up != null) ? normalizeSafe(this.up) : Vec3.fromValues(0, 1, 0);

    // ---------- PAN AXES (match Rust; invert left/right) ----------
    // x_axis = right = normalize(up × dir)
    var x_axis = Vec3.cross(Vec3.create(), worldUp, dirNorm);
    x_axis = normalizeSafe(x_axis);
    if (Vec3.length(x_axis) < 1e-6) x_axis = Vec3.fromValues(1, 0, 0);
    final y_axis = worldUp;

    // Invert left/right by flipping sign on x_axis contribution
    final panScale = dt * this.speed * 0.1 * distance;
    final pan = Vec3.create();
    Vec3.scaleAndAdd(pan, pan, x_axis, -this.shift[1] * panScale);
    Vec3.scaleAndAdd(pan, pan, y_axis, -this.shift[0] * panScale);
    Vec3.add(this.center, this.center, pan);
    Vec3.add(camera.position, camera.position, pan);

    // ---------- ORBIT (yaw/pitch only, no roll) ----------
    final yaw   = (this.rotation[0]) * dt * this.sensitivity; // mouse X
    final pitch = (this.rotation[1]) * dt * this.sensitivity; // mouse Y

    // right axis for pitch: up × viewDir (same as x_axis above)
    var right = Vec3.clone(x_axis);
    if (Vec3.length(right) < 1e-6) right = Vec3.fromValues(1, 0, 0);

    final qYaw   = Quat.setAxisAngle(Quat.create(), worldUp, yaw);
    final qPitch = Quat.setAxisAngle(Quat.create(), right,  pitch);
    final rot = Quat.multiply(Quat.create(), qYaw, qPitch);

    final new_dir = Vec3.transformQuat(Vec3.create(), dirNorm, rot);

    // Prevent pole flip (~0.1 rad)
    if (angle_short(worldUp, new_dir) < 0.1) {
      Vec3.copy(new_dir, dirNorm);
    }

    // Position and orientation (look along -new_dir with fixed up = worldUp)
    Vec3.add(camera.position, this.center, new_dir);
    camera.rotation = lookRotation(Vec3.scale(Vec3.create(), new_dir, -1), worldUp);

    // ---------- damping ----------
    var decay = Math.pow(0.8, dt * 60.0);
    if (decay < 1e-4) decay = 0.0;

    Vec3.scale(this.rotation, this.rotation, decay);
    if (Vec3.length(this.rotation) < 1e-4) Vec3.set(this.rotation, 0, 0, 0);

    Vec2.scale(this.shift, this.shift, decay);
    if (Vec2.length(this.shift) < 1e-4) Vec2.set(this.shift, 0, 0);

    this.scroll *= decay;
    if (Math.abs(this.scroll) < 1e-4) this.scroll = 0.0;

    this.user_input = false;
    dlog('update_camera (orbit, no-roll)', { dt:dt, yaw:yaw, pitch:pitch, center:this.center, camPos:camera.position });
  }
}

/* ----------------------------- helpers (1:1) ----------------------------- */

private inline function closest_point(orig:js.lib.Float32Array, dir:js.lib.Float32Array, point:js.lib.Float32Array):js.lib.Float32Array {
  final d = normalizeSafe(dir);
  final lhs = Vec3.subtract(Vec3.create(), point, orig);
  final dot_p = Vec3.dot(lhs, d);
  return Vec3.scaleAndAdd(Vec3.create(), orig, d, dot_p);
}

private inline function angle_short(a:js.lib.Float32Array, b:js.lib.Float32Array):Float {
  final na = normalizeSafe(a);
  final nb = normalizeSafe(b);
  final dot = Math.min(1, Math.max(-1, Vec3.dot(na, nb)));
  final angle = Math.acos(dot);
  return angle > Math.PI / 2 ? Math.PI - angle : angle;
}

private inline function normalizeSafe(v:js.lib.Float32Array):js.lib.Float32Array {
  final len = Vec3.length(v);
  return len > 0 ? Vec3.scale(Vec3.create(), v, 1 / len) : Vec3.fromValues(0, 0, 0);
}

/** Quaternion that makes -Z look along `forward` with the given `up`. */
private inline function lookRotation(forward:js.lib.Float32Array, up:js.lib.Float32Array):js.lib.Float32Array {
  final f = normalizeSafe(forward);
  final r = normalizeSafe(Vec3.cross(Vec3.create(), up, f));
  final u = Vec3.cross(Vec3.create(), f, r);

  // Column-major Mat3 (gl-matrix): columns are r, u, f
  final m = Mat3.fromValues(
    r[0], r[1], r[2],
    u[0], u[1], u[2],
    f[0], f[1], f[2]
  );
  final q = Quat.fromMat3(Quat.create(), m);
  return Quat.normalize(q, q);
}
