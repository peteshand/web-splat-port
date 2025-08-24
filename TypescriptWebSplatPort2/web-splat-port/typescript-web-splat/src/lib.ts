// lib.ts — 1:1 surface port of lib.rs adapted to your TS APIs
// Updated: exact Rust FOVs at init + two-phase init (800x600 → real size)

import { vec2, vec3, quat } from 'gl-matrix';
import { GaussianRenderer, SplattingArgs, Display } from './renderer';
import { PointCloud } from './pointcloud';
import { Camera, PerspectiveCamera, PerspectiveProjection } from './camera';
import { CameraController, KeyCode } from './controller';
import * as io from './io/mod';
import { Animation /*, TrackingShot, Transition*/ } from './animation';
import { Scene, SceneCamera, Split } from './scene';
// key_to_num imported but not used in this TS-only build (kept for 1:1 surface)
import { key_to_num, GPUStopwatch } from './utils';

// --- helpers to bridge {x,y,z} <-> gl-matrix tuples ---
const v3 = (p: { x: number; y: number; z: number }): vec3 =>
  vec3.fromValues(p.x, p.y, p.z);
const near = (a: number, b: number, eps = 1e-4) => Math.abs(a - b) <= eps;
const nearVec3 = (a: vec3, b: vec3, eps = 1e-4) =>
  near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps);
const nearQuat = (a: quat, b: quat, eps = 1e-4) =>
  near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps) && near(a[3], b[3], eps);

/* ------------------------------- No-op UI shims ------------------------------ */
type FullOutput = unknown;
class EguiWGPU {
  constructor(_device: GPUDevice, _fmt: GPUTextureFormat, _canvas: HTMLCanvasElement) {}
  begin_frame(_w: HTMLCanvasElement) {}
  end_frame(_w: HTMLCanvasElement): FullOutput { return {}; }
  prepare(_size: { width: number; height: number }, _scale: number, _dev: GPUDevice, _q: GPUQueue, _enc: GPUCommandEncoder, shapes: FullOutput) { return shapes; }
  render(_pass: GPURenderPassEncoder, _state: FullOutput) {}
  cleanup(_state: FullOutput) {}
}
const ui = { ui: (_wc: unknown) => false };
/* --------------------------------------------------------------------------- */

export class RenderConfig {
  constructor(
    public no_vsync: boolean,
    public skybox: string | null = null,
    public hdr: boolean = false
  ) {}
}

export class WGPUContext {
  device!: GPUDevice;
  queue!: GPUQueue;
  adapter!: GPUAdapter;

  static async new_instance(): Promise<WGPUContext> {
    return WGPUContext.new(undefined, undefined);
  }

  static async new(_instance?: unknown, _surface?: GPUCanvasContext | null): Promise<WGPUContext> {
    if (!('gpu' in navigator)) throw new Error('WebGPU not available');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter');

    // Mirror wasm limits we rely on (keep permissive for browser portability)
    const device = await adapter.requestDevice({
      requiredLimits: { maxComputeWorkgroupStorageSize: 1 << 15 } // 32768
    });

    const ctx = new WGPUContext();
    ctx.adapter = adapter;
    ctx.device = device;
    ctx.queue = device.queue;
    return ctx;
  }
}

type SurfaceConfiguration = {
  format: GPUTextureFormat;
  width: number;
  height: number;
  present_mode: 'auto' | 'auto-vsync' | 'auto-no-vsync';
  alpha_mode: GPUCanvasAlphaMode;
  view_formats: GPUTextureFormat[];
};

export class WindowContext {
  private wgpu_context!: WGPUContext;
  private surface!: GPUCanvasContext;
  private config!: SurfaceConfiguration;
  private window!: HTMLCanvasElement;
  private scale_factor!: number;

  private pc!: PointCloud;
  private pointcloud_file_path: string | null = null;
  private renderer!: GaussianRenderer;
  private animation: [Animation<PerspectiveCamera>, boolean] | null = null;
  private controller!: CameraController;
  private scene: Scene | null = null;
  private scene_file_path: string | null = null;
  private current_view: number | null = null;
  private ui_renderer!: EguiWGPU;
  private fps = 0;
  private ui_visible = true;

  private display!: Display;

  private splatting_args!: SplattingArgs;

  private saved_cameras: SceneCamera[] = [];
  private stopwatch: GPUStopwatch | null = null;

  // --------- PERF: incremental change tracking instead of JSON stringify -------
  private _lastCamPos: vec3 = vec3.create();
  private _lastCamRot: quat = quat.create();
  private _lastWalltime = 0;
  private _changed = true; // force first frame
  // ---------------------------------------------------------------------------

