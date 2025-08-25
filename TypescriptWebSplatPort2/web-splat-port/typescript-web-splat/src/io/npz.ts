// io/npz.ts
// TS port of src/io/npz.rs with perf-focused changes:
// - TypedArray.subarray reads (no Array.from/slice copies)
// - On-the-fly packing (no big temporaries) + block copy for SH "rest"
// - Separate S/G/F cardinalities kept
// - Lazy NPZ archive (parse on demand, free raw bytes)
// - Scalar path (no gl-matrix allocations)
// - Non-alloc f32->f16 conversion

import { unzipSync } from 'fflate';

import {
  Covariance3D,
  GaussianCompressed,
  GaussianQuantization,
  Quantization,
} from '../pointcloud';
import { buildCovScalar, shDegFromNumCoefs, shNumCoefficients } from '../utils';
import { GenericGaussianPointCloud, PointCloudReader } from './mod';

/* -------------------------------------------------------------------------- */
/*                 minimal NPZ adapter interfaces (sync-style)                */
/* -------------------------------------------------------------------------- */

export interface INpzArray<T = number> {
  data: ArrayLike<T>;
  shape: number[];
}
export interface INpzArchive {
  byName<T = number>(name: string): INpzArray<T> | undefined;
}

/* -------------------------- Concrete NPZ archive --------------------------- */

// lazy archive: store raw bytes, parse on demand, free afterwards
export class ZipNpzArchive implements INpzArchive {
  private parsed = new Map<string, INpzArray>();
  private raw = new Map<string, Uint8Array>();

  private constructor() {}

  static fromArrayBuffer(buf: ArrayBuffer): ZipNpzArchive {
    const files = unzipSync(new Uint8Array(buf));
    const z = new ZipNpzArchive();
    for (const name of Object.keys(files)) {
      if (!name.endsWith('.npy')) continue;
      const key = name.replace(/\.npy$/i, '');
      z.raw.set(key, files[name]); // keep raw; parse later
    }
    return z;
  }

  byName<T = number>(name: string): INpzArray<T> | undefined {
    const hit = this.parsed.get(name);
    if (hit) return hit as INpzArray<T>;
    const raw = this.raw.get(name);
    if (!raw) return undefined;
    const { data, shape } = parseNPY(raw);
    const arr = { data, shape };
    this.parsed.set(name, arr);
    this.raw.delete(name);           // free raw bytes ASAP
    return arr as INpzArray<T>;
  }
}

/* ------------------------------- NPY parser -------------------------------- */

function parseNPY(bytes: Uint8Array): { data: ArrayLike<number>, shape: number[] } {
  if (bytes[0] !== 0x93 || bytes[1] !== 0x4E || bytes[2] !== 0x55 || bytes[3] !== 0x4D || bytes[4] !== 0x50 || bytes[5] !== 0x59) {
    throw new Error('Invalid NPY magic');
  }
  const verMajor = bytes[6], verMinor = bytes[7];

  let headerLen = 0, headerOfs = 0;
  if (verMajor === 1) { headerLen = bytes[8] | (bytes[9] << 8); headerOfs = 10; }
  else { headerLen = (bytes[8]) | (bytes[9] << 8) | (bytes[10] << 16) | (bytes[11] << 24); headerOfs = 12; }

  const headerText = new TextDecoder('ascii').decode(bytes.subarray(headerOfs, headerOfs + headerLen));
  const descr = match1(headerText, /'descr'\s*:\s*'([^']+)'/);
  const fortran = match1(headerText, /'fortran_order'\s*:\s*(True|False)/) === 'True';
  const shapeStr = match1(headerText, /'shape'\s*:\s*\(([^)]*)\)/) || '';
  const shape = shapeStr.trim().length
    ? shapeStr.split(',').map(s => s.trim()).filter(Boolean).map(s => parseInt(s, 10))
    : [];

  const dataOfs = headerOfs + headerLen;
  const raw = bytes.subarray(dataOfs);

  const big = descr.startsWith('>');
  const type = descr.slice(1); // i1,i4,f4,f8,f2,b1
  const needSwap = big;

  let out: ArrayLike<number>;
  switch (type) {
    case 'i1': out = new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength); break;
    case 'i4': {
      const v = new Int32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      if (needSwap) byteswap32(v);
      out = v; break;
    }
    case 'f4': {
      const v = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
      if (needSwap) byteswap32(v);
      out = v; break;
    }
    case 'f8': {
      const v = new Float64Array(raw.buffer, raw.byteOffset, raw.byteLength / 8);
      if (needSwap) byteswap64(v);
      out = v; break;
    }
    case 'f2': { // half -> f32
      const u16 = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
      if (needSwap) byteswap16(u16);
      const f32 = new Float32Array(u16.length);
      for (let i = 0; i < u16.length; i++) f32[i] = f16_to_f32(u16[i]);
      out = f32; break;
    }
    case 'b1': out = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength); break;
    default: throw new Error(`Unsupported dtype '${descr}'`);
  }

  if (fortran) console.warn('NPY fortran_order=True encountered; data order may be wrong.');
  return { data: out, shape };
}

