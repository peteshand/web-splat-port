package lib;

import js.Browser;
import js.lib.Promise;

class GPUContext {
  public var device:GPUDevice;
  public var queue:GPUQueue;
  public var adapter:Dynamic; // use GPUAdapter extern if available

  private function new() {}

  /**
   * TS: static async new(_instance?, _surface?) -> WGPUContext
   * Haxe: named factory to avoid ctor conflicts.
   * NOTE: _instance and _surface are accepted for parity but not used (same as TS).
   */
  public static function create(?_instance:Dynamic, ?_surface:GPUCanvasContext):Promise<GPUContext> {
    return new Promise(function(resolve, reject) {
      var nav:Dynamic = Browser.navigator;
      var gpu:Dynamic = nav.gpu;
      if (gpu == null) { reject('WebGPU not available'); return; }

      var adapterP:js.lib.Promise<Dynamic> = cast gpu.requestAdapter();

      adapterP.then(function(adapter:Dynamic) {
        if (adapter == null) { reject('No WebGPU adapter'); return null; }

        var desc:Dynamic = { requiredLimits: { maxComputeWorkgroupStorageSize: 32768 } };
        var devP:js.lib.Promise<GPUDevice> = cast adapter.requestDevice(desc);

        return devP.then(function(device:GPUDevice) {
          var ctx = new GPUContext();
          ctx.adapter = adapter;
          ctx.device = device;
          ctx.queue  = device.queue;
          resolve(ctx);
          return null;
        }).catchError(function(err) {
          reject(err);
          return null;
        });

      }).catchError(function(err) {
        reject(err);
        return null;
      });
    });
  }

  /** TS helper parity */
  public static inline function new_instance():Promise<GPUContext> {
    return create(null, null);
  }
}
