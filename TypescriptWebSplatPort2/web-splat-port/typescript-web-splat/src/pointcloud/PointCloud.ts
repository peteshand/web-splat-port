import { UniformBuffer } from '../uniform';
import { BYTES_PER_SPLAT } from './constants';
import { Aabb } from './aabb';
import type { Vec3, GenericGaussianPointCloud } from './types';
import { getLayouts } from './layout';
import { asBytes, isArrayBufferView, halfToFloat, packGaussianQuantizationToBytes } from './utils';
import { GaussianQuantization } from './quantization';

// ---- logging helper ----
function pclog(...args: any[]) {
  console.log('[pointcloud]', ...args);
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
      num_points: this.num_points_, sh_deg: this.sh_deg_,
      compressed: this.compressed_, bbox: this.bbox_,
      center: this.center_, mip_splatting: this.mip_splatting_,
      kernel_size: this.kernel_size_, background_color: this.background_color_
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
