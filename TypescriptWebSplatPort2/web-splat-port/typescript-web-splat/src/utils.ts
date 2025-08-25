// utils.ts
// 1-for-1 port of utils.rs utilities used by the renderer, with perf-oriented changes:
// - buildCovScalar: scalar, no-alloc covariance (optionally writes into a caller-provided out[6])
// - build_cov wrapper kept for compatibility (accepts [x,y,z,w] + [sx,sy,sz]-like)

 /** Map KeyboardEvent.code like "Digit3" -> 3, otherwise null */
 export function key_to_num(code: string): number | null {
  switch (code) {
    case 'Digit0': return 0;
    case 'Digit1': return 1;
    case 'Digit2': return 2;
    case 'Digit3': return 3;
    case 'Digit4': return 4;
    case 'Digit5': return 5;
    case 'Digit6': return 6;
    case 'Digit7': return 7;
    case 'Digit8': return 8;
    case 'Digit9': return 9;
    default: return null;
  }
}

/**
 * GPUStopwatch — mirrors the Rust struct/methods:
 * fields: query_set, query_buffer, query_set_capacity, index, labels
 * methods: new(..), start(..), stop(..), end(..), reset(), take_measurements(..)
 *
 * NOTE: WebGPU timestamp queries may be unavailable; in that case this class
 * degrades to no-ops and returns empty results.
 */
export class GPUStopwatch {
  // --- fields (same names as Rust) ---
  private query_set: GPUQuerySet | null;
  private query_buffer: GPUBuffer | null;
  private query_set_capacity: number; // total query slots (pairs * 2)
  private index: number;              // pair index (start/stop)
  private labels: Map<string, number>;

  // Web: browsers don’t expose a timestamp period like wgpu; assume ns ticks.
  private timestamp_period_ns = 1;

  // Rust: GPUStopwatch::new(device, capacity)
  static new(device: GPUDevice, capacity?: number): GPUStopwatch {
    return new GPUStopwatch(device, capacity);
  }

  constructor(device: GPUDevice, capacity?: number) {
    const pairs = Math.max(1, capacity ?? (8192 >> 1)); // default like Rust comment
    this.query_set_capacity = pairs * 2;
    this.index = 0;
    this.labels = new Map();

    let qs: GPUQuerySet | null = null;
    let qb: GPUBuffer | null = null;
    try {
      qs = device.createQuerySet({
        label: 'time stamp query set',
        type: 'timestamp',
        count: this.query_set_capacity,
      });
      qb = device.createBuffer({
        label: 'query set buffer',
        size: this.query_set_capacity * 8, // u64 per timestamp
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });
    } catch {
      // Feature not supported in current environment.
      qs = null;
      qb = null;
    }
    this.query_set = qs;
    this.query_buffer = qb;
  }

  start(encoder: GPUCommandEncoder, label: string): void {
    if (!this.query_set) return;
    if (this.labels.has(label)) {
      throw new Error('cannot start measurement for same label twice');
    }
    if (this.labels.size * 2 >= this.query_set_capacity) {
      throw new Error(`query set capacity (${this.query_set_capacity})reached`);
    }
    this.labels.set(label, this.index);
    (encoder as any).writeTimestamp?.(this.query_set, this.index * 2);
    this.index += 1;
  }

  stop(encoder: GPUCommandEncoder, label: string): void {
    if (!this.query_set) return;
    const idx = this.labels.get(label);
    if (idx === undefined) {
      throw new Error(`start was not yet called for label ${label}`);
    }
    (encoder as any).writeTimestamp?.(this.query_set, idx * 2 + 1);
  }

  end(encoder: GPUCommandEncoder): void {
    if (!this.query_set || !this.query_buffer) return;
    encoder.resolveQuerySet(this.query_set, 0, this.query_set_capacity, this.query_buffer, 0);
    this.index = 0;
  }

  reset(): void {
    this.labels.clear();
  }

  // TS: returns Map<label, duration_ms>
  async take_measurements(
    device: GPUDevice,
    queue: GPUQueue,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!this.query_buffer) return out;

    const labels = Array.from(this.labels.entries());
    this.labels.clear();

    const byteSize = this.query_set_capacity * 8;
    const staging = device.createBuffer({
      size: byteSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const enc = device.createCommandEncoder({ label: 'GPUStopwatch readback' });
    enc.copyBufferToBuffer(this.query_buffer, 0, staging, 0, byteSize);
    queue.submit([enc.finish()]);

    await staging.mapAsync(GPUMapMode.READ);
    const data = staging.getMappedRange();
    const timestamps = new BigUint64Array(data);

    for (const [label, index] of labels) {
      const start = timestamps[index * 2];
      const stop  = timestamps[index * 2 + 1];
      if (stop > start) {
        const diff_ns = stop - start;
        const ms = Number(diff_ns) / 1_000_000 / this.timestamp_period_ns;
        out.set(label, ms);
      }
    }

    staging.unmap();
    staging.destroy();
    return out;
  }
}

/** Simple ring buffer used for fixed-size rolling statistics, etc. */
export class RingBuffer<T> {
  private index = 0;
  private size = 0;
  private store: (T | undefined)[];

