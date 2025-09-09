// Engine.hx
package gs.lib;

import js.Browser;
import js.html.CanvasElement;
import js.html.TextDecoder;
import js.lib.ArrayBuffer;
import js.lib.Promise;
import js.lib.Float32Array;
import js.lib.Uint8Array;
import haxe.extern.EitherType;

import resize.ResizeObserver;

import gs.lib.SurfaceContext;
import gs.lib.RenderConfig;
import gs.scene.Scene;
import gs.lib.EguiWGPU.Internal;
import gs.loader.Loader;

typedef Source = EitherType<String, ArrayBuffer>;

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

  // When scene arrives before gaussian, stash it here
  var _pendingSceneBytes:Null<ArrayBuffer> = null;
  var _pendingScenePath:Null<String> = null;

  // Internal generic progress-enabled loader for any URL fetches
  var _loader:Loader;

  /** Expose the internal loader so UIs can bind to its progress events. */
  public var loader(get, never):Loader;
  inline function get_loader():Loader return _loader;

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

    // Create the internal loader used for any URL sources
    _loader = new Loader();
  }

  /** Convenience: check if SurfaceContext is ready */
  public var isReady(get, never):Bool;
  inline function get_isReady():Bool return state != null;

  /* =========================================================================
     Public API (callbacks, independent flows)
     ========================================================================= */

  /** Load/replace the point cloud. Starts SurfaceContext and render loop if needed. */
  public function addGaussian(
    source:Source,
    ?onReady:Void->Void,
    ?onError:Dynamic->Void
  ):Void {
    resolveSource(
      source,
      null, // no special Accept header for gaussian data
      function(bytes:ArrayBuffer, path:Null<String>) {
        SurfaceContext.create(canvas, bytes, cfg).then(function(s) {
          state = s;

          // Bind input now that we have a controller
          try {
            _unbindInput = Internal.bind_input(canvas, state.controller);
          } catch (_:Dynamic) {}

          // Record source path
          state.pointcloud_file_path = path;

          // Resize to the captured backing-store size
          applyCapturedSize();

          // Responsive handlers
          installResizeHandlers();

          // Optional env map
          try {
            if (cfg.skybox != null && state.set_env_map != null) state.set_env_map(cfg.skybox);
          } catch (_:Dynamic) {}

          // If a scene was queued earlier, apply now
          if (_pendingSceneBytes != null) {
            try {
              applySceneBytes(_pendingSceneBytes, _pendingScenePath);
              _pendingSceneBytes = null;
              _pendingScenePath  = null;
            } catch (e:Dynamic) {
              if (onError != null) onError(e);
            }
          }

          // Start the render loop once
          startLoop();

          if (onReady != null) onReady();
          return null;
        }).catchError(function(e) {
          if (onError != null) onError(e);
          return null;
        });
      },
      function(err:Dynamic) {
        if (onError != null) onError(err);
      }
    );
  }

  /** Load/replace the scene (cameras, etc.). Safe to call before or after addGaussian(). */
  public function addScene(
    source:Source,
    ?onReady:Void->Void,
    ?onError:Dynamic->Void
  ):Void {
    resolveSource(
      source,
      "application/json", // hint JSON when going over HTTP
      function(bytes:ArrayBuffer, path:Null<String>) {
        if (state == null) {
          // Stash until gaussian is ready
          _pendingSceneBytes = bytes;
          _pendingScenePath  = path;
          if (onReady != null) onReady(); // staged
          return;
        }
        // Apply immediately
        try {
          applySceneBytes(bytes, path);
          if (onReady != null) onReady();
        } catch (e:Dynamic) {
          if (onError != null) onError(e);
        }
      },
      function(err:Dynamic) {
        if (onError != null) onError(err);
      }
    );
  }

  /* =========================================================================
     Internals
     ========================================================================= */

  // Resolve Source (URL or ArrayBuffer) to bytes. If URL, use internal loader.
  inline function resolveSource(
    source:Source,
    accept:Null<String>,
    onOk:ArrayBuffer->Null<String>->Void,
    onErr:Dynamic->Void
  ):Void {
    if ((source is ArrayBuffer)) {
      onOk(cast source, null);
      return;
    }
    var url:String = cast source;
    _loader.load(url, accept).then(function(bytes) {
      onOk(bytes, url);
      return null;
    }).catchError(function(e) {
      onErr(e);
      return null;
    });
  }

  /** Decode JSON scene and apply to current state. Throws on error. */
  inline function applySceneBytes(sceneBuf:ArrayBuffer, scene_file_path:Null<String>):Void {
    if (state == null) throw 'Engine not ready: cannot set scene yet.';
    var td = new TextDecoder("utf-8");
    var jsonText = td.decode(new Uint8Array(sceneBuf));
    var json:Dynamic = haxe.Json.parse(jsonText);
    var sc = Scene.fromJson(cast json);

    state.set_scene(sc);
    if (state.set_scene_camera != null) try state.set_scene_camera(0) catch (_:Dynamic) {}
    state.scene_file_path = scene_file_path;
  }

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
