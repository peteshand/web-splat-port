// lib.ts — 1:1 surface port of lib.rs adapted to your TS APIs
import { vec2, vec3, quat } from 'gl-matrix';
import { GaussianRenderer, Display } from './renderer.js';
import { PointCloud } from './pointcloud.js';
import { PerspectiveCamera, PerspectiveProjection } from './camera.js';
import { CameraController } from './controller.js';
import * as io from './io/mod.js';
import { Scene, SceneCamera, Split } from './scene.js';
import { GPUStopwatch } from './utils.js';
// --- helpers to bridge {x,y,z} <-> gl-matrix tuples ---
const v3 = (p) => vec3.fromValues(p.x, p.y, p.z);
const near = (a, b, eps = 1e-4) => Math.abs(a - b) <= eps;
const nearVec3 = (a, b, eps = 1e-4) => near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps);
const nearQuat = (a, b, eps = 1e-4) => near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps) && near(a[3], b[3], eps);
class EguiWGPU {
    constructor(_device, _fmt, _canvas) { }
    begin_frame(_w) { }
    end_frame(_w) { return {}; }
    prepare(_size, _scale, _dev, _q, _enc, shapes) { return shapes; }
    render(_pass, _state) { }
    cleanup(_state) { }
}
const ui = { ui: (_wc) => false };
/* --------------------------------------------------------------------------- */
export class RenderConfig {
    no_vsync;
    skybox;
    hdr;
    constructor(no_vsync, skybox = null, hdr = false) {
        this.no_vsync = no_vsync;
        this.skybox = skybox;
        this.hdr = hdr;
    }
}
export class WGPUContext {
    device;
    queue;
    adapter;
    static async new_instance() {
        return WGPUContext.new(undefined, undefined);
    }
    static async new(_instance, _surface) {
        if (!('gpu' in navigator))
            throw new Error('WebGPU not available');
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter)
            throw new Error('No WebGPU adapter');
        const device = await adapter.requestDevice({});
        const ctx = new WGPUContext();
        ctx.adapter = adapter;
        ctx.device = device;
        ctx.queue = device.queue;
        return ctx;
    }
}
export class WindowContext {
    wgpu_context;
    surface;
    config;
    window;
    scale_factor;
    pc;
    pointcloud_file_path = null;
    renderer;
    animation = null;
    controller;
    scene = null;
    scene_file_path = null;
    current_view = null;
    ui_renderer;
    fps = 0;
    ui_visible = true;
    display;
    splatting_args;
    saved_cameras = [];
    stopwatch = null;
    static async new(window, pc_file, render_config) {
        const state = new WindowContext();
        const size = {
            width: window.width || 800,
            height: window.height || 600
        };
        state.window = window;
        state.scale_factor = window.ownerDocument?.defaultView?.devicePixelRatio ?? 1;
        const surface = window.getContext('webgpu');
        if (!surface)
            throw new Error('WebGPU canvas context unavailable');
        const wgpu_context = await WGPUContext.new(undefined, surface);
        const surface_format = navigator.gpu.getPreferredCanvasFormat();
        const render_format = render_config.hdr ? 'rgba16float' : 'rgba8unorm';
        surface.configure({
            device: wgpu_context.device,
            format: surface_format,
            alphaMode: 'opaque'
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
        const pc_raw = (await io.GenericGaussianPointCloud?.load?.(pc_file)) ?? pc_file;
        state.pc = await PointCloud.new(wgpu_context.device, pc_raw);
        state.renderer = await GaussianRenderer.create(wgpu_context.device, wgpu_context.queue, render_format, state.pc.shDeg(), state.pc.compressed());
        // ---- Initial camera (tuples, not {x,y,z}) ----
        const aabb = state.pc.bbox();
        const aspect = size.width / Math.max(1, size.height);
        const c0 = state.pc.center();
        const r = aabb.radius();
        const eyeTuple = vec3.fromValues(c0.x - r * 0.5, c0.y - r * 0.5, c0.z - r * 0.5);
        const rot = quat.create();
        const proj = new PerspectiveProjection(size.width, size.height, 45, 0.01, 1000);
        const view_camera = new PerspectiveCamera(eyeTuple, rot, proj);
        const controller = new CameraController(0.1, 0.05);
        const c = state.pc.center();
        controller.center = vec3.fromValues(c.x, c.y, c.z);
        state.ui_renderer = new EguiWGPU(wgpu_context.device, surface_format, window);
        state.display = await Display.create(wgpu_context.device, render_format, deSRGB(surface_format), size.width, size.height);
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
        return state;
    }
    reload() {
        if (!this.pointcloud_file_path)
            throw new Error('no pointcloud file path present');
        console.info('reloading volume from', this.pointcloud_file_path);
        // Stub: supply new data via your app if needed.
        if (this.scene_file_path) {
            console.info('reloading scene from', this.scene_file_path);
        }
    }
    resize(new_size, scale_factor) {
        if (new_size.width > 0 && new_size.height > 0) {
            this.config.width = new_size.width;
            this.config.height = new_size.height;
            this.surface.configure({
                device: this.wgpu_context.device,
                format: this.config.format,
                alphaMode: this.config.alpha_mode
            });
            this.display.resize(this.wgpu_context.device, new_size.width, new_size.height);
            this.splatting_args.camera.projection.resize(new_size.width, new_size.height);
            this.splatting_args.viewport = vec2.fromValues(new_size.width, new_size.height);
            this.splatting_args.camera.projection.resize(new_size.width, new_size.height);
        }
        if (scale_factor !== undefined && scale_factor > 0) {
            this.scale_factor = scale_factor;
        }
    }
    ui() {
        this.ui_renderer.begin_frame(this.window);
        const request_redraw = ui.ui(this);
        const shapes = this.ui_renderer.end_frame(this.window);
        return [request_redraw, shapes];
    }
    update(dt_seconds) {
        const dt = dt_seconds;
        if (this.splatting_args.walltime < 5.0) {
            this.splatting_args.walltime += dt;
        }
        if (this.animation) {
            const [next_camera, playing] = this.animation;
            if (this.controller.user_inptut) {
                this.cancle_animation();
            }
            else {
                const adv = playing ? dt : 0.0;
                this.splatting_args.camera = next_camera.update(adv);
                this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
                if (next_camera.done()) {
                    this.animation = null;
                    this.controller.reset_to_camera(this.splatting_args.camera);
                }
            }
        }
        else {
            this.controller.update_camera(this.splatting_args.camera, dt);
            // check if camera moved out of selected view
            if (this.current_view != null && this.scene) {
                const cam = this.scene.camera(this.current_view);
                if (cam) {
                    const scene_camera = cam.toPerspective ? cam.toPerspective() : cam;
                    const aPos = this.splatting_args.camera.position;
                    const bPos = Array.isArray(scene_camera.position)
                        ? scene_camera.position
                        : v3(scene_camera.position);
                    const pos_change = !nearVec3(aPos, bPos, 1e-4);
                    // Rotation equality optional; if needed:
                    // const aRot: quat = this.splatting_args.camera.rotation as quat;
                    // const bRot: quat = Array.isArray((scene_camera as any).rotation)
                    //   ? ((scene_camera as any).rotation as quat)
                    //   : quat.fromValues((scene_camera as any).rotation.x, (scene_camera as any).rotation.y, (scene_camera as any).rotation.z, (scene_camera as any).rotation.w);
                    // const rot_change = !nearQuat(aRot, bRot, 1e-4);
                    if (pos_change)
                        this.current_view = null;
                }
            }
        }
        const aabb = this.pc.bbox();
        this.splatting_args.camera.fit_near_far(aabb);
    }
    render(redraw_scene, shapes) {
        this.stopwatch?.reset();
        const texture = this.surface.getCurrentTexture?.();
        if (!texture)
            return;
        const view_rgb = texture.createView({ format: deSRGB(this.config.format) });
        const view_srgb = texture.createView();
        const encoder = this.wgpu_context.device.createCommandEncoder({
            label: 'render command encoder'
        });
        if (redraw_scene) {
            this.renderer.prepare(encoder, this.wgpu_context.device, this.wgpu_context.queue, this.pc, this.splatting_args, this.stopwatch ?? undefined);
        }
        let ui_state = null;
        if (shapes) {
            ui_state = this.ui_renderer.prepare({ width: texture.width ?? this.config.width, height: texture.height ?? this.config.height }, this.scale_factor, this.wgpu_context.device, this.wgpu_context.queue, encoder, shapes);
        }
        if (this.stopwatch)
            this.stopwatch.start(encoder, 'rasterization');
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
        if (this.stopwatch)
            this.stopwatch.stop(encoder, 'rasterization');
        // Access camera/settings bind groups from GaussianRenderer’s unified uniform
        const cameraBG = this.renderer.unifiedUniform.getCameraBindGroup();
        const settingsBG = this.renderer.unifiedUniform.getSettingsBindGroup();
        this.display.render(encoder, view_rgb, this.splatting_args.backgroundColor, cameraBG, settingsBG);
        this.stopwatch?.end(encoder);
        if (ui_state) {
            const pass = encoder.beginRenderPass({
                label: 'render pass ui',
                colorAttachments: [{ view: view_srgb, loadOp: 'load', storeOp: 'store' }]
            });
            this.ui_renderer.render(pass, ui_state);
            pass.end();
        }
        if (ui_state)
            this.ui_renderer.cleanup(ui_state);
        this.wgpu_context.queue.submit([encoder.finish()]);
        texture.present?.();
        this.splatting_args.resolution = vec2.fromValues(this.config.width, this.config.height);
    }
    set_scene(scene) {
        // sceneExtend: use point cloud radius (public)
        this.splatting_args.sceneExtend = this.pc.bbox().radius();
        // Center: average scene cameras if available, else pc.center()
        const n = scene.numCameras();
        let acc = { x: 0, y: 0, z: 0 };
        let cnt = 0;
        for (let i = 0; i < n; i++) {
            const c = scene.camera(i);
            if (c) {
                // positions are vec3 tuples
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
            const arr = [];
            for (let i = 0; i < scene.numCameras(); i++) {
                const c = scene.camera(i);
                if (c && (c.split === undefined || c.split === Split.Test))
                    arr.push(c);
            }
            this.saved_cameras = arr;
        }
    }
    async set_env_map(_path) {
        // Stub — hook your EXR/HDR decode pipeline here if needed
        this.splatting_args.showEnvMap = true;
    }
    /*private start_tracking_shot(): void {
      if (this.saved_cameras.length > 1) {
        const shot = TrackingShot.from_cameras(this.saved_cameras.slice() as unknown as PerspectiveCamera[]);
        const a: Animation<PerspectiveCamera> = new Animation<PerspectiveCamera>(
          this.saved_cameras.length * 2.0,
          true,
          shot as unknown as PerspectiveCamera
        );
        this.animation = [a, true];
      }
    }*/
    cancle_animation() {
        this.animation = null;
        this.controller.reset_to_camera(this.splatting_args.camera);
    }
    stop_animation() {
        if (this.animation)
            this.animation[1] = false;
        this.controller.reset_to_camera(this.splatting_args.camera);
    }
    /*private set_scene_camera(i: number): void {
      if (this.scene) {
        this.current_view = i;
        const camera = this.scene.camera(i);
        if (camera) {
          this.set_camera(camera, 0.2);
        } else {
          console.error(`camera ${i} not found`);
        }
      }
    }*/
    /*public set_camera(camera: PerspectiveCamera | SceneCamera, animation_duration: number): void {
      const target: PerspectiveCamera = (camera as any).toPerspective ? (camera as any).toPerspective() : (camera as PerspectiveCamera);
      if (animation_duration <= 0) {
        this.update_camera(target);
      } else {
        const a: Animation<PerspectiveCamera> = new Animation<PerspectiveCamera>(
          animation_duration,
          false,
          new Transition(this.splatting_args.camera, target, smoothstep) as unknown as PerspectiveCamera
        );
        this.animation = [a, true];
      }
    }*/
    update_camera(camera) {
        this.splatting_args.camera = camera;
        this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
    }
    save_view() {
        const sceneArr = [];
        if (this.scene)
            for (let i = 0; i < this.scene.numCameras(); i++) {
                const c = this.scene.camera(i);
                if (c)
                    sceneArr.push(c);
            }
        const max_scene_id = sceneArr.reduce((m, c) => Math.max(m, c.id ?? 0), 0);
        const max_id = this.saved_cameras.reduce((m, c) => Math.max(m, c.id ?? 0), 0);
        const id = Math.max(max_id, max_scene_id) + 1;
        const cam = SceneCamera.fromPerspective(this.splatting_args.camera, String(id), id, { x: this.config.width, y: this.config.height }, Split.Test);
        this.saved_cameras.push(cam);
    }
}
export function smoothstep(x) {
    return x * x * (3.0 - 2.0 * x);
}
export async function open_window(file, scene_file, config, pointcloud_file_path, scene_file_path) {
    const canvas = document.getElementById('window-canvas') ??
        (() => {
            const c = document.createElement('canvas');
            c.id = 'window-canvas';
            c.style.width = '100%';
            c.style.height = '100%';
            document.body.appendChild(c);
            const dpr = window.devicePixelRatio || 1;
            const rect = c.getBoundingClientRect();
            c.width = Math.max(1, Math.floor(rect.width * dpr));
            c.height = Math.max(1, Math.floor(rect.height * dpr));
            return c;
        })();
    const state = await WindowContext.new(canvas, file, config);
    state.pointcloud_file_path = pointcloud_file_path;
    if (scene_file) {
        try {
            const s = await Scene.fromJson(scene_file);
            state['set_scene'](s);
            state;
            state.scene_file_path = scene_file_path;
        }
        catch (err) {
            console.error('cannot load scene:', err);
        }
    }
    if (config.skybox) {
        try {
            await state['set_env_map'](config.skybox);
        }
        catch (e) {
            console.error('failed to set skybox:', e);
        }
    }
    let last = performance.now();
    const loop = () => {
        const now = performance.now();
        const dt = (now - last) / 1000.0;
        last = now;
        const old_settings = JSON.stringify(state['splatting_args']);
        state.update(dt);
        const [redraw_ui, shapes] = state.ui();
        const res = state['splatting_args'].resolution;
        const resChange = res[0] !== state['config'].width ||
            res[1] !== state['config'].height;
        const request_redraw = old_settings !== JSON.stringify(state['splatting_args']) || resChange;
        if (request_redraw || redraw_ui) {
            state['fps'] = (1.0 / Math.max(1e-6, dt)) * 0.05 + state['fps'] * 0.95;
            state.render(request_redraw, state['ui_visible'] ? shapes : undefined);
        }
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}
export async function run_wasm(pc, scene, pc_file, scene_file) {
    await open_window(pc, scene, new RenderConfig(false, null, false), pc_file, scene_file);
}
/* --------------------------------- helpers --------------------------------- */
function deSRGB(fmt) {
    if (fmt === 'bgra8unorm-srgb')
        return 'bgra8unorm';
    if (fmt === 'rgba8unorm-srgb')
        return 'rgba8unorm';
    return fmt;
}
//# sourceMappingURL=lib.js.map