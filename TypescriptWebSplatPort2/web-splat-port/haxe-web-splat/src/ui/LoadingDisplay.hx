package ui;

import js.Browser;
import js.html.Element;
import js.html.CustomEvent;
import js.html.svg.CircleElement;
import js.html.svg.TextElement;
import loader.GaussianLoader;

/**
 * Encapsulates all user-facing loading UI:
 * - spinner visibility
 * - "no WebGPU" / "no file" panes
 * - progress ring + MB text
 * - error pane
 * - binds/unbinds to GaussianLoader events
 */
class LoadingDisplay {
  var meter:CircleElement;
  var label:TextElement;
  var spinner:Element;
  var paneNoWebGPU:Element;
  var paneNoFile:Element;
  var paneError:Element;

  // keep references so we can unbind cleanly
  var _loader:GaussianLoader;

  public function new() {
    meter       = cast Browser.document.querySelector(".meter-1");
    label       = cast Browser.document.querySelector("#loading-display");
    spinner     = Browser.document.getElementById("spinner");
    paneNoWebGPU= Browser.document.getElementById("no-webgpu");
    paneNoFile  = Browser.document.getElementById("no-file");
    paneError   = Browser.document.getElementById("loading-error");
  }

  /* ---------- high-level panels ---------- */

  public function showNoWebGPU():Void {
    showFlex(paneNoWebGPU);
  }

  public function showNoFile():Void {
    showFlex(paneNoFile);
  }

  public function showSpinner():Void {
    showFlex(spinner);
  }

  public function hideSpinner():Void {
    hide(spinner);
  }

  public function showError(err:Dynamic, ?pcUrl:String):Void {
    if (paneError != null) {
      paneError.style.display = "flex";
      final p:Element = cast paneError.querySelector("p");
      if (p != null) {
        final urlStr = (pcUrl != null) ? pcUrl : "";
        p.innerHTML = Std.string(err) + (urlStr != "" ? "<pre>" + urlStr + "</pre>" : "");
      }
    }
    js.Browser.console.error(err);
  }

  /* ---------- loader binding ---------- */

  public function bindToLoader(loader:GaussianLoader):Void {
    // clean previous bindings if any
    unbind();

    _loader = loader;
    _loader.addEventListener(GaussianLoader.EVT_START,    cast onLoaderStart);
    _loader.addEventListener(GaussianLoader.EVT_PROGRESS, cast onLoaderProgress);
    _loader.addEventListener(GaussianLoader.EVT_END,      cast onLoaderEnd);
    _loader.addEventListener(GaussianLoader.EVT_ERROR,    cast onLoaderError);
  }

  public function unbind():Void {
    if (_loader != null) {
      _loader.removeEventListener(GaussianLoader.EVT_START,    cast onLoaderStart);
      _loader.removeEventListener(GaussianLoader.EVT_PROGRESS, cast onLoaderProgress);
      _loader.removeEventListener(GaussianLoader.EVT_END,      cast onLoaderEnd);
      _loader.removeEventListener(GaussianLoader.EVT_ERROR,    cast onLoaderError);
      _loader = null;
    }
  }

  /* ---------- internal: loader handlers ---------- */

  function onLoaderStart(_e:CustomEvent):Void {
    if (label != null) label.textContent = "0 MB";
    if (meter != null) meter.style.strokeDashoffset = "360";
  }

  function onLoaderProgress(e:CustomEvent):Void {
    final detail:Dynamic  = e.detail;
    final loaded:Int      = (detail != null && detail.loaded != null) ? detail.loaded : 0;
    final total:Null<Int> = (detail != null && detail.total  != null) ? detail.total  : null;

    final mb = Std.int(Math.round(loaded / (1024 * 1024)));
    if (label != null) {
      if (total != null && total > 0) {
        final mbTot = Std.int(Math.round(total / (1024 * 1024)));
        label.textContent = mb + " / " + mbTot + " MB";
      } else {
        label.textContent = mb + " MB";
      }
    }
    if (meter != null && total != null && total > 0) {
      meter.style.strokeDashoffset = Std.string(360 - Math.round((loaded / total) * 360));
    }
  }

  function onLoaderEnd(_e:CustomEvent):Void {
    // keep final numbers; spinner is hidden by caller when engine ready
  }

  function onLoaderError(e:CustomEvent):Void {
    js.Browser.console.warn("[loader error]", e != null ? e.detail : null);
  }

  /* ---------- small helpers ---------- */

  inline function showFlex(el:Element):Void {
    if (el != null) el.style.display = "flex";
  }

  inline function hide(el:Element):Void {
    if (el != null) el.style.display = "none";
  }
}
