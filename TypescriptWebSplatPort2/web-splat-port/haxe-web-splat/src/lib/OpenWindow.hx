package lib;

import js.Browser;
import js.html.CanvasElement;
import js.html.Element;
import js.html.Document;

import haxe.io.Bytes;
import haxe.io.BytesInput;

import lib.WindowContext;
import scene.Scene;

// 🔽 NEW: import the input binder
import lib.EguiWGPU.Internal;

// ...imports unchanged...

class OpenWindow {
  public static function open_window(
    file:ArrayBuffer,
    sceneBuf:Null<ArrayBuffer>,
    config:RenderConfig,
    pointcloud_file_path:Null<String>,
    scene_file_path:Null<String>
  ):Promise<Dynamic> {
    return new js.lib.Promise(function (resolve, reject) {
      var doc = Browser.document;
      var canvas:CanvasElement = cast doc.getElementById('window-canvas');
      if (canvas == null) {
        canvas = doc.createCanvasElement();
        canvas.id = 'window-canvas';
        canvas.style.width  = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block'; // avoid inline-block whitespace quirks
        doc.body.appendChild(canvas);

        // Ensure page can actually be 100% tall
        untyped doc.documentElement.style.height = '100%';
        doc.body.style.height = '100%';
        doc.body.style.margin = '0';
      }

      inline function backingFromCss() {
        final rect = canvas.getBoundingClientRect();
        final dpr:Float = (untyped Browser.window.devicePixelRatio != null)
          ? (untyped Browser.window.devicePixelRatio)
          : 1.0;
        final w = Math.max(1, Math.floor(rect.width  * dpr));
        final h = Math.max(1, Math.floor(rect.height * dpr));
        Internal.clog('backingFromCss()', {
          cssW: rect.width, cssH: rect.height, dpr: dpr, w: w, h: h
        });
        return { w: w, h: h, dpr: dpr };
      }

      // --- Phase 0: capture real size BEFORE init (matches TS) ---
      final real = backingFromCss();

      // --- Phase 1: init at 800x600 (like Rust) ---
      canvas.width  = 800;
      canvas.height = 600;

      WindowContext.create(canvas, file, config).then(function(state) {
        final unbindInput = Internal.bind_input(canvas, state.controller);

        state.pointcloud_file_path = pointcloud_file_path;
        state.scene_file_path = scene_file_path;

        // --- Phase 2: immediately resize to real backing-store size (matches TS) ---
        function applyRealSize() {
          final now = backingFromCss();
          if (canvas.width  != now.w) canvas.width  = Std.int(now.w);
          if (canvas.height != now.h) canvas.height = Std.int(now.h);
          state.resize({ width: Std.int(now.w), height: Std.int(now.h) }, now.dpr);
        }
        applyRealSize();

        // Observe/responsive
        try {
          final ro = new ResizeObserver(function(_){ applyRealSize(); });
          ro.observe(canvas);
        } catch (_:Dynamic) {}
        Browser.window.addEventListener('resize', function(_){ applyRealSize(); });
        Browser.window.addEventListener('orientationchange', function(_){ applyRealSize(); });

        // Optional scene JSON (unchanged) ...
        if (sceneBuf != null) {
          try {
            var td = new TextDecoder("utf-8");
            var jsonText = td.decode(new js.lib.Uint8Array(sceneBuf));
            var json:Dynamic = haxe.Json.parse(jsonText);
            var sc = Scene.fromJson(cast json);
            state.set_scene(sc);
            state.set_scene_camera(0);
          } catch (err:Dynamic) {
            console.error('cannot load scene:', err);
          }
        }

        if (config.skybox != null) {
          state.set_env_map(config.skybox);
        }

        // Main loop (unchanged) ...
        var last = Browser.window.performance.now();
        function loop(_:Float):Void {
          var now = Browser.window.performance.now();
          var dt = (now - last) / 1000.0;
          last = now;

          state.update(dt);

          var shapes:Dynamic = null;
          var request_redraw:Bool = false;

          var uiRes = state.ui();
          if (uiRes != null && uiRes.length >= 2) {
            request_redraw = uiRes[0] == true;
            shapes = uiRes[1];
          }
          if (state.needsRedraw()) request_redraw = true;

          state.render(request_redraw, state.ui_visible ? shapes : null);

          Browser.window.requestAnimationFrame(loop);
        }
        Browser.window.requestAnimationFrame(loop);

        resolve(null);
      }).catchError(reject);
    });
  }

  /** Convenience wrapper */
  public static function run_wasm(
    pc:ArrayBuffer,
    scene:Null<ArrayBuffer>,
    pc_file:Null<String>,
    scene_file:Null<String>
  ):Promise<Dynamic> {
    return open_window(pc, scene, new RenderConfig(false, null, false), pc_file, scene_file);
  }
}