  static async new(
    window: HTMLCanvasElement,
    pc_file: any,
    render_config: RenderConfig
  ): Promise<WindowContext> {
    const state = new WindowContext();

    // Use the canvas backing store size if present, otherwise derive from CSS box (no DPR).
    const rect = window.getBoundingClientRect();
    const size = {
      width:  Math.max(1, window.width  || Math.floor(rect.width)  || 800),
      height: Math.max(1, window.height || Math.floor(rect.height) || 600),
    };

    state.window = window;
    // Keep a UI scaling factor like Rust's winit path; not used for render resolution.
    state.scale_factor = window.ownerDocument?.defaultView?.devicePixelRatio ?? 1;

    const surface = window.getContext('webgpu') as GPUCanvasContext;
    if (!surface) throw new Error('WebGPU canvas context unavailable');

    const wgpu_context = await WGPUContext.new(undefined, surface);

    const surface_format = navigator.gpu.getPreferredCanvasFormat();
    const render_format: GPUTextureFormat = render_config.hdr ? 'rgba16float' : 'rgba8unorm';

    // Match Rust: draw to a linear (non-sRGB) intermediate; surface exposes both
    surface.configure({
      device: wgpu_context.device,
      format: surface_format,
      alphaMode: 'opaque',
      viewFormats: [deSRGB(surface_format)]
    });

    state.wgpu_context = wgpu_context;
    state.surface = surface;
    state.config = {
      format: surface_format,
      width: size.width,
      height: size.height,
      present_mode: render_config.no_vsync ? 'auto-no-vsync' : 'auto-vsync',
      alpha_mode: 'opaque',
      view_formats: [deSRGB(surface_format)]
    };

    const pc_raw =
      (await (io as any).GenericGaussianPointCloud?.load?.(pc_file)) ?? pc_file;
    state.pc = await PointCloud.new(wgpu_context.device, pc_raw);

    state.renderer = await GaussianRenderer.create(
      wgpu_context.device,
      wgpu_context.queue,
      render_format,
      state.pc.shDeg(),
      state.pc.compressed()
    );

    // ---- Initial camera (Rust parity for FOVs) ----
    // Rust: PerspectiveProjection::new(viewport, (Deg(45), Deg(45 / aspect)), 0.01, 1000)
    const aabb = state.pc.bbox();
    const aspect = size.width / Math.max(1, size.height);

    const c0v = aabb.center();
    const c0 = vec3.fromValues(c0v.x, c0v.y, c0v.z);
    const r = aabb.radius();
    const eyeTuple: vec3 = vec3.fromValues(c0[0] - r * 0.5, c0[1] - r * 0.5, c0[2] - r * 0.5);
    const rot: quat = quat.create();

    const deg2rad = (d: number) => (d * Math.PI) / 180;
    const fovx = deg2rad(45);
    const fovy = deg2rad(45 / Math.max(1e-6, aspect));

    const proj = PerspectiveProjection.new(
      vec2.fromValues(size.width, size.height),
      vec2.fromValues(fovx, fovy),
      0.01,
      1000
    );

    const view_camera = new PerspectiveCamera(eyeTuple, rot, proj);

    const controller = new CameraController(0.1, 0.05);
    const c = state.pc.center();
    controller.center = vec3.fromValues(c.x, c.y, c.z);
    state.controller = controller;

    state.ui_renderer = new EguiWGPU(wgpu_context.device, surface_format, window);

    state.display = await Display.create(
      wgpu_context.device,
      render_format,
      deSRGB(surface_format),
      size.width,
      size.height
    );

    state.stopwatch = new GPUStopwatch(wgpu_context.device, 3);

    state.splatting_args = {
      camera: view_camera,
      viewport: vec2.fromValues(size.width, size.height),
      gaussianScaling: 1.0,
      maxShDeg: state.pc.shDeg(),
      showEnvMap: false,
      mipSplatting: undefined,
      kernelSize: undefined,
      clippingBox: undefined,
      walltime: 0.0,
      sceneCenter: undefined,
      sceneExtend: undefined,
      backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
      resolution: vec2.fromValues(size.width, size.height)
    };

    // snapshot baseline for change tracking
    vec3.copy(state._lastCamPos, state.splatting_args.camera.position as vec3);
    quat.copy(state._lastCamRot, state.splatting_args.camera.rotation as quat);
    state._lastWalltime = state.splatting_args.walltime;

    return state;
  }

  reload(): void {
    if (!this.pointcloud_file_path) throw new Error('no pointcloud file path present');
    console.info('reloading volume from', this.pointcloud_file_path);
    if (this.scene_file_path) {
      console.info('reloading scene from', this.scene_file_path);
    }
  }

