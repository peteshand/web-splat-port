// pointcloud.ts
// 1:1 port of pointcloud.rs to WebGPU (TypeScript)
import { UniformBuffer } from './uniform.js';
export class Quantization {
    // Rust: #[repr(C)] { zero_point: i32, scale: f32, _pad: [u32; 2] }
    zero_point;
    scale;
    _pad;
    constructor(zero_point = 0, scale = 1) {
        this.zero_point = zero_point;
        this.scale = scale;
        this._pad = [0, 0];
    }
    static new(zero_point, scale) {
        return new Quantization(zero_point, scale);
    }
}
export class GaussianQuantization {
    color_dc;
    color_rest;
    opacity;
    scaling_factor;
    constructor(color_dc = new Quantization(), color_rest = new Quantization(), opacity = new Quantization(), scaling_factor = new Quantization()) {
        this.color_dc = color_dc;
        this.color_rest = color_rest;
        this.opacity = opacity;
        this.scaling_factor = scaling_factor;
    }
}
export class Aabb {
    min;
    max;
    constructor(min, max) {
        this.min = { ...min };
        this.max = { ...max };
    }
    static unit() {
        return new Aabb({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 });
    }
    static zeroed() {
        return new Aabb({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    }
    center() {
        return {
            x: (this.min.x + this.max.x) * 0.5,
            y: (this.min.y + this.max.y) * 0.5,
            z: (this.min.z + this.max.z) * 0.5,
        };
    }
    radius() {
        const dx = this.max.x - this.min.x;
        const dy = this.max.y - this.min.y;
        const dz = this.max.z - this.min.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
    }
    size() {
        return {
            x: this.max.x - this.min.x,
            y: this.max.y - this.min.y,
            z: this.max.z - this.min.z,
        };
    }
    grow(pos) {
        this.min.x = Math.min(this.min.x, pos.x);
        this.min.y = Math.min(this.min.y, pos.y);
        this.min.z = Math.min(this.min.z, pos.z);
        this.max.x = Math.max(this.max.x, pos.x);
        this.max.y = Math.max(this.max.y, pos.y);
        this.max.z = Math.max(this.max.z, pos.z);
    }
    grow_union(other) {
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
// ---- PointCloud (1:1 with Rust) ----
export class PointCloud {
    splat_2d_buffer;
    // renamed private fields (leading underscore) to avoid clashing with methods
    _bind_group;
    _render_bind_group;
    num_points;
    sh_deg;
    bbox_;
    compressed_;
    center_;
    up_;
    mip_splatting_;
    kernel_size_;
    background_color_;
    vertex_buffer; // 3D gaussians
    sh_buffer; // SH coefs
    covars_buffer; // compressed only
    quantization_uniform;
    // ---- new(device, pc) ----
    static new(device, pc) {
        return new PointCloud(device, pc);
    }
    constructor(device, pc) {
        // 2D splats buffer (written by preprocess, read by vertex shader)
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
        const entries = [
            { binding: 0, resource: { buffer: this.vertex_buffer } }, // read-only
            { binding: 1, resource: { buffer: this.sh_buffer } }, // read-only
            { binding: 2, resource: { buffer: this.splat_2d_buffer } } // read-write
        ];
        if (pc.compressed()) {
            // binding 3: covariances (storage read-only)
            if (!pc.covars)
                throw new Error('compressed() true but covars missing');
            this.covars_buffer = device.createBuffer({
                label: 'Covariances buffer',
                size: pc.covars.byteLength ?? pc.covars.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            new Uint8Array(this.covars_buffer.getMappedRange()).set(pc.covars instanceof ArrayBuffer ? new Uint8Array(pc.covars) : new Uint8Array(pc.covars));
            this.covars_buffer.unmap();
            entries.push({ binding: 3, resource: { buffer: this.covars_buffer } });
            // binding 4: quantization uniform
            if (!pc.quantization)
                throw new Error('compressed() true but quantization missing');
            this.quantization_uniform = UniformBuffer.new(device, pc.quantization, 'quantization uniform buffer');
            entries.push({ binding: 4, resource: { buffer: this.quantization_uniform.bufferRef() } });
            this._bind_group = device.createBindGroup({
                label: 'point cloud bind group (compressed)',
                layout: PointCloud.bind_group_layout_compressed(device),
                entries
            });
        }
        else {
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
    // ---- getters matching Rust API ----
    compressed() { return this.compressed_; }
    numPoints() { return this.num_points; }
    shDeg() { return this.sh_deg; }
    bbox() { return this.bbox_; }
    // Rust names (methods) — keep names; return the underscored fields
    bind_group() { return this._bind_group; }
    render_bind_group() { return this._render_bind_group; }
    // TS-friendly aliases used by your renderer.ts:
    getBindGroup() { return this._bind_group; }
    getRenderBindGroup() { return this._render_bind_group; }
    mipSplatting() { return this.mip_splatting_; }
    dilationKernelSize() { return this.kernel_size_; }
    center() { return this.center_; }
    up() { return this.up_; }
    // ---- static bind group layouts (exact bindings/visibility as Rust) ----
    static bind_group_layout_compressed(device) {
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
    static bind_group_layout(device) {
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
    static bind_group_layout_render(device) {
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
//# sourceMappingURL=pointcloud.js.map