  constructor(capacity: number) {
    this.store = new Array(Math.max(1, capacity));
  }

  push(item: T): void {
    this.store[this.index] = item;
    this.index = (this.index + 1) % this.store.length;
    this.size = Math.min(this.size + 1, this.store.length);
  }

  to_array(): T[] {
    const out: T[] = [];
    if (this.size === 0) return out;
    const start = (this.index - this.size + this.store.length) % this.store.length;
    for (let i = 0; i < this.size; i++) {
      const v = this.store[(start + i) % this.store.length];
      if (v !== undefined) out.push(v);
    }
    return out;
  }
}

/** Number of SH coefficients for degree `sh_deg` ( (n+1)^2 ). */
export function sh_num_coefficients(sh_deg: number): number {
  return (sh_deg + 1) * (sh_deg + 1);
}

/** Inverse of sh_num_coefficients: returns degree if n is a perfect square; else null. */
export function sh_deg_from_num_coefs(n: number): number | null {
  const sqrt = Math.sqrt(n);
  return Number.isInteger(sqrt) ? (sqrt | 0) - 1 : null;
}

/**
 * Build the symmetric covariance (upper-triangular packed: m00,m01,m02,m11,m12,m22)
 * from quaternion components (x,y,z,w) and axis scales (sx,sy,sz).
 * Matches Kerbl et al. “3D Gaussian Splatting …”
 *
 * Inputs must already be normalized / exp()'d as appropriate.
 * If `out6` is provided, writes into it and returns it; otherwise returns a fresh tuple.
 */
export function buildCovScalar(
  qx: number, qy: number, qz: number, qw: number,
  sx: number, sy: number, sz: number,
  out6?: Float32Array
): [number, number, number, number, number, number] | Float32Array {
  // D = diag(s^2)
  const d0 = sx * sx, d1 = sy * sy, d2 = sz * sz;

  // Quaternion -> rotation matrix (same convention as previous build_cov)
  const xx = qx * qx, yy = qy * qy, zz = qz * qz;
  const xy = qx * qy, xz = qx * qz, yz = qy * qz;
  const wx = qw * qx, wy = qw * qy, wz = qw * qz;

  const r00 = 1 - 2 * (yy + zz);
  const r01 = 2 * (xy - wz);
  const r02 = 2 * (xz + wy);

  const r10 = 2 * (xy + wz);
  const r11 = 1 - 2 * (xx + zz);
  const r12 = 2 * (yz - wx);

  const r20 = 2 * (xz - wy);
  const r21 = 2 * (yz + wx);
  const r22 = 1 - 2 * (xx + yy);

  // RD = R * D
  const rd00 = r00 * d0, rd01 = r01 * d1, rd02 = r02 * d2;
  const rd10 = r10 * d0, rd11 = r11 * d1, rd12 = r12 * d2;
  const rd20 = r20 * d0, rd21 = r21 * d1, rd22 = r22 * d2;

  // M = RD * R^T
  const m00 = rd00 * r00 + rd01 * r01 + rd02 * r02;
  const m01 = rd00 * r10 + rd01 * r11 + rd02 * r12;
  const m02 = rd00 * r20 + rd01 * r21 + rd02 * r22;

  const m11 = rd10 * r10 + rd11 * r11 + rd12 * r12;
  const m12 = rd10 * r20 + rd11 * r21 + rd12 * r22;

  const m22 = rd20 * r20 + rd21 * r21 + rd22 * r22;

  if (out6) {
    out6[0] = m00; out6[1] = m01; out6[2] = m02;
    out6[3] = m11; out6[4] = m12; out6[5] = m22;
    return out6;
  }
  return [m00, m01, m02, m11, m12, m22];
}

/** Back-compat wrapper: accepts array-likes [x,y,z,w] and [sx,sy,sz] */
export function build_cov(
  rotation: ArrayLike<number>,   // [x,y,z,w], already normalized
  scale: ArrayLike<number>       // [sx,sy,sz], already exp()'d or normalized
): [number, number, number, number, number, number] {
  return buildCovScalar(rotation[0], rotation[1], rotation[2], rotation[3], scale[0], scale[1], scale[2]) as [number, number, number, number, number, number];
}

/** Numerically stable sigmoid */
export function sigmoid(x: number): number {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

/* -------------------------------------------------------------------------- */
/*                    camelCase aliases (for mixed imports)                    */
/* -------------------------------------------------------------------------- */
export const buildCov = build_cov;
export const shDegFromNumCoefs = sh_deg_from_num_coefs;
export const shNumCoefficients = sh_num_coefficients;
