package pointcloud;

class Utils {

  public static inline function isArrayBufferView(?view:ArrayBufferView, ?q:pointcloud.Quantization.GaussianQuantization):Bool {
    return view != null;
  }

  // Zero-copy view over input bytes (ArrayBuffer or ArrayBufferView)
  public static inline function asBytes(src:haxe.extern.EitherType<ArrayBuffer, ArrayBufferView>):js.lib.Uint8Array {
    return Std.isOfType(src, ArrayBuffer)
      ? new js.lib.Uint8Array(cast src)
      : (function(v:ArrayBufferView) return new js.lib.Uint8Array(v.buffer, v.byteOffset, v.byteLength))(cast src);
  }

  // (optional) f16 → f32
  public static inline function halfToFloat(h:Int):Float {
    var s = (h >>> 15) & 0x1;
    var e = (h >>> 10) & 0x1F;
    var f = h & 0x3FF;
    if (e == 0) return (s == 1 ? -1 : 1) * Math.pow(2, -14) * (f / 1024.0);
    if (e == 31) return f != 0 ? Math.NaN : ((s == 1 ? -1 : 1) * Math.POSITIVE_INFINITY);
    return (s == 1 ? -1 : 1) * Math.pow(2, e - 15) * (1.0 + f / 1024.0);
  }

  public static function packGaussianQuantizationToBytes(q:pointcloud.Quantization.GaussianQuantization):js.lib.Uint8Array {
    var buf = new js.lib.ArrayBuffer(64); // 4 * Quantization, each 16 bytes
    var dv = new js.lib.DataView(buf);

    var writeQuant = function(off:Int, zero:Int, scale:Float) {
      dv.setInt32(off + 0, zero, true);
      dv.setFloat32(off + 4, scale, true);
      dv.setUint32(off + 8, 0, true);
      dv.setUint32(off + 12, 0, true);
    };

    writeQuant( 0, q.color_dc.zero_point,       q.color_dc.scale);
    writeQuant(16, q.color_rest.zero_point,     q.color_rest.scale);
    writeQuant(32, q.opacity.zero_point,        q.opacity.scale);
    writeQuant(48, q.scaling_factor.zero_point, q.scaling_factor.scale);

    return new js.lib.Uint8Array(buf);
  }
}
