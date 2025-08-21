// pointcloud.ts
// 1:1 port of pointcloud.rs to WebGPU (TypeScript)

import { UniformBuffer } from './uniform';

// ---- Types mirroring the Rust structs (for clarity; buffers are passed as bytes) ----
export type Vec3 = { x: number; y: number; z: number };
export type Color3 = [number, number, number];

// ---- 1:1 Rust type mirrors we need to export ----
export type Point3f32 = { x: number; y: number; z: number };
export type Vector3f32 = { x: number; y: number; z: number };

function toArrayBuffer(src: ArrayBuffer | ArrayBufferView): ArrayBuffer {
    if (src instanceof ArrayBuffer) return src.slice(0);
    // src is a view (e.g., Uint8Array)
    const { buffer, byteOffset, byteLength } = src;
    return buffer.slice(byteOffset, byteOffset + byteLength);
}

// (optional) f16 → f32 from my prior message
function halfToFloat(h: number): number {
    const s = (h & 0x8000) >> 15, e = (h & 0x7C00) >> 10, f = h & 0x03FF;
    if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    if (e === 31) return f ? NaN : ((s ? -1 : 1) * Infinity);
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

export type Gaussian = {
    // Rust: Point3<f16> for xyz; we store as numbers and pack to f16 later
    xyz: Point3f32;
    opacity: number; // f16
    cov: [number, number, number, number, number, number]; // [f16; 6]
  };
  
  export type GaussianCompressed = {
    // Rust: #[repr(C)] tightly packed; we mirror fields
    xyz: Point3f32;              // f16
    opacity: number;             // i8
    scale_factor: number;        // i8
    geometry_idx: number;        // u32
    sh_idx: number;              // u32
  };
  
  export type Covariance3D = {
    // Rust: tuple struct Covariance3D([f16; 6]); keep the 6-tuple
    v: [number, number, number, number, number, number];
  };
  
  export class Quantization {
    // Rust: #[repr(C)] { zero_point: i32, scale: f32, _pad: [u32; 2] }
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

  // raw GPU-ready bytes:
  gaussian_buffer(): ArrayBuffer;   // 3D gaussian source buffer (layout matches WGSL preprocess)
  sh_coefs_buffer(): ArrayBuffer;   // SH buffer

  // only for compressed:
  covars?: ArrayBuffer;             // covariance blocks
  quantization?: ArrayBufferView;   // bytes for GaussianQuantization uniform

  aabb: { min: Vec3; max: Vec3 };
  center: Vec3;
  up?: Vec3;
  mip_splatting?: boolean;
  kernel_size?: number;
  background_color?: Color3;
}

// ---- PointCloud (1:1 with Rust) ----
export class PointCloud {
    private splat_2d_buffer: GPUBuffer;
  
    // renamed private fields (leading underscore) to avoid clashing with methods
    private _bind_group: GPUBindGroup;
    private _render_bind_group: GPUBindGroup;
    private num_points: number;
    private sh_deg: number;
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

    private _gaussianSrc?: ArrayBuffer;
    private _shSrc?: ArrayBuffer;
  
    // ---- new(device, pc) ----
    static new(device: GPUDevice, pc: GenericGaussianPointCloud): PointCloud {
      return new PointCloud(device, pc);
    }
  
    private constructor(device: GPUDevice, pc: GenericGaussianPointCloud) {
      // 2D splats buffer (written by preprocess, read by vertex shader)

      this._gaussianSrc = toArrayBuffer(pc.gaussian_buffer() as any);
      this._shSrc       = toArrayBuffer(pc.sh_coefs_buffer() as any);

      this.splat_2d_buffer = device.createBuffer({
        label: '2d gaussians buffer',
        size: pc.num_points * BYTES_PER_SPLAT,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
      });
  
      // Render bind group (only points_2d at binding=2)
      this._render_bind_group = device.createBindGroup({
        label: 'point cloud rendering bind group',
        layout: PointCloud.bind_group_layout_render(device),
        entries: [
          {
            binding: 2,
            resource: { buffer: this.splat_2d_buffer }
          }
        ]
      });
  
      // 3D gaussians + SH buffers
      this.vertex_buffer = device.createBuffer({
        label: '3d gaussians buffer',
        size: pc.gaussian_buffer().byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Uint8Array(this.vertex_buffer.getMappedRange()).set(new Uint8Array(pc.gaussian_buffer()));
      this.vertex_buffer.unmap();
  
      this.sh_buffer = device.createBuffer({
        label: 'sh coefs buffer',
        size: pc.sh_coefs_buffer().byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Uint8Array(this.sh_buffer.getMappedRange()).set(new Uint8Array(pc.sh_coefs_buffer()));
      this.sh_buffer.unmap();
  
      // Build the preprocess bind group (compressed or not)
      const entries: GPUBindGroupEntry[] = [
        { binding: 0, resource: { buffer: this.vertex_buffer } }, // read-only
        { binding: 1, resource: { buffer: this.sh_buffer } },     // read-only
        { binding: 2, resource: { buffer: this.splat_2d_buffer } } // read-write
      ];
  
      if (pc.compressed()) {
        // binding 3: covariances (storage read-only)
        if (!pc.covars) throw new Error('compressed() true but covars missing');
        this.covars_buffer = device.createBuffer({
          label: 'Covariances buffer',
          size: (pc.covars as any).byteLength ?? (pc.covars as ArrayBuffer).byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true
        });
        new Uint8Array(this.covars_buffer.getMappedRange()).set(
          pc.covars instanceof ArrayBuffer ? new Uint8Array(pc.covars) : new Uint8Array(pc.covars as ArrayBufferLike)
        );
        this.covars_buffer.unmap();
        entries.push({ binding: 3, resource: { buffer: this.covars_buffer } });
  
        // binding 4: quantization uniform
        if (!pc.quantization) throw new Error('compressed() true but quantization missing');
        this.quantization_uniform = UniformBuffer.new(device, pc.quantization, 'quantization uniform buffer');
        entries.push({ binding: 4, resource: { buffer: this.quantization_uniform.bufferRef() } });
  
        this._bind_group = device.createBindGroup({
          label: 'point cloud bind group (compressed)',
          layout: PointCloud.bind_group_layout_compressed(device),
          entries
        });
      } else {
        this._bind_group = device.createBindGroup({
          label: 'point cloud bind group',
          layout: PointCloud.bind_group_layout(device),
          entries
        });
      }
  
      // mirror Rust fields
      this.num_points = pc.num_points >>> 0;
      this.sh_deg = pc.sh_deg >>> 0;
      this.compressed_ = pc.compressed();
      this.bbox_ = new Aabb(pc.aabb.min, pc.aabb.max);
      this.center_ = { ...pc.center };
      this.up_ = pc.up ? { ...pc.up } : undefined;
      this.mip_splatting_ = pc.mip_splatting;
      this.kernel_size_ = pc.kernel_size;
      this.background_color_ = pc.background_color
        ? { r: pc.background_color[0], g: pc.background_color[1], b: pc.background_color[2], a: 1.0 }
        : undefined;
    }

    // --- DEBUG: log first Gaussian & SH buffer sanity info
    public debugLogFirstGaussian(): void {
        const buf = this._gaussianSrc;
        if (!buf) { console.warn('[pc] no gaussian src captured'); return; }
      
        const dv = new DataView(buf);             // now guaranteed ArrayBuffer
        // uncompressed: 10 halfs (20 bytes) per gaussian
        const halves: number[] = [];
        for (let i = 0; i < 10; i++) halves.push(dv.getUint16(i * 2, true));
        const floats = halves.map(halfToFloat);
      
        const xyz = floats.slice(0, 3);
        const opacity = floats[3];
        const cov = floats.slice(4);
      
        console.log('[pc] first gaussian (halfs):', halves);
        console.log('[pc] first gaussian (floats):', { xyz, opacity, cov });
        console.log('[pc] aabb:', this.bbox_);
        console.log('[pc] num_points:', this.num_points);
      
        const expectedSH = this.num_points * 24 * 4; // deg=3: 24 u32 per point
        console.log('[pc] sh bytes:', this._shSrc?.byteLength, 'expected:', expectedSH);
    }
  
    // ---- getters matching Rust API ----
    compressed(): boolean { return this.compressed_; }
    numPoints(): number { return this.num_points; }
    shDeg(): number { return this.sh_deg; }
    bbox(): Aabb { return this.bbox_; }
  
    // Rust names (methods) — keep names; return the underscored fields
    bind_group(): GPUBindGroup { return this._bind_group; }
    render_bind_group(): GPUBindGroup { return this._render_bind_group; }
  
    // TS-friendly aliases used by your renderer.ts:
    getBindGroup(): GPUBindGroup { return this._bind_group; }
    getRenderBindGroup(): GPUBindGroup { return this._render_bind_group; }
  
    mipSplatting(): boolean | undefined { return this.mip_splatting_; }
    dilationKernelSize(): number | undefined { return this.kernel_size_; }
    center(): Vec3 { return this.center_; }
    up(): Vec3 | undefined { return this.up_; }

  // ---- static bind group layouts (exact bindings/visibility as Rust) ----
  static bind_group_layout_compressed(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'point cloud bind group layout (compressed)',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage', hasDynamicOffset: false }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage', hasDynamicOffset: false }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage', hasDynamicOffset: false }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage', hasDynamicOffset: false }
        },
        {
          binding: 4,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform', hasDynamicOffset: false }
        }
      ]
    });
  }

  static bind_group_layout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'point cloud float bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage', hasDynamicOffset: false }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage', hasDynamicOffset: false }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage', hasDynamicOffset: false }
        }
      ]
    });
  }

  static bind_group_layout_render(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'point cloud rendering bind group layout',
      entries: [
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage', hasDynamicOffset: false }
        }
      ]
    });
  }
}
