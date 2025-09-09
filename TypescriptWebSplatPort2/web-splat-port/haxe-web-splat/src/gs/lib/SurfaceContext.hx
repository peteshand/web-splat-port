package gs.lib;

import gl_matrix.Vec2;
import gl_matrix.Vec3;
import gl_matrix.Quat;

import gs.lib.EguiWGPU;
import gs.lib.EguiWGPU.Internal.deSRGB;
import gs.lib.EguiWGPU.Internal.nearVec3;
import gs.lib.EguiWGPU.Internal.nearQuat;

import gs.renderer.Display;
import gs.renderer.GaussianRenderer;
import gs.renderer.SplattingArgs;

import gs.camera.PerspectiveCamera;
import gs.camera.PerspectiveProjection;

import gs.io.Mod.GenericGaussianPointCloud;
import gs.animation.Animation;
import gs.pointcloud.PointCloud;
import gs.controller.CameraController;

import gs.scene.Scene;
import gs.scene.SceneCamera;
import gs.scene.Split;

import gs.utils.GPUStopwatch;

import js.Browser;
import js.html.CanvasElement;
import js.lib.Promise;

class SurfaceContext {
  // --- GPU / surface ---
  public var wgpu_context:GPUContext;
  var surface:GPUCanvasContext;
  public var config:SurfaceConfiguration;
  var window:CanvasElement;
  var scale_factor:Float;

  // --- app state ---
  public var pc:PointCloud;
  public var pointcloud_file_path:Null<String> = null;
  var renderer:GaussianRenderer;
  var animation:Null<Array<Dynamic>> = null; // [Animation<PerspectiveCamera>, Bool]
  public var controller:CameraController;
  var scene:Null<Scene> = null;
  public var scene_file_path:Null<String> = null;
  var current_view:Null<Int> = null;
  var ui_renderer:EguiWGPU;
  public var fps:Float = 0;
  public var ui_visible:Bool = true;

  var display:Display;
  public var splatting_args:SplattingArgs;
  var saved_cameras:Array<SceneCamera> = [];
  var stopwatch:Null<GPUStopwatch> = null;

  // --------- PERF tracking -------
  var _lastCamPos:Vec3 = Vec3.create();
  var _lastCamRot:Quat = Quat.create();
  var _lastWalltime:Float = 0;
  var _changed:Bool = true;
  // --------------------------------

  function new() {}

