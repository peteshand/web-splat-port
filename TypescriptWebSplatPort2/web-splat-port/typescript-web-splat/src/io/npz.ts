// io/npz.ts
// 1:1 port of src/io/npz.rs (logic and structure preserved)

import { quat, vec3 } from 'gl-matrix';

import {
  Covariance3D,
  GaussianCompressed,
  GaussianQuantization,
  Quantization,
} from '../pointcloud';
import {
  buildCov,
  shDegFromNumCoefs,
  shNumCoefficients,
} from '../utils';
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

    let sh_deg = 0;
    const rest = this.npzFile.byName<number>('features_rest');
    if (rest) {
      const maybeDeg = shDegFromNumCoefs(rest.shape[1] + 1);
      if (maybeDeg == null) throw new Error('num sh coefs not valid');
      sh_deg = maybeDeg;
    }
    this.sh_deg = sh_deg;

    this.kernel_size = get_npz_value<number>(this.npzFile, 'kernel_size');
    this.mip_splatting = get_npz_value<number>(this.npzFile, 'mip_splatting') as unknown as (boolean | null);

    const bg = get_npz_array_optional<number>(this.npzFile, 'background_color');
    this.background_color = bg ? ([bg[0], bg[1], bg[2]] as [number, number, number]) : null;
  }

  static magic_bytes(): Uint8Array {
    return new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
  }
  static file_ending(): string { return 'npz'; }

  read(): GenericGaussianPointCloud {
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const opacity_scale = get_npz_value<number>(this.npzFile, 'opacity_scale') ?? 1.0;
    const opacity_zero_point = get_npz_value<number>(this.npzFile, 'opacity_zero_point') ?? 0;

    const scaling_scale = get_npz_value<number>(this.npzFile, 'scaling_scale') ?? 1.0;
    const scaling_zero_point = (get_npz_value<number>(this.npzFile, 'scaling_zero_point') ?? 0);

    const rotation_scale = get_npz_value<number>(this.npzFile, 'rotation_scale') ?? 1.0;
    const rotation_zero_point = (get_npz_value<number>(this.npzFile, 'rotation_zero_point') ?? 0);

    const features_dc_scale = get_npz_value<number>(this.npzFile, 'features_dc_scale') ?? 1.0;
    const features_dc_zero_point = get_npz_value<number>(this.npzFile, 'features_dc_zero_point') ?? 0;

    const features_rest_scale = get_npz_value<number>(this.npzFile, 'features_rest_scale') ?? 1.0;
    const features_rest_zero_point = get_npz_value<number>(this.npzFile, 'features_rest_zero_point') ?? 0;

    let scaling_factor: number[] | null = null;
    let scaling_factor_zero_point = 0;
    let scaling_factor_scale = 1.0;

    if (this.npzFile.byName('scaling_factor_scale')) {
      scaling_factor_scale = get_npz_value<number>(this.npzFile, 'scaling_factor_scale') ?? 1.0;
      scaling_factor_zero_point = get_npz_value<number>(this.npzFile, 'scaling_factor_zero_point') ?? 0;
      scaling_factor = try_get_npz_array<number>(this.npzFile, 'scaling_factor');
    }

    const xyzRaw = try_get_npz_array<number>(this.npzFile, 'xyz');
    const xyz = chunk3(xyzRaw).map(([x, y, z]) => ({ x, y, z }));

    let scaling: Array<ReturnType<typeof vec3.fromValues>>;
    const scalingRaw = try_get_npz_array<number>(this.npzFile, 'scaling');
    if (!scaling_factor) {
      const vals = scalingRaw.map((c) => Math.exp((c - scaling_zero_point) * scaling_scale));
      scaling = chunk3(vals).map(([x, y, z]) => vec3.fromValues(x, y, z));
    } else {
      const vals = scalingRaw.map((c) => Math.max((c - scaling_zero_point) * scaling_scale, 0));
      scaling = chunk3(vals).map(([x, y, z]) => {
        const v = vec3.fromValues(x, y, z);
        const n = vec3.len(v);
        return n > 0 ? vec3.scale(vec3.create(), v, 1 / n) : vec3.fromValues(0, 0, 0);
      });
    }

    const rotationRaw = try_get_npz_array<number>(this.npzFile, 'rotation');
    const rotation = chunkN(rotationRaw.map((c) => (c - rotation_zero_point) * rotation_scale), 4)
      .map(([w, x, y, z]) => {
        const q = quat.fromValues(x, y, z, w);
        return quat.normalize(q, q);
      });

    const opacity = try_get_npz_array<number>(this.npzFile, 'opacity');

    let feature_indices: number[] | null = null;
    if (this.npzFile.byName('feature_indices')) {
      feature_indices = try_get_npz_array<number>(this.npzFile, 'feature_indices').map((v) => v >>> 0);
    }

    let gaussian_indices: number[] | null = null;
    if (this.npzFile.byName('gaussian_indices')) {
      gaussian_indices = try_get_npz_array<number>(this.npzFile, 'gaussian_indices').map((v) => v >>> 0);
    }

    const features_dc = try_get_npz_array<number>(this.npzFile, 'features_dc');
    const features_rest = try_get_npz_array<number>(this.npzFile, 'features_rest');

    const num_points = xyz.length;
    const sh_deg = this.sh_deg;
    const num_sh_coeffs = shNumCoefficients(sh_deg);

    const gaussians: GaussianCompressed[] = [];
    for (let i = 0; i < num_points; i++) {
      gaussians.push({
        xyz: xyz[i],
        opacity: opacity[i] | 0,
        scale_factor: scaling_factor ? (scaling_factor[i] | 0) : 0,
        geometry_idx: gaussian_indices ? gaussian_indices[i] >>> 0 : i >>> 0,
        sh_idx: feature_indices ? feature_indices[i] >>> 0 : i >>> 0,
      });
    }

    const sh_coeffs_length = (num_sh_coeffs * 3) | 0;
    const rest_num_coefs = (sh_coeffs_length - 3) | 0;
    const sh_coefs_tmp: number[] = [];
    for (let i = 0; i < features_dc.length / 3; i++) {
      sh_coefs_tmp.push(features_dc[i * 3 + 0] | 0);
      sh_coefs_tmp.push(features_dc[i * 3 + 1] | 0);
      sh_coefs_tmp.push(features_dc[i * 3 + 2] | 0);
      for (let j = 0; j < rest_num_coefs; j++) {
        sh_coefs_tmp.push(features_rest[i * rest_num_coefs + j] | 0);
      }
    }
    // --- FIX 2: convert signed i8 values to raw bytes (Uint8Array) ---
    const sh_coefs = new Uint8Array(sh_coefs_tmp.length);
    for (let i = 0; i < sh_coefs_tmp.length; i++) sh_coefs[i] = sh_coefs_tmp[i] & 0xff;

    // --- FIX 1: produce Covariance3D objects with required `v` field ---
    const covars: Covariance3D[] = rotation.map((q, i) => {
      const c = buildCov(q, scaling[i]); // [m00,m01,m02,m11,m12,m22]
      return { v: [c[0], c[1], c[2], c[3], c[4], c[5]] };
    });

    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    console.info('reading took', (t1 - t0).toFixed(2), 'ms');

    const quantization: GaussianQuantization = {
      color_dc: Quantization.new(features_dc_zero_point, features_dc_scale),
      color_rest: Quantization.new(features_rest_zero_point, features_rest_scale),
      opacity: Quantization.new(opacity_zero_point, opacity_scale),
      scaling_factor: Quantization.new(scaling_factor_zero_point, scaling_factor_scale),
    };

    return GenericGaussianPointCloud.new_compressed(
      gaussians,
      sh_coefs,
      sh_deg,
      num_points,
      this.kernel_size ?? null,
      this.mip_splatting ?? null,
      this.background_color ?? null,
      covars,
      quantization,
    );
  }

  static magic_bytes_ts(): Uint8Array { return NpzReader.magic_bytes(); }
  static file_ending_ts(): string { return NpzReader.file_ending(); }
}

/* -------------------------------------------------------------------------- */
/*                                helpers (TS)                                 */
/* -------------------------------------------------------------------------- */

function chunk3(a: ArrayLike<number>): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < a.length; i += 3) out.push([a[i], a[i + 1], a[i + 2]]);
  return out;
}
function chunkN(a: ArrayLike<number>, n: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < a.length; i += n) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = a[i + j];
    out.push(row);
  }
  return out;
}

function get_npz_array_optional<T>(reader: INpzArchive, field_name: string): T[] | null {
  const arr = reader.byName<T>(field_name);
  if (!arr) return null;
  return Array.from(arr.data as ArrayLike<T>);
}
function try_get_npz_array<T>(reader: INpzArchive, field_name: string): T[] {
  const arr = reader.byName<T>(field_name);
  if (!arr) throw new Error(`array ${field_name} missing`);
  return Array.from(arr.data as ArrayLike<T>);
}
function get_npz_value<T>(reader: INpzArchive, field_name: string): T | null {
  const arr = get_npz_array_optional<T>(reader, field_name);
  if (!arr) return null;
  if (arr.length === 0) throw new Error('array empty');
  return arr[0] as T;
}