  resize(new_size: { width: number; height: number }, scale_factor?: number): void {
    if (new_size.width > 0 && new_size.height > 0) {
      this.config.width = new_size.width;
      this.config.height = new_size.height;

      // Reconfigure the surface (mirrors Rust wgpu SurfaceConfiguration semantics).
      this.surface.configure({
        device: this.wgpu_context.device,
        format: this.config.format,
        alphaMode: this.config.alpha_mode,
        viewFormats: this.config.view_formats
      });

      // Resize our linear offscreen and update camera params.
      this.display.resize(this.wgpu_context.device, new_size.width, new_size.height);

      this.splatting_args.camera.projection.resize(new_size.width, new_size.height);
      // reuse viewport vec2 (avoid allocation)
      this.splatting_args.viewport[0] = new_size.width;
      this.splatting_args.viewport[1] = new_size.height;

      // mark changed because viewport/camera matrices updated
      this._changed = true;
    }
    if (scale_factor !== undefined && scale_factor > 0) {
      this.scale_factor = scale_factor;
    }
  }

  ui(): [boolean, FullOutput] {
    this.ui_renderer.begin_frame(this.window);
    const request_redraw = ui.ui(this);
    const shapes = this.ui_renderer.end_frame(this.window);
    return [request_redraw, shapes];
  }

  update(dt_seconds: number): void {
    const dt = dt_seconds;

    if (this.splatting_args.walltime < 5.0) {
      this.splatting_args.walltime += dt;
    }

    if (this.animation) {
      const [next_camera, playing] = this.animation;
      if ((this.controller as any).user_inptut) {
        this.cancle_animation();
      } else {
        const adv = playing ? dt : 0.0;
        this.splatting_args.camera = next_camera.update(adv);
        this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
        if (next_camera.done()) {
          this.animation = null;
          this.controller.reset_to_camera(this.splatting_args.camera);
        }
      }
    } else {
      this.controller.update_camera(this.splatting_args.camera, dt);

      // check if camera moved out of selected view
      if (this.current_view != null && this.scene) {
        const cam = this.scene.camera(this.current_view);
        if (cam) {
          const scene_camera = (cam as any).toPerspective ? (cam as any).toPerspective() : cam;
          const aPos: vec3 = this.splatting_args.camera.position as vec3;
          const bPos: vec3 = Array.isArray((scene_camera as any).position)
            ? ((scene_camera as any).position as vec3)
            : v3((scene_camera as any).position);
          const pos_change = !nearVec3(aPos, bPos, 1e-4);
          if (pos_change) this.current_view = null;
        }
      }
    }

    const aabb = this.pc.bbox();
    this.splatting_args.camera.fit_near_far(aabb);

    // --- update change tracking (pos/rot or walltime changes) ---
    const pos = this.splatting_args.camera.position as vec3;
    const rot = this.splatting_args.camera.rotation as quat;
    if (!nearVec3(this._lastCamPos, pos) || !nearQuat(this._lastCamRot, rot) ||
        this.splatting_args.walltime !== this._lastWalltime) {
      vec3.copy(this._lastCamPos, pos);
      quat.copy(this._lastCamRot, rot);
      this._lastWalltime = this.splatting_args.walltime;
      this._changed = true;
    }
  }

