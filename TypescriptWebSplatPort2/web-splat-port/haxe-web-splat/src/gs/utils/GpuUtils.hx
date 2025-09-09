package gs.utils;

import js.Browser;
import js.lib.Promise;

/** WebGPU feature detection & quick adapter/device probe. */
class GpuUtils {
  public static function checkWebGPU():Promise<Bool> {
    final nav:Dynamic = Browser.navigator;
    final gpu:GPU = untyped nav.gpu;
    if (gpu == null) {
      return Promise.resolve(false);
    }
    try {
      return cast gpu.requestAdapter().then(function(adapter:Dynamic) {
        if (adapter == null) return false;
        return adapter.requestDevice().then(function(_:Dynamic) return true);
      }).catchError(function(_){ return false; });
    } catch (_:Dynamic) {
      return Promise.resolve(false);
    }
  }
}
