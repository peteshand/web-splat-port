package io;

import pointcloud.Aabb;
import pointcloud.Types;
import pointcloud.Quantization;
import io.Ply.PlyReader;
import io.Npz.NpzReader;
import io.Npz.ZipNpzArchive;

/* ------------------------- helpers for fixed-length SH ------------------------- */
/** One SH coefficient triplet (r,g,b) */
typedef SHTriplet = Array<Float>; // length 3 expected

/** Exactly 16 SH triplets */
typedef SHBlock16 = Array<SHTriplet>;

/** Return type for plane_from_points (Haxe doesn’t have TS tuple destructuring) */
typedef PlaneResult = { center: Types.Point3f32, up: Null<Types.Vector3f32> };

/* ----------------------------- Reader interface ----------------------------- */
interface PointCloudReader {
  public function read(): GenericGaussianPointCloud;
  // concrete readers expose static magic_bytes() and file_ending()
}

/* ---------------------- GenericGaussianPointCloud ---------------------- */
class GenericGaussianPointCloud {
  var gaussiansBytes: js.lib.Uint8Array;
  var shCoefsBytes: js.lib.Uint8Array;
  var _compressed: Bool;

  // NOTE: names mirror Rust; the actual values are byte-packed like Rust consumers expect.
  public var covars: Null<Array<Types.Covariance3D>>;                       // runtime: Uint16Array chunks inside entries
  public var quantization: Null<Quantization.GaussianQuantization>;         // 64-byte layout when serialized
  public var sh_deg: Int;
  public var num_points: Int;
  public var kernel_size: Null<Float>;
  public var mip_splatting: Null<Bool>;
  public var background_color: Null<Array<Float>>;                           // [r,g,b]

  public var up: Null<Types.Vector3f32>;
  public var center: Types.Point3f32;
  public var aabb: Aabb;

  var _gaussiansParsed: Null<Array<Types.Gaussian>> = null;

  /* ------------------------------- factories ------------------------------- */

  public static function load(data: js.lib.ArrayBuffer): GenericGaussianPointCloud {
    var sig = new js.lib.Uint8Array(data, 0, 4);

    if (startsWith(sig, PlyReader.magic_bytes())) {
      var ply = new PlyReader(data);
      return ply.read();
    }
    if (startsWith(sig, NpzReader.magic_bytes())) {
      // zip (.npz) → in-memory archive → NpzReader
      var archive = ZipNpzArchive.fromArrayBuffer(data);
      var npz = new NpzReader(archive);
      return npz.read();
    }

    throw "Unknown file format";
  }

  // Rust: fn new(gaussians: Vec<Gaussian>, sh_coefs: Vec<[[f16;3];16]>, ...)
  public static function new(
    gaussians: Array<Types.Gaussian>,
    sh_coefs: Array<SHBlock16>,
    sh_deg: Int,
    num_points: Int,
    kernel_size: Null<Float>,
    mip_splatting: Null<Bool>,
    background_color: Null<Array<Float>>,
    covars: Null<Array<Types.Covariance3D>>,
    quantization: Null<Quantization.GaussianQuantization>
  ): GenericGaussianPointCloud {
    var bbox = Aabb.zeroed();
    for (g in gaussians) {
      bbox.grow({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z });
    }

    var points:Array<Types.Point3f32> = [];
    for (g in gaussians) points.push({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z });

    var pr = plane_from_points(points);
    var center = pr.center;
    var up0 = pr.up;

    var up:Null<Types.Vector3f32> = up0;
    if (bbox.radius() < 10.0) up = null;

    var gaussiansBytes = packGaussiansF16(gaussians);
    var shCoefsBytes   = packShCoefsF16(sh_coefs);

    return new GenericGaussianPointCloud(
      gaussiansBytes,
      shCoefsBytes,
      sh_deg,
      num_points,
      kernel_size,
      mip_splatting,
      background_color,
      covars,
      quantization,
      up,
      center,
      bbox,
      false,          // compressed
      gaussians       // parsed
    );
  }

  // Fast path: pre-packed bytes + precomputed bbox/center/up
  public static function new_packed(
    gaussiansBytes: js.lib.Uint8Array,
    shCoefsBytes: js.lib.Uint8Array,
    sh_deg: Int,
    num_points: Int,
    kernel_size: Null<Float>,
    mip_splatting: Null<Bool>,
    background_color: Null<Array<Float>>,
    covars: Null<Array<Types.Covariance3D>>,
    quantization: Null<Quantization.GaussianQuantization>,
    up: Null<Types.Vector3f32>,
    center: Types.Point3f32,
    bbox: Aabb
  ): GenericGaussianPointCloud {
    return new GenericGaussianPointCloud(
      gaussiansBytes,
      shCoefsBytes,
      sh_deg,
      num_points,
      kernel_size,
      mip_splatting,
      background_color,
      covars,
      quantization,
      up,
      center,
      bbox,
      false,
      null
    );
  }

