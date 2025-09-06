package lib;

import js.Browser;
import js.html.CanvasElement;
import js.html.TextDecoder;
import js.lib.ArrayBuffer;
import js.lib.Promise;
import js.lib.Float32Array;
import js.lib.Uint8Array;

import resize.ResizeObserver;

import lib.SurfaceContext;
import lib.RenderConfig;
import scene.Scene;
import lib.EguiWGPU.Internal;

/**
 * Engine instance: set up once via initialize(), then call load_point_cloud() and (optionally) load_scene().
 * Mirrors the behavior in open_window.ts.
 */
class Engine {
  // Instance state
  var canvas:CanvasElement;
  var cfg:RenderConfig;
  var state:Null<SurfaceContext> = null;

  var _loopStarted:Bool = false;
  var _resizeObserver:Dynamic = null;
  var _unbindInput:Dynamic = null;

  // Size captured BEFORE wasm/SurfaceContext init (to avoid a frame of wrong size)
  var _capturedW:Int = 800;
  var _capturedH:Int = 600;
  var _capturedDpr:Float = 1.0;

  function new() {}

  /** Create or reuse the canvas, attach resize handlers, and store config. */
  public static function initialize(?config:RenderConfig):Promise<Engine> {
    return new Promise(function (resolve, reject) {
      try {
        var eng = new Engine();
        eng.cfg = (config != null) ? config : new RenderConfig(false, null, false);

        // Ensure a canvas exists
        var c:CanvasElement = cast Browser.document.getElementById('window-canvas');
        if (c == null) {
          c = Browser.document.createCanvasElement();
          c.id = 'window-canvas';
          c.style.width = '100%';
          c.style.height = '100%';
          Browser.document.body.appendChild(c);
        }

        eng.canvas = c;

        // Phase 0: capture the real backing size we want to use immediately after init
        final css = eng.backingFromCss();
        eng._capturedW = css.w;
        eng._capturedH = css.h;
        eng._capturedDpr = css.dpr;

        // Phase 1: initialize at 800x600 like Rust/TS do before the wasm canvas resize.
        c.width  = 800;
        c.height = 600;

        resolve(eng);
      } catch (e:Dynamic) {
        reject(e);
      }
    });
  }

  /** Load the point cloud and spin up the renderer + main loop. Must be called before load_scene(). */
  public function load_point_cloud(
    file:ArrayBuffer,
    pointcloud_file_path:Null<String>
  ):Promise<Dynamic> {
    final self = this;
    return new Promise(function (resolve, reject) {
      SurfaceContext.create(canvas, file, cfg).then(function(s) {
        state = s;

        // Bind input now that we have a controller
        try {
          _unbindInput = Internal.bind_input(canvas, state.controller);
        } catch (_:Dynamic) {}

        // Record source path
        state.pointcloud_file_path = pointcloud_file_path;

        // Phase 2: immediately resize to the captured real backing-store size
        // (mirrors applyRealSize() right away, but with the pre-captured size)
        self.applyCapturedSize();

        self.installResizeHandlers();

        // Optional env map (if cfg.skybox exists)
        if (cfg.skybox != null) {
          try {
            state.set_env_map(cfg.skybox);
          } catch (_:Dynamic) {
            // non-fatal
          }
        }

        // Start the render loop once
        startLoop();

        resolve(null);
      }).catchError(reject);
    });
  }

  /** Load optional scene JSON (camera sets, etc.). Requires load_point_cloud() called first. */
  public function load_scene(
    sceneBuf:ArrayBuffer,
    scene_file_path:Null<String>
  ):Promise<Dynamic> {
    return new Promise(function (resolve, reject) {
      if (state == null) {
        reject('Engine not ready: call load_point_cloud() before load_scene().');
        return;
      }
      try {
        var td = new TextDecoder("utf-8");
        var jsonText = td.decode(new Uint8Array(sceneBuf));
        var json:Dynamic = haxe.Json.parse(jsonText);
        var sc = Scene.fromJson(cast json);

        state.set_scene(sc);
        // Match TS: switch to scene camera 0
        try state.set_scene_camera(0) catch (_:Dynamic) {}
        state.scene_file_path = scene_file_path;

        resolve(null);
      } catch (err:Dynamic) {
        reject(err);
      }
    });
  }

  // ---------------------------- internals ----------------------------

  /** Compute real backing store from CSS size and DPR, min 1x1, floor like TS. */
  inline function backingFromCss():{ w:Int, h:Int, dpr:Float } {
    var rect = canvas.getBoundingClientRect();
    var dpr:Float = (untyped Browser.window.devicePixelRatio) != null ? cast untyped Browser.window.devicePixelRatio : 1.0;
    var w = Std.int(Math.max(1, Math.floor(rect.width  * dpr)));
    var h = Std.int(Math.max(1, Math.floor(rect.height * dpr)));
    return { w: w, h: h, dpr: dpr };
  }

