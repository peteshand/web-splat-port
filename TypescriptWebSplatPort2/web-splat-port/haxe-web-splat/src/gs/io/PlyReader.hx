package gs.io;

import gs.pointcloud.Aabb;
import gs.io.Mod.GenericGaussianPointCloud;

typedef PlyEncoding = String; // 'ascii' | 'binary_little_endian' | 'binary_big_endian'

typedef ParsedHeader = {
  var encoding:PlyEncoding;
  var vertexCount:Int;
  var comments:Array<String>;
  var vertexPropNames:Array<String>;
  var headerByteLength:Int;
};

class PlyReader {
  /* ------------------------------ DEBUG toggles ------------------------------ */
  static inline var DEBUG_HEADER:Bool = false;            // header summary + lines
  static inline var DEBUG_COUNTS:Bool = false;            // counts & layout
  static inline var DEBUG_PAYLOAD_VIEW:Bool = false;      // f32 view / endianness
  static inline var DEBUG_SAMPLE0:Bool = false;           // sample first vertex
  static inline var DEBUG_VALIDATE_LENGTHS:Bool = false;  // expected vs actual f32 count
  static var __LOGGED_SAMPLE__:Bool = false;

  /* --------------------------------- state ---------------------------------- */
  var header:ParsedHeader;
  var dv:js.lib.DataView;
  var offset:Int;

  var sh_deg:Int;
  var num_points:Int;
  var mip_splatting:Null<Bool>;
  var kernel_size:Null<Float>;
  var background_color:Null<Array<Float>>; // [r,g,b]

  public function new(reader:js.lib.ArrayBuffer) {
    this.header = parsePlyHeader(reader);
    this.dv = new js.lib.DataView(reader);
    this.offset = this.header.headerByteLength;

    // infer sh degree from count of f_* props
    var numShCoefs = 0;
    for (n in this.header.vertexPropNames) if (StringTools.startsWith(n, "f_")) numShCoefs++;
    final deg = gs.utils.Utils.shDegFromNumCoefs(Std.int(numShCoefs / 3));
    if (deg == null) throw "PLY: number of SH coefs cannot be mapped to sh degree";
    this.sh_deg = deg;

    // counts
    final fileCount = this.header.vertexCount;
    this.num_points = fileCount;

    // parse comments
    this.mip_splatting    = parseBoolFromComments(this.header.comments, "mip");
    this.kernel_size      = parseNumberFromComments(this.header.comments, "kernel_size");
    this.background_color = parseRGBFromComments(this.header.comments, "background_color");

    if (DEBUG_COUNTS || DEBUG_HEADER) {
      trace('[ply] ctor: sh_deg=' + this.sh_deg + ' num_points=' + this.num_points);
    }
  }

  public static function new_(reader:js.lib.ArrayBuffer):PlyReader return new PlyReader(reader);
  public static function magic_bytes():js.lib.Uint8Array return new js.lib.Uint8Array(js.Syntax.code("[0x70,0x6c,0x79]")); // "ply"
  public static function file_ending():String return "ply";