  // Rust: fn new_compressed(...)
  public static function new_compressed(
    gaussians: Array<Types.GaussianCompressed>,
    sh_coefs_packed: js.lib.Uint8Array,
    sh_deg: Int,
    num_points: Int,
    kernel_size: Null<Float>,
    mip_splatting: Null<Bool>,
    background_color: Null<Array<Float>>,
    covars: Null<Array<Types.Covariance3D>>,
    quantization: Null<Quantization.GaussianQuantization>
  ): GenericGaussianPointCloud {
    var bbox = Aabb.unit();
    for (v in gaussians) {
      bbox.grow({ x: v.xyz.x, y: v.xyz.y, z: v.xyz.z });
    }

    var points:Array<Types.Point3f32> = [];
    for (g in gaussians) points.push({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z });

    var pr = plane_from_points(points);
    var center = pr.center;
    var up0 = pr.up;
    var up:Null<Types.Vector3f32> = up0;
    if (bbox.radius() < 10.0) up = null;

    var gaussiansBytes = packGaussiansCompressed(gaussians);

    return new GenericGaussianPointCloud(
      gaussiansBytes,
      sh_coefs_packed,
      sh_deg,
      num_points,
      kernel_size,
      mip_splatting,
      background_color,
      covars,
      quantization,
      up,
      center,
      bbox,
      true,   // compressed
      null
    );
  }

  /* -------------------------------- ctor -------------------------------- */
  public function new(
    gaussiansBytes: js.lib.Uint8Array,
    shCoefsBytes: js.lib.Uint8Array,
    sh_deg: Int,
    num_points: Int,
    kernel_size: Null<Float>,
    mip_splatting: Null<Bool>,
    background_color: Null<Array<Float>>,
    covars: Null<Array<Types.Covariance3D>>,
    quantization: Null<Quantization.GaussianQuantization>,
    up: Null<Types.Vector3f32>,
    center: Types.Point3f32,
    aabb: Aabb,
    compressed: Bool,
    parsed: Null<Array<Types.Gaussian>>
  ) {
    this.gaussiansBytes = gaussiansBytes;
    this.shCoefsBytes = shCoefsBytes;
    this._compressed = compressed;

    this.covars = covars;
    this.quantization = quantization;

    this.sh_deg = sh_deg;
    this.num_points = num_points;
    this.kernel_size = kernel_size;
    this.mip_splatting = mip_splatting;
    this.background_color = background_color;

    this.up = up;
    this.center = center;
    this.aabb = aabb;

    this._gaussiansParsed = parsed;
  }

  /* -------------------------------- API -------------------------------- */

  public function gaussians(): Array<Types.Gaussian> {
    if (this._compressed) throw "Gaussians are compressed";
    if (this._gaussiansParsed != null) return this._gaussiansParsed;
    throw "Parsed gaussians not available";
  }

  public function gaussians_compressed(): Array<Types.GaussianCompressed> {
    if (this._compressed) throw "Gaussians are compressed";
    else throw "Not compressed";
  }

  public function sh_coefs_buffer(): js.lib.Uint8Array {
    return this.shCoefsBytes;
  }

  public function gaussian_buffer(): js.lib.Uint8Array {
    return this.gaussiansBytes;
  }

  public function compressed(): Bool {
    return this._compressed;
  }
}

/* ------------------------------- small helpers ------------------------------ */

static inline function startsWith(buf: js.lib.Uint8Array, sig: js.lib.Uint8Array): Bool {
  if (sig.length > buf.length) return false;
  for (i in 0...sig.length) if (buf[i] != sig[i]) return false;
  return true;
}

