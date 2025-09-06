package io;

// io/npz.ts → Haxe port (sync, fast, minimal allocations)

import haxe.DynamicAccess;
import pointcloud.Quantization;
import io.Mod.GenericGaussianPointCloud;
import io.Mod.PointCloudReader;

// fflate's unzipSync: we'll call it via JS interop (keeps types local)
private typedef NpyParsed = { data: Dynamic, shape: Array<Int> };

typedef INpzArray<T> = { var data: Dynamic; var shape:Array<Int>; };
interface INpzArchive {
  public function byName<T>(name:String):Null<INpzArray<T>>;
}

/* -------------------------- Concrete NPZ archive --------------------------- */

class ZipNpzArchive implements INpzArchive {
  var parsed:Map<String, INpzArray<Dynamic>> = new Map();
  var raw:Map<String, js.lib.Uint8Array> = new Map();

  function new() {}

  public static function fromArrayBuffer(buf:js.lib.ArrayBuffer):ZipNpzArchive {
    final files:DynamicAccess<js.lib.Uint8Array> =
      js.Syntax.code("require('fflate').unzipSync({0})", new js.lib.Uint8Array(buf));
    final z = new ZipNpzArchive();
    for (name in files.keys()) {
      if (!StringTools.endsWith(name, ".npy")) continue;
      final key = name.substr(0, name.length - 4);
      z.raw.set(key, files.get(name));
    }
    return z;
  }

  public function byName<T>(name:String):Null<INpzArray<T>> {
    final hit = parsed.get(name);
    if (hit != null) return cast hit;
    final r = raw.get(name);
    if (r == null) return null;
    final parsedNpy = parseNPY(r);
    final arr:INpzArray<T> = { data: parsedNpy.data, shape: parsedNpy.shape };
    parsed.set(name, cast arr);
    raw.remove(name);
    return arr;
  }
}

/* ------------------------------- NPY parser -------------------------------- */

private function parseNPY(bytes:js.lib.Uint8Array):NpyParsed {
  // magic "\x93NUMPY"
  if (bytes[0] != 0x93 || bytes[1] != 0x4E || bytes[2] != 0x55 || bytes[3] != 0x4D || bytes[4] != 0x50 || bytes[5] != 0x59) {
    throw "Invalid NPY magic";
  }
  final verMajor = bytes[6], verMinor = bytes[7];

  var headerLen = 0, headerOfs = 0;
  if (verMajor == 1) { headerLen = bytes[8] | (bytes[9] << 8); headerOfs = 10; }
  else { headerLen = (bytes[8]) | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24); headerOfs = 12; }

  final headerText = new TextDecoder("ascii").decode(bytes.subarray(headerOfs, headerOfs + headerLen));
  final descr = match1(headerText, ~/'descr'\s*:\s*'([^']+)'/);
  final fortran = (match1(headerText, ~/'fortran_order'\s*:\s*(True|False)/) == "True");
  final shapeStr = match1(headerText, ~/'shape'\s*:\s*\(([^)]*)\)/);
  final shape = (shapeStr != null && shapeStr.trim().length > 0)
    ? shapeStr.split(",").map(s -> StringTools.trim(s)).filter(s -> s.length > 0).map(s -> Std.parseInt(s))
    : [];

  final dataOfs = headerOfs + headerLen;
  final raw = bytes.subarray(dataOfs);

  final big = StringTools.startsWith(descr, ">");
  final dtype = descr.substr(1); // e.g., i1,i4,f4,f8,f2,b1
  final needSwap = big;

  var out:Dynamic;
  switch (dtype) {
    case "i1":
      out = new js.lib.Int8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    case "i4":
      var v = new js.lib.Int32Array(raw.buffer, raw.byteOffset, Std.int(raw.byteLength / 4));
      if (needSwap) byteswap32(v);
      out = v;
    case "f4":
      var v = new js.lib.Float32Array(raw.buffer, raw.byteOffset, Std.int(raw.byteLength / 4));
      if (needSwap) byteswap32(v);
      out = v;
    case "f8":
      var v = new js.lib.Float64Array(raw.buffer, raw.byteOffset, Std.int(raw.byteLength / 8));
      if (needSwap) byteswap64(v);
      out = v;
    case "f2": { // half → f32
      var u16 = new js.lib.Uint16Array(raw.buffer, raw.byteOffset, Std.int(raw.byteLength / 2));
      if (needSwap) byteswap16(u16);
      var f32 = new js.lib.Float32Array(u16.length);
      for (i in 0...u16.length) f32[i] = f16_to_f32(u16[i]);
      out = f32;
    }
    case "b1":
      out = new js.lib.Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    default:
      throw "Unsupported dtype '" + descr + "'";
  }

  if (fortran) js.Browser.console.warn("NPY fortran_order=True encountered; data order may be wrong.");
  return { data: out, shape: shape };
}