  public function read():GenericGaussianPointCloud {
    if (this.header.encoding == "ascii") throw "ascii ply format not supported";

    final little = (this.header.encoding == "binary_little_endian");
    final n = this.num_points;
    final sh_deg = this.sh_deg;
    final numCoefs = (sh_deg + 1) * (sh_deg + 1);
    final restCount = (numCoefs - 1) * 3;

    // payload view (try to avoid copies)
    final payloadU8 = new js.lib.Uint8Array(this.dv.buffer, this.offset);
    var f32:js.lib.Float32Array;
    var madeCopy = false;

    if (little) {
      if ((payloadU8.byteOffset & 0x3) == 0) {
        f32 = new js.lib.Float32Array(this.dv.buffer, this.offset);
      } else {
        final buf = new js.lib.ArrayBuffer(payloadU8.byteLength);
        new js.lib.Uint8Array(buf).set(payloadU8);
        f32 = new js.lib.Float32Array(buf);
        madeCopy = true;
      }
    } else {
      final buf = new js.lib.ArrayBuffer(payloadU8.byteLength);
      final dst = new js.lib.Uint8Array(buf);
      final len = Std.int(payloadU8.byteLength / 4);
      final src = payloadU8;
      var i = 0;
      while (i < len) {
        final s = i * 4;
        dst[s + 0] = src[s + 3];
        dst[s + 1] = src[s + 2];
        dst[s + 2] = src[s + 1];
        dst[s + 3] = src[s + 0];
        i++;
      }
      f32 = new js.lib.Float32Array(buf);
      madeCopy = true;
    }

    if (DEBUG_PAYLOAD_VIEW) {
      trace('[ply] payload view: encoding=' + this.header.encoding
        + ' byteOffset=' + payloadU8.byteOffset
        + ' byteLength=' + payloadU8.byteLength
        + ' madeCopy=' + madeCopy
        + ' f32.len=' + f32.length);
    }

    // sanity: expected float count (assumes only vertex array follows header)
    final floatsPerVertex = 3 + 3 + 3 + restCount + 1 + 3 + 4;
    if (DEBUG_VALIDATE_LENGTHS) {
      final expectFloats = n * floatsPerVertex;
      if (expectFloats != f32.length) {
        trace('[ply] WARN expected f32 len = num_points(' + n + ') * floatsPerVertex(' + floatsPerVertex + ') = ' + expectFloats + ', got ' + f32.length);
      } else {
        trace('[ply] payload length OK: ' + f32.length + ' floats (' + n + ' * ' + floatsPerVertex + ')');
      }
    }

    // targets
    final gaussU16 = new js.lib.Uint16Array(n * 10);     // 3 xyz, 1 opacity, 6 cov
    final shU16    = new js.lib.Uint16Array(n * 16 * 3); // 16 triplets per point

    // bbox + plane accumulators
    var minx = Math.POSITIVE_INFINITY, miny = Math.POSITIVE_INFINITY, minz = Math.POSITIVE_INFINITY;
    var maxx = Math.NEGATIVE_INFINITY, maxy = Math.NEGATIVE_INFINITY, maxz = Math.NEGATIVE_INFINITY;

    var sumx = 0.0, sumy = 0.0, sumz = 0.0;
    var sumxx = 0.0, sumyy = 0.0, sumzz = 0.0;
    var sumxy = 0.0, sumxz = 0.0, sumyz = 0.0;

    // ranges we’ll log
    var opMin =  1e9, opMax = -1e9;
    var sMin =  1e9, sMax = -1e9;
    var dcMin =  1e9, dcMax = -1e9;

    final cov6 = new js.lib.Float32Array(6);

    var idx = 0;
    for (p in 0...n) {
      // pos
      final px = f32[idx++], py = f32[idx++], pz = f32[idx++];
      if (px < minx) minx = px; if (py < miny) miny = py; if (pz < minz) minz = pz;
      if (px > maxx) maxx = px; if (py > maxy) maxy = py; if (pz > maxz) maxz = pz;
      sumx += px; sumy += py; sumz += pz;
      sumxx += px * px; sumyy += py * py; sumzz += pz * pz;
      sumxy += px * py; sumxz += px * pz; sumyz += py * pz;

      // normals (skip)
      idx += 3;

      // SH DC
      final sb = p * 16 * 3;
      final dc_r = f32[idx++], dc_g = f32[idx++], dc_b = f32[idx++];
      if (dc_r < dcMin) dcMin = dc_r; if (dc_r > dcMax) dcMax = dc_r;
      if (dc_g < dcMin) dcMin = dc_g; if (dc_g > dcMax) dcMax = dc_g;
      if (dc_b < dcMin) dcMin = dc_b; if (dc_b > dcMax) dcMax = dc_b;
      shU16[sb + 0] = f32_to_f16_fast(dc_r);
      shU16[sb + 1] = f32_to_f16_fast(dc_g);
      shU16[sb + 2] = f32_to_f16_fast(dc_b);

      // SH rest (channel-first in file)
      final restBase = idx;
      idx += restCount;
      for (i in 0...(numCoefs - 1)) {
        final r = f32[restBase + i];
        final g = f32[restBase + (numCoefs - 1) + i];
        final b = f32[restBase + 2 * (numCoefs - 1) + i];
        final dst = sb + (i + 1) * 3;
        shU16[dst + 0] = f32_to_f16_fast(r);
        shU16[dst + 1] = f32_to_f16_fast(g);
        shU16[dst + 2] = f32_to_f16_fast(b);
      }
      // zero-pad to 16
      for (i in numCoefs...16) {
        final dst = sb + i * 3;
        shU16[dst + 0] = 0;
        shU16[dst + 1] = 0;
        shU16[dst + 2] = 0;
      }

      // opacity (sigmoid)
      final opacity = sigmoid(f32[idx++]);
      if (opacity < opMin) opMin = opacity; if (opacity > opMax) opMax = opacity;

      // scales exp
      final s1 = Math.exp(f32[idx++]);
      final s2 = Math.exp(f32[idx++]);
      final s3 = Math.exp(f32[idx++]);
      if (s1 < sMin) sMin = s1; if (s1 > sMax) sMax = s1;
      if (s2 < sMin) sMin = s2; if (s2 > sMax) sMax = s2;
      if (s3 < sMin) sMin = s3; if (s3 > sMax) sMax = s3;

      // quaternion (w,x,y,z) → normalize → [x,y,z,w]
      var qw = f32[idx++], qx = f32[idx++], qy = f32[idx++], qz = f32[idx++];
      final qn = Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz);
      if (qn > 0) { qw /= qn; qx /= qn; qy /= qn; qz /= qn; }

      buildCovScalar(qx, qy, qz, qw, s1, s2, s3, cov6);

      if (DEBUG_SAMPLE0 && !__LOGGED_SAMPLE__ && p == 0) {
        __LOGGED_SAMPLE__ = true;
        trace('[ply::sample0] pos=' + [px, py, pz]);
        trace('[ply::sample0] opacity=' + opacity);
        trace('[ply::sample0] scales(exp)=' + [s1, s2, s3]);
        trace('[ply::sample0] quat(x,y,z,w)=' + [qx, qy, qz, qw]);
        trace('[ply::sample0] cov6=' + [for (k in 0...6) cov6[k]]);
        trace('[ply::sample0] SH_DC=' + [dc_r, dc_g, dc_b]);
      }

      // pack gaussian halfs
      final gb = p * 10;
      gaussU16[gb + 0] = f32_to_f16_fast(px);
      gaussU16[gb + 1] = f32_to_f16_fast(py);
      gaussU16[gb + 2] = f32_to_f16_fast(pz);
      gaussU16[gb + 3] = f32_to_f16_fast(opacity);
      gaussU16[gb + 4] = f32_to_f16_fast(cov6[0]);
      gaussU16[gb + 5] = f32_to_f16_fast(cov6[1]);
      gaussU16[gb + 6] = f32_to_f16_fast(cov6[2]);
      gaussU16[gb + 7] = f32_to_f16_fast(cov6[3]);
      gaussU16[gb + 8] = f32_to_f16_fast(cov6[4]);
      gaussU16[gb + 9] = f32_to_f16_fast(cov6[5]);
    }

