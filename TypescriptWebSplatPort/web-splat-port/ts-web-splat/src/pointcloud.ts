// Mirrors pointcloud.rs - complete port
import { GenericGaussianPointCloud } from "./io.js";
import { UniformBuffer } from "./uniform.js";

export type Vec3 = [number, number, number];
export type Point3<T = number> = [T, T, T];
export type Vector3<T = number> = [T, T, T];

export interface Aabb<T = number> { 
  min: Point3<T>; 
  max: Point3<T>; 
  
  center(): Point3<T>;
  radius(): T;
  size(): Vector3<T>;
  corners(): Point3<T>[];
  grow(pos: Point3<T>): void;
  growUnion(other: Aabb<T>): void;
}

export class AabbImpl<T extends number = number> implements Aabb<T> {
  constructor(public min: Point3<T>, public max: Point3<T>) {}
  
  center(): Point3<T> {
    return [
      (this.min[0] + this.max[0]) / 2 as T,
      (this.min[1] + this.max[1]) / 2 as T,
      (this.min[2] + this.max[2]) / 2 as T
    ];
  }
  
  radius(): T {
    const dx = this.max[0] - this.min[0];
    const dy = this.max[1] - this.min[1];
    const dz = this.max[2] - this.min[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz) / 2 as T;
  }
  
  size(): Vector3<T> {
    return [
      (this.max[0] - this.min[0]) as T,
      (this.max[1] - this.min[1]) as T,
      (this.max[2] - this.min[2]) as T
    ];
  }
  
  corners(): Point3<T>[] {
    const [minX, minY, minZ] = this.min;
    const [maxX, maxY, maxZ] = this.max;
    return [
      [minX, minY, minZ],
      [maxX, minY, minZ],
      [minX, maxY, minZ],
      [maxX, maxY, minZ],
      [minX, minY, maxZ],
      [maxX, minY, maxZ],
      [minX, maxY, maxZ],
      [maxX, maxY, maxZ]
    ] as Point3<T>[];
  }
  
  grow(pos: Point3<T>): void {
    this.min[0] = Math.min(this.min[0], pos[0]) as T;
    this.min[1] = Math.min(this.min[1], pos[1]) as T;
    this.min[2] = Math.min(this.min[2], pos[2]) as T;
    this.max[0] = Math.max(this.max[0], pos[0]) as T;
    this.max[1] = Math.max(this.max[1], pos[1]) as T;
    this.max[2] = Math.max(this.max[2], pos[2]) as T;
  }
  
  growUnion(other: Aabb<T>): void {
    this.min[0] = Math.min(this.min[0], other.min[0]) as T;
    this.min[1] = Math.min(this.min[1], other.min[1]) as T;
    this.min[2] = Math.min(this.min[2], other.min[2]) as T;
    this.max[0] = Math.max(this.max[0], other.max[0]) as T;
    this.max[1] = Math.max(this.max[1], other.max[1]) as T;
    this.max[2] = Math.max(this.max[2], other.max[2]) as T;
  }
  
  static unit<T extends number>(): AabbImpl<T> {
    return new AabbImpl<T>([-1, -1, -1] as Point3<T>, [1, 1, 1] as Point3<T>);
  }
}

export interface Quantization {
  zeroPoint: number;
  scale: number;
}

export class PointCloud {
  // GPU buffers - matches Rust struct fields
  public splat2dBuffer!: GPUBuffer;  // splat_2d_buffer
  public bindGroup!: GPUBindGroup;    // bind_group
  public renderBindGroup!: GPUBindGroup; // render_bind_group
  
  // Properties - matches Rust struct fields
  public numPoints: number;           // num_points
  public shDeg: number;              // sh_deg
  public compressed: boolean;        // compressed
  public bbox: Aabb<number>;         // bbox
  public center: Point3<number>;     // center
  public up?: Vector3<number>;       // up
  public mipSplatting?: boolean;     // mip_splatting
  public kernelSize?: number;        // kernel_size
  public backgroundColor?: [number, number, number, number]; // background_color
  
  // Internal buffers for data storage
  public gaussiansBuffer!: GPUBuffer;
  public shCoefsBuffer!: GPUBuffer;
  public indicesBuffer!: GPUBuffer;
  public covarsBuffer?: GPUBuffer;
  public quantizationUniform?: UniformBuffer<Quantization>;

  private constructor(
    numPoints: number, 
    shDeg: number, 
    compressed: boolean,
    bbox: Aabb<number>,
    center: Point3<number>,
    up?: Vector3<number>,
    mipSplatting?: boolean,
    kernelSize?: number,
    backgroundColor?: [number, number, number, number]
  ) {
    this.numPoints = numPoints;
    this.shDeg = shDeg;
    this.compressed = compressed;
    this.bbox = bbox;
    this.center = center;
    this.up = up;
    this.mipSplatting = mipSplatting;
    this.kernelSize = kernelSize;
    this.backgroundColor = backgroundColor;
  }