private inline function match1(s:String, re:EReg):String {
  return re.match(s) ? re.matched(1) : "";
}

private inline function byteswap16(a:js.lib.Uint16Array) {
  for (i in 0...a.length) {
    final v = a[i];
    a[i] = ((v & 0xFF) << 8) | (v >>> 8);
  }
}
private inline function byteswap32(a:Dynamic) {
  // a: Uint32Array | Int32Array | Float32Array
  final u = new js.lib.Uint32Array(a.buffer, a.byteOffset, a.length);
  for (i in 0...u.length) {
    final v = u[i];
    u[i] = ((v & 0xFF) << 24) | ((v & 0xFF00) << 8) | ((v >>> 8) & 0xFF00) | ((v >>> 24) & 0xFF);
  }
}
private inline function byteswap64(a:js.lib.Float64Array) {
  final u = new js.lib.Uint32Array(a.buffer, a.byteOffset, a.length * 2);
  var i = 0;
  while (i < u.length) {
    final a0 = u[i], a1 = u[i + 1];
    u[i]     = ((a1 & 0xFF) << 24) | ((a1 & 0xFF00) << 8) | ((a1 >>> 8) & 0xFF00) | ((a1 >>> 24) & 0xFF);
    u[i + 1] = ((a0 & 0xFF) << 24) | ((a0 & 0xFF00) << 8) | ((a0 >>> 8) & 0xFF00) | ((a0 >>> 24) & 0xFF);
    i += 2;
  }
}
private inline function f16_to_f32(u:Int):Float {
  final s = (u & 0x8000) >> 15, e = (u & 0x7C00) >> 10, f = u & 0x03FF;
  if (e == 0) return (s != 0 ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e == 31) return f != 0 ? Math.NaN : ((s != 0 ? -1 : 1) * Math.POSITIVE_INFINITY);
  return (s != 0 ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/* -------------------------- f32 -> f16 (scratch) --------------------------- */

private var __f32_buf = new js.lib.ArrayBuffer(4);
private var __f32v = new js.lib.Float32Array(__f32_buf);
private var __u32v = new js.lib.Uint32Array(__f32_buf);
private inline function f32_to_f16_fast(val:Float):Int {
  __f32v[0] = val;
  var x:Int = __u32v[0];

  var sign:Int = (x >>> 16) & 0x8000;
  var exp:Int  = (x >>> 23) & 0xff;
  var mant:Int = x & 0x007fffff;

  var out:Int;

  if (exp == 0xff) {
    // Inf/NaN
    out = sign | 0x7c00 | (mant != 0 ? 1 : 0);
  } else if (exp == 0) {
    // Zero / subnormal maps to signed zero
    out = sign;
  } else {
    var e:Int = exp - 112; // 127 - 15
    if (e <= 0) {
      if (e < -10) {
        out = sign;
      } else {
        mant = (mant | 0x00800000) >>> (1 - e);
        if ((mant & 0x00001000) != 0) mant += 0x00002000;
        out = sign | (mant >>> 13);
      }
    } else if (e >= 0x1f) {
      // Overflow -> Inf
      out = sign | 0x7c00;
    } else {
      if ((mant & 0x00001000) != 0) {
        mant += 0x00002000;
        if ((mant & 0x00800000) != 0) {
          mant = 0;
          e += 1;
          if (e >= 0x1f) {
            out = sign | 0x7c00;
            // fall through to final return
          } else {
            out = sign | (e << 10) | ((mant >>> 13) & 0x03ff);
          }
        } else {
          out = sign | (e << 10) | ((mant >>> 13) & 0x03ff);
        }
      } else {
        out = sign | (e << 10) | ((mant >>> 13) & 0x03ff);
      }
    }
  }

  return out;
}


/* -------------------------------- Reader ---------------------------------- */

class NpzReader implements PointCloudReader {
  var npzFile:INpzArchive;
  var sh_deg:Int;
  var kernel_size:Null<Float>;
  var mip_splatting:Null<Bool>;
  var background_color:Null<Array<Float>>;

  public function new(reader:INpzArchive) {
    this.npzFile = reader;

    // infer sh_deg from features_rest width (+1)
    var deg = 0;
    final rest = this.npzFile.byName("features_rest");
    if (rest != null) {
      final width = (rest.shape.length > 1 ? rest.shape[1] : 0);
      final maybeDeg = shDegFromNumCoefs(width + 1);
      if (maybeDeg == null) throw "num sh coefs not valid";
      deg = maybeDeg;
    }
    this.sh_deg = deg;

    this.kernel_size    = get_npz_value(this.npzFile, "kernel_size");
    final ms            = get_npz_value(this.npzFile, "mip_splatting");
    this.mip_splatting  = (ms == null) ? null : (ms != 0);

    final bg = get_npz_array_optional(this.npzFile, "background_color");
    this.background_color = bg != null ? [bg[0], bg[1], bg[2]] : null;
  }

  public static function magic_bytes():js.lib.Uint8Array
    return new js.lib.Uint8Array(js.Syntax.code("[0x50,0x4B,0x03,0x04]"));
  public static function file_ending():String return "npz";

  private inline function nz(v:Null<Float>, d:Float):Float return (v != null) ? v : d;

  public function read():GenericGaussianPointCloud {
    // decode scalar metadata
    final opacity_scale        = nz(get_npz_value(this.npzFile, "opacity_scale"),        1.0);
    final opacity_zero_point   = nz(get_npz_value(this.npzFile, "opacity_zero_point"),   0.0);

    final scaling_scale        = nz(get_npz_value(this.npzFile, "scaling_scale"),        1.0);
    final scaling_zero_point   = nz(get_npz_value(this.npzFile, "scaling_zero_point"),   0.0);

    final rotation_scale       = nz(get_npz_value(this.npzFile, "rotation_scale"),       1.0);
    final rotation_zero_point  = nz(get_npz_value(this.npzFile, "rotation_zero_point"),  0.0);

    final features_dc_scale        = nz(get_npz_value(this.npzFile, "features_dc_scale"),        1.0);
    final features_dc_zero_point   = nz(get_npz_value(this.npzFile, "features_dc_zero_point"),   0.0);

    final features_rest_scale      = nz(get_npz_value(this.npzFile, "features_rest_scale"),      1.0);
    final features_rest_zero_point = nz(get_npz_value(this.npzFile, "features_rest_zero_point"), 0.0);

    // arrays WITH shapes
    final xyzArr          = must_get_arr(this.npzFile, "xyz");
    final opacityArr      = must_get_arr(this.npzFile, "opacity");
    final scalingArr      = must_get_arr(this.npzFile, "scaling");
    final rotationArr     = must_get_arr(this.npzFile, "rotation");
    final featuresDcArr   = must_get_arr(this.npzFile, "features_dc");
    final featuresRestArr = must_get_arr(this.npzFile, "features_rest");

    // SH cardinalities
    final sh_deg = this.sh_deg;
    final num_sh_coeffs    = shNumCoefficients(sh_deg);
    final sh_coeffs_length = (num_sh_coeffs * 3);
    final rest_num_coefs   = (sh_coeffs_length - 3);

    // validate shapes (loosely)
    expectShape(xyzArr,     2, [null, 3],              "xyz(S,3)");
    expectShapeOneOf(opacityArr, [{ dims:1, pattern:[null] }, { dims:2, pattern:[null,1] }], "opacity(S or Sx1)");
    expectShape(scalingArr, 2, [null, 3],              "scaling(G,3)");
    expectShape(rotationArr,2, [null, 4],              "rotation(G,4)");
    expectShapeOneOf(featuresDcArr, [
      { dims:2, pattern:[null,3] },
      { dims:3, pattern:[null,1,3] },
      { dims:3, pattern:[null,3,1] }
    ], "features_dc(F,3)");

    final restPerChan:Null<Int> = (rest_num_coefs % 3 == 0) ? Std.int(rest_num_coefs / 3) : null;
    final restChoices:Array<ShapePattern> = [
      { dims:2, pattern:[null, rest_num_coefs] },
      { dims:3, pattern:[null, 1, rest_num_coefs] },
      { dims:3, pattern:[null, rest_num_coefs, 1] },
    ];
    if (restPerChan != null) {
      restChoices.push({ dims:3, pattern:[null, restPerChan, 3] });
      restChoices.push({ dims:3, pattern:[null, 3, restPerChan] });
    }
    expectShapeOneOf(featuresRestArr, restChoices, "features_rest(F,rest)");

    // cardinalities
    final S = Std.int(Math.min(xyzArr.shape[0], opacityArr.shape[0]));
    final G = Std.int(Math.min(rotationArr.shape[0], scalingArr.shape[0]));
    final F = Std.int(Math.min(featuresDcArr.shape[0], featuresRestArr.shape[0]));

    // typed views
    final xyzF32     = (cast xyzArr.data:js.lib.Float32Array).subarray(0, S * 3);
    final opacityI8  = (cast opacityArr.data:js.lib.Int8Array).subarray(0, S);
    final scalingI8  = (cast scalingArr.data:js.lib.Int8Array).subarray(0, G * 3);
    final rotationI8 = (cast rotationArr.data:js.lib.Int8Array).subarray(0, G * 4);
    final fdcI8      = (cast featuresDcArr.data:js.lib.Int8Array).subarray(0, F * 3);
    final frsI8      = (rest_num_coefs > 0) ? (cast featuresRestArr.data:js.lib.Int8Array).subarray(0, F * rest_num_coefs) : new js.lib.Int8Array(0);

    // optional arrays
    var scaling_factorI8:Null<js.lib.Int8Array> = null;
    var scaling_factor_zero_point = 0.0;
    var scaling_factor_scale = 1.0;
    final hasScalingFactor = (this.npzFile.byName("scaling_factor_scale") != null);
    if (hasScalingFactor) {
      scaling_factor_scale      = nz(get_npz_value(this.npzFile, "scaling_factor_scale"),      1.0);
      scaling_factor_zero_point = nz(get_npz_value(this.npzFile, "scaling_factor_zero_point"), 0.0);
      final sfArr = must_get_arr(this.npzFile, "scaling_factor");
      expectShapeOneOf(sfArr, [{dims:1, pattern:[null]}, {dims:2, pattern:[null,1]}], "scaling_factor(S)");
      scaling_factorI8 = (cast sfArr.data:js.lib.Int8Array).subarray(0, S);
    }

    var feature_indicesU32:Null<js.lib.Uint32Array> = null;
    if (this.npzFile.byName("feature_indices") != null) {
      final fiArr = must_get_arr(this.npzFile, "feature_indices");
      expectShapeOneOf(fiArr, [{dims:1, pattern:[null]}, {dims:2, pattern:[null,1]}], "feature_indices(S)");
      final base:js.lib.Int32Array = cast fiArr.data;
      feature_indicesU32 = new js.lib.Uint32Array(base.buffer, base.byteOffset, Std.int(Math.min(S, base.length)));
    }

    var gaussian_indicesU32:Null<js.lib.Uint32Array> = null;
    if (this.npzFile.byName("gaussian_indices") != null) {
      final giArr = must_get_arr(this.npzFile, "gaussian_indices");
      expectShapeOneOf(giArr, [{dims:1, pattern:[null]}, {dims:2, pattern:[null,1]}], "gaussian_indices(S)");
      final base:js.lib.Int32Array = cast giArr.data;
      gaussian_indicesU32 = new js.lib.Uint32Array(base.buffer, base.byteOffset, Std.int(Math.min(S, base.length)));
    }

    // build compressed gaussians
    final gaussians = new Array<GaussianCompressed>();
    gaussians.resize(S);
    for (i in 0...S) {
      final ix = i * 3;
      // Coerce typed-array reads to Int BEFORE modulo
      var giVal = (gaussian_indicesU32 != null) ? Std.int(gaussian_indicesU32[i]) : i;
      var fiVal = (feature_indicesU32  != null) ? Std.int(feature_indicesU32[i])  : i;

      final gi:Int = Math.round(giVal % Math.max(1, G));
      final fi:Int = Math.round(fiVal % Math.max(1, F));

      gaussians[i] = {
        xyz: { 
          x: xyzF32[ix + 0], 
          y: xyzF32[ix + 1], 
          z: xyzF32[ix + 2]
        },
        opacity: opacityI8[i],
        scale_factor: (scaling_factorI8 != null ? scaling_factorI8[i] : 0),
        geometry_idx: gi,
        sh_idx: fi
      };
    }

    // pack SH (F entries) into byte array (channel-first rest already contiguous)
    final sh_coefs = new js.lib.Uint8Array(F * sh_coeffs_length);
    var wp = 0;
    for (i in 0...F) {
      final j = i * 3;
      sh_coefs[wp++] = fdcI8[j + 0];
      sh_coefs[wp++] = fdcI8[j + 1];
      sh_coefs[wp++] = fdcI8[j + 2];

      final base = i * rest_num_coefs;
      if (rest_num_coefs > 0) {
        sh_coefs.set(frsI8.subarray(base, base + rest_num_coefs), wp);
        wp += rest_num_coefs;
      }
    }

    // covariances for G entries (f16-packed)
    final covarsHalf = new js.lib.Uint16Array(G * 6);
    final cov6 = new js.lib.Float32Array(6);
    for (i in 0...G) {
      final si = i * 3; final ri = i * 4;

      // decode scaling (geometry)
      final s0 = (scalingI8[si + 0] - scaling_zero_point) * scaling_scale;
      final s1 = (scalingI8[si + 1] - scaling_zero_point) * scaling_scale;
      final s2 = (scalingI8[si + 2] - scaling_zero_point) * scaling_scale;
      var sx:Float, sy:Float, sz:Float;
      if (!hasScalingFactor) {
        sx = Math.exp(s0); sy = Math.exp(s1); sz = Math.exp(s2);
      } else {
        var x = s0 > 0 ? s0 : 0, y = s1 > 0 ? s1 : 0, z = s2 > 0 ? s2 : 0;
        final n = Math.sqrt(x*x + y*y + z*z);
        if (n > 0) { x /= n; y /= n; z /= n; }
        sx = x; sy = y; sz = z;
      }

      // decode + normalize quaternion (w,x,y,z)
      var qw = (rotationI8[ri + 0] - rotation_zero_point) * rotation_scale;
      var qx = (rotationI8[ri + 1] - rotation_zero_point) * rotation_scale;
      var qy = (rotationI8[ri + 2] - rotation_zero_point) * rotation_scale;
      var qz = (rotationI8[ri + 3] - rotation_zero_point) * rotation_scale;
      final qn = Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz);
      if (qn > 0) { qw /= qn; qx /= qn; qy /= qn; qz /= qn; }

      buildCovScalar(qx, qy, qz, qw, sx, sy, sz, cov6);

      final o = i * 6;
      covarsHalf[o + 0] = f32_to_f16_fast(cov6[0]);
      covarsHalf[o + 1] = f32_to_f16_fast(cov6[1]);
      covarsHalf[o + 2] = f32_to_f16_fast(cov6[2]);
      covarsHalf[o + 3] = f32_to_f16_fast(cov6[3]);
      covarsHalf[o + 4] = f32_to_f16_fast(cov6[4]);
      covarsHalf[o + 5] = f32_to_f16_fast(cov6[5]);
    }

    // pack GaussianQuantization (64B) exactly like TS
    final qbuf = new js.lib.ArrayBuffer(64);
    final dv = new js.lib.DataView(qbuf);
    writeQuant(dv,  0, features_dc_zero_point,    features_dc_scale);
    writeQuant(dv, 16, features_rest_zero_point,  features_rest_scale);
    writeQuant(dv, 32, opacity_zero_point,        opacity_scale);
    writeQuant(dv, 48, 0,                         1.0); // default scaling_factor_* if absent
    if (hasScalingFactor) {
      final sf_zp = nz(get_npz_value(this.npzFile, "scaling_factor_zero_point"), 0.0);
      final sf_sc = nz(get_npz_value(this.npzFile, "scaling_factor_scale"),      1.0);
      writeQuant(dv, 48, sf_zp, sf_sc);
    }
    final quantBytes = new js.lib.Uint8Array(qbuf);

    return GenericGaussianPointCloud.new_compressed(
      gaussians,
      sh_coefs,
      this.sh_deg,
      S,
      this.kernel_size,
      this.mip_splatting,
      this.background_color,
      cast (covarsHalf),             // Covariance3D[] ABI-compatible
      cast (quantBytes)              // GaussianQuantization bytes
    );
  }
}

/* -------------------------------- helpers --------------------------------- */

private inline function writeQuant(dv:js.lib.DataView, off:Int, zero:Float, scale:Float) {
  dv.setInt32(off + 0, Std.int(zero), true);
  dv.setFloat32(off + 4, scale, true);
  dv.setUint32(off + 8, 0, true);
  dv.setUint32(off + 12, 0, true);
}

private function must_get_arr(reader:INpzArchive, field_name:String):INpzArray<Float> {
  final arr = reader.byName(field_name);
  if (arr == null) throw 'array ${field_name} missing';
  return arr;
}

private typedef ShapePattern = { dims:Int, pattern:Array<Null<Int>> };

private function expectShape(arr:INpzArray<Dynamic>, dims:Int, pattern:Array<Null<Int>>, name:String) {
  if (arr.shape == null || arr.shape.length != dims) throw '[npz] ${name}: expected ${dims}D, got shape=${arr.shape}';
  for (i in 0...pattern.length) {
    final want = pattern[i];
    final got = arr.shape[i];
    if (want != null && got != want) throw '[npz] ${name}: expected dim[${i}]=${want}, got ${got} (shape=${arr.shape})';
  }
}

private function expectShapeOneOf(arr:INpzArray<Dynamic>, choices:Array<ShapePattern>, name:String) {
  final ok = choices.exists(function(c) {
    if (arr.shape == null || arr.shape.length != c.dims) return false;
    for (i in 0...c.pattern.length) {
      final want = c.pattern[i];
      final got = arr.shape[i];
      if (want != null && got != want) return false;
    }
    return true;
  });
  if (!ok) {
    final want = choices.map(c -> '${c.dims}D(${c.pattern.map(p -> p == null ? "*" : Std.string(p)).join(",")})').join(" or ");
    throw '[npz] ${name}: expected ${want}, got shape=${arr.shape}';
  }
}

private function get_npz_array_optional(reader:INpzArchive, field_name:String):Null<Array<Float>> {
  final arr:Null<INpzArray<Float>> = reader.byName(field_name);
  if (arr == null) return null;
  // Convert ArrayLike -> Array (copy) for simple access
  var out:Array<Float> = [];
  final len:Int = js.Syntax.code("{0}.length", arr.data);
  for (i in 0...len) out.push(js.Syntax.code("{0}[{1}]", arr.data, i));
  return out;
}

private function get_npz_value(reader:INpzArchive, field_name:String):Null<Float> {
  final arr = get_npz_array_optional(reader, field_name);
  if (arr == null || arr.length == 0) return null;
  return arr[0];
}