function match1(s: string, re: RegExp): string { const m = s.match(re); return m ? m[1] : ''; }
function byteswap16(a: Uint16Array) { for (let i = 0; i < a.length; i++) { const v = a[i]; a[i] = ((v & 0xFF) << 8) | (v >>> 8); } }
function byteswap32(a: Uint32Array | Int32Array | Float32Array) {
  const u = new Uint32Array(a.buffer, a.byteOffset, a.length);
  for (let i = 0; i < u.length; i++) { const v = u[i];
    u[i] = ((v & 0xFF) << 24) | ((v & 0xFF00) << 8) | ((v >>> 8) & 0xFF00) | ((v >>> 24) & 0xFF); }
}
function byteswap64(a: Float64Array) {
  const u = new Uint32Array(a.buffer, a.byteOffset, a.length * 2);
  for (let i = 0; i < u.length; i += 2) {
    const a0 = u[i], a1 = u[i + 1];
    u[i] = ((a1 & 0xFF) << 24) | ((a1 & 0xFF00) << 8) | ((a1 >>> 8) & 0xFF00) | ((a1 >>> 24) & 0xFF);
    u[i + 1] = ((a0 & 0xFF) << 24) | ((a0 & 0xFF00) << 8) | ((a0 >>> 8) & 0xFF00) | ((a0 >>> 24) & 0xFF);
  }
}
function f16_to_f32(u: number): number {
  const s = (u & 0x8000) >> 15, e = (u & 0x7C00) >> 10, f = u & 0x03FF;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : ((s ? -1 : 1) * Infinity);
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/* -------------------------------------------------------------------------- */
/*                  non-alloc f32 -> f16 (module-scope scratch)               */
/* -------------------------------------------------------------------------- */
const __f32_buf = new ArrayBuffer(4);
const __f32v = new Float32Array(__f32_buf);
const __u32v = new Uint32Array(__f32_buf);
function f32_to_f16_fast(val: number): number {
  __f32v[0] = val;
  const x = __u32v[0];

  const sign = (x >>> 16) & 0x8000;
  let exp  = (x >>> 23) & 0xff;
  let mant = x & 0x007fffff;

  if (exp === 0xff) return sign | 0x7c00 | (mant ? 1 : 0);
  if (exp === 0) return sign;

  let e = exp - 112;
  if (e <= 0) {
    if (e < -10) return sign;
    mant = (mant | 0x00800000) >>> (1 - e);
    if (mant & 0x00001000) mant += 0x00002000;
    return sign | (mant >>> 13);
  }
  if (e >= 0x1f) return sign | 0x7c00;

  if (mant & 0x00001000) {
    mant += 0x00002000;
    if (mant & 0x00800000) { mant = 0; e += 1; if (e >= 0x1f) return sign | 0x7c00; }
  }
  return sign | (e << 10) | ((mant >>> 13) & 0x03ff);
}

/* -------------------------------------------------------------------------- */
/*                                  Reader                                     */
/* -------------------------------------------------------------------------- */

export class NpzReader implements PointCloudReader {
  private npzFile: INpzArchive;
  private sh_deg: number;
  private kernel_size: number | null;
  private mip_splatting: boolean | null;
  private background_color: [number, number, number] | null;

  constructor(reader: INpzArchive) {
    this.npzFile = reader;

    // infer sh_deg from features_rest width (+1)
    let sh_deg = 0;
    const rest = this.npzFile.byName<number>('features_rest');
    if (rest) {
      const maybeDeg = shDegFromNumCoefs((rest.shape[1] ?? 0) + 1);
      if (maybeDeg == null) throw new Error('num sh coefs not valid');
      sh_deg = maybeDeg;
    }
    this.sh_deg = sh_deg;

    this.kernel_size   = get_npz_value<number>(this.npzFile, 'kernel_size');
    const ms           = get_npz_value<number>(this.npzFile, 'mip_splatting');
    this.mip_splatting = ms == null ? null : !!ms;

    const bg = get_npz_array_optional<number>(this.npzFile, 'background_color');
    this.background_color = bg ? ([bg[0], bg[1], bg[2]] as [number, number, number]) : null;
  }

  static magic_bytes(): Uint8Array { return new Uint8Array([0x50, 0x4B, 0x03, 0x04]); }
  static file_ending(): string { return 'npz'; }

  read(): GenericGaussianPointCloud {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const opacity_scale        = get_npz_value<number>(this.npzFile, 'opacity_scale') ?? 1.0;
    const opacity_zero_point   = get_npz_value<number>(this.npzFile, 'opacity_zero_point') ?? 0;

    const scaling_scale        = get_npz_value<number>(this.npzFile, 'scaling_scale') ?? 1.0;
    const scaling_zero_point   = (get_npz_value<number>(this.npzFile, 'scaling_zero_point') ?? 0);

    const rotation_scale       = get_npz_value<number>(this.npzFile, 'rotation_scale') ?? 1.0;
    const rotation_zero_point  = (get_npz_value<number>(this.npzFile, 'rotation_zero_point') ?? 0);

    const features_dc_scale        = get_npz_value<number>(this.npzFile, 'features_dc_scale') ?? 1.0;
    const features_dc_zero_point   = get_npz_value<number>(this.npzFile, 'features_dc_zero_point') ?? 0;

    const features_rest_scale      = get_npz_value<number>(this.npzFile, 'features_rest_scale') ?? 1.0;
    const features_rest_zero_point = get_npz_value<number>(this.npzFile, 'features_rest_zero_point') ?? 0;

    // --- Fetch arrays WITH shapes ------------------------------------------
    const xyzArr          = must_get_arr<number>(this.npzFile, 'xyz');           // S x 3 (f2->f32)
    const opacityArr      = must_get_arr<number>(this.npzFile, 'opacity');       // S or S x 1 (i1)
    const scalingArr      = must_get_arr<number>(this.npzFile, 'scaling');       // G x 3 (i1)
    const rotationArr     = must_get_arr<number>(this.npzFile, 'rotation');      // G x 4 (i1)
    const featuresDcArr   = must_get_arr<number>(this.npzFile, 'features_dc');   // F x 3 (i1) or 3D variants
    const featuresRestArr = must_get_arr<number>(this.npzFile, 'features_rest'); // F x rest (i1) or variants

    // SH degree & expected per-point coeff counts
    const sh_deg = this.sh_deg;
    const num_sh_coeffs    = shNumCoefficients(sh_deg);
    const sh_coeffs_length = (num_sh_coeffs * 3) | 0;
    const rest_num_coefs   = (sh_coeffs_length - 3) | 0;

    // Validate shapes but DON'T force a single N — we have S/G/F tables.
    expectShape(xyzArr,     2, [null, 3],              'xyz(S,3)');
    expectShapeOneOf(opacityArr, [{ dims: 1, pattern: [null] }, { dims: 2, pattern: [null, 1] }], 'opacity(S or Sx1)');
    expectShape(scalingArr, 2, [null, 3],              'scaling(G,3)');
    expectShape(rotationArr,2, [null, 4],              'rotation(G,4)');
    expectShapeOneOf(featuresDcArr, [
      { dims: 2, pattern: [null, 3] },
      { dims: 3, pattern: [null, 1, 3] },
      { dims: 3, pattern: [null, 3, 1] },
    ], 'features_dc(F,3)');

    const restPerChan = (rest_num_coefs % 3 === 0) ? (rest_num_coefs / 3) : null;
    const restChoices = [
      { dims: 2, pattern: [null, rest_num_coefs] as (number | null)[] },
      { dims: 3, pattern: [null, 1, rest_num_coefs] as (number | null)[] },
      { dims: 3, pattern: [null, rest_num_coefs, 1] as (number | null)[] },
    ];
    if (restPerChan !== null) {
      restChoices.push(
        { dims: 3, pattern: [null, restPerChan, 3] as (number | null)[] },
        { dims: 3, pattern: [null, 3, restPerChan] as (number | null)[] },
      );
    }
    expectShapeOneOf(featuresRestArr, restChoices, 'features_rest(F,rest)');

    // Cardinalities
    const S = Math.min(xyzArr.shape[0], opacityArr.shape[0]);
    const G = Math.min(rotationArr.shape[0], scalingArr.shape[0]);
    const F = Math.min(featuresDcArr.shape[0], featuresRestArr.shape[0]);

    // Typed views (no copies)
    const xyzF32      = (xyzArr.data as Float32Array).subarray(0, S * 3);
    const opacityI8   = (opacityArr.data as Int8Array).subarray(0, S);
    const scalingI8   = (scalingArr.data as Int8Array).subarray(0, G * 3);
    const rotationI8  = (rotationArr.data as Int8Array).subarray(0, G * 4);
    const fdcI8       = (featuresDcArr.data as Int8Array).subarray(0, F * 3);
    const frsI8       = rest_num_coefs > 0 ? (featuresRestArr.data as Int8Array).subarray(0, F * rest_num_coefs) : new Int8Array(0);

    // Optional per-splat arrays (typed, no copies)
    let scaling_factorI8: Int8Array | null = null;
    let scaling_factor_zero_point = 0;
    let scaling_factor_scale = 1.0;
    const hasScalingFactor = !!this.npzFile.byName('scaling_factor_scale');
    if (hasScalingFactor) {
      scaling_factor_scale       = get_npz_value<number>(this.npzFile, 'scaling_factor_scale') ?? 1.0;
      scaling_factor_zero_point  = get_npz_value<number>(this.npzFile, 'scaling_factor_zero_point') ?? 0;
      const sfArr = must_get_arr<number>(this.npzFile, 'scaling_factor');
      expectShapeOneOf(sfArr, [{ dims: 1, pattern: [null] }, { dims: 2, pattern: [null, 1] }], 'scaling_factor(S)');
      scaling_factorI8 = (sfArr.data as Int8Array).subarray(0, S);
    }

    let feature_indicesU32: Uint32Array | null = null;
    if (this.npzFile.byName('feature_indices')) {
      const fiArr = must_get_arr<number>(this.npzFile, 'feature_indices');
      expectShapeOneOf(fiArr, [{ dims: 1, pattern: [null] }, { dims: 2, pattern: [null, 1] }], 'feature_indices(S)');
      feature_indicesU32 = new Uint32Array((fiArr.data as Int32Array).buffer, (fiArr.data as Int32Array).byteOffset, Math.min(S, (fiArr.data as Int32Array).length));
    }

    let gaussian_indicesU32: Uint32Array | null = null;
    if (this.npzFile.byName('gaussian_indices')) {
      const giArr = must_get_arr<number>(this.npzFile, 'gaussian_indices');
      expectShapeOneOf(giArr, [{ dims: 1, pattern: [null] }, { dims: 2, pattern: [null, 1] }], 'gaussian_indices(S)');
      gaussian_indicesU32 = new Uint32Array((giArr.data as Int32Array).buffer, (giArr.data as Int32Array).byteOffset, Math.min(S, (giArr.data as Int32Array).length));
    }

    // --- Build compressed gaussians (length S) without intermediate arrays ---
    const gaussians: GaussianCompressed[] = new Array(S);
    for (let i = 0; i < S; i++) {
      const ix = i * 3;
      const gi = gaussian_indicesU32 ? (gaussian_indicesU32[i] % Math.max(1, G)) : (i % Math.max(1, G));
      const fi = feature_indicesU32  ? (feature_indicesU32[i]  % Math.max(1, F)) : (i % Math.max(1, F));

      gaussians[i] = {
        xyz: { x: xyzF32[ix + 0], y: xyzF32[ix + 1], z: xyzF32[ix + 2] },
        opacity: (opacityI8[i] | 0),
        scale_factor: scaling_factorI8 ? (scaling_factorI8[i] | 0) : 0,
        geometry_idx: gi >>> 0,
        sh_idx: fi >>> 0,
      };
    }

    // --- Pack SH for F entries directly into a Uint8Array (block copy for "rest") ---
    const sh_coefs = new Uint8Array(F * sh_coeffs_length);
    {
      let wp = 0;
      for (let i = 0; i < F; i++) {
        const j = i * 3;
        sh_coefs[wp++] = fdcI8[j + 0] as unknown as number;
        sh_coefs[wp++] = fdcI8[j + 1] as unknown as number;
        sh_coefs[wp++] = fdcI8[j + 2] as unknown as number;

        const base = i * rest_num_coefs;
        if (rest_num_coefs > 0) {
          sh_coefs.set(frsI8.subarray(base, base + rest_num_coefs), wp);
          wp += rest_num_coefs;
        }
      }
    }

    // --- Covariances for G entries -> f16-packed bytes (6 per geometry), no allocations ---
    const covarsHalf = new Uint16Array(G * 6);
    const cov6 = new Float32Array(6); // scratch
    for (let i = 0; i < G; i++) {
      const si = i * 3, ri = i * 4;

      // decode scaling (geometry)
      const s0 = (scalingI8[si + 0] - scaling_zero_point) * scaling_scale;
      const s1 = (scalingI8[si + 1] - scaling_zero_point) * scaling_scale;
      const s2 = (scalingI8[si + 2] - scaling_zero_point) * scaling_scale;
      let sx: number, sy: number, sz: number;
      if (!hasScalingFactor) {
        sx = Math.exp(s0); sy = Math.exp(s1); sz = Math.exp(s2);
      } else {
        let x = s0 > 0 ? s0 : 0, y = s1 > 0 ? s1 : 0, z = s2 > 0 ? s2 : 0;
        const n = Math.sqrt(x * x + y * y + z * z);
        if (n > 0) { x /= n; y /= n; z /= n; }
        sx = x; sy = y; sz = z;
      }

      // decode + normalize quaternion (w,x,y,z) -> (x,y,z,w)
      let qw = (rotationI8[ri + 0] - rotation_zero_point) * rotation_scale;
      let qx = (rotationI8[ri + 1] - rotation_zero_point) * rotation_scale;
      let qy = (rotationI8[ri + 2] - rotation_zero_point) * rotation_scale;
      let qz = (rotationI8[ri + 3] - rotation_zero_point) * rotation_scale;
      const qn = Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz);
      if (qn > 0) { qw /= qn; qx /= qn; qy /= qn; qz /= qn; }

      // compute covariance into cov6
      buildCovScalar(qx, qy, qz, qw, sx, sy, sz, cov6);

      const o = i * 6;
      covarsHalf[o + 0] = f32_to_f16_fast(cov6[0]);
      covarsHalf[o + 1] = f32_to_f16_fast(cov6[1]);
      covarsHalf[o + 2] = f32_to_f16_fast(cov6[2]);
      covarsHalf[o + 3] = f32_to_f16_fast(cov6[3]);
      covarsHalf[o + 4] = f32_to_f16_fast(cov6[4]);
      covarsHalf[o + 5] = f32_to_f16_fast(cov6[5]);
    }

    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    console.info('[npz] read S/G/F:', { S, G, F, sh_deg: this.sh_deg, took_ms: +(t1 - t0).toFixed(2) });

    // ---- pack GaussianQuantization exactly like Rust (4 * 16 bytes = 64B) ----
    const qbuf = new ArrayBuffer(64);
    const dv = new DataView(qbuf);
    writeQuant(dv,  0, features_dc_zero_point,    features_dc_scale);
    writeQuant(dv, 16, features_rest_zero_point,  features_rest_scale);
    writeQuant(dv, 32, opacity_zero_point,        opacity_scale);
    writeQuant(dv, 48, scaling_factor_zero_point, scaling_factor_scale);
    const quantBytes = new Uint8Array(qbuf);
    // -------------------------------------------------------------------------

    return GenericGaussianPointCloud.new_compressed(
      gaussians,                        // S
      sh_coefs,                         // F * (num_sh_coeffs*3)
      this.sh_deg,
      S,                                // num_points (splats)
      this.kernel_size ?? null,
      this.mip_splatting ?? null,
      this.background_color ?? null,
      (covarsHalf as unknown as Covariance3D[]),       // G * 6 halfs
      (quantBytes  as unknown as GaussianQuantization) // 64B uniform
    );
  }

  static magic_bytes_ts(): Uint8Array { return NpzReader.magic_bytes(); }
  static file_ending_ts(): string { return NpzReader.file_ending(); }
}