  /** prefer typed factory over reflection */
  @:keep
  public static function create(
    window:CanvasElement,
    pc_file:js.lib.ArrayBuffer,
    render_config:RenderConfig
  ):Promise<SurfaceContext> {
    return new Promise(function(resolve, reject) {
      var state = new SurfaceContext();

      // Canvas size
      var rect = window.getBoundingClientRect();
      var size = {
        width:  Std.int(Math.max(1, (window.width  != null && window.width  > 0) ? window.width  : Math.floor(rect.width))),
        height: Std.int(Math.max(1, (window.height != null && window.height > 0) ? window.height : Math.floor(rect.height)))
      };
      
      trace('create size: ' + size.width + 'x' + size.height);

      state.window = window;
      var dpr:Dynamic = (window.ownerDocument != null && window.ownerDocument.defaultView != null)
        ? window.ownerDocument.defaultView.devicePixelRatio : null;
      state.scale_factor = dpr != null ? dpr : 1;

      // WebGPU canvas context
      var s = window.getContext('webgpu');
      if (s == null) { reject('WebGPU canvas context unavailable'); return; }
      state.surface = cast s;

      // WebGPU device/queue
      GPUContext.create(null, state.surface).then(function(wgpu_context) {
        state.wgpu_context = wgpu_context;

        var surface_format:GPUTextureFormat = untyped navigator.gpu.getPreferredCanvasFormat();
        var render_format:GPUTextureFormat = render_config.hdr ? 'rgba16float' : 'rgba8unorm';

        state.surface.configure({
          device: wgpu_context.device,
          format: surface_format,
          alphaMode: 'opaque',
          viewFormats: [deSRGB(surface_format)]
        });

        state.config = {
          format: surface_format,
          width: size.width,
          height: size.height,
          present_mode: render_config.no_vsync ? 'auto-no-vsync' : 'auto-vsync',
          alpha_mode: 'opaque',
          view_formats: [deSRGB(surface_format)]
        };

        // Load + build PointCloud
        var genericPc:GenericGaussianPointCloud;
        try {
          genericPc = GenericGaussianPointCloud.load(pc_file);
        } catch (e:Dynamic) {
          reject('Failed to parse point cloud: ' + e);
          return;
        }

        PointCloud.create(wgpu_context.device, genericPc).then(function(pc) {
          state.pc = pc;

          GaussianRenderer.create(
            wgpu_context.device,
            wgpu_context.queue,
            render_format,
            state.pc.shDeg(),
            state.pc.compressed()
          ).then(function(renderer) {
            state.renderer = renderer;

            // Initial camera
            var aabb = state.pc.bbox();
            var aspect:Float = size.width / Math.max(1, size.height);

            var c0v = aabb.center();
            var c0 = Vec3.fromValues(c0v.x, c0v.y, c0v.z);
            var r:Float = aabb.radius();
            var eye = Vec3.fromValues(c0[0] - r * 0.5, c0[1] - r * 0.5, c0[2] - r * 0.5);
            var rot = Quat.create();

            var deg2rad = function(d:Float) return (d * Math.PI) / 180.0;
            var fovx = deg2rad(45);
            var fovy = deg2rad(45 / Math.max(1e-6, aspect));

            var proj = PerspectiveProjection.create(
              Vec2.fromValues(size.width, size.height),
              Vec2.fromValues(fovx, fovy),
              0.01,
              1000
            );

            var view_camera = new PerspectiveCamera(eye, rot, proj);

            var controller = new CameraController(0.1, 0.05);
            var c = state.pc.center();
            controller.center = Vec3.fromValues(c.x, c.y, c.z);
            state.controller = controller;

            state.ui_renderer = new EguiWGPU(wgpu_context.device, surface_format, window);

            Display.create(
              wgpu_context.device,
              render_format,
              deSRGB(surface_format),
              size.width,
              size.height
            ).then(function(display) {
              state.display = display;

              state.stopwatch = new GPUStopwatch(wgpu_context.device, 3);

              state.splatting_args = {
                camera: view_camera,
                viewport: Vec2.fromValues(size.width, size.height),
                gaussianScaling: 1.0,
                maxShDeg: state.pc.shDeg(),
                showEnvMap: false,
                mipSplatting: null,
                kernelSize: null,
                clippingBox: null,
                walltime: 0.0,
                sceneCenter: null,
                sceneExtend: null,
                backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
                resolution: Vec2.fromValues(size.width, size.height)
              };

              // change tracking baseline
              Vec3.copy(state._lastCamPos, state.splatting_args.camera.position);
              Quat.copy(state._lastCamRot, state.splatting_args.camera.rotation);
              state._lastWalltime = state.splatting_args.walltime;

              resolve(state);
            }).catchError(reject);
          }).catchError(reject);
        }).catchError(reject);
      }).catchError(reject);
    });
  }

  @:keep
  public function reload():Void {
    if (this.pointcloud_file_path == null) throw 'no pointcloud file path present';
    console.info('reloading volume from', this.pointcloud_file_path);
    if (this.scene_file_path != null) {
      console.info('reloading scene from', this.scene_file_path);
    }
  }

  @:keep
  public function resize(new_size:{ width:Int, height:Int }, ?scale_factor:Float):Void {
    if (new_size != null && new_size.width > 0 && new_size.height > 0) {
      this.config.width = new_size.width;
      this.config.height = new_size.height;

      this.surface.configure({
        device: this.wgpu_context.device,
        format: this.config.format,
        alphaMode: this.config.alpha_mode,
        viewFormats: this.config.view_formats
      });

      this.display.resize(this.wgpu_context.device, new_size.width, new_size.height);

      this.splatting_args.camera.projection.resize(new_size.width, new_size.height);
      this.splatting_args.viewport[0] = new_size.width;
      this.splatting_args.viewport[1] = new_size.height;

      this._changed = true;
    }
    if (scale_factor != null && scale_factor > 0) {
      this.scale_factor = scale_factor;
    }
  }

