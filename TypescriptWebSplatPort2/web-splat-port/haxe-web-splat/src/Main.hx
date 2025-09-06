package;

import js.Browser;
import js.html.Element;
import js.html.URLSearchParams;
import js.lib.Promise;
import js.lib.ArrayBuffer;
import haxe.Resource;
import StringTools;
import loader.Loader;
import utils.GpuUtils;
import ui.LoadingDisplay;

@:expose
class Main {
  static var _main:Main;

  var ui:LoadingDisplay;
  var loader:Loader;
  var engine:lib.Engine;

  public static function main() {
    Build.injectCss();
    if (_main == null) _main = new Main();
  }

  public function new() {
    // Visuals manager
    ui = new LoadingDisplay();

    // WebGPU gate
    GpuUtils.checkWebGPU()
      .then(onWebGpuChecked)
      .catchError(onWebGpuError);
  }

  /* ----------------- Callbacks for GpuUtils.checkWebGPU ---------------- */

  function onWebGpuChecked(supported:Bool):Promise<Dynamic> {
    if (!supported) {
      ui.showNoWebGPU();
      throw "WebGPU not supported.";
    }

    final params    = new URLSearchParams(Browser.location.search);
    final scene_url = params.get("scene");
    final pc_url    = params.get("file");

    if (pc_url == null) {
      ui.showNoFile();
      return Promise.resolve(null);
    }

    ui.showSpinner();

    // Prepare loader + bind UI
    loader = new Loader();
    ui.bindToLoader(loader);

    final self = this;

    // Initialize engine (creates canvas; resize hooks are added later by Engine.load_point_cloud)
    return lib.Engine.initialize().then(function(eng) {
      self.engine = eng;

      // Start loads
      final pcPromise:Promise<ArrayBuffer> = loader.load(pc_url);
      final scenePromise:Promise<Dynamic> =
        (scene_url != null)
          ? Browser.window.fetch(scene_url, { headers: cast { 'Accept': 'application/json' } }).then(function(r) return r.arrayBuffer())
          : Promise.resolve(null);

      return Promise.all([pcPromise, scenePromise]);
    }).then(function(arr) {
      final pc_data:ArrayBuffer          = cast arr[0];
      final scene_data:Null<ArrayBuffer> = cast arr[1];

      // Load point cloud first (required)
      return self.engine.load_point_cloud(pc_data, pc_url).then(function(_) {
        // Optional scene
        if (scene_data != null) {
          return self.engine.load_scene(scene_data, scene_url);
        } else {
          return Promise.resolve(null);
        }
      });
    }).then(function(_) {
      ui.hideSpinner();
      return null;
    }).catchError(function(e) {
      ui.hideSpinner();
      ui.showError(e, pc_url);
      return null;
    }).then(function(_) {
      // Disable context menu
      // Browser.document.addEventListener("contextmenu", function(ev) ev.preventDefault());
      return null;
    });
  }

  function onWebGpuError(e:Dynamic):Dynamic {
    ui.hideSpinner();
    ui.showError(e);
    return null;
  }
}