    // center + up from accumulated moments
    final invN = n > 0 ? (1.0 / n) : 0.0;
    final cx = sumx * invN, cy = sumy * invN, cz = sumz * invN;

    var xx = sumxx * invN - cx * cx;
    var yy = sumyy * invN - cy * cy;
    var zz = sumzz * invN - cz * cz;
    var xy = sumxy * invN - cx * cy;
    var xz = sumxz * invN - cx * cz;
    var yz = sumyz * invN - cy * cz;

    var wx = 0.0, wy = 0.0, wz = 0.0;
    {
      final det_x = yy * zz - yz * yz;
      final ax = det_x, ay = xz * yz - xy * zz, az = xy * yz - xz * yy;
      var w = det_x * det_x; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
      wx += ax * w; wy += ay * w; wz += az * w;
    }
    {
      final det_y = xx * zz - xz * xz;
      final ax = xz * yz - xy * zz, ay = det_y, az = xy * xz - yz * xx;
      var w = det_y * det_y; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
      wx += ax * w; wy += ay * w; wz += az * w;
    }
    {
      final det_z = xx * yy - xy * xy;
      final ax = xy * yz - xz * yy, ay = xy * xz - yz * xx, az = det_z;
      var w = det_z * det_z; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
      wx += ax * w; wy += ay * w; wz += az * w;
    }