  @:keep
  public function ui():Array<Dynamic> {
    this.ui_renderer.begin_frame(this.window);
    var request_redraw:Bool = EguiWGPU.Ui.ui(this);
    var shapes:Dynamic = this.ui_renderer.end_frame(this.window);
    return [request_redraw, shapes];
  }

  @:keep
  public function update(dt_seconds:Float):Void {
    var dt = dt_seconds;

    if (this.splatting_args.walltime < 5.0) {
      this.splatting_args.walltime += dt;
    }

    if (this.animation != null) {
      var next_camera:Animation<PerspectiveCamera> = cast this.animation[0];
      var playing:Bool = this.animation[1];
      var userInput:Bool = try this.controller.user_input catch (_) false;
      if (userInput) {
        this.cancel_animation();
      } else {
        var adv = playing ? dt : 0.0;
        this.splatting_args.camera = next_camera.update(adv);
        this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
        if (next_camera.done()) {
          this.animation = null;
          this.controller.reset_to_camera(this.splatting_args.camera);
        }
      }
    } else {
      this.controller.update_camera(this.splatting_args.camera, dt);

      if (this.current_view != null && this.scene != null) {
        var cam:SceneCamera = this.scene.camera(this.current_view);
        if (cam != null) {
          var aPos:Vec3 = cast this.splatting_args.camera.position;
          var bPos:Vec3 = toVec3(cam.position);
          var pos_change:Bool = !nearVec3(aPos, bPos, 1e-4);
          if (pos_change) this.current_view = null;
        }
      }
    }

    var aabb = this.pc.bbox();
    this.splatting_args.camera.fit_near_far(aabb);

    var pos:Vec3 = cast this.splatting_args.camera.position;
    var rot:Quat = cast this.splatting_args.camera.rotation;
    if (!nearVec3(this._lastCamPos, pos, 1e-4) || !nearQuat(this._lastCamRot, rot, 1e-6) ||
        this.splatting_args.walltime != this._lastWalltime) {
      Vec3.copy(this._lastCamPos, pos);
      Quat.copy(this._lastCamRot, rot);
      this._lastWalltime = this.splatting_args.walltime;
      this._changed = true;
    }
  }

