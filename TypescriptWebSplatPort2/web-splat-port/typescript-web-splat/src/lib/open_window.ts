import { RenderConfig } from './RenderConfig';
import { WindowContext } from './WindowContext';
import { bind_input } from './internal';

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

  const _unbindInput = bind_input(canvas, (state as any)['controller'] as any);

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
      const s = await (await import('../scene')).Scene.fromJson(scene);
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
