import { vec2, vec3, quat } from 'gl-matrix';

/* ------------------------------- No-op UI shims ------------------------------ */
export type FullOutput = unknown;
export class EguiWGPU {
  constructor(_device: GPUDevice, _fmt: GPUTextureFormat, _canvas: HTMLCanvasElement) {}
  begin_frame(_w: HTMLCanvasElement) {}
  end_frame(_w: HTMLCanvasElement): FullOutput { return {}; }
  prepare(_size: { width: number; height: number }, _scale: number, _dev: GPUDevice, _q: GPUQueue, _enc: GPUCommandEncoder, shapes: FullOutput) { return shapes; }
  render(_pass: GPURenderPassEncoder, _state: FullOutput) {}
  cleanup(_state: FullOutput) {}
}
export const ui = { ui: (_wc: unknown) => false };
/* --------------------------------------------------------------------------- */

// --- helpers to bridge {x,y,z} <-> gl-matrix tuples ---
export const v3 = (p: { x: number; y: number; z: number }): vec3 =>
  vec3.fromValues(p.x, p.y, p.z);
export const near = (a: number, b: number, eps = 1e-4) => Math.abs(a - b) <= eps;
export const nearVec3 = (a: vec3, b: vec3, eps = 1e-4) =>
  near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps);
export const nearQuat = (a: quat, b: quat, eps = 1e-4) =>
  near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps) && near(a[3], b[3], eps);

// -------------------------------- helpers ----------------------------------
export function deSRGB(fmt: GPUTextureFormat): GPUTextureFormat {
  if (fmt === 'bgra8unorm-srgb') return 'bgra8unorm';
  if (fmt === 'rgba8unorm-srgb') return 'rgba8unorm';
  return fmt;
}

// --------------------------- input binding helper ---------------------------
import type { CameraController, KeyCode } from '../controller';

export function bind_input(canvas: HTMLCanvasElement, controller: CameraController) {
  // Ensure keyboard focus can land on the canvas
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;

  let pressedPointerId: number | null = null;

  const DEBUG = true; // flip to false to silence logs
  const log = (...args: any[]) => { if (DEBUG) console.debug('[input]', ...args); };

  const mapCode = (code: string): KeyCode | undefined => {
    switch (code) {
      case 'KeyW': case 'KeyS': case 'KeyA': case 'KeyD':
      case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
      case 'KeyQ': case 'KeyE': case 'Space': case 'ShiftLeft':
        return code as KeyCode;
      default:
        return undefined;
    }
  };

  const updateAlt = (e: KeyboardEvent | PointerEvent | WheelEvent) => {
    // Mirror winit's modifier tracking by sampling altKey on each event
    // @ts-ignore
    controller.alt_pressed = !!(e as any).altKey;
  };

  // Keyboard
  const onKeyDown = (e: KeyboardEvent) => {
    updateAlt(e);
    const code = mapCode(e.code);
    if (!code) return;
    if (controller.process_keyboard(code, true)) {
      log('keydown', code);
      e.preventDefault();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    updateAlt(e);
    const code = mapCode(e.code);
    if (!code) return;
    if (controller.process_keyboard(code, false)) {
      log('keyup', code);
      e.preventDefault();
    }
  };

  // Pointer (mouse/touch/pen)
  const onPointerDown = (e: PointerEvent) => {
    updateAlt(e);
    canvas.focus();
    pressedPointerId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    if (e.button === 0) controller.left_mouse_pressed  = true;
    if (e.button === 2) controller.right_mouse_pressed = true;
    log('pointerdown', e.button, 'alt=', controller.alt_pressed);
    e.preventDefault();
  };
  const onPointerMove = (e: PointerEvent) => {
    updateAlt(e);
    const dx = e.movementX ?? 0;
    const dy = e.movementY ?? 0;
    if (controller.left_mouse_pressed || controller.right_mouse_pressed) {
      controller.process_mouse(dx, dy);
      log('pointermove', dx, dy);
      e.preventDefault();
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    updateAlt(e);
    if (pressedPointerId === e.pointerId) {
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      pressedPointerId = null;
    }
    if (e.button === 0) controller.left_mouse_pressed  = false;
    if (e.button === 2) controller.right_mouse_pressed = false;
    log('pointerup', e.button);
    e.preventDefault();
  };

  // Prevent browser context menu so right-drag pans like in Rust
  const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };

  // Wheel
  const onWheel = (e: WheelEvent) => {
    updateAlt(e);
    controller.process_scroll(e.deltaY / 100);
    log('wheel', e.deltaY);
    e.preventDefault(); // stop page scroll
  };

  // Blur: clear pressed flags similar to losing focus in winit
  const onWindowBlur = () => {
    controller.left_mouse_pressed = false;
    controller.right_mouse_pressed = false;
  };

  // Attach
  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup', onKeyUp, { capture: true });
  window.addEventListener('blur', onWindowBlur);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', onContextMenu);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // Return unbind if you need teardown later
  return () => {
    window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
    window.removeEventListener('keyup', onKeyUp, { capture: true } as any);
    window.removeEventListener('blur', onWindowBlur);

    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('contextmenu', onContextMenu);
    canvas.removeEventListener('wheel', onWheel as any);
  };
}
