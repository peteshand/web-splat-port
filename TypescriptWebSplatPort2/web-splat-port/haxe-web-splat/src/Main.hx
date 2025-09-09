// Main.hx
package;

import js.Browser;
import js.html.URLSearchParams;
import gs.utils.GpuUtils;
import gs.ui.LoadingDisplay;
import gs.lib.Engine;

@:expose
class Main {
  static var _main:Main;

  var ui:LoadingDisplay;
  var engine:Engine;

  public static function main() {
    Build.injectCss();
    if (_main == null) _main = new Main();
  }

  public function new() {
    ui = new LoadingDisplay();

    GpuUtils.checkWebGPU()
      .then(onWebGpuChecked)
      .catchError(onWebGpuError);
  }

  /* ----------------- Callbacks for GpuUtils.checkWebGPU ---------------- */

  function onWebGpuChecked(supported:Bool):Dynamic {
    if (!supported) {
      ui.showNoWebGPU();
      return null;
    }

    final params    = new URLSearchParams(Browser.location.search);
    final scene_url = params.get("scene");
    final pc_url    = params.get("file");

    if (pc_url == null) {
      ui.showNoFile();
      return null;
    }

    ui.showSpinner();

    // Engine construction (init canvas etc.)
    engine = new Engine();

    // Bind UI progress to the engine's internal loader
    ui.bindToLoader(engine.loader);

    // Load point cloud (required)
    engine.addGaussian(
      pc_url,
      function() {
        ui.hideSpinner();
      },
      function(e) {
        ui.hideSpinner();
        ui.showError(e, pc_url);
      }
    );

    // Load scene (optional, can be called before or after addGaussian)
    if (scene_url != null) {
      engine.addScene(
        scene_url,
        null, // no-op onReady
        function(e) {
          // Scene failure shouldn't mask the gaussian; surface an error toast
          ui.showError(e, scene_url);
        }
      );
    }

    return null;
  }

  function onWebGpuError(e:Dynamic):Dynamic {
    ui.hideSpinner();
    ui.showError(e);
    return null;
  }
}
