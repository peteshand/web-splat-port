package renderer;

class Internal {
  // -------------------------- global logging gate --------------------------
  public static function enableLoggingOnce():Void {
    // one-shot enable; safe even if called multiple times
    untyped window.__LOGGING_ENABLED__ = true;
  }

  public static inline function loggingEnabled():Bool {
    return untyped window.__LOGGING_ENABLED__;
  }

  // -------------------------- logging + helpers --------------------------
  public static function logi(tag:String, msg:String, ?extra:Dynamic):Void {
    if (!loggingEnabled()) return;
    if (extra != null) console.log(tag + " " + msg, extra); else console.log(tag + " " + msg);
  }

  public static function fmtF32Slice(a:js.lib.Float32Array):String {
    var out:Array<String> = [];
    var n = a.length;
    for (i in 0...n) {
      var whole = Std.string(a[i]).split(".")[0];
      var frac  = Std.string(Math.round((a[i] % 1) * 1e7));
      out.push(whole + "." + StringTools.lpad(frac, "0", 7));
    }
    return "[" + out.join(",") + "]";
  }

  // FNV-1a 64-bit
  public static function hashBytesU64(bytes:js.lib.Uint8Array):String {
    var h:haxe.Int64 = haxe.Int64.make(0xcbf29ce4, 0x84222325);
    var prime:haxe.Int64 = haxe.Int64.make(0x00000100, 0x000001b3);
    for (i in 0...bytes.byteLength) {
      var b = bytes[i];
      h = h ^ haxe.Int64.make(0, b);
      h = haxe.Int64.mul(h, prime);
    }
    var hex = StringTools.hex(h.low) + StringTools.hex(h.high);
    return StringTools.lpad(hex, "0", 16);
  }

  public static inline function mat4ColMajorToArray(m:js.lib.Float32Array):js.lib.Float32Array {
    // gl-matrix already stores column-major in a Float32Array
    return new js.lib.Float32Array(m);
  }

  // -------------------------- debug readback + dumps --------------------------
  public static inline var DEBUG_READBACK_EVERY_N_FRAMES:Int = 1; // set to 0 to disable

  public static function u8ToU32LE(u8:js.lib.Uint8Array):js.lib.Uint32Array {
    var n = Math.floor(u8.byteLength / 4);
    return new js.lib.Uint32Array(u8.buffer, u8.byteOffset, n);
  }
  public static function u8ToF32(u8:js.lib.Uint8Array):js.lib.Float32Array {
    var n = Math.floor(u8.byteLength / 4);
    return new js.lib.Float32Array(u8.buffer, u8.byteOffset, n);
  }

  public static function dumpU32(label:String, u8:js.lib.Uint8Array):Void {
    if (!loggingEnabled()) return;
    var u32 = u8ToU32LE(u8);
    // No Array.from in Haxe std; build a Haxe Array<Int> manually.
    var arr:Array<Int> = [];
    for (i in 0...u32.length) arr.push(u32[i]);
    console.log(label, arr);
  }

  public static function readbackBuffer(device:GPUDevice, src:GPUBuffer, size:Int):Promise<ArrayBuffer> {
    var rb = device.createBuffer({
      label: 'rb',
      size: size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    var enc = device.createCommandEncoder({ label: 'rb-encoder' });
    enc.copyBufferToBuffer(src, 0, rb, 0, size);
    device.queue.submit([enc.finish()]);
    return new Promise(function(resolve, reject) {
      rb.mapAsync(GPUMapMode.READ).then(function(_) {
        var slice = rb.getMappedRange().slice(0, size);
        rb.unmap();
        resolve(slice);
      }).catchError(function(e) {
        reject(e);
      });
    });
  }
}
