// controller.ts
import { vec2, vec3, mat3, quat } from 'gl-matrix';
import { PerspectiveCamera } from './camera.js';

/** Toggle to log input + updates without changing behavior. */
export const DEBUG_INPUT = false;
const dlog = (...args: any[]) => { if (DEBUG_INPUT) console.debug('[controller]', ...args); };

/** Minimal KeyCode union to mirror the Rust winit::keyboard::KeyCode variants used */
export type KeyCode =
  | 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD'
  | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  | 'KeyQ' | 'KeyE' | 'Space' | 'ShiftLeft';

export class CameraController {
  public center: vec3;
  public up: vec3 | null;

  private amount: vec3;
  private shift: vec2;
  private rotation: vec3;
  private scroll: number;

  public speed: number;
  public sensitivity: number;

  public left_mouse_pressed: boolean;
  public right_mouse_pressed: boolean;
  public alt_pressed: boolean;
  public user_inptut: boolean; // keep original typo for 1:1 API

  constructor(speed: number, sensitivity: number) {
    this.center = vec3.fromValues(0, 0, 0);
    this.up = null;

    this.amount = vec3.fromValues(0, 0, 0);
    this.shift = vec2.fromValues(0, 0);
    this.rotation = vec3.fromValues(0, 0, 0);
    this.scroll = 0.0;

    this.speed = speed;
    this.sensitivity = sensitivity;

    this.left_mouse_pressed = false;
    this.right_mouse_pressed = false;
    this.alt_pressed = false;
    this.user_inptut = false;
  }

  /** Returns true if the key was handled (matches Rust’s bool). */
  process_keyboard(key: KeyCode, pressed: boolean): boolean {
    const amount = pressed ? 1.0 : 0.0;
    let processed = false;

    switch (key) {
      case 'KeyW':
      case 'ArrowUp':
        this.amount[2] += amount;
        processed = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.amount[2] += -amount;
        processed = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.amount[0] += -amount;
        processed = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.amount[0] += amount;
        processed = true;
        break;
      case 'KeyQ':
        this.rotation[2] += amount / this.sensitivity;
        processed = true;
        break;
      case 'KeyE':
        this.rotation[2] += -amount / this.sensitivity;
        processed = true;
        break;
      case 'Space':
        this.amount[1] += amount;
        processed = true;
        break;
      case 'ShiftLeft':
        this.amount[1] += -amount;
        processed = true;
        break;
      default:
        processed = false;
    }

    this.user_inptut = processed;
    if (processed) dlog('process_keyboard', key, { pressed, amount: this.amount, rotation: this.rotation });
    return processed;
  }

  /** mouse_dx/mouse_dy in pixels (same semantics as Rust). */
  process_mouse(mouse_dx: number, mouse_dy: number): void {
    if (this.left_mouse_pressed) {
      this.rotation[0] += mouse_dx;
      this.rotation[1] += mouse_dy;
      this.user_inptut = true;
      dlog('process_mouse rotate', { dx: mouse_dx, dy: mouse_dy, rotation: this.rotation });
    }
    if (this.right_mouse_pressed) {
      this.shift[1] += -mouse_dx;
      this.shift[0] += mouse_dy;
      this.user_inptut = true;
      dlog('process_mouse pan', { dx: mouse_dx, dy: mouse_dy, shift: this.shift });
    }
  }

  process_scroll(dy: number): void {
    this.scroll += -dy;
    this.user_inptut = true;
    dlog('process_scroll', { dy, scroll: this.scroll });
  }