  render(redraw_scene: boolean, shapes?: FullOutput): void {
    this.stopwatch?.reset();

    const texture = (this.surface as any).getCurrentTexture?.();
    if (!texture) return;

    const view_rgb  = texture.createView({ format: deSRGB(this.config.format) });
    const view_srgb = texture.createView();

    const encoder = this.wgpu_context.device.createCommandEncoder({
      label: 'render command encoder'
    });

    if (redraw_scene) {
      // Prepare: preprocess + sort + copy instanceCount into indirect buffer
      this.renderer.prepare(
        encoder,
        this.wgpu_context.device,
        this.wgpu_context.queue,
        this.pc,
        this.splatting_args,
        this.stopwatch ?? undefined
      );
    }

    let ui_state: FullOutput | null = null;
    if (shapes) {
      // Use our tracked size + scale factor; some browsers don't expose texture.size here.
      ui_state = this.ui_renderer.prepare(
        { width: this.config.width, height: this.config.height },
        this.scale_factor,
        this.wgpu_context.device,
        this.wgpu_context.queue,
        encoder,
        shapes
      );
    }

    if (this.stopwatch) this.stopwatch.start(encoder, 'rasterization');
    if (redraw_scene) {
      const pass = encoder.beginRenderPass({
        label: 'render pass',
        colorAttachments: [{
          view: this.display.texture(),
          clearValue: this.splatting_args.backgroundColor,
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      this.renderer.render(pass, this.pc);
      pass.end();
    }
    if (this.stopwatch) this.stopwatch.stop(encoder, 'rasterization');

    // Access camera/settings bind groups from GaussianRenderer’s uniforms
    const cameraBG   = this.renderer.camera().bind_group();
    const settingsBG = this.renderer.render_settings().bind_group();

    // Composite to the swapchain
    this.display.render(
      encoder,
      view_rgb,
      this.splatting_args.backgroundColor,
      cameraBG,
      settingsBG
    );

    this.stopwatch?.end(encoder);

    // UI overlay (sRGB)
    if (ui_state) {
      const pass = encoder.beginRenderPass({
        label: 'render pass ui',
        colorAttachments: [{ view: view_srgb, loadOp: 'load', storeOp: 'store' }]
      });
      this.ui_renderer.render(pass, ui_state);
      pass.end();
    }
    if (ui_state) this.ui_renderer.cleanup(ui_state);

    // ---- Submit GPU work for this frame ----
    this.wgpu_context.queue.submit([encoder.finish()]);

    // Keep args in sync (avoid allocation)
    this.splatting_args.resolution[0] = this.config.width;
    this.splatting_args.resolution[1] = this.config.height;

    // frame rendered; reset change flag
    this._changed = false;
  }

  private set_scene(scene: Scene): void {
    // Prefer scene-provided extent if available to mirror Rust; else fall back to pc radius
    const extend = (scene as any).extend ? (scene as any).extend() : this.pc.bbox().radius();
    this.splatting_args.sceneExtend = extend;

    // Center: average scene cameras if available, else pc.center()
    const n = scene.numCameras();
    let acc = { x: 0, y: 0, z: 0 };
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      const c = scene.camera(i);
      if (c) {
        acc.x += c.position[0];
        acc.y += c.position[1];
        acc.z += c.position[2];
        cnt++;
      }
    }
    const center = cnt > 0 ? { x: acc.x / cnt, y: acc.y / cnt, z: acc.z / cnt } : this.pc.center();
    this.controller.center = vec3.fromValues(center.x, center.y, center.z);

    this.scene = scene;
    if (this.saved_cameras.length === 0) {
      const arr: SceneCamera[] = [];
      for (let i = 0; i < scene.numCameras(); i++) {
        const c = scene.camera(i);
        if (c && (c.split === undefined || c.split === Split.Test)) arr.push(c);
      }
      this.saved_cameras = arr;
    }
    this._changed = true;
  }

  // NEW: parity helper to jump to a scene camera (no animation for simplicity)
  private set_scene_camera(i: number): void {
    if (!this.scene) return;
    this.current_view = i;
    const cam = this.scene.camera(i);
    if (!cam) return;

    // Try SceneCamera.toPerspective() first if available
    const anyCam: any = cam as any;
    if (typeof anyCam.toPerspective === 'function') {
      const pc: PerspectiveCamera = anyCam.toPerspective();
      this.update_camera(pc);
      return;
    }

    // Otherwise, build a PerspectiveCamera from the SceneCamera fields
    const pos = Array.isArray(cam.position)
      ? vec3.fromValues(cam.position[0], cam.position[1], cam.position[2])
      : v3(cam.position as any);
    const rot = Array.isArray(cam.rotation)
      ? quat.fromValues(cam.rotation[0], cam.rotation[1], cam.rotation[2], cam.rotation[3])
      : (cam.rotation as any as quat);

    // Reuse current projection (Rust also keeps projection except for resize)
    const proj = this.splatting_args.camera.projection;
    const pc = new PerspectiveCamera(pos, rot, proj);
    this.update_camera(pc);
  }

  private async set_env_map(_path: string): Promise<void> {
    // Stub — hook your EXR/HDR decode pipeline here if needed
    this.splatting_args.showEnvMap = true;
    this._changed = true;
  }

  private cancle_animation(): void {
    this.animation = null;
    this.controller.reset_to_camera(this.splatting_args.camera);
    this._changed = true;
  }

  private stop_animation(): void {
    if (this.animation) this.animation[1] = false;
    this.controller.reset_to_camera(this.splatting_args.camera);
    this._changed = true;
  }

  private update_camera(camera: PerspectiveCamera): void {
    this.splatting_args.camera = camera;
    this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
    this._changed = true;
  }

  private save_view(): void {
    const sceneArr: SceneCamera[] = [];
    if (this.scene) for (let i = 0; i < this.scene.numCameras(); i++) {
      const c = this.scene.camera(i);
      if (c) sceneArr.push(c);
    }
    const max_scene_id = sceneArr.reduce((m, c) => Math.max(m, c.id ?? 0), 0);
    const max_id = this.saved_cameras.reduce((m, c) => Math.max(m, c.id ?? 0), 0);
    const id = Math.max(max_id, max_scene_id) + 1;

    const cam = SceneCamera.fromPerspective(
      this.splatting_args.camera,
      String(id),
      id,
      { x: this.config.width, y: this.config.height } as any,
      Split.Test
    );
    this.saved_cameras.push(cam);
  }
}

export function smoothstep(x: number): number {
  return x * x * (3.0 - 2.0 * x);
}

/* --------------------------- input binding helper --------------------------- */

function bind_input(canvas: HTMLCanvasElement, controller: CameraController) {
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

/* --------------------------------------------------------------------------- */

export async function open_window(
  file: any,
  scene: any | null,
  config: RenderConfig,
  pointcloud_file_path: string | null,
  scene_file_path: string | null
): Promise<void> {
  const canvas = (document.getElementById('window-canvas') as HTMLCanvasElement) ??
    (() => {
      const c = document.createElement('canvas');
      c.id = 'window-canvas';
      c.style.width = '100%';
      c.style.height = '100%';
      document.body.appendChild(c);
      return c;
    })();

  // Real backing store = CSS * DPR (what we *actually* want to render)
  const backingFromCss = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      w: Math.max(1, Math.floor(rect.width  * dpr)),
      h: Math.max(1, Math.floor(rect.height * dpr)),
      dpr
    };
  };

  // --- TWO-PHASE INIT to mimic Rust ---
  // Phase 0: capture real size we’ll use *after* initialization.
  const { w: realW, h: realH, dpr: realDpr } = backingFromCss();

  // Phase 1: initialize at 800x600 like Rust does before the wasm canvas resize.
  const initW = 800, initH = 600;
  canvas.width = initW;
  canvas.height = initH;

  const state = await WindowContext.new(canvas, file, config);

  const _unbindInput = bind_input(canvas, (state as any)['controller'] as CameraController);

  // Phase 2: immediately resize to the real backing-store size
  const applyRealSize = () => {
    const now = backingFromCss();
    if (canvas.width !== now.w)  canvas.width  = now.w;
    if (canvas.height !== now.h) canvas.height = now.h;
    state.resize({ width: now.w, height: now.h }, now.dpr);
  };
  applyRealSize();

  const ro = new ResizeObserver(applyRealSize);
  ro.observe(canvas);
  addEventListener('resize', applyRealSize, { passive: true });
  addEventListener('orientationchange', applyRealSize, { passive: true });

  (state as any).pointcloud_file_path = pointcloud_file_path;

  if (scene) {
    try {
      const s = await (Scene as any).fromJson(scene);
      (state as any)['set_scene'](s);
      // NEW: switch to scene camera 0 like Rust
      (state as any)['set_scene_camera']?.(0);
      (state as any).scene_file_path = scene_file_path;
    } catch (err) {
      console.error('cannot load scene:', err);
    }
  }

  if (config.skybox) {
    try {
      await (state as any)['set_env_map'](config.skybox);
    } catch (e) {
      console.error('failed to set skybox:', e);
    }
  }

  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = (now - last) / 1000.0;
    last = now;

    (state as any).update(dt);

    const [redraw_ui, shapes] = (state as any).ui();
    const res = (state as any)['splatting_args'].resolution as Float32Array | [number, number];
    const resChange =
      (res as any)[0] !== (state as any)['config'].width ||
      (res as any)[1] !== (state as any)['config'].height;

    const request_redraw = (state as any)._changed || resChange;

    if (request_redraw || redraw_ui) {
      (state as any)['fps'] = (1.0 / Math.max(1e-6, dt)) * 0.05 + (state as any)['fps'] * 0.95;
      (state as any).render(request_redraw, (state as any)['ui_visible'] ? shapes : undefined);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export async function run_wasm(
  pc: ArrayBuffer,
  scene: ArrayBuffer | null,
  pc_file: string | null,
  scene_file: string | null
): Promise<void> {
  await open_window(
    pc,
    scene,
    new RenderConfig(false, null, false),
    pc_file,
    scene_file
  );
}

/* --------------------------------- helpers --------------------------------- */

function deSRGB(fmt: GPUTextureFormat): GPUTextureFormat {
  if (fmt === 'bgra8unorm-srgb') return 'bgra8unorm';
  if (fmt === 'rgba8unorm-srgb') return 'rgba8unorm';
  return fmt;
}