    final wlen = Math.sqrt(wx*wx + wy*wy + wz*wz);
    var up:Null<Array<Float>> = null;
    if (wlen > 0 && Math.isFinite(wlen)) {
      var nx = wx / wlen, ny = wy / wlen, nz = wz / wlen;
      if (ny < 0.0) { nx = -nx; ny = -ny; nz = -nz; }
      up = [nx, ny, nz];
    }

    final bbox = new Aabb({ x:minx, y:miny, z:minz }, { x:maxx, y:maxy, z:maxz });

    // ---- NEW: summary logs ---------------------------------------------------
    if (DEBUG_COUNTS) {
      final rad = bbox.radius();
      trace('[ply::summary] bbox min=' + [minx,miny,minz] + ' max=' + [maxx,maxy,maxz] + ' radius=' + rad);
      trace('[ply::summary] center=' + [cx,cy,cz] + ' up=' + (up == null ? 'null' : '[' + up.join(",") + ']'));
      trace('[ply::summary] opacity[min,max]=[' + opMin + ',' + opMax + '] scales[min,max]=[' + sMin + ',' + sMax + '] SH_DC[min,max]=[' + dcMin + ',' + dcMax + ']');
    }
    // -------------------------------------------------------------------------

    final gaussBytes = new js.lib.Uint8Array(gaussU16.buffer);
    final shBytes    = new js.lib.Uint8Array(shU16.buffer);

    if (DEBUG_COUNTS) {
      trace('[ply] return: bytes gauss=' + gaussBytes.byteLength + ' sh=' + shBytes.byteLength
        + ' sh_deg=' + sh_deg + ' n=' + n);
      if (this.mip_splatting != null) trace('[ply] comment mip=' + this.mip_splatting);
      if (this.kernel_size != null)   trace('[ply] comment kernel_size=' + this.kernel_size);
      if (this.background_color != null) trace('[ply] comment background_color=' + this.background_color);
    }