  static async new(device: GPUDevice, pc: GenericGaussianPointCloud): Promise<PointCloud> {
    // Create 2D splat buffer for GPU processing (matches Rust splat_2d_buffer)
    const splat2dBuffer = device.createBuffer({
      label: "2d gaussians buffer",
      size: pc.num_points * 20, // Splat struct size (5 * u32 = 20 bytes)
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Create render bind group (matches Rust render_bind_group)
    const renderBindGroup = device.createBindGroup({
      label: "point cloud rendering bind group",
      layout: PointCloud.bindGroupLayoutRender(device),
      entries: [{
        binding: 2,
        resource: { buffer: splat2dBuffer }
      }]
    });
    
    // Create 3D gaussians buffer (matches Rust vertex_buffer)
    const gaussiansBuffer = device.createBuffer({
      label: "3d gaussians buffer",
      size: pc.gaussians.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint8Array(gaussiansBuffer.getMappedRange()).set(new Uint8Array(pc.gaussians));
    gaussiansBuffer.unmap();
    
    // Create SH coefficients buffer (matches Rust sh_buffer)
    const shCoefsBuffer = device.createBuffer({
      label: "sh coefs buffer",
      size: pc.sh_coefs.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint8Array(shCoefsBuffer.getMappedRange()).set(new Uint8Array(pc.sh_coefs));
    shCoefsBuffer.unmap();
    
    // Create bind group entries (matches Rust bind_group_entries)
    const bindGroupEntries: GPUBindGroupEntry[] = [
      { binding: 0, resource: { buffer: gaussiansBuffer } },
      { binding: 1, resource: { buffer: shCoefsBuffer } },
      { binding: 2, resource: { buffer: splat2dBuffer } }
    ];
    
    let covarsBuffer: GPUBuffer | undefined;
    let quantizationUniform: UniformBuffer<Quantization> | undefined;
    
    // Handle compressed data (matches Rust compressed branch)
    if (pc.compressed()) {
      if (!pc.covars) throw new Error("Compressed point cloud missing covariances");
      if (!pc.quantization) throw new Error("Compressed point cloud missing quantization");
      
      covarsBuffer = device.createBuffer({
        label: "Covariances buffer",
        size: pc.covars.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Uint8Array(covarsBuffer.getMappedRange()).set(new Uint8Array(pc.covars));
      covarsBuffer.unmap();
      
      quantizationUniform = new UniformBuffer(device, {
        zeroPoint: pc.quantization.zero_point,
        scale: pc.quantization.scale
      }, "quantization uniform buffer");
      
      bindGroupEntries.push(
        { binding: 3, resource: { buffer: covarsBuffer } },
        { binding: 4, resource: { buffer: quantizationUniform.getBuffer() } }
      );
    }
    
    // Create main bind group (matches Rust bind_group)
    const bindGroup = device.createBindGroup({
      label: pc.compressed() ? "point cloud bind group (compressed)" : "point cloud bind group",
      layout: pc.compressed() 
        ? PointCloud.bindGroupLayoutCompressed(device)
        : PointCloud.bindGroupLayout(device),
      entries: bindGroupEntries
    });
    
    // Convert Rust types to TypeScript
    const bbox = new AabbImpl<number>(
      [pc.aabb.min.x, pc.aabb.min.y, pc.aabb.min.z],
      [pc.aabb.max.x, pc.aabb.max.y, pc.aabb.max.z]
    );
    
    const backgroundColor = pc.background_color ? 
      [pc.background_color[0], pc.background_color[1], pc.background_color[2], 1.0] as [number, number, number, number] :
      undefined;
    
    const self = new PointCloud(
      pc.num_points,
      pc.sh_deg,
      pc.compressed(),
      bbox,
      [pc.center.x, pc.center.y, pc.center.z],
      pc.up ? [pc.up.x, pc.up.y, pc.up.z] : undefined,
      pc.mip_splatting,
      pc.kernel_size,
      backgroundColor
    );
    
    // Assign GPU resources
    self.splat2dBuffer = splat2dBuffer;
    self.bindGroup = bindGroup;
    self.renderBindGroup = renderBindGroup;
    self.gaussiansBuffer = gaussiansBuffer;
    self.shCoefsBuffer = shCoefsBuffer;
    self.covarsBuffer = covarsBuffer;
    self.quantizationUniform = quantizationUniform;
    
    // Create default indices buffer 0..num_points-1
    const idx = new Uint32Array(self.numPoints);
    for (let i = 0; i < self.numPoints; i++) idx[i] = i >>> 0;
    self.indicesBuffer = createAndUploadBuffer(device, idx.buffer, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    
    return self;
  }

  // Getter methods matching Rust implementation
  isCompressed(): boolean { return this.compressed; }
  getNumPoints(): number { return this.numPoints; }
  getShDeg(): number { return this.shDeg; }
  getBbox(): Aabb<number> { return this.bbox; }
  getCenter(): Point3<number> { return this.center; }
  getUp(): Vector3<number> | undefined { return this.up; }
  getMipSplatting(): boolean | undefined { return this.mipSplatting; }
  getDilationKernelSize(): number | undefined { return this.kernelSize; }
  getRenderBindGroup(): GPUBindGroup { return this.renderBindGroup; }
  
  // Static bind group layout methods matching Rust
  static bindGroupLayoutCompressed(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: "point cloud bind group layout (compressed)",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }
      ]
    });
  }
  
  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: "point cloud float bind group layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
      ]
    });
  }
  
  static bindGroupLayoutRender(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: "point cloud rendering bind group layout",
      entries: [
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }
      ]
    });
  }
}

function createAndUploadBuffer(device: GPUDevice, data: ArrayBuffer, usage: GPUBufferUsageFlags): GPUBuffer {
  const buffer = device.createBuffer({
    size: alignTo(data.byteLength, 4), // 4-byte alignment for safety
    usage,
    mappedAtCreation: true,
  });
  const dst = new Uint8Array(buffer.getMappedRange());
  dst.set(new Uint8Array(data));
  buffer.unmap();
  return buffer;
}

function alignTo(n: number, alignment: number): number {
  const r = n % alignment;
  return r === 0 ? n : n + alignment - r;
}