// float32 -> float16 (uint16)
static function f32_to_f16(val: Float): Int {
  var f32 = new js.lib.Float32Array(1);
  var u32 = new js.lib.Uint32Array(f32.buffer);
  f32[0] = val;
  var x = u32[0];

  var sign = (x >>> 16) & 0x8000;
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

static inline function writeF16(view: js.lib.DataView, byteOffset: Int, v: Float): Void {
  view.setUint16(byteOffset, f32_to_f16(v), true);
}

// Gaussian: 20 bytes each (3*f16 + f16 + 6*f16)
static function packGaussiansF16(gaussians: Array<Types.Gaussian>): js.lib.Uint8Array {
  var BYTES_PER = 20;
  var buf = new js.lib.ArrayBuffer(gaussians.length * BYTES_PER);
  var view = new js.lib.DataView(buf);
  var off = 0;
  for (g in gaussians) {
    writeF16(view, off + 0,  g.xyz.x);
    writeF16(view, off + 2,  g.xyz.y);
    writeF16(view, off + 4,  g.xyz.z);
    writeF16(view, off + 6,  g.opacity);
    writeF16(view, off + 8,  g.cov[0]);
    writeF16(view, off + 10, g.cov[1]);
    writeF16(view, off + 12, g.cov[2]);
    writeF16(view, off + 14, g.cov[3]);
    writeF16(view, off + 16, g.cov[4]);
    writeF16(view, off + 18, g.cov[5]);
    off += BYTES_PER;
  }
  return new js.lib.Uint8Array(buf);
}

// sh_coefs: Vec<[[f16;3];16]> per point => 96 bytes per point
static function packShCoefsF16(sh: Array<SHBlock16>): js.lib.Uint8Array {
  var BYTES_PER_POINT = 16 * 3 * 2; // 96
  var buf = new js.lib.ArrayBuffer(sh.length * BYTES_PER_POINT);
  var view = new js.lib.DataView(buf);
  var off = 0;
  for (block in sh) {
    for (i in 0...16) {
      var trip = block[i];
      var r = trip[0], g = trip[1], b = trip[2];
      writeF16(view, off + 0, r);
      writeF16(view, off + 2, g);
      writeF16(view, off + 4, b);
      off += 6;
    }
  }
  return new js.lib.Uint8Array(buf);
}

// GaussianCompressed: 16 bytes each
static function packGaussiansCompressed(g: Array<Types.GaussianCompressed>): js.lib.Uint8Array {
  var BYTES_PER = 16;
  var buf = new js.lib.ArrayBuffer(g.length * BYTES_PER);
  var view = new js.lib.DataView(buf);
  var off = 0;
  for (v in g) {
    writeF16(view, off + 0, v.xyz.x);
    writeF16(view, off + 2, v.xyz.y);
    writeF16(view, off + 4, v.xyz.z);
    view.setInt8(off + 6, v.opacity);
    view.setInt8(off + 7, v.scale_factor);
    view.setUint32(off + 8,  v.geometry_idx, true);
    view.setUint32(off + 12, v.sh_idx,       true);
    off += BYTES_PER;
  }
  return new js.lib.Uint8Array(buf);
}

/* --------------------------------- math --------------------------------- */
static function plane_from_points(points: Array<Types.Point3f32>): PlaneResult {
  var n = points.length;

  var sumX = 0.0, sumY = 0.0, sumZ = 0.0;
  for (p in points) { sumX += p.x; sumY += p.y; sumZ += p.z; }
  var centroid:Types.Point3f32 = { x: sumX / (n > 0 ? n : 1), y: sumY / (n > 0 ? n : 1), z: sumZ / (n > 0 ? n : 1) };
  if (n < 3) return { center: centroid, up: null };

  var xx = 0.0, xy = 0.0, xz = 0.0, yy = 0.0, yz = 0.0, zz = 0.0;
  for (p in points) {
    var rx = p.x - centroid.x;
    var ry = p.y - centroid.y;
    var rz = p.z - centroid.z;
    xx += rx * rx; xy += rx * ry; xz += rx * rz;
    yy += ry * ry; yz += ry * rz;
    zz += rz * rz;
  }
  xx /= n; xy /= n; xz /= n; yy /= n; yz /= n; zz /= n;

  var wx = 0.0, wy = 0.0, wz = 0.0;

  {
    var det_x = yy * zz - yz * yz;
    var ax = det_x, ay = xz * yz - xy * zz, az = xy * yz - xz * yy;
    var w = det_x * det_x; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
    wx += ax * w; wy += ay * w; wz += az * w;
  }
  {
    var det_y = xx * zz - xz * xz;
    var ax = xz * yz - xy * zz, ay = det_y, az = xy * xz - yz * xx;
    var w = det_y * det_y; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
    wx += ax * w; wy += ay * w; wz += az * w;
  }
  {
    var det_z = xx * yy - xy * xy;
    var ax = xy * yz - xz * yy, ay = xy * xz - yz * xx, az = det_z;
    var w = det_z * det_z; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
    wx += ax * w; wy += ay * w; wz += az * w;
  }

  var len = Math.sqrt(wx*wx + wy*wy + wz*wz);
  if (!(len > 0) || !Math.isFinite(len)) return { center: centroid, up: null };

  var nx = wx / len, ny = wy / len, nz = wz / len;
  if (ny < 0.0) { nx = -nx; ny = -ny; nz = -nz; }

  return { center: centroid, up: { x: nx, y: ny, z: nz } };
}