  /** Resize once using the captured (pre-init) size. */
  function applyCapturedSize():Void {
    if (canvas == null || state == null) return;

    if (canvas.width != _capturedW)  canvas.width  = _capturedW;
    if (canvas.height != _capturedH) canvas.height = _capturedH;

    state.resize({ width: _capturedW, height: _capturedH }, _capturedDpr);
  }

  /** Resize the canvas to match current CSS*DPR and notify SurfaceContext if present. */
  function applyRealSize():Void {
    if (canvas == null) return;

    final now = backingFromCss();

    if (canvas.width != now.w)  canvas.width  = now.w;
    if (canvas.height != now.h) canvas.height = now.h;

    if (state != null) {
      state.resize({ width: now.w, height: now.h }, now.dpr);
    }
  }

  function installResizeHandlers():Void {
    // Responsive: observe element size + window events
    try {
      _resizeObserver = new ResizeObserver(function(_){ applyRealSize(); });
      _resizeObserver.observe(canvas);
    } catch (_:Dynamic) {}
    Browser.window.addEventListener('resize', function(_){ applyRealSize(); });
    Browser.window.addEventListener('orientationchange', function(_){ applyRealSize(); });
  }

  function startLoop():Void {
    if (_loopStarted) return;
    _loopStarted = true;

    var last = Browser.window.performance.now();
    function loop(_:Float):Void {
      var now = Browser.window.performance.now();
      var dt = (now - last) / 1000.0;
      last = now;

      if (state != null) {
        state.update(dt);

        // --- UI ---
        var shapes:Dynamic = null;
        var redraw_ui:Bool = false;
        var uiRes:Dynamic = null;
        try {
          uiRes = state.ui();
        } catch (_:Dynamic) {}

        if (uiRes != null && uiRes.length >= 2) {
          // ui() returns [bool, shapes]
          redraw_ui = (uiRes[0] == true);
          shapes    = uiRes[1];
        }

        // --- Resolution change check (match TS) ---
        var resChange:Bool = false;
        try {
          var resDyn:Dynamic = Reflect.field(state, "splatting_args");
          if (resDyn != null) {
            var res:Dynamic = Reflect.field(resDyn, "resolution");
            var res0:Float = 0, res1:Float = 0;

            // Support Float32Array or [number, number]
            if (Std.isOfType(res, Float32Array)) {
              var fa:Float32Array = cast res;
              if (fa.length >= 2) { res0 = fa[0]; res1 = fa[1]; }
            } else if (res != null && res.length >= 2) {
              res0 = res[0];
              res1 = res[1];
            }

            var cfgDyn:Dynamic = Reflect.field(state, "config");
            var cw:Float = (cfgDyn != null && Reflect.hasField(cfgDyn, "width"))  ? Reflect.field(cfgDyn, "width")  : 0;
            var ch:Float = (cfgDyn != null && Reflect.hasField(cfgDyn, "height")) ? Reflect.field(cfgDyn, "height") : 0;

            resChange = (res0 != cw || res1 != ch);
          }
        } catch (_:Dynamic) {
          resChange = false;
        }

        // --- _changed flag (match TS) ---
        var changed:Bool = false;
        try {
          var cDyn:Dynamic = Reflect.field(state, "_changed");
          if (cDyn != null) changed = (cDyn == true);
        } catch (_:Dynamic) {}

        var request_redraw:Bool = changed || resChange;

        // Optional needsRedraw()
        try {
          if (state.needsRedraw()) request_redraw = true;
        } catch (_:Dynamic) {}

        // Smoothed FPS like TS (fps = 1/dt * 0.05 + fps * 0.95)
        try {
          var fpsPrev:Float = 0.0;
          if (Reflect.hasField(state, "fps")) fpsPrev = Reflect.field(state, "fps");
          var fpsNow = 1.0 / Math.max(1e-6, dt);
          var fpsSmooth = fpsNow * 0.05 + fpsPrev * 0.95;
          Reflect.setField(state, "fps", fpsSmooth);
        } catch (_:Dynamic) {}

        // Render
        try {
          state.render(request_redraw || redraw_ui, (state.ui_visible ? shapes : null));
        } catch (_:Dynamic) {}
      }

      Browser.window.requestAnimationFrame(loop);
    }
    Browser.window.requestAnimationFrame(loop);

    // Kick an early size sync in case CSS changed between initialize and now
    applyRealSize();
  }
}
