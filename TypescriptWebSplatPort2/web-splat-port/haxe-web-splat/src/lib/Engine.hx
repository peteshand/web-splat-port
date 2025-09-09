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
import loader.GaussianLoader;

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

  /** Create/reuse canvas, capture initial size, and store config. */
  public function new(?config:RenderConfig) {
    cfg = (config != null) ? config : new RenderConfig(false, null, false);

    // Ensure a canvas exists
    var c:CanvasElement = cast Browser.document.getElementById('window-canvas');
    if (c == null) {
      c = Browser.document.createCanvasElement();
      c.id = 'window-canvas';
      c.style.width = '100%';
      c.style.height = '100%';
      Browser.document.body.appendChild(c);
    }
    canvas = c;

    // Capture desired backing size before wasm init
    final css = backingFromCss();
    _capturedW = css.w;
    _capturedH = css.h;
    _capturedDpr = css.dpr;

    // Bootstrap at 800x600 like TS/Rust (SurfaceContext.resize will correct it)
    c.width  = 800;
    c.height = 600;
  }

  /** Convenience: check if SurfaceContext is ready */
  public var isReady(get, never):Bool;
  inline function get_isReady():Bool return state != null;

  /**
   * High-level bootstrap that loads the point cloud (required) and scene (optional)
   * from URLs using provided loaders. Progress is emitted by the pcLoader you pass in.
   */
  public function load_from_urls_cb(
    pcUrl:String,
    ?sceneUrl:String,
    ?pcLoader:GaussianLoader,
    ?sceneLoader:GaussianLoader,
    ?onReady:Void->Void,
    ?onError:Dynamic->Void
  ):Void {
    if (pcUrl == null) {
      if (onError != null) onError('Missing file URL');
      return;
    }

    final _pcLoader = (pcLoader != null) ? pcLoader : new GaussianLoader();
    final _sceneLoader = (sceneUrl != null)
      ? ((sceneLoader != null) ? sceneLoader : new GaussianLoader())
      : null;

    final pcPromise:Promise<ArrayBuffer> = _pcLoader.load(pcUrl);
    final scenePromise:Promise<Dynamic> =
      (sceneUrl != null && sceneUrl != "")
        ? _sceneLoader.load(sceneUrl, "application/json")
        : Promise.resolve(null);

    Promise.all([pcPromise, scenePromise]).then(function(arr) {
      final pc_data:ArrayBuffer          = cast arr[0];
      final scene_data:Null<ArrayBuffer> = cast arr[1];

      load_point_cloud(pc_data, pcUrl).then(function(_) {
        if (scene_data != null) {
          try {
            load_scene_sync(scene_data, sceneUrl);
          } catch (e:Dynamic) {
            if (onError != null) { onError(e); return null; } else throw e;
          }
        }
        if (onReady != null) onReady();
        return null;
      }).catchError(function(err) {
        if (onError != null) onError(err); else throw err;
        return null;
      });
      return null;
    }).catchError(function(err) {
      if (onError != null) onError(err); else throw err;
      return null;
    });
  }

  /** Optional Promise wrapper around load_from_urls_cb for Promise-style callers. */
  public function load_from_urls(
    pcUrl:String,
    ?sceneUrl:String,
    ?pcLoader:GaussianLoader,
    ?sceneLoader:GaussianLoader
  ):Promise<Dynamic> {
    return new Promise(function(resolve, reject) {
      load_from_urls_cb(pcUrl, sceneUrl, pcLoader, sceneLoader, function() resolve(null), reject);
    });
  }

  /**
   * Load the point cloud and spin up the renderer + main loop.
   * Must be called before load_scene_sync().
   *
   * Promise-based (SurfaceContext.create is async).
   */
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

        // Resize to the captured backing-store size
        self.applyCapturedSize();

        self.installResizeHandlers();

        // Optional env map
        try {
          if (cfg.skybox != null && state.set_env_map != null) {
            state.set_env_map(cfg.skybox);
          }
        } catch (_:Dynamic) {
          // non-fatal
        }

        // Start the render loop once
        startLoop();

        resolve(null);
      }).catchError(reject);
    });
  }

  /**
   * Load optional scene JSON (camera sets, etc.).
   * Requires load_point_cloud() to have completed.
   * SYNCHRONOUS version (throws on error).
   */
  public function load_scene_sync(
    sceneBuf:ArrayBuffer,
    scene_file_path:Null<String>
  ):Void {
    if (state == null) throw 'Engine not ready: call load_point_cloud() before load_scene_sync().';

    var td = new TextDecoder("utf-8");
    var jsonText = td.decode(new Uint8Array(sceneBuf));
    var json:Dynamic = haxe.Json.parse(jsonText);
    var sc = Scene.fromJson(cast json);

    state.set_scene(sc);
    if (state.set_scene_camera != null) try state.set_scene_camera(0) catch (_:Dynamic) {}
    state.scene_file_path = scene_file_path;
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

    // Typed direct call keeps DCE happy (you already have @:keep on SurfaceContext.resize)
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
        try {
          var uiArr = state.ui();
          if (uiArr != null && uiArr.length >= 2) {
            // ui() returns [bool, shapes]
            redraw_ui = (uiArr[0] == true);
            shapes    = uiArr[1];
          }
        } catch (_:Dynamic) {}

        // --- Resolution change check (match TS) ---
        var resChange:Bool = false;
        try {
          if (state.splatting_args != null) {
            var res:Float32Array = cast state.splatting_args.resolution;
            var res0:Float = (res != null && res.length >= 1) ? res[0] : 0;
            var res1:Float = (res != null && res.length >= 2) ? res[1] : 0;

            var cw:Float = state.config.width;
            var ch:Float = state.config.height;
            resChange = (res0 != cw || res1 != ch);
          }
        } catch (_:Dynamic) {
          resChange = false;
        }

        // --- redraw decision ---
        var request_redraw:Bool = resChange;
        try {
          if (state.needsRedraw != null && state.needsRedraw()) request_redraw = true;
        } catch (_:Dynamic) {}

        // Smoothed FPS like TS (fps = 1/dt * 0.05 + fps * 0.95)
        try {
          var fpsPrev:Float = state.fps;
          var fpsNow = 1.0 / Math.max(1e-6, dt);
          var fpsSmooth = fpsNow * 0.05 + fpsPrev * 0.95;
          state.fps = fpsSmooth;
        } catch (_:Dynamic) {}

        // Render
        try {
          state.render(request_redraw || redraw_ui, (state.ui_visible ? shapes : null));
        } catch (_:Dynamic) {}
      }

      Browser.window.requestAnimationFrame(loop);
    }
    Browser.window.requestAnimationFrame(loop);

    // Kick an early size sync in case CSS changed between construction and now
    applyRealSize();
  }
}
