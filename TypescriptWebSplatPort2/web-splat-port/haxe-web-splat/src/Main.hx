package;

import js.Browser;
import js.html.svg.CircleElement;
import js.html.svg.TextElement;
import js.html.CustomEvent;
import js.lib.Promise;
import haxe.Resource;
import StringTools;
import loader.Loader;
import utils.GpuUtils;

@:expose
class Main {
  static var _main:Main;

  // --- UI refs we reuse across handlers ---
  var meter:CircleElement;
  var display:TextElement;

  // Keep one loader instance so we can attach class methods as listeners
  var loader:Loader;

  public static function main() {
    // Inject any packaged CSS
    for (name in Resource.listNames()) {
      if (StringTools.endsWith(name, ".css")) {
        var css = Resource.getString(name);
        var style:js.html.StyleElement = cast Browser.document.createElement("style");
        style.appendChild(Browser.document.createTextNode(css));
        Browser.document.head.appendChild(style);
      }
    }
    if (_main == null) _main = new Main();
  }

  public function new() {
    // Resolve UI elements once
    this.meter   = cast Browser.document.querySelector(".meter-1");
    this.display = cast Browser.document.querySelector("#loading-display");

    // Use class methods for the checkWebGPU callbacks
    GpuUtils.checkWebGPU()
      .then(onWebGpuChecked)
      .catchError(onWebGpuError);
  }

  /* ----------------- Callbacks for GpuUtils.checkWebGPU ---------------- */

  // Success path from checkWebGPU(); kicks off the rest of the init
  function onWebGpuChecked(supported:Bool):Promise<Dynamic> {
    if (!supported) {
      final pane = Browser.document.getElementById("no-webgpu");
      if (pane != null) pane.style.display = "flex";
      // throw to route through the common error UI below
      throw "WebGPU not supported.";
    }

    final params    = new js.html.URLSearchParams(Browser.location.search);
    final scene_url = params.get("scene");
    final pc_url    = params.get("file");

    if (pc_url == null) {
      final pane = Browser.document.getElementById("no-file");
      if (pane != null) pane.style.display = "flex";
      return Promise.resolve(null);
    }

    final spinner = Browser.document.getElementById("spinner");
    if (spinner != null) spinner.style.display = "flex";

    // Build the loader + bind instance methods as listeners
    loader = new Loader();
    loader.addEventListener(Loader.EVT_START,    cast onLoaderStart);
    loader.addEventListener(Loader.EVT_PROGRESS, cast onLoaderProgress);
    loader.addEventListener(Loader.EVT_END,      cast onLoaderEnd);
    loader.addEventListener(Loader.EVT_ERROR,    cast onLoaderError);

    // Start loads
    final pcPromise:Promise<js.lib.ArrayBuffer> = loader.load(pc_url);
    final scenePromise:Promise<js.lib.ArrayBuffer> =
      (scene_url != null)
        ? js.Browser.window.fetch(scene_url, { headers: cast { 'Accept': 'application/json' } }).then(r -> r.arrayBuffer())
        : Promise.resolve(null);

    return Promise.all([pcPromise, scenePromise]).then(function(arr) {
      final pc_data:js.lib.ArrayBuffer    = cast arr[0];
      final scene_data:js.lib.ArrayBuffer = cast arr[1];
      return lib.OpenWindow.run_wasm(pc_data, scene_data, pc_url, scene_url);
    }).then(function(_) {
      if (spinner != null) spinner.style.display = "none";
      return null;
    }).catchError(function(e) {
      if (spinner != null) spinner.style.display = "none";
      final pane = Browser.document.getElementById("loading-error");
      if (pane != null) {
        pane.style.display = "flex";
        final pc_url_str = pc_url != null ? pc_url : "";
        final p:js.html.Element = cast pane.querySelector("p");
        if (p != null) p.innerHTML = Std.string(e) + "<pre>" + pc_url_str + "</pre>";
      }
      console.error(e);
      return null;
    }).then(function(_) {
      Browser.document.addEventListener("contextmenu", function(ev) ev.preventDefault());
      return null;
    });
  }

  // Error path from checkWebGPU(); surfaces the standard error pane
  function onWebGpuError(e:Dynamic):Dynamic {
    final spinner = Browser.document.getElementById("spinner");
    if (spinner != null) spinner.style.display = "none";
    final pane = Browser.document.getElementById("loading-error");
    if (pane != null) {
      pane.style.display = "flex";
      final p:js.html.Element = cast pane.querySelector("p");
      if (p != null) p.innerHTML = Std.string(e);
    }
    console.error(e);
    return null;
  }

  /* --------------------------- Loader event handlers -------------------------- */

  // Fires once when the stream/clone is ready; good place to reset UI.
  function onLoaderStart(_e:CustomEvent):Void {
    if (display != null) display.textContent = "0 MB";
    if (meter != null)   meter.style.strokeDashoffset = "360";
  }

  // Frequent progress callback — whole MB and ring meter progress.
  function onLoaderProgress(e:CustomEvent):Void {
    final detail:Dynamic  = e.detail;
    final loaded:Int      = (detail != null && detail.loaded != null) ? detail.loaded : 0;
    final total:Null<Int> = (detail != null && detail.total  != null) ? detail.total  : null;

    final mb = Std.int(Math.round(loaded / (1024 * 1024)));
    if (display != null) {
      if (total != null && total > 0) {
        final mbTot = Std.int(Math.round(total / (1024 * 1024)));
        display.textContent = mb + " / " + mbTot + " MB";
      } else {
        display.textContent = mb + " MB";
      }
    }
    if (meter != null && total != null && total > 0) {
      meter.style.strokeDashoffset = Std.string(360 - Math.round((loaded / total) * 360));
    }
  }

  // Called when the loader finishes reading the clone; no UI changes required.
  function onLoaderEnd(_e:CustomEvent):Void {
    // keep final numbers; spinner is hidden after wasm init completes
  }

  // Error during streaming/clone; we only warn here — main catch shows the pane.
  function onLoaderError(e:CustomEvent):Void {
    console.warn("[loader error]", e != null ? e.detail : null);
  }
}