  @:keep
  public function render(redraw_scene:Bool, ?shapes:Dynamic):Void {
    if (this.stopwatch != null) this.stopwatch.reset();

    var texture = getCurrentTextureSafe(this.surface);
    if (texture == null) return;

    var view_rgb  = texture.createView({ format: deSRGB(this.config.format) });
    var view_srgb = texture.createView();

    var encoder = this.wgpu_context.device.createCommandEncoder({
      label: 'render command encoder'
    });

    if (redraw_scene) {
      this.renderer.prepare(
        encoder,
        this.wgpu_context.device,
        this.wgpu_context.queue,
        this.pc,
        this.splatting_args,
        (this.stopwatch != null ? this.stopwatch : null)
      );
    }

    var ui_state:Dynamic = null;
    if (shapes != null) {
      ui_state = this.ui_renderer.prepare(
        { width: this.config.width, height: this.config.height },
        this.scale_factor,
        this.wgpu_context.device,
        this.wgpu_context.queue,
        encoder,
        shapes
      );
    }

    if (this.stopwatch != null) this.stopwatch.start(encoder, 'rasterization');
    if (redraw_scene) {
      var pass = encoder.beginRenderPass({
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
    if (this.stopwatch != null) this.stopwatch.stop(encoder, 'rasterization');

    var cameraBG   = this.renderer.camera().bind_group();
    var settingsBG = this.renderer.render_settings().bind_group();

    this.display.render(
      encoder,
      view_rgb,
      this.splatting_args.backgroundColor,
      cameraBG,
      settingsBG
    );

    if (this.stopwatch != null) this.stopwatch.end(encoder);

    if (ui_state != null) {
      var passUi = encoder.beginRenderPass({
        label: 'render pass ui',
        colorAttachments: [{ view: view_srgb, loadOp: 'load', storeOp: 'store' }]
      });
      this.ui_renderer.render(passUi, ui_state);
      passUi.end();
      this.ui_renderer.cleanup(ui_state);
    }

    this.wgpu_context.queue.submit([encoder.finish()]);
    this.splatting_args.resolution[0] = this.config.width;
    this.splatting_args.resolution[1] = this.config.height;
    this._changed = false;
  }

  // Public API used by the window bootstrapper
  @:keep
  public function set_scene(scene:Scene):Void {
    var extend:Float = scene.getExtend();
    this.splatting_args.sceneExtend = extend;

    // compute center from cameras
    var cams = scene.getCameras();
    var cnt = cams.length;
    var acc = { x: 0.0, y: 0.0, z: 0.0 };
    for (c in cams) {
      acc.x += c.position[0];
      acc.y += c.position[1];
      acc.z += c.position[2];
    }
    var center = (cnt > 0) ? { x: acc.x / cnt, y: acc.y / cnt, z: acc.z / cnt } : this.pc.center();
    this.controller.center = Vec3.fromValues(center.x, center.y, center.z);

    this.scene = scene;
    if (this.saved_cameras.length == 0) {
      var arr:Array<SceneCamera> = [];
      for (c in scene.getCameras()) {
        if (c != null && (c.split == null || c.split == Split.Test)) arr.push(c);
      }
      this.saved_cameras = arr;
    }
    this._changed = true;
  }

  @:keep
  public function set_scene_camera(i:Int):Void {
    if (this.scene == null) return;
    this.current_view = i;
    var cam:SceneCamera = this.scene.camera(i);
    if (cam == null) return;

    var pos = toVec3(cam.position);
    var rot = toQuat(cam.rotation);

    var proj = this.splatting_args.camera.projection;
    var pcam = new PerspectiveCamera(pos, rot, proj);
    this.update_camera(pcam);
  }

  @:keep
  public function set_env_map(_path:String):Promise<Dynamic> {
    this.splatting_args.showEnvMap = true;
    this._changed = true;
    return Promise.resolve(null);
  }

  @:keep
  public function cancel_animation():Void {
    this.animation = null;
    this.controller.reset_to_camera(this.splatting_args.camera);
    this._changed = true;
  }

  @:keep
  public inline function cancle_animation():Void cancel_animation(); // alias for legacy calls

  @:keep
  public function stop_animation():Void {
    if (this.animation != null) this.animation[1] = false;
    this.controller.reset_to_camera(this.splatting_args.camera);
    this._changed = true;
  }

  @:keep
  public function update_camera(camera:PerspectiveCamera):Void {
    this.splatting_args.camera = camera;
    this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
    this._changed = true;
  }

  @:keep
  public function save_view():Void {
    var sceneArr:Array<SceneCamera> = [];
    if (this.scene != null) {
      for (c in this.scene.getCameras()) sceneArr.push(c);
    }
    var max_scene_id = 0;
    for (c in sceneArr) if (c.id != null) max_scene_id = Std.int(Math.max(max_scene_id, c.id));
    var max_id = 0;
    for (c in this.saved_cameras) if (c.id != null) max_id = Std.int(Math.max(max_id, c.id));
    var id = Std.int(Math.max(max_id, max_scene_id)) + 1;

    var cam = SceneCamera.fromPerspective(
      this.splatting_args.camera,
      Std.string(id),
      id,
      Vec2.fromValues(this.config.width, this.config.height),
      Split.Test
    );
    this.saved_cameras.push(cam);
  }

  @:keep
  public inline function needsRedraw():Bool return _changed;

  // -------- helpers --------
  @:keep
  static inline function toVec3(v:Array<Float>):Vec3 {
    return Vec3.fromValues(v[0], v[1], v[2]);
  }
  @:keep
  static inline function toQuat(v:Mat3x3):Quat {
    var a:Array<Float> = cast v;
    return Quat.fromValues(a[0], a[1], a[2], a[3]);
  }

  @:keep
  static inline function getCurrentTextureSafe(ctx:GPUCanvasContext):Null<GPUTexture> {
    var tex:GPUTexture = null;
    try tex = ctx.getCurrentTexture() catch (_:Dynamic) {}
    return tex;
  }
}
