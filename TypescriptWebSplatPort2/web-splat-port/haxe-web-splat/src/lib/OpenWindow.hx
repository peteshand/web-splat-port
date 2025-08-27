package lib;

// Minimal extern for ResizeObserver (available on Window in modern browsers)
@:native("ResizeObserver")
extern class ResizeObserver {
  public function new(cb:Dynamic->Void):Void;
  public function observe(target:js.html.Element):Void;
}

class OpenWindow {
  /** 1:1 with TS: open_window(file, scene, config, pointcloud_file_path, scene_file_path) */
  public static function open_window(file:ArrayBuffer, scene:Null<ArrayBuffer>, config:RenderConfig, pointcloud_file_path:Null<String>, scene_file_path:Null<String>):Promise<Dynamic> {
    return new js.lib.Promise(function (resolve, reject) {
      // Canvas: find-or-create
      var canvas:CanvasElement = cast document.getElementById('window-canvas');
      if (canvas == null) {
        canvas = document.createCanvasElement();
        canvas.id = 'window-canvas';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        document.body.appendChild(canvas);
      }

      // Real backing store = CSS * DPR
      var backingFromCss = function() {
        var rect = canvas.getBoundingClientRect();
        var dpr:Float = (untyped window.devicePixelRatio) != null ? (untyped window.devicePixelRatio) : 1.0;
        var w = Math.round(rect.width * dpr);
        var h = Math.round(rect.height * dpr);
        return { w: w, h: h, dpr: dpr };
      };

      // Phase 1: initialize at 800x600 like Rust
      var initW = 800;
      var initH = 600;
      canvas.width  = initW;
      canvas.height = initH;

      // WindowContext factory (promise)
      var stateP:Promise<Dynamic>;
      try {
        // Direct call avoids Reflect + DCE issues (prefix with `lib.` if not in the same package)
        stateP = cast WindowContext.create(canvas, file, config);
      } catch (e:Dynamic) {
        reject(e);
        return;
      }

      stateP.then(function(state:Dynamic) {
        // Bind input
        try {
          var internalNs:Dynamic = Reflect.field(Internal, "Internal");
          if (internalNs != null && Reflect.hasField(internalNs, "bind_input")) {
            Reflect.callMethod(internalNs, Reflect.field(internalNs, "bind_input"), [canvas, Reflect.field(state, "controller")]);
          }
        } catch (_:Dynamic) {}

        // Phase 2: resize to real backing store
        var applyRealSize = function() {
          var now = backingFromCss();
          if (canvas.width != now.w)  canvas.width  = now.w;
          if (canvas.height != now.h) canvas.height = now.h;
          var resize = Reflect.field(state, "resize");
          if (resize != null) Reflect.callMethod(state, resize, [ { width: now.w, height: now.h }, now.dpr ]);
        };
        applyRealSize();

        // Observers / listeners
        try {
          var ro = new ResizeObserver(function(_){ applyRealSize(); });
          ro.observe(canvas);
        } catch (_:Dynamic) {}

        try {
          window.addEventListener('resize', function(_){ applyRealSize(); });
        } catch (_:Dynamic) {}

        try {
          window.addEventListener('orientationchange', function(_){ applyRealSize(); });
        } catch (_:Dynamic) {}

        // File path fields (expanded try/catch)
        try {
          Reflect.setField(state, "pointcloud_file_path", pointcloud_file_path);
        } catch (_:Dynamic) {}

        // Optional: load scene json if provided
        if (scene != null) {
          try {
            var sceneClass = Type.resolveClass("scene.Scene");
            if (sceneClass != null) {
              var fromJson = Reflect.field(sceneClass, "fromJson");
              if (fromJson != null) {
                var s = Reflect.callMethod(sceneClass, fromJson, [scene]);
                var set_scene = Reflect.field(state, "set_scene");
                if (set_scene != null) Reflect.callMethod(state, set_scene, [s]);

                var set_cam = Reflect.field(state, "set_scene_camera");
                if (set_cam != null) Reflect.callMethod(state, set_cam, [0]);

                Reflect.setField(state, "scene_file_path", scene_file_path);
              }
            }
          } catch (err:Dynamic) {
            console.error('cannot load scene:', err);
          }
        }

        // Optional: set skybox
        try {
          var skybox = Reflect.field(config, "skybox");
          if (skybox != null) {
            var set_env = Reflect.field(state, "set_env_map");
            if (set_env != null) Reflect.callMethod(state, set_env, [skybox]);
          }
        } catch (e:Dynamic) {
          console.error('failed to set skybox:', e);
        }

        // Main loop
        var last = window.performance.now();
        function loop(_:Float):Void {
          var now = window.performance.now();
          var dt = (now - last) / 1000.0;
          last = now;

          var upd = Reflect.field(state, "update");
          if (upd != null) Reflect.callMethod(state, upd, [dt]);

          var shapes:Dynamic = null;
          var request_redraw:Bool = false;
          var uiFn = Reflect.field(state, "ui");
          if (uiFn != null) {
            var uiRes:Dynamic = Reflect.callMethod(state, uiFn, []);
            if (uiRes != null && Std.isOfType(uiRes, Array)) {
              var arr:Array<Dynamic> = cast uiRes;
              if (arr.length >= 2) {
                request_redraw = arr[0] == true;
                shapes = arr[1];
              }
            }
          }
          if (Reflect.field(state, "_changed") == true) request_redraw = true;

          var render = Reflect.field(state, "render");
          if (render != null) {
            var ui_visible = Reflect.field(state, "ui_visible") == true;
            Reflect.callMethod(state, render, [request_redraw, ui_visible ? shapes : null]);
          }

          window.requestAnimationFrame(loop);
        }
        window.requestAnimationFrame(loop);

        resolve(null);
      }).catchError(function(e) {
        reject(e);
      });
    });
  }

  /** 1:1 TS wrapper */
  public static function run_wasm(pc:ArrayBuffer, scene:Null<ArrayBuffer>, pc_file:Null<String>, scene_file:Null<String>):Promise<Dynamic> {
    return open_window(pc, scene, new RenderConfig(false, null, false), pc_file, scene_file);
  }
}