/* -------------------------------------------------------------------------- */
/*                                helpers (TS)                                 */
/* -------------------------------------------------------------------------- */

function writeQuant(dv: DataView, off: number, zero: number, scale: number) {
  dv.setInt32(off + 0, zero | 0, true);
  dv.setFloat32(off + 4, scale, true);
  dv.setUint32(off + 8, 0, true);
  dv.setUint32(off + 12, 0, true);
}
function must_get_arr<T>(reader: INpzArchive, field_name: string): INpzArray<T> {
  const arr = reader.byName<T>(field_name);
  if (!arr) throw new Error(`array ${field_name} missing`);
  return arr;
}
function expectShape(arr: INpzArray, dims: number, pattern: (number | null)[], name: string) {
  if (!arr.shape || arr.shape.length !== dims) throw new Error(`[npz] ${name}: expected ${dims}D, got shape=${JSON.stringify(arr.shape)}`);
  for (let i = 0; i < pattern.length; i++) {
    const want = pattern[i], got = arr.shape[i];
    if (want != null && got !== want) throw new Error(`[npz] ${name}: expected dim[${i}]=${want}, got ${got} (shape=${arr.shape})`);
  }
}
type ShapePattern = { dims: number; pattern: (number | null)[] };
function expectShapeOneOf(arr: INpzArray, choices: ShapePattern[], name: string) {
  const ok = choices.some(({ dims, pattern }) => {
    if (!arr.shape || arr.shape.length !== dims) return false;
    for (let i = 0; i < pattern.length; i++) { const want = pattern[i], got = arr.shape[i]; if (want != null && got !== want) return false; }
    return true;
  });
  if (!ok) {
    const want = choices.map(({ dims, pattern }) => `${dims}D(${pattern.map(p => p ?? '*').join(',')})`).join(' or ');
    throw new Error(`[npz] ${name}: expected ${want}, got shape=${JSON.stringify(arr.shape)}`);
  }
}
function get_npz_array_optional<T>(reader: INpzArchive, field_name: string): T[] | null {
  const arr = reader.byName<T>(field_name);
  if (!arr) return null;
  return Array.from(arr.data as ArrayLike<T>);
}
function get_npz_value<T>(reader: INpzArchive, field_name: string): T | null {
  const arr = get_npz_array_optional<T>(reader, field_name);
  if (!arr) return null;
  if (arr.length === 0) throw new Error('array empty');
  return arr[0] as T;
}
