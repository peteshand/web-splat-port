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

class OpenWindow {
  /** open_window(file, scene, config, pointcloud_file_path, scene_file_path) */
  public static function open_window(
    file:ArrayBuffer,
    sceneBuf:Null<ArrayBuffer>,
    config:RenderConfig,
    pointcloud_file_path:Null<String>,
    scene_file_path:Null<String>
  ):Promise<Dynamic> {
    return new js.lib.Promise(function (resolve, reject) {
      var canvas:CanvasElement = cast document.getElementById('window-canvas');
      if (canvas == null) {
        canvas = Browser.document.createCanvasElement();
        canvas.id = 'window-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        document.body.appendChild(canvas);
      }

      // backing size from CSS * DPR
      var backingFromCss = function() {
        var rect = canvas.getBoundingClientRect();
        var dpr:Float = (untyped Browser.window.devicePixelRatio) != null ? (untyped Browser.window.devicePixelRatio) : 1.0;
        var w = Math.round(rect.width * dpr);
        var h = Math.round(rect.height * dpr);
        return { w: w, h: h, dpr: dpr };
      };

      // init size 800x600 (like Rust)
      canvas.width  = 800;
      canvas.height = 600;

      // create WindowContext
      WindowContext.create(canvas, file, config).then(function(state) {
        // 🔽 NEW: bind DOM input to the camera controller (1:1 with TS open_window.ts)
        final unbindInput = Internal.bind_input(canvas, state.controller);

        // store paths (typed)
        state.pointcloud_file_path = pointcloud_file_path;
        state.scene_file_path = scene_file_path;

        // Phase 2: resize to real backing store
        var applyRealSize = function() {
          var now = backingFromCss();
          if (canvas.width != now.w)  canvas.width  = now.w;
          if (canvas.height != now.h) canvas.height = now.h;
          state.resize({ width: now.w, height: now.h }, now.dpr);
        };
        applyRealSize();

        // Observe/responsive
        try {
          var ro = new ResizeObserver(function(_){ applyRealSize(); });
          ro.observe(canvas);
        } catch (_:Dynamic) {}
        Browser.window.addEventListener('resize', function(_){ applyRealSize(); });
        Browser.window.addEventListener('orientationchange', function(_){ applyRealSize(); });

        // Optional scene JSON
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

        // Optional env map (if config.skybox exists)
        if (config.skybox != null) {
          state.set_env_map(config.skybox);
        }

        // Main loop
        var last = Browser.window.performance.now();
        function loop(_:Float):Void {
          var now = Browser.window.performance.now();
          var dt = (now - last) / 1000.0;
          last = now;

          state.update(dt);

          var shapes:Dynamic = null;
          var request_redraw:Bool = false;

          // UI
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