  /** Align controller to the camera’s current line of sight and adjust up. */
  reset_to_camera(camera: PerspectiveCamera): void {
    const invView = quat.invert(quat.create(), camera.rotation);
    const forward = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, 1), invView);
    const right = vec3.transformQuat(vec3.create(), vec3.fromValues(1, 0, 0), invView);

    // Move center to closest point on the camera ray
    this.center = closest_point(camera.position, forward, this.center);

    // Adjust up vector by projecting it onto plane orthogonal to right
    if (this.up) {
      const projLen = vec3.dot(this.up, right) / vec3.dot(right, right);
      const proj = vec3.scale(vec3.create(), right, projLen);
      const newUp = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), this.up, proj));
      this.up = newUp;
    }
    dlog('reset_to_camera', { center: this.center, up: this.up });
  }

  /**
   * Update camera given dt in seconds (1:1 with Duration semantics).
   * Mutates camera position/rotation.
   */
  update_camera(camera: PerspectiveCamera, dt_seconds: number): void {
    const dt = dt_seconds;

    // --- orbit baseline ---
    const dir = vec3.subtract(vec3.create(), camera.position, this.center);
    const distance = Math.max(1e-12, vec3.length(dir));
    const newDist = Math.exp(Math.log(distance) + this.scroll * dt * 10.0 * this.speed);
    const dirNorm = vec3.scale(vec3.create(), vec3.normalize(vec3.create(), dir), newDist);

    // --- fixed up (no-roll). allow custom up if user set it; otherwise world-up ---
    const worldUp = this.up ? normalizeSafe(this.up) : vec3.fromValues(0, 1, 0);

    // --- pan (unchanged) ---
    const invQ = quat.invert(quat.create(), camera.rotation);
    const x_axis_cam = vec3.transformQuat(vec3.create(), vec3.fromValues(1, 0, 0), invQ);
    const y_axis_cam = this.up ? vec3.clone(this.up) : vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), invQ);

    const panScale = dt * this.speed * 0.1 * distance;
    const pan = vec3.create();
    const sx = vec3.scale(vec3.create(), x_axis_cam, this.shift[1] * panScale);
    const sy = vec3.scale(vec3.create(), y_axis_cam, -this.shift[0] * panScale);
    vec3.add(pan, sx, sy);
    vec3.add(this.center, this.center, pan);
    vec3.add(camera.position, camera.position, pan);

    // --- orbit: yaw about worldUp, pitch about "right" from (worldUp x viewDir) ---
    const yaw   = (this.rotation[0]) * dt * this.sensitivity;   // mouse X
    const pitch = (this.rotation[1]) * dt * this.sensitivity;   // mouse Y (inverted to feel natural)

    // right axis from current viewing direction (dirNorm points center->cam)
    let right = vec3.cross(vec3.create(), worldUp, dirNorm);
    right = normalizeSafe(right);
    if (vec3.length(right) < 1e-6) {
      // looking straight up/down; pick a stable right
      right = vec3.fromValues(1, 0, 0);
    }

    const qYaw   = quat.setAxisAngle(quat.create(), worldUp, yaw);
    const qPitch = quat.setAxisAngle(quat.create(), right,  pitch);
    // IMPORTANT: no roll (eta) at all.
    const rot = quat.multiply(quat.create(), qYaw, qPitch);

    const new_dir = vec3.transformQuat(vec3.create(), dirNorm, rot);

    // avoid near-up singularity
    if (angle_short(worldUp, new_dir) < 0.1) {
      vec3.copy(new_dir, dirNorm);
    }

    // position and orientation (look along -new_dir with fixed up = worldUp)
    vec3.add(camera.position, this.center, new_dir);
    camera.rotation = lookRotation(vec3.scale(vec3.create(), new_dir, -1), worldUp);

    // --- damping (unchanged) ---
    let decay = Math.pow(0.8, dt * 60.0);
    if (decay < 1e-4) decay = 0.0;

    vec3.scale(this.rotation, this.rotation, decay);
    if (vec3.length(this.rotation) < 1e-4) vec3.set(this.rotation, 0, 0, 0);

    vec2.scale(this.shift, this.shift, decay);
    if (vec2.length(this.shift) < 1e-4) vec2.set(this.shift, 0, 0);

    this.scroll *= decay;
    if (Math.abs(this.scroll) < 1e-4) this.scroll = 0.0;

    this.user_inptut = false;
    dlog('update_camera (orbit, no-roll)', { dt, yaw, pitch, center: this.center, camPos: camera.position });
  }
}

/* ----------------------------- helpers (1:1) ----------------------------- */

function closest_point(orig: vec3, dir: vec3, point: vec3): vec3 {
  const d = normalizeSafe(dir);
  const lhs = vec3.subtract(vec3.create(), point, orig);
  const dot_p = vec3.dot(lhs, d);
  const out = vec3.scaleAndAdd(vec3.create(), orig, d, dot_p);
  return out;
}

function angle_short(a: vec3, b: vec3): number {
  const na = normalizeSafe(a);
  const nb = normalizeSafe(b);
  const dot = Math.min(1, Math.max(-1, vec3.dot(na, nb)));
  const angle = Math.acos(dot);
  return angle > Math.PI / 2 ? Math.PI - angle : angle;
}

function normalizeSafe(v: vec3): vec3 {
  const len = vec3.length(v);
  return len > 0 ? vec3.scale(vec3.create(), v, 1 / len) : vec3.fromValues(0, 0, 0);
}

/** Quaternion that makes -Z look along `forward` with the given `up`. */
function lookRotation(forward: vec3, up: vec3): quat {
  const f = normalizeSafe(forward);
  const r = normalizeSafe(vec3.cross(vec3.create(), up, f));
  const u = vec3.cross(vec3.create(), f, r);

  // Column-major mat3 (gl-matrix): columns are r, u, f
  const m = mat3.fromValues(
    r[0], r[1], r[2],
    u[0], u[1], u[2],
    f[0], f[1], f[2]
  );
  const q = quat.fromMat3(quat.create(), m);
  return quat.normalize(q, q);
}