    return GenericGaussianPointCloud.new_packed(
      gaussBytes,
      shBytes,
      sh_deg,
      n,
      this.kernel_size,
      this.mip_splatting,
      this.background_color,
      null,
      null,
      up != null ? { x: up[0], y: up[1], z: up[2] } : null,
      { x: cx, y: cy, z: cz },
      bbox
    );
  }

  /* ------------------------------ header parse ------------------------------ */

  static function parsePlyHeader(data:js.lib.ArrayBuffer):ParsedHeader {
    final u8 = new js.lib.Uint8Array(data);
    final needle = utf8Bytes("end_header");

    // scan for "end_header"
    var endIdx = -1;
    var limit = u8.length - needle.length + 1;
    var i = 0;
    while (i < limit) {
      var matched = true;
      var j = 0;
      while (j < needle.length) {
        if (u8[i + j] != needle[j]) { matched = false; break; }
        j++;
      }
      if (matched) { endIdx = i + needle.length; break; }
      i++;
    }
    if (endIdx < 0) throw "PLY: end_header not found";

    // advance to end of that line
    var headerEnd = endIdx;
    while (headerEnd < u8.length && u8[headerEnd] != 0x0a) headerEnd++;
    headerEnd++;

    final headerText = asciiDecode(u8.subarray(0, headerEnd));

    // Split lines robustly: use '\n' and trim to drop any trailing '\r'
    var rawLines = headerText.split("\n");
    var lines = new Array<String>();
    for (line in rawLines) {
      var s = StringTools.trim(line);
      if (s.length > 0) lines.push(s);
    }

    if (DEBUG_HEADER) {
      final preview = headerText.substr(0, Std.int(Math.min(headerText.length, 400)));
      trace('[ply::header] headerBytes=' + headerEnd + ' lines=' + lines.length);
      trace('[ply::header:preview] ' + preview.split("\n").join("\\n"));
    }

    var encoding:Null<PlyEncoding> = null;
    var vertexCount = 0;
    var comments:Array<String> = [];
    var vertexPropNames:Array<String> = [];
    var inVertexElement = false;

    // small helper: whitespace tokenizer (spaces/tabs, collapses multiples)
    inline function splitWS(s:String):Array<String> {
      var t = StringTools.replace(s, "\t", " ");
      while (t.indexOf("  ") != -1) t = StringTools.replace(t, "  ", " ");
      var arr = t.split(" ");
      var out = new Array<String>();
      for (x in arr) if (x.length > 0) out.push(x);
      return out;
    }

    for (line in lines) {
      if (StringTools.startsWith(line, "comment ")) {
        if (DEBUG_HEADER) trace('[ply::header] comment line: ' + line);
        comments.push(line.substr("comment ".length));
        continue;
      }

      if (StringTools.startsWith(line, "format ")) {
        if (line.indexOf("binary_little_endian") >= 0) encoding = "binary_little_endian";
        else if (line.indexOf("binary_big_endian") >= 0) encoding = "binary_big_endian";
        else if (line.indexOf("ascii") >= 0) encoding = "ascii";
        else throw 'PLY: unknown format in line "${line}"';
        if (DEBUG_HEADER) trace('[ply::header] format line: ' + line + ' -> encoding=' + encoding);
        continue;
      }

      if (StringTools.startsWith(line, "element ")) {
        // Parse explicitly to avoid regex/tokenizer quirks
        final rest = line.substr("element ".length);
        if (StringTools.startsWith(rest, "vertex ")) {
          final countStr = StringTools.trim(rest.substr("vertex ".length));
          vertexCount = Std.parseInt(countStr);
          inVertexElement = true;
          if (DEBUG_HEADER) trace('[ply::header] element vertex count=' + vertexCount);
        } else {
          inVertexElement = false;
          if (DEBUG_HEADER) trace('[ply::header] element non-vertex: ' + rest);
        }
        continue;
      }

      if (StringTools.startsWith(line, "property ") && inVertexElement) {
        final parts = splitWS(line);
        final name = parts[parts.length - 1];
        vertexPropNames.push(name);
        if (DEBUG_HEADER) trace('[ply::header] property (vertex) name=' + name + ' parts=' + parts.join('|'));
        continue;
      }
    }

    if (encoding == null) throw "PLY: format line not found";
    if (DEBUG_HEADER) {
      trace('[ply::header] encoding=' + encoding
        + ' vertexCount=' + vertexCount
        + ' headerBytes=' + headerEnd);
      trace('[ply::header] props=' + vertexPropNames.join(','));
      if (comments.length > 0) trace('[ply::header] comments=' + comments.join(' | '));
      if (vertexCount == 0) trace('[ply::header] WARNING: did not parse a non-zero vertexCount');
    }

    return {
      encoding: encoding,
      vertexCount: vertexCount,
      comments: comments,
      vertexPropNames: vertexPropNames,
      headerByteLength: headerEnd
    };
  }

  static inline function utf8Bytes(s:String):js.lib.Uint8Array {
    return new TextEncoder().encode(s);
  }
  static inline function asciiDecode(bytes:js.lib.Uint8Array):String {
    return new TextDecoder("utf-8").decode(bytes);
  }

  /* ------------------------- f32 -> f16 (scratch) ------------------------- */

  static var __f32_buf = new js.lib.ArrayBuffer(4);
  static var __f32v = new js.lib.Float32Array(__f32_buf);
  static var __u32v = new js.lib.Uint32Array(__f32_buf);

  static function f32_to_f16_fast(val:Float):Int {
    __f32v[0] = val;
    final x = __u32v[0];

    final sign = (x >>> 16) & 0x8000;
    var exp  = (x >>> 23) & 0xff;
    var mant = x & 0x007fffff;

    if (exp == 0xff) return sign | 0x7c00 | (mant != 0 ? 1 : 0);
    if (exp == 0) return sign;

    var e = exp - 112;
    if (e <= 0) {
      if (e < -10) return sign;
      mant = (mant | 0x00800000) >>> (1 - e);
      if ((mant & 0x00001000) != 0) mant += 0x00002000;
      return sign | (mant >>> 13);
    }
    if (e >= 0x1f) return sign | 0x7c00;

    if ((mant & 0x00001000) != 0) {
      mant += 0x00002000;
      if ((mant & 0x00800000) != 0) {
        mant = 0;
        e += 1;
        if (e >= 0x1f) return sign | 0x7c00;
      }
    }
    return sign | (e << 10) | ((mant >>> 13) & 0x03ff);
  }

  /* ----------------------------- comment parsers ---------------------------- */

  static function parseBoolFromComments(comments:Array<String>, key:String):Null<Bool> {
    for (c in comments) {
      if (c.indexOf(key) >= 0) {
        final idx = c.indexOf("=");
        if (idx >= 0) {
          final raw = StringTools.trim(c.substr(idx + 1));
          if (raw == "true") return true;
          if (raw == "false") return false;
        }
      }
    }
    return null;
  }

  static function parseNumberFromComments(comments:Array<String>, key:String):Null<Float> {
    for (c in comments) {
      if (c.indexOf(key) >= 0) {
        final idx = c.indexOf("=");
        if (idx >= 0) {
          final raw = StringTools.trim(c.substr(idx + 1));
          final num = Std.parseFloat(raw);
          if (Math.isFinite(num)) return num;
        }
      }
    }
    return null;
  }

  static function parseRGBFromComments(comments:Array<String>, key:String):Null<Array<Float>> {
    for (c in comments) {
      if (c.indexOf(key) >= 0) {
        final idx = c.indexOf("=");
        if (idx >= 0) {
          final raw = StringTools.trim(c.substr(idx + 1));
          final parts = raw.split(",").map(s -> Std.parseFloat(StringTools.trim(s)));
          if (parts.length == 3 && parts.every(v -> Math.isFinite(v))) {
            return [parts[0], parts[1], parts[2]];
          }
        }
      }
    }
    return null;
  }
}

