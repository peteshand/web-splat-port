import { PerspectiveCamera } from './camera.js';
import { PointCloud } from './pointcloud.js';
import { GPURSSorter } from './gpu_rs.js';
import { UniformBuffer } from './uniform.js';
import { mat4 } from 'gl-matrix';

// Y-flip matrix to match Rust's VIEWPORT_Y_FLIP
const VIEWPORT_Y_FLIP = mat4.fromValues(
  1, 0, 0, 0,
  0, -1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
);

export interface CameraUniform {
  viewMatrix: Float32Array;      // 64 bytes (4x4 f32)
  viewInvMatrix: Float32Array;   // 64 bytes (4x4 f32)
  projMatrix: Float32Array;      // 64 bytes (4x4 f32)
  projInvMatrix: Float32Array;   // 64 bytes (4x4 f32)
  viewport: Float32Array;        // 8 bytes (2 f32)
  focal: Float32Array;           // 8 bytes (2 f32)
  // Total: 272 bytes
}

// RenderSettings packed in std140 layout matching WGSL struct
function createRenderSettingsBuffer(device: GPUDevice, settings: {
  clippingBoxMin: [number, number, number, number];
  clippingBoxMax: [number, number, number, number];
  gaussianScaling: number;
  maxShDeg: number;
  showEnvMap: number;
  mipSplatting: number;
  kernelSize: number;
  walltime: number;
  sceneExtend: number;
  center: [number, number, number];
}): GPUBuffer {
  // std140 layout: vec4(16) + vec4(16) + 8 scalars in 16-byte slots + vec3 as vec4(16) = 80 bytes
  const buffer = new ArrayBuffer(80);
  const f32View = new Float32Array(buffer);
  const u32View = new Uint32Array(buffer);
  
  let offset = 0;
  // clipping_box_min: vec4<f32> (16 bytes)
  f32View[offset++] = settings.clippingBoxMin[0];
  f32View[offset++] = settings.clippingBoxMin[1];
  f32View[offset++] = settings.clippingBoxMin[2];
  f32View[offset++] = settings.clippingBoxMin[3];
  
  // clipping_box_max: vec4<f32> (16 bytes)
  f32View[offset++] = settings.clippingBoxMax[0];
  f32View[offset++] = settings.clippingBoxMax[1];
  f32View[offset++] = settings.clippingBoxMax[2];
  f32View[offset++] = settings.clippingBoxMax[3];
  
  // gaussian_scaling: f32 (4 bytes, aligned to 16)
  f32View[offset++] = settings.gaussianScaling;
  u32View[offset++] = settings.maxShDeg;
  u32View[offset++] = settings.showEnvMap;
  u32View[offset++] = settings.mipSplatting;
  
  // kernel_size: f32 (4 bytes, aligned to 16)
  f32View[offset++] = settings.kernelSize;
  f32View[offset++] = settings.walltime;
  f32View[offset++] = settings.sceneExtend;
  offset++; // padding
  
  // center: vec3<f32> written as vec4 (16 bytes)
  f32View[offset++] = settings.center[0];
  f32View[offset++] = settings.center[1];
  f32View[offset++] = settings.center[2];
  f32View[offset++] = 0.0; // padding
  
  const gpuBuffer = device.createBuffer({
    size: buffer.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Uint8Array(gpuBuffer.getMappedRange()).set(new Uint8Array(buffer));
  gpuBuffer.unmap();
  return gpuBuffer;
}

export interface SplattingArgsUniform {
  clippingBoxMin: Float32Array;    // vec4<f32>
  clippingBoxMax: Float32Array;    // vec4<f32>
  gaussianScaling: number;         // f32
  maxShDeg: number;               // u32
  showEnvMap: number;             // u32
  mipSplatting: number;           // u32
  kernelSize: number;             // f32
  walltime: number;               // f32
  sceneExtend: number;            // f32
  center: Float32Array;           // vec3<f32>
  // Total: ~80 bytes with padding
}

export interface SplattingArgs {
  camera: PerspectiveCamera;
  viewport: [number, number];
  gaussianScaling: number;
  maxShDeg: number;
  showEnvMap: boolean;
  backgroundColor: [number, number, number, number];
}

export class GaussianRenderer {
  device: GPUDevice;
  queue: GPUQueue;
  pipeline?: GPURenderPipeline;
  camera: UniformBuffer<CameraUniform>;
  renderSettingsBuffer?: GPUBuffer;
  splatSettings: UniformBuffer<SplattingArgsUniform>;
  drawIndirectBuffer?: GPUBuffer;
  sortInfosBuffer?: GPUBuffer;
  sortDepthsBuffer?: GPUBuffer;
  sortIndicesBuffer?: GPUBuffer;
  sortDispatchBuffer?: GPUBuffer;
  private bindGroup0?: GPUBindGroup;
  private bindGroup1?: GPUBindGroup;
  private dummyDataInitialized = false;
  private preprocessPipeline?: GPUComputePipeline;
  private renderBGL0?: GPUBindGroupLayout;
  private renderBGL1?: GPUBindGroupLayout;

  constructor(device: GPUDevice, queue: GPUQueue) {
    this.device = device;
    this.queue = queue;
    
    this.camera = new UniformBuffer(device, {
      viewMatrix: new Float32Array(16),
      viewInvMatrix: new Float32Array(16),
      projMatrix: new Float32Array(16),
      projInvMatrix: new Float32Array(16),
      viewport: new Float32Array(2),
      focal: new Float32Array(2)
    }, 'camera');
    
    this.renderSettingsBuffer = createRenderSettingsBuffer(device, {
      clippingBoxMin: [-1000, -1000, -1000, 1],
      clippingBoxMax: [1000, 1000, 1000, 1],
      gaussianScaling: 1.0,
      maxShDeg: 3,
      showEnvMap: 0,
      mipSplatting: 0,
      kernelSize: 1.0,
      walltime: 0.0,
      sceneExtend: 100.0,
      center: [0, 0, 0]
    });
    
    this.splatSettings = new UniformBuffer(device, {
      clippingBoxMin: new Float32Array([-1000, -1000, -1000, 1]),
      clippingBoxMax: new Float32Array([1000, 1000, 1000, 1]),
      gaussianScaling: 1.0,
      maxShDeg: 3,
      showEnvMap: 0,
      mipSplatting: 0,
      kernelSize: 0.3,
      walltime: 0.0,
      sceneExtend: 1.0,
      center: new Float32Array([0, 0, 0])
    }, "splat settings");
  }

  static async new(device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, shDeg: number, compressed: boolean): Promise<GaussianRenderer> {
    const renderer = new GaussianRenderer(device, queue);
    
    // Initialize draw indirect buffer with proper synchronization
    renderer.drawIndirectBuffer = device.createBuffer({
      size: 16, // 4 u32s for DrawIndirectArgs
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
    });
    
    // Initialize sort buffers (minimal for compute shader to work)
    const maxPoints = 100000; // Conservative estimate
    renderer.sortInfosBuffer = device.createBuffer({
      size: 24, // SortInfos struct size (5×u32 with std430 alignment)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    renderer.sortDepthsBuffer = device.createBuffer({
      size: maxPoints * 4, // u32 per point
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    renderer.sortIndicesBuffer = device.createBuffer({
      size: maxPoints * 4, // u32 per point
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    renderer.sortDispatchBuffer = device.createBuffer({
      size: 12, // DispatchIndirect struct size
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Zero-initialize sort buffers
    queue.writeBuffer(renderer.sortInfosBuffer, 0, new Uint32Array([0, 0, 0, 0, 0])); // 5 u32s = 20 bytes
    queue.writeBuffer(renderer.sortDispatchBuffer, 0, new Uint32Array([0, 0, 0])); // 3 u32s = 12 bytes
    
    // Initialize with default draw args (4 vertices per splat, 1000 splats max)
    const defaultArgs = new Uint32Array([4, 1000, 0, 0]);
    queue.writeBuffer(renderer.drawIndirectBuffer, 0, defaultArgs);
    
    // Gaussian splatting shader
    const shaderSource = `
      // we cutoff at 1/255 alpha value 
      const CUTOFF:f32 = 2.3539888583335364; // = sqrt(log(255))

      struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) screen_pos: vec2<f32>,
          @location(1) color: vec4<f32>,
      };

      struct Splat {
           // 4x f16 packed as u32
          v_0: u32, v_1: u32,
          // 2x f16 packed as u32
          pos: u32,
          // rgba packed as f16
          color_0: u32,color_1: u32,
      };

      @group(0) @binding(2)
      var<storage, read> points_2d : array<Splat>;
      @group(1) @binding(0)
      var<storage, read> indices : array<u32>;

      @vertex
      fn vs_main(
          @builtin(vertex_index) in_vertex_index: u32,
          @builtin(instance_index) in_instance_index: u32
      ) -> VertexOutput {
          var out: VertexOutput;

          let vertex = points_2d[indices[in_instance_index] + 0u];

          // scaled eigenvectors in screen space 
          let v1 = unpack2x16float(vertex.v_0);
          let v2 = unpack2x16float(vertex.v_1);

          let v_center = unpack2x16float(vertex.pos);

          // splat rectangle with left lower corner at (-1,-1)
          // and upper right corner at (1,1)
          let x = f32(in_vertex_index % 2u == 0u) * 2. - (1.);
          let y = f32(in_vertex_index < 2u) * 2. - (1.);

          let position = vec2<f32>(x, y) * CUTOFF;

          let offset = 2. * mat2x2<f32>(v1, v2) * position;
          out.position = vec4<f32>(v_center + offset, 0., 1.);
          out.screen_pos = position;
          out.color = vec4<f32>(unpack2x16float(vertex.color_0), unpack2x16float(vertex.color_1));
          return out;
      }

      @fragment
      fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
          // Temporary debug: return white to rule out alpha/color issues
          return vec4<f32>(1.0, 1.0, 1.0, 1.0);
          
          // Original code (commented out for debugging):
          // let a = dot(in.screen_pos, in.screen_pos);
          // if a > 2. * CUTOFF {
          //     discard;
          // }
          // let b = min(0.99, exp(-a) * in.color.a);
          // return vec4<f32>(in.color.rgb, 1.) * b;
      }
    `;
    
    const shader = device.createShaderModule({
      label: "gaussian shader",
      code: shaderSource
    });
    
    // Create bind group layouts and save them
    renderer.renderBGL0 = device.createBindGroupLayout({
      entries: [{
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      }],
    });
    
    renderer.renderBGL1 = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      }],
    });
    
    renderer.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ 
        bindGroupLayouts: [renderer.renderBGL0, renderer.renderBGL1] 
      }),
      vertex: {
        module: shader,
        entryPoint: "vs_main",
      },
      fragment: {
        module: shader,
        entryPoint: "fs_main",
        targets: [{
          format: colorFormat,
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha", 
              operation: "add",
            },
          },
        }],
      },
      primitive: {
        topology: "triangle-strip",
      },
    });
    
    return renderer;
  }

  updateUniformsFromCamera(camera: PerspectiveCamera, viewport?: [number, number]) {
    const cameraData = this.camera.getData();
    
    // Get matrices from camera
    const viewMatrix = camera.view_matrix();
    const projMatrix = camera.proj_matrix();
    
    // Calculate inverse matrices
    const viewInvMatrix = mat4.create();
    const projInvMatrix = mat4.create();
    mat4.invert(viewInvMatrix, viewMatrix);
    mat4.invert(projInvMatrix, projMatrix);
    
    // Update uniform data (no Y-flip here - handled in camera projection)
    cameraData.viewMatrix.set(viewMatrix);
    cameraData.viewInvMatrix.set(viewInvMatrix);
    cameraData.projMatrix.set(projMatrix);
    cameraData.projInvMatrix.set(projInvMatrix);
    
    if (viewport) {
      cameraData.viewport[0] = viewport[0];
      cameraData.viewport[1] = viewport[1];
      
      // Calculate focal length from projection matrix
      const focal = camera.projection.focal(viewport);
      cameraData.focal[0] = focal[0];
      cameraData.focal[1] = focal[1];
      
      // Debug logging for viewport and focal
      console.log(`Viewport: [${viewport[0]}, ${viewport[1]}], Focal: [${focal[0]}, ${focal[1]}]`);
    }
    
    // Sync to GPU
    this.camera.sync(this.queue);
  }

  async initializePreprocessPipeline() {
    if (this.preprocessPipeline) return;
    
    // Load preprocessing compute shader
    const preprocessShader = await fetch('/src/shaders/preprocess.wgsl').then(r => r.text());
    
    // Create compute pipeline for preprocessing
    this.preprocessPipeline = this.device.createComputePipeline({
      label: 'preprocess-pipeline',
      layout: 'auto',
      compute: {
        module: this.device.createShaderModule({
          label: 'preprocess-compute',
          code: preprocessShader
        }),
        entryPoint: 'preprocess'
      }
    });
    
    console.log('Preprocessing compute pipeline initialized');
  }

  async encodePreprocessAndSort(pc: PointCloud, camera: PerspectiveCamera, viewport: [number, number]): Promise<GPUCommandEncoder> {
    // Update camera uniforms before encoding
    this.updateUniformsFromCamera(camera, viewport);
    await this.initializePreprocessPipeline();
    
    // Runtime assert to verify factory was used properly
    if (!this.pipeline || !this.renderBGL0 || !this.renderBGL1) {
      throw new Error("GaussianRenderer not initialized; use `await GaussianRenderer.new(...)`");
    }
    
    const encoder = this.device.createCommandEncoder();
    
    // Use preprocessing compute shader instead of dummy data
    if (this.preprocessPipeline && pc.gaussiansBuffer && pc.shCoefsBuffer && pc.splat2dBuffer && 
        this.sortInfosBuffer && this.sortDepthsBuffer && this.sortIndicesBuffer && this.sortDispatchBuffer) {
      // Create bind groups for preprocessing compute shader
      const preprocessBindGroup0 = this.device.createBindGroup({
        layout: this.preprocessPipeline.getBindGroupLayout(0),
        entries: [{
          binding: 0,
          resource: { buffer: this.camera.getBuffer() }
        }]
      });
      
      const preprocessBindGroup1 = this.device.createBindGroup({
        layout: this.preprocessPipeline.getBindGroupLayout(1),
        entries: [
          { binding: 0, resource: { buffer: pc.gaussiansBuffer } },
          { binding: 1, resource: { buffer: pc.shCoefsBuffer } },
          { binding: 2, resource: { buffer: pc.splat2dBuffer } }
        ]
      });
      
      const preprocessBindGroup2 = this.device.createBindGroup({
        layout: this.preprocessPipeline.getBindGroupLayout(2),
        entries: [
          { binding: 0, resource: { buffer: this.sortInfosBuffer } },
          { binding: 1, resource: { buffer: this.sortDepthsBuffer } },
          { binding: 2, resource: { buffer: this.sortIndicesBuffer } },
          { binding: 3, resource: { buffer: this.sortDispatchBuffer } }
        ]
      });
      
      const preprocessBindGroup3 = this.device.createBindGroup({
        layout: this.preprocessPipeline.getBindGroupLayout(3),
        entries: [{
          binding: 0,
          resource: { buffer: this.renderSettingsBuffer! }
        }]
      });
      
      // Dispatch preprocessing compute shader
      const computePass = encoder.beginComputePass({ label: 'preprocess-pass' });
      computePass.setPipeline(this.preprocessPipeline);
      computePass.setBindGroup(0, preprocessBindGroup0);
      computePass.setBindGroup(1, preprocessBindGroup1);
      computePass.setBindGroup(2, preprocessBindGroup2);
      computePass.setBindGroup(3, preprocessBindGroup3);
      
      // Reset sort buffers before each dispatch
      this.queue.writeBuffer(this.sortInfosBuffer!, 0, new Uint32Array([0, 0, 0, 0, 0])); // 5×u32
      this.queue.writeBuffer(this.sortDispatchBuffer!, 0, new Uint32Array([0, 0, 0])); // 3×u32
      
      // Dispatch one thread per Gaussian
      const numGaussians = pc.getNumPoints();
      const workgroupSize = 256; // Match Rust workgroup size
      const numWorkgroups = Math.ceil(numGaussians / workgroupSize);
      computePass.dispatchWorkgroups(numWorkgroups);
      computePass.end();
      
      // Finish and submit the encoder immediately
      const cb = encoder.finish();
      this.queue.submit([cb]);
      
      // Update indirect draw args to actual point count
      const N = pc.getNumPoints();
      this.queue.writeBuffer(this.drawIndirectBuffer!, 0, new Uint32Array([4, N, 0, 0]));
      
      // Initialize indicesBuffer with 0..N-1 while sorter not wired
      const idx = new Uint32Array(N);
      for (let i = 0; i < N; i++) idx[i] = i;
      this.queue.writeBuffer(pc.indicesBuffer!, 0, idx);
      
      // Add CPU test splat with IEEE f16 packing to prove render path
      const testSplat = new ArrayBuffer(20); // One Splat struct
      const view = new Uint32Array(testSplat);
      
      // Pack test splat at center screen with visible size and white color
      // v_0, v_1: eigenvectors (packed as f16)
      view[0] = 0x40004000; // v_0: (2.0, 2.0) in f16
      view[1] = 0x00000000; // v_1: (0.0, 0.0) in f16
      // pos: center screen (0.0, 0.0) in f16
      view[2] = 0x00000000; // pos: (0.0, 0.0) in f16
      // color: white with full alpha
      view[3] = 0x3C003C00; // color_0: (1.0, 1.0) in f16
      view[4] = 0x3C003C00; // color_1: (1.0, 1.0) in f16
      
      // Write test splat to first position
      this.queue.writeBuffer(pc.splat2dBuffer!, 0, testSplat);
      
      console.log(`Dispatched preprocessing for ${numGaussians} Gaussians in ${numWorkgroups} workgroups`);
      
      // Return new encoder for caller
      return this.device.createCommandEncoder();
    } else {
      // Fallback to dummy data if preprocessing not ready
      if (pc.splat2dBuffer && !this.dummyDataInitialized) {
        const numSplats = Math.min(pc.getNumPoints(), 25);
        const splatData = new ArrayBuffer(numSplats * 20);
        const view = new Uint32Array(splatData);
        
        for (let i = 0; i < numSplats; i++) {
          const offset = i * 5;
          view[offset + 0] = 0x30003000; // tiny splats
          view[offset + 1] = 0x00003000;
          
          const gridSize = 5;
          const gridX = ((i % gridSize) / (gridSize - 1)) * 1.6 - 0.8;
          const gridY = (Math.floor(i / gridSize) / (gridSize - 1)) * 1.6 - 0.8;
          
          function floatToF16(val: number): number {
            const clamped = Math.max(-1, Math.min(1, val));
            return Math.floor((clamped + 1) * 32767.5) & 0xFFFF;
          }
          
          const xf16 = floatToF16(gridX);
          const yf16 = floatToF16(gridY);
          view[offset + 2] = (yf16 << 16) | xf16;
          
          const hue = i / numSplats;
          const r = Math.abs(Math.sin(hue * Math.PI * 2));
          const g = Math.abs(Math.sin((hue + 0.33) * Math.PI * 2));
          const b = Math.abs(Math.sin((hue + 0.66) * Math.PI * 2));
          const a = 1.0;
          
          const rf16 = Math.floor(r * 65535) & 0xFFFF;
          const gf16 = Math.floor(g * 65535) & 0xFFFF;
          const bf16 = Math.floor(b * 65535) & 0xFFFF;
          const af16 = Math.floor(a * 65535) & 0xFFFF;
          
          view[offset + 3] = (gf16 << 16) | rf16;
          view[offset + 4] = (af16 << 16) | bf16;
        }
        
        this.queue.writeBuffer(pc.splat2dBuffer, 0, splatData);
        this.dummyDataInitialized = true;
        console.log(`Fallback: Initialized ${numSplats} static test splats`);
      }
    }
    
    // Create bind groups with actual splat data using saved layouts
    if (!this.bindGroup0 && pc.splat2dBuffer && this.renderBGL0) {
      this.bindGroup0 = this.device.createBindGroup({
        layout: this.renderBGL0,
        entries: [{ binding: 2, resource: { buffer: pc.splat2dBuffer } }],
      });
    }
    
    if (!this.bindGroup1 && pc.indicesBuffer && this.renderBGL1) {
      this.bindGroup1 = this.device.createBindGroup({
        layout: this.renderBGL1,
        entries: [{ binding: 0, resource: { buffer: pc.indicesBuffer } }],
      });
    }
    
    return encoder;
  }

  render(pass: GPURenderPassEncoder, pc: PointCloud): void {
    // Debug logging to diagnose initialization
    console.log("render precheck", {
      pipeline: !!this.pipeline,
      renderBGL0: !!this.renderBGL0,
      renderBGL1: !!this.renderBGL1,
      bg0: !!this.bindGroup0,
      bg1: !!this.bindGroup1,
      hasSplat2D: !!pc.splat2dBuffer,
      hasIndices: !!pc.indicesBuffer
    });
    
    // Create bind groups lazily if not created yet (eliminates race condition)
    if (!this.bindGroup0 && this.renderBGL0 && pc.splat2dBuffer) {
      this.bindGroup0 = this.device.createBindGroup({
        layout: this.renderBGL0,
        entries: [{ binding: 2, resource: { buffer: pc.splat2dBuffer } }],
      });
    }
    if (!this.bindGroup1 && this.renderBGL1 && pc.indicesBuffer) {
      this.bindGroup1 = this.device.createBindGroup({
        layout: this.renderBGL1,
        entries: [{ binding: 0, resource: { buffer: pc.indicesBuffer } }],
      });
    }

    if (!this.pipeline || !this.bindGroup0 || !this.bindGroup1) {
      console.warn("Renderer not fully initialized", {
        pipeline: !!this.pipeline, bg0: !!this.bindGroup0, bg1: !!this.bindGroup1
      });
      return;
    }
    
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup0);
    pass.setBindGroup(1, this.bindGroup1);
    
    // For now, prove the draw path
    const N = pc.getNumPoints();
    pass.draw(4, Math.min(N, 1000), 0, 0);
    
    // Original indirect draw (commented out for debugging):
    // if (this.drawIndirectBuffer) {
    //   pass.drawIndirect(this.drawIndirectBuffer, 0);
    // } else {
    //   console.warn("Missing drawIndirectBuffer - using fallback");
    //   pass.draw(4, Math.min(pc.numPoints, 1000), 0, 0);
    // }
  }
}
