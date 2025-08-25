// pointcloud.ts
// 1:1 port of pointcloud.rs to WebGPU (TypeScript)

import { UniformBuffer } from './uniform';

// ---- logging helper ----
function pclog(...args: any[]) {
  console.log('[pointcloud]', ...args);
}

// ---- Types mirroring the Rust structs (for clarity; buffers are passed as bytes) ----
export type Vec3 = { x: number; y: number; z: number };
export type Color3 = [number, number, number];

// ---- 1:1 Rust type mirrors we need to export ----
export type Point3f32 = { x: number; y: number; z: number };
export type Vector3f32 = { x: number; y: number; z: number };

// Zero-copy view over input bytes (ArrayBuffer or ArrayBufferView)
function asBytes(src: ArrayBuffer | ArrayBufferView): Uint8Array {
  return src instanceof ArrayBuffer
    ? new Uint8Array(src)
    : new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
}

// (optional) f16 → f32
function halfToFloat(h: number): number {
  const s = (h & 0x8000) >> 15, e = (h & 0x7C00) >> 10, f = h & 0x03FF;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : ((s ? -1 : 1) * Infinity);
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

export type Gaussian = {
  xyz: Point3f32;                 // f16 triplet in source
  opacity: number;                // f16
  cov: [number, number, number, number, number, number]; // [f16; 6]
};

export type GaussianCompressed = {
  xyz: Point3f32;       // f16
  opacity: number;      // i8
  scale_factor: number; // i8
  geometry_idx: number; // u32
  sh_idx: number;       // u32
};

export type Covariance3D = {
  v: [number, number, number, number, number, number];
};

export class Quantization {
  zero_point: number;
  scale: number;
  _pad: [number, number];
  constructor(zero_point = 0, scale = 1) {
    this.zero_point = zero_point;
    this.scale = scale;
    this._pad = [0, 0];
  }
  static new(zero_point: number, scale: number) {
    return new Quantization(zero_point, scale);
  }
}

export class GaussianQuantization {
  color_dc: Quantization;
  color_rest: Quantization;
  opacity: Quantization;
  scaling_factor: Quantization;
  constructor(
    color_dc = new Quantization(),
    color_rest = new Quantization(),
    opacity = new Quantization(),
    scaling_factor = new Quantization()
  ) {
    this.color_dc = color_dc;
    this.color_rest = color_rest;
    this.opacity = opacity;
    this.scaling_factor = scaling_factor;
  }
}

export class Aabb {
  min: Vec3;
  max: Vec3;

  constructor(min: Vec3, max: Vec3) {
    this.min = { ...min };
    this.max = { ...max };
  }

  static unit(): Aabb {
    return new Aabb({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 });
  }

  static zeroed(): Aabb {
    return new Aabb({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  }

  center(): Vec3 {
    return {
      x: (this.min.x + this.max.x) * 0.5,
      y: (this.min.y + this.max.y) * 0.5,
      z: (this.min.z + this.max.z) * 0.5,
    };
  }

  radius(): number {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
  }

  size(): Vec3 {
    return {
      x: this.max.x - this.min.x,
      y: this.max.y - this.min.y,
      z: this.max.z - this.min.z,
    };
  }

  grow(pos: Vec3): void {
    this.min.x = Math.min(this.min.x, pos.x);
    this.min.y = Math.min(this.min.y, pos.y);
    this.min.z = Math.min(this.min.z, pos.z);
    this.max.x = Math.max(this.max.x, pos.x);
    this.max.y = Math.max(this.max.y, pos.y);
    this.max.z = Math.max(this.max.z, pos.z);
  }

  grow_union(other: Aabb): void {
    this.min.x = Math.min(this.min.x, other.min.x);
    this.min.y = Math.min(this.min.y, other.min.y);
    this.min.z = Math.min(this.min.z, other.min.z);
    this.max.x = Math.max(this.max.x, other.max.x);
    this.max.y = Math.max(this.max.y, other.max.y);
    this.max.z = Math.max(this.max.z, other.max.z);
  }
}

// Layout-compatible with WGSL struct Splat (5 x u32 = 20 bytes).
export const BYTES_PER_SPLAT = 20;

// ---- Minimal interface your loader should satisfy (mirrors GenericGaussianPointCloud) ----
export interface GenericGaussianPointCloud {
  num_points: number;
  sh_deg: number;
  compressed(): boolean;

  gaussian_buffer(): ArrayBuffer | ArrayBufferView; // 3D gaussian source buffer
  sh_coefs_buffer(): ArrayBuffer | ArrayBufferView; // SH buffer

  // only for compressed:
  covars?: ArrayBuffer | ArrayBufferView;                 // covariance blocks
  quantization?: ArrayBufferView | GaussianQuantization;  // accept bytes or struct

  aabb: { min: Vec3; max: Vec3 };
  center: Vec3;
  up?: Vec3;
  mip_splatting?: boolean;
  kernel_size?: number;
  background_color?: Color3;
}

/* ------------------------------ layout cache ------------------------------ */

type LayoutCache = {
  plain: GPUBindGroupLayout;
  compressed: GPUBindGroupLayout;
  render: GPUBindGroupLayout;
};
const LAYOUTS = new WeakMap<GPUDevice, LayoutCache>();

function getLayouts(device: GPUDevice): LayoutCache {
  let l = LAYOUTS.get(device);
  if (l) return l;

  const plain = device.createBindGroupLayout({
    label: 'point cloud float bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ]
  });

  const compressed = device.createBindGroupLayout({
    label: 'point cloud bind group layout (compressed)',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });

  const render = device.createBindGroupLayout({
    label: 'point cloud rendering bind group layout',
    entries: [
      { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
    ]
  });

  l = { plain, compressed, render };
  LAYOUTS.set(device, l);
  pclog('getLayouts(): created new layouts');
  return l;
}

function isArrayBufferView(x: any): x is ArrayBufferView {
  return x && typeof x === 'object' && x.buffer instanceof ArrayBuffer && typeof (x as any).byteLength === 'number';
}

function packGaussianQuantizationToBytes(q: GaussianQuantization): Uint8Array {
  const buf = new ArrayBuffer(64);     // 4 * Quantization, each 16 bytes
  const dv = new DataView(buf);

  function writeQuant(off: number, zero: number, scale: number) {
    dv.setInt32(off + 0, zero | 0, true);
    dv.setFloat32(off + 4, scale, true);
    dv.setUint32(off + 8, 0, true);
    dv.setUint32(off + 12, 0, true);
  }

  writeQuant( 0, q.color_dc.zero_point,       q.color_dc.scale);
  writeQuant(16, q.color_rest.zero_point,     q.color_rest.scale);
  writeQuant(32, q.opacity.zero_point,        q.opacity.scale);
  writeQuant(48, q.scaling_factor.zero_point, q.scaling_factor.scale);
  return new Uint8Array(buf);
}

/* -------------------------------- PointCloud -------------------------------- */

export class PointCloud {
  private splat_2d_buffer: GPUBuffer;

  // internal fields (underscore to avoid clashes with Rust-style getter names)
  private _bind_group: GPUBindGroup;
  private _render_bind_group: GPUBindGroup;
  private num_points_: number;
  private sh_deg_: number;
  private bbox_: Aabb;
  private compressed_: boolean;

  private center_: Vec3;
  private up_?: Vec3;

  private mip_splatting_?: boolean;
  private kernel_size_?: number;
  private background_color_?: GPUColor;

  private vertex_buffer!: GPUBuffer; // 3D gaussians
  private sh_buffer!: GPUBuffer;     // SH coefs
  private covars_buffer?: GPUBuffer; // compressed only
  private quantization_uniform?: UniformBuffer<ArrayBufferView>;

  // captured for optional debug
  private _gaussianSrc?: Uint8Array;
  private _shSrc?: Uint8Array;

  static new(device: GPUDevice, pc: GenericGaussianPointCloud): PointCloud {
    return new PointCloud(device, pc);
  }

  private constructor(device: GPUDevice, pc: GenericGaussianPointCloud) {
    // Persist zero-copy byte views exactly once
    const gaussBytes = asBytes(pc.gaussian_buffer());
    const shBytes    = asBytes(pc.sh_coefs_buffer());
    this._gaussianSrc = gaussBytes;
    this._shSrc = shBytes;

    this.splat_2d_buffer = device.createBuffer({
      label: '2d gaussians buffer',
      size: (pc.num_points >>> 0) * BYTES_PER_SPLAT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    });
    pclog('ctor: created splat_2d_buffer', {
      bytes: (pc.num_points >>> 0) * BYTES_PER_SPLAT,
      num_points: pc.num_points
    });

    // Render bind group (only points_2d at binding=2)
    const { render, plain, compressed } = getLayouts(device);
    this._render_bind_group = device.createBindGroup({
      label: 'point cloud rendering bind group',
      layout: render,
      entries: [{ binding: 2, resource: { buffer: this.splat_2d_buffer } }]
    });
    pclog('ctor: created render bind group');

    // GPU buffers for 3D gaussians + SH coefs (upload without mapping)
    this.vertex_buffer = device.createBuffer({
      label: '3d gaussians buffer',
      size: gaussBytes.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.vertex_buffer, 0, gaussBytes);
    pclog('ctor: uploaded vertex_buffer', { bytes: gaussBytes.byteLength });

    this.sh_buffer = device.createBuffer({
      label: 'sh coefs buffer',
      size: shBytes.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.sh_buffer, 0, shBytes);
    pclog('ctor: uploaded sh_buffer', { bytes: shBytes.byteLength });

    // Build the preprocess bind group (compressed or not)
    const entries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: this.vertex_buffer } }, // read-only
      { binding: 1, resource: { buffer: this.sh_buffer } },     // read-only
      { binding: 2, resource: { buffer: this.splat_2d_buffer } } // read-write
    ];

    if (pc.compressed()) {
      if (!pc.covars) throw new Error('compressed() true but covars missing');
      const covBytes = asBytes(pc.covars);
      this.covars_buffer = device.createBuffer({
        label: 'Covariances buffer',
        size: covBytes.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      device.queue.writeBuffer(this.covars_buffer, 0, covBytes);
      entries.push({ binding: 3, resource: { buffer: this.covars_buffer } });

      if (!pc.quantization) throw new Error('compressed() true but quantization missing');

      let quantView: ArrayBufferView;
      if (isArrayBufferView(pc.quantization)) {
        quantView = asBytes(pc.quantization);
      } else {
        quantView = packGaussianQuantizationToBytes(pc.quantization as GaussianQuantization);
      }

      this.quantization_uniform = UniformBuffer.new(device, quantView, 'quantization uniform buffer');
      entries.push({ binding: 4, resource: { buffer: this.quantization_uniform.bufferRef() } });

      this._bind_group = device.createBindGroup({
        label: 'point cloud bind group (compressed)',
        layout: compressed,
        entries
      });
      pclog('ctor: created preprocess bind group (compressed)');
    } else {
      this._bind_group = device.createBindGroup({
        label: 'point cloud bind group',
        layout: plain,
        entries
      });
      pclog('ctor: created preprocess bind group (plain)');
    }

    // mirror Rust fields
    this.num_points_ = pc.num_points >>> 0;
    this.sh_deg_ = pc.sh_deg >>> 0;
    this.compressed_ = pc.compressed();
    this.bbox_ = new Aabb(pc.aabb.min, pc.aabb.max);
    this.center_ = { ...pc.center };
    this.up_ = pc.up ? { ...pc.up } : undefined;
    this.mip_splatting_ = pc.mip_splatting;
    this.kernel_size_ = pc.kernel_size;
    this.background_color_ = pc.background_color
      ? { r: pc.background_color[0], g: pc.background_color[1], b: pc.background_color[2], a: 1.0 }
      : undefined;

    pclog('ctor: initialized fields', {
      num_points: this.num_points_,
      sh_deg: this.sh_deg_,
      compressed: this.compressed_,
      bbox: this.bbox_,
      center: this.center_,
      mip_splatting: this.mip_splatting_,
      kernel_size: this.kernel_size_,
      background_color: this.background_color_
    });
  }

  // --- DEBUG: log first Gaussian & SH buffer sanity info
  public debugLogFirstGaussian(): void {
    if (!this._gaussianSrc) {
      console.warn('[pc] no gaussian src captured');
      return;
    }
    if (this.compressed_) {
      console.log('[pc] compressed point cloud; first-gaussian debug for raw halfs is skipped');
      console.log('[pc] aabb:', this.bbox_, 'num_points:', this.num_points_);
      return;
    }

    // uncompressed: 10 halfs (20 bytes) per gaussian
    const dv = new DataView(this._gaussianSrc.buffer, this._gaussianSrc.byteOffset, this._gaussianSrc.byteLength);
    const halves: number[] = [];
    for (let i = 0; i < Math.min(10, (this._gaussianSrc.byteLength / 2) | 0); i++) {
      halves.push(dv.getUint16(i * 2, true));
    }
    const floats = halves.map(halfToFloat);

    const xyz = floats.slice(0, 3);
    const opacity = floats[3];
    const cov = floats.slice(4, 10);

    console.log('[pc] first gaussian (halfs):', halves);
    console.log('[pc] first gaussian (floats):', { xyz, opacity, cov });
    console.log('[pc] aabb:', this.bbox_);
    console.log('[pc] num_points:', this.num_points_);
    console.log('[pc] sh bytes:', this._shSrc?.byteLength);
  }

  // ---- getters matching Rust API ----
  compressed(): boolean { return this.compressed_; }
  num_points(): number { return this.num_points_; }       // exact Rust name
  numPoints(): number { return this.num_points_; }
  sh_deg(): number { return this.sh_deg_; }               // exact Rust name
  shDeg(): number { return this.sh_deg_; }                // TS convenience
  bbox(): Aabb { return this.bbox_; }

  // Rust names (methods)
  bind_group(): GPUBindGroup { return this._bind_group; }
  render_bind_group(): GPUBindGroup { return this._render_bind_group; }

  // TS-friendly aliases used by renderer.ts:
  getBindGroup(): GPUBindGroup { return this._bind_group; }
  getRenderBindGroup(): GPUBindGroup { return this._render_bind_group; }

  mip_splatting(): boolean | undefined { return this.mip_splatting_; }      // exact Rust
  mipSplatting(): boolean | undefined { return this.mip_splatting_; }       // TS convenience
  dilation_kernel_size(): number | undefined { return this.kernel_size_; }  // exact Rust
  dilationKernelSize(): number | undefined { return this.kernel_size_; }    // TS convenience
  center(): Vec3 { return this.center_; }
  up(): Vec3 | undefined { return this.up_; }

  // ---- static bind group layouts (exact bindings/visibility as Rust) ----
  static bind_group_layout_compressed(device: GPUDevice): GPUBindGroupLayout {
    return getLayouts(device).compressed;
  }
  static bind_group_layout(device: GPUDevice): GPUBindGroupLayout {
    return getLayouts(device).plain;
  }
  static bind_group_layout_render(device: GPUDevice): GPUBindGroupLayout {
    return getLayouts(device).render;
  }
}