/* ----------------------------- math utils used ----------------------------- */

private inline function buildCovScalar(
  qx:Float, qy:Float, qz:Float, qw:Float,
  sx:Float, sy:Float, sz:Float,
  out6:js.lib.Float32Array
):js.lib.Float32Array {
  final d0 = sx * sx, d1 = sy * sy, d2 = sz * sz;

  final xx = qx * qx, yy = qy * qy, zz = qz * qz;
  final xy = qx * qy, xz = qx * qz, yz = qy * qz;
  final wx = qw * qx, wy = qw * qy, wz = qw * qz;

  final r00 = 1 - 2 * (yy + zz);
  final r01 = 2 * (xy - wz);
  final r02 = 2 * (xz + wy);

  final r10 = 2 * (xy + wz);
  final r11 = 1 - 2 * (xx + zz);
  final r12 = 2 * (yz - wx);

  final r20 = 2 * (xz - wy);
  final r21 = 2 * (yz + wx);
  final r22 = 1 - 2 * (xx + yy);

  final rd00 = r00 * d0, rd01 = r01 * d1, rd02 = r02 * d2;
  final rd10 = r10 * d0, rd11 = r11 * d1, rd12 = r12 * d2;
  final rd20 = r20 * d0, rd21 = r21 * d1, rd22 = r22 * d2;

  final m00 = rd00 * r00 + rd01 * r01 + rd02 * r02;
  final m01 = rd00 * r10 + rd01 * r11 + rd02 * r12;
  final m02 = rd00 * r20 + rd01 * r21 + rd02 * r22;

  final m11 = rd10 * r10 + rd11 * r11 + rd12 * r12;
  final m12 = rd10 * r20 + rd11 * r21 + rd12 * r22;

  final m22 = rd20 * r20 + rd21 * r21 + rd22 * r22;

  out6[0] = m00; out6[1] = m01; out6[2] = m02;
  out6[3] = m11; out6[4] = m12; out6[5] = m22;
  return out6;
}

private inline function sigmoid(x:Float):Float {
  return x >= 0 ? 1.0 / (1.0 + Math.exp(-x)) : Math.exp(x) / (1.0 + Math.exp(x));
}
