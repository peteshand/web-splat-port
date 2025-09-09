package;

import js.Browser;
import js.html.URLSearchParams;
import utils.GpuUtils;
import ui.LoadingDisplay;
import loader.GaussianLoader;

@:expose
class Main {
  static var _main:Main;

  var ui:LoadingDisplay;
  var loader:GaussianLoader;
  var engine:lib.Engine;

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

    // Create UI-bound loader for point cloud progress
    loader = new GaussianLoader();
    ui.bindToLoader(loader);

    // Construct engine (constructor does the old initialize() work)
    engine = new lib.Engine();

    // Delegate all async work to the engine
    engine.load_from_urls_cb(
      pc_url,
      scene_url,
      loader,        // pc loader (UI bound)
      null,          // optional scene loader (engine will create one if needed)
      function() {   // onReady
        ui.hideSpinner();
      },
      function(e) {  // onError
        ui.hideSpinner();
        ui.showError(e, pc_url);
      }
    );

    return null;
  }

  function onWebGpuError(e:Dynamic):Dynamic {
    ui.hideSpinner();
    ui.showError(e);
    return null;
  }
}
