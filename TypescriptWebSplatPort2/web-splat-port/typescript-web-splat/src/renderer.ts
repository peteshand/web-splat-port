// renderer.ts
import { mat4, vec2, vec4 } from 'gl-matrix';
import { Camera, PerspectiveCamera, VIEWPORT_Y_FLIP } from './camera';
import { PointCloud } from './pointcloud';
import { UniformBuffer } from './uniform';
import { GPUStopwatch } from './utils';

// NOTE: This matches the Rust gpu_rs API names used in renderer.rs.
// Your TS port of gpu_rs should export these with matching signatures.
import {
  GPURSSorter,
  PointCloudSortStuff
} from './gpu_rs';

/* ========================= CameraUniform ========================= */

export class CameraUniform {
  public viewMatrix: mat4;
  public viewInvMatrix: mat4;
  public projMatrix: mat4;
  public projInvMatrix: mat4;
  public viewport: vec2;
  public focal: vec2;

  constructor() {
    this.viewMatrix = mat4.create();
    this.viewInvMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.projInvMatrix = mat4.create();
    this.viewport = vec2.fromValues(1.0, 1.0);
    this.focal = vec2.fromValues(1.0, 1.0);
  }

  setViewMat(viewMatrix: mat4): void {
    mat4.copy(this.viewMatrix, viewMatrix);
    mat4.invert(this.viewInvMatrix, viewMatrix);
  }

  setProjMat(projMatrix: mat4): void {
    const tmp = mat4.create();
    mat4.multiply(tmp, VIEWPORT_Y_FLIP, projMatrix);
    mat4.copy(this.projMatrix, tmp);
    mat4.invert(this.projInvMatrix, projMatrix);
  }

  setCamera(camera: Camera): void {
    this.setProjMat(camera.projMatrix());
    this.setViewMat(camera.viewMatrix());
  }

  setViewport(viewport: vec2): void {
    vec2.copy(this.viewport, viewport);
  }

  setFocal(focal: vec2): void {
    vec2.copy(this.focal, focal);
  }
}

/* ========================= SplattingArgs ========================= */

export interface SplattingArgs {
  camera: PerspectiveCamera;
  viewport: vec2;
  gaussianScaling: number;
  maxShDeg: number;
  showEnvMap: boolean;
  mipSplatting?: boolean;
  kernelSize?: number;
  clippingBox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  walltime: number; // seconds
  sceneCenter?: [number, number, number];
  sceneExtend?: number;
  backgroundColor: GPUColor;
  resolution: vec2;
}

export const DEFAULT_KERNEL_SIZE = 0.3;

/* ========================= SplattingArgsUniform ========================= */

export class SplattingArgsUniform {
  public clippingBoxMin: vec4;
  public clippingBoxMax: vec4;
  public gaussianScaling: number;
  public maxShDeg: number;
  public showEnvMap: number;
  public mipSplatting: number;

  public kernelSize: number;
  public walltime: number;
  public sceneExtend: number;
  public _pad: number;

  public sceneCenter: vec4;

  constructor() {
    this.gaussianScaling = 1.0;
    this.maxShDeg = 3;
    this.showEnvMap = 1;
    this.mipSplatting = 0;

    this.kernelSize = DEFAULT_KERNEL_SIZE;
    this.walltime = 0.0;
    this.sceneExtend = 1.0;
    this._pad = 0;

    this.clippingBoxMin = vec4.fromValues(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      0.0
    );
    this.clippingBoxMax = vec4.fromValues(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      0.0
    );
    this.sceneCenter = vec4.fromValues(0, 0, 0, 0);
  }

  static fromArgsAndPc(args: SplattingArgs, pc: PointCloud): SplattingArgsUniform {
    const u = new SplattingArgsUniform();
    u.gaussianScaling = args.gaussianScaling;
    u.maxShDeg = args.maxShDeg;
    u.showEnvMap = args.showEnvMap ? 1 : 0;

    const pcMip = pc.mipSplatting() ?? false;
    u.mipSplatting = (args.mipSplatting ?? pcMip) ? 1 : 0;

    const pcKernel = pc.dilationKernelSize() ?? DEFAULT_KERNEL_SIZE;
    u.kernelSize = args.kernelSize ?? pcKernel;

    const bbox = pc.bbox();
    const clip = (args.clippingBox ?? bbox) as any;
    vec4.set(u.clippingBoxMin, clip.min.x, clip.min.y, clip.min.z, 0.0);
    vec4.set(u.clippingBoxMax, clip.max.x, clip.max.y, clip.max.z, 0.0);

    u.walltime = args.walltime;

    const c = pc.center();
    vec4.set(u.sceneCenter, c.x, c.y, c.z, 0.0);

    const minExtend = bbox.radius();
    u.sceneExtend = Math.max(args.sceneExtend ?? minExtend, minExtend);

    return u;
  }
}

/* ========================= PreprocessPipeline ========================= */

class PreprocessPipeline {
  private pipeline!: GPUComputePipeline;

  // layouts captured so we can create/pass matching bind groups
  private cameraLayout: GPUBindGroupLayout;
  private pcLayout: GPUBindGroupLayout;
  private sortPreLayout: GPUBindGroupLayout;
  private settingsLayout: GPUBindGroupLayout;

  private constructor(
    cameraLayout: GPUBindGroupLayout,
    pcLayout: GPUBindGroupLayout,
    sortPreLayout: GPUBindGroupLayout,
    settingsLayout: GPUBindGroupLayout
  ) {
    this.cameraLayout = cameraLayout;
    this.pcLayout = pcLayout;
    this.sortPreLayout = sortPreLayout;
    this.settingsLayout = settingsLayout;
  }

  static async create(
    device: GPUDevice,
    shDeg: number,
    compressed: boolean,
    sortPreLayout: GPUBindGroupLayout
  ): Promise<PreprocessPipeline> {
    const cameraLayout = UniformBuffer.bind_group_layout(device); // group(0)
    const pcLayout = compressed
      ? PointCloud.bind_group_layout_compressed(device)           // group(1)
      : PointCloud.bind_group_layout(device);
    const settingsLayout = UniformBuffer.bind_group_layout(device); // group(3)

    const self = new PreprocessPipeline(cameraLayout, pcLayout, sortPreLayout, settingsLayout);

    // Load WGSL and inject MAX_SH_DEG just like Rust's build_shader()
    const wgslPath = compressed ? './shaders/preprocess_compressed.wgsl' : './shaders/preprocess.wgsl';
    const src = await (await fetch(wgslPath)).text();
    const code = `const MAX_SH_DEG : u32 = ${shDeg}u;\n${src}`;
    

    const module = device.createShaderModule({ label: 'preprocess shader', code });

    const pipelineLayout = device.createPipelineLayout({
      label: 'preprocess pipeline layout',
      bindGroupLayouts: [
        self.cameraLayout,          // group(0)
        self.pcLayout,              // group(1)
        self.sortPreLayout,         // group(2)
        self.settingsLayout         // group(3)
      ]
    });

    self.pipeline = device.createComputePipeline({
      label: 'preprocess pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'preprocess' }
    });

    return self;
  }

  run(
    encoder: GPUCommandEncoder,
    pc: PointCloud,
    cameraBG: GPUBindGroup,
    sortPreBG: GPUBindGroup,
    settingsBG: GPUBindGroup
  ): void {
    const pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, cameraBG);             // group(0)
    pass.setBindGroup(1, pc.getBindGroup());    // group(1)
    pass.setBindGroup(2, sortPreBG);            // group(2)
    pass.setBindGroup(3, settingsBG);           // group(3)
    const wgsX = Math.ceil(pc.numPoints() / 256);
    pass.dispatchWorkgroups(wgsX, 1, 1);
    pass.end();
  }
}

/* ========================= Display ========================= */

export class Display {
  private pipeline: GPURenderPipeline;
  private bindGroup: GPUBindGroup;
  private format: GPUTextureFormat;
  private view: GPUTextureView;
  private envBg: GPUBindGroup;
  private hasEnvMap: boolean;

  private constructor(
    pipeline: GPURenderPipeline,
    format: GPUTextureFormat,
    view: GPUTextureView,
    bindGroup: GPUBindGroup,
    envBg: GPUBindGroup
  ) {
    this.pipeline = pipeline;
    this.format = format;
    this.view = view;
    this.bindGroup = bindGroup;
    this.envBg = envBg;
    this.hasEnvMap = false;
  }

  static envMapBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'env map bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
      ]
    });
  }

  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'display bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float', viewDimension: '2d' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } }
      ]
    });
  }

  static createEnvMapBg(device: GPUDevice, envTexture: GPUTextureView | null): GPUBindGroup {
    const placeholderTexture = device.createTexture({
      label: 'placeholder',
      size: { width: 1, height: 1 },
      format: 'rgba16float',
      usage: GPUTextureUsage.TEXTURE_BINDING
    }).createView();

    const textureView = envTexture ?? placeholderTexture;
    const sampler = device.createSampler({ label: 'env map sampler', magFilter: 'linear', minFilter: 'linear' });

    return device.createBindGroup({
      label: 'env map bind group',
      layout: Display.envMapBindGroupLayout(device),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
  }

  static createRenderTarget(
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number
  ): [GPUTextureView, GPUBindGroup] {
    const texture = device.createTexture({
      label: 'display render image',
      size: { width, height },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const textureView = texture.createView();
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

    const bindGroup = device.createBindGroup({
      label: 'render target bind group',
      layout: Display.bindGroupLayout(device),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
    return [textureView, bindGroup];
  }

  static async create(
    device: GPUDevice,
    sourceFormat: GPUTextureFormat,
    targetFormat: GPUTextureFormat,
    width: number,
    height: number
  ): Promise<Display> {
    const pipelineLayout = device.createPipelineLayout({
      label: 'display pipeline layout',
      bindGroupLayouts: [
        Display.bindGroupLayout(device),           // group(0)
        Display.envMapBindGroupLayout(device),     // group(1)
        UniformBuffer.bind_group_layout(device),   // group(2): camera
        UniformBuffer.bind_group_layout(device)    // group(3): settings
      ]
    });

    const displaySrc = await (await fetch('./shaders/display.wgsl')).text();
    const module = device.createShaderModule({ label: 'display shader', code: displaySrc });

    const pipeline = device.createRenderPipeline({
      label: 'display pipeline',
      layout: pipelineLayout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: {
        module, entryPoint: 'fs_main',
        targets: [{
          format: targetFormat,
          blend: {
            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          },
          writeMask: GPUColorWrite.ALL
        }]
      },
      primitive: { topology: 'triangle-strip' }
    });

    const envBg = Display.createEnvMapBg(device, null);
    const [view, bindGroup] = Display.createRenderTarget(device, sourceFormat, width, height);

    return new Display(pipeline, sourceFormat, view, bindGroup, envBg);
  }

  texture(): GPUTextureView {
    return this.view;
  }

  setEnvMap(device: GPUDevice, envTexture: GPUTextureView | null): void {
    this.envBg = Display.createEnvMapBg(device, envTexture);
    this.hasEnvMap = envTexture !== null;
  }

  hasEnvMapSet(): boolean {
    return this.hasEnvMap;
  }

  resize(device: GPUDevice, width: number, height: number): void {
    const [view, bindGroup] = Display.createRenderTarget(device, this.format, width, height);
    this.bindGroup = bindGroup;
    this.view = view;
  }

  render(
    encoder: GPUCommandEncoder,
    target: GPUTextureView,
    backgroundColor: GPUColor,
    camera: GPUBindGroup,
    renderSettings: GPUBindGroup
  ): void {
    const pass = encoder.beginRenderPass({
      label: 'render pass',
      colorAttachments: [{ view: target, clearValue: backgroundColor, loadOp: 'clear', storeOp: 'store' }]
    });
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, this.envBg);
    pass.setBindGroup(2, camera);
    pass.setBindGroup(3, renderSettings);
    pass.setPipeline(this.pipeline);
    pass.draw(4, 1);
    pass.end();
  }
}

/* ========================= GaussianRenderer ========================= */

export class GaussianRenderer {
  private pipeline: GPURenderPipeline;
  private cameraUB: UniformBuffer<ArrayBufferView>;
  private settingsUB: UniformBuffer<ArrayBufferView>;
  private preprocess: PreprocessPipeline;

  private drawIndirectBuffer: GPUBuffer;
  private drawIndirect: GPUBindGroup;

  private _colorFormat: GPUTextureFormat;

  private sorter: GPURSSorter;
  private sorterStuff: PointCloudSortStuff | null = null;

  // keep the *exact* layouts used for creating the pipelines to make fallback B/Gs compatible
  private renderSorterLayout: GPUBindGroupLayout;
  private sortPreLayout: GPUBindGroupLayout;

  private constructor(
    pipeline: GPURenderPipeline,
    cameraUB: UniformBuffer<ArrayBufferView>,
    settingsUB: UniformBuffer<ArrayBufferView>,
    preprocess: PreprocessPipeline,
    drawIndirectBuffer: GPUBuffer,
    drawIndirect: GPUBindGroup,
    colorFormat: GPUTextureFormat,
    sorter: GPURSSorter,
    renderSorterLayout: GPUBindGroupLayout,
    sortPreLayout: GPUBindGroupLayout
  ) {
    this.pipeline = pipeline;
    this.cameraUB = cameraUB;
    this.settingsUB = settingsUB;
    this.preprocess = preprocess;
    this.drawIndirectBuffer = drawIndirectBuffer;
    this.drawIndirect = drawIndirect;
    this._colorFormat = colorFormat;
    this.sorter = sorter;
    this.renderSorterLayout = renderSorterLayout;
    this.sortPreLayout = sortPreLayout;
  }

  async getVisibleInstanceCount(device: GPUDevice): Promise<number> {
    // staging buffer for readback
    const staging = device.createBuffer({
      label: 'readback indirect',
      size: 16,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
  
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(this.drawIndirectBuffer, 0, staging, 0, 16);
    device.queue.submit([enc.finish()]);
  
    await staging.mapAsync(GPUMapMode.READ);
    const dv = new DataView(staging.getMappedRange());
    const vertexCount   = dv.getUint32(0, true);
    const instanceCount = dv.getUint32(4, true);
    staging.unmap();
  
    console.log('[indirect] vertexCount:', vertexCount, 'instanceCount:', instanceCount);
    return instanceCount;
  }

  public camera(): UniformBuffer<ArrayBufferView> { return this.cameraUB; }
  public render_settings(): UniformBuffer<ArrayBufferView> { return this.settingsUB; }

  static async create(
    device: GPUDevice,
    queue: GPUQueue,
    colorFormat: GPUTextureFormat,
    shDeg: number,
    compressed: boolean
  ): Promise<GaussianRenderer> {
    const sorter = await GPURSSorter.create(device, queue);

    // Render pipeline layouts: (0) point cloud 2D splats, (1) sorter
    const pcRenderLayout = PointCloud.bind_group_layout_render(device);
    const renderSorterLayout = GPURSSorter.bindGroupLayoutRendering(device);

    const renderPipelineLayout = device.createPipelineLayout({
      label: 'render pipeline layout',
      bindGroupLayouts: [pcRenderLayout, renderSorterLayout]
    });

    const gaussianSrc = await (await fetch('./shaders/gaussian.wgsl')).text();
    const gaussianModule = device.createShaderModule({ label: 'gaussian shader', code: gaussianSrc });

    const pipeline = device.createRenderPipeline({
      label: 'render pipeline',
      layout: renderPipelineLayout,
      vertex: { module: gaussianModule, entryPoint: 'vs_main' },
      fragment: {
        module: gaussianModule, entryPoint: 'fs_main',
        targets: [{
          format: colorFormat,
          blend: {
            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          },
          writeMask: GPUColorWrite.ALL
        }]
      },
      primitive: { topology: 'triangle-strip', frontFace: 'ccw' }
    });

    // Draw-indirect storage buffer & bind group
    const drawIndirectBuffer = device.createBuffer({
      label: 'indirect draw buffer',
      size: 16, // 4 * u32
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const drawIndirectLayout = GaussianRenderer.bindGroupLayout(device);
    const drawIndirect = device.createBindGroup({
      label: 'draw indirect buffer',
      layout: drawIndirectLayout,
      entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
    });

    // Preprocess pipeline
    const sortPreLayout = GPURSSorter.bindGroupLayoutPreprocess(device);
    const preprocess = await PreprocessPipeline.create(device, shDeg, compressed, sortPreLayout);

    // Two separate uniform buffers (1:1 with Rust)
    const cameraUB = UniformBuffer.newDefault(device, 'camera uniform buffer', 272);
    const settingsUB = UniformBuffer.newDefault(device, 'render settings uniform buffer', 80);

    return new GaussianRenderer(
      pipeline,
      cameraUB,
      settingsUB,
      preprocess,
      drawIndirectBuffer,
      drawIndirect,
      colorFormat,
      sorter,
      renderSorterLayout,
      sortPreLayout
    );
  }

  /* ---------- helpers (serialization mirrors Rust struct layout) ---------- */

  private serializeCameraUniform(camera: CameraUniform): Uint8Array {
    const buf = new ArrayBuffer(272); // 4 * mat4 (64 floats) + 2*vec2 (4 floats) = 68 floats * 4
    const f32 = new Float32Array(buf);

    f32.set(camera.viewMatrix as Float32Array, 0);              // [0..16)
    f32.set(camera.viewInvMatrix as Float32Array, 16);          // [16..32)
    f32.set(camera.projMatrix as Float32Array, 32);             // [32..48)
    f32.set(camera.projInvMatrix as Float32Array, 48);          // [48..64)
    f32[64] = camera.viewport[0]; f32[65] = camera.viewport[1]; // [64..66)
    f32[66] = camera.focal[0];    f32[67] = camera.focal[1];    // [66..68)

    return new Uint8Array(buf);
  }

  private serializeSettingsUniform(u: SplattingArgsUniform): Uint8Array {
    const buf = new ArrayBuffer(80);
    const dv = new DataView(buf);
    let off = 0;

    // clipping_box_min (vec4)
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.clippingBoxMin[i], true);
    off += 16;

    // clipping_box_max (vec4)
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.clippingBoxMax[i], true);
    off += 16;

    // gaussian_scaling f32
    dv.setFloat32(off, u.gaussianScaling, true); off += 4;
    // max_sh_deg u32
    dv.setUint32(off, (u.maxShDeg >>> 0), true); off += 4;
    // show_env_map u32
    dv.setUint32(off, (u.showEnvMap >>> 0), true); off += 4;
    // mip_splatting u32
    dv.setUint32(off, (u.mipSplatting >>> 0), true); off += 4;

    // kernel_size, walltime, scene_extend
    dv.setFloat32(off, u.kernelSize, true); off += 4;
    dv.setFloat32(off, u.walltime, true); off += 4;
    dv.setFloat32(off, u.sceneExtend, true); off += 4;

    // _pad u32
    dv.setUint32(off, 0, true); off += 4;

    // scene_center vec4
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.sceneCenter[i] ?? 0, true);

    return new Uint8Array(buf);
  }

  private writeInitialDrawIndirect(queue: GPUQueue): void {
    // vertex_count=4, instance_count=0, first_vertex=0, first_instance=0
    const arr = new ArrayBuffer(16);
    const dv = new DataView(arr);
    dv.setUint32(0, 4, true);
    dv.setUint32(4, 0, true);
    dv.setUint32(8, 0, true);
    dv.setUint32(12, 0, true);
    queue.writeBuffer(this.drawIndirectBuffer, 0, arr);
  }

  /* ---------- public API ---------- */

  getColorFormat(): GPUTextureFormat {
    return this._colorFormat;
  }

  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    // draw indirect buffer layout (storage)
    return device.createBindGroupLayout({
      label: 'draw indirect',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
    });
  }

  /* ---------- core steps ---------- */

  private preprocessStep(
    queue: GPUQueue,
    pc: PointCloud,
    renderSettings: SplattingArgs
  ): [GPUBindGroup, GPUBindGroup] /* cameraBG, settingsBG */ {
    // Camera uniform
    const cu = new CameraUniform();
    cu.setCamera(renderSettings.camera);
    cu.setViewport(renderSettings.viewport);

    // focal = camera.projection.focal(viewport)
    const focalX = renderSettings.viewport[0] / (2.0 * Math.tan(renderSettings.camera.projection.fovx / 2.0));
    const focalY = renderSettings.viewport[1] / (2.0 * Math.tan(renderSettings.camera.projection.fovy / 2.0));
    cu.setFocal(vec2.fromValues(focalX, focalY));

    const cameraBytes = this.serializeCameraUniform(cu);

    // Settings uniform
    const su = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
    const settingsBytes = this.serializeSettingsUniform(su);

    // Upload to two separate uniform buffers (1:1 with Rust)
    this.cameraUB.setData(cameraBytes);
    this.cameraUB.sync(queue);
    this.settingsUB.setData(settingsBytes);
    this.settingsUB.sync(queue);

    // Initialize indirect args like Rust (instance_count = 0 now)
    this.writeInitialDrawIndirect(queue);

    return [this.cameraUB.bind_group(), this.settingsUB.bind_group()];
  }

  prepare(
    encoder: GPUCommandEncoder,
    device: GPUDevice,
    queue: GPUQueue,
    pc: PointCloud,
    renderSettings: SplattingArgs,
    stopwatch?: GPUStopwatch
  ): void {
    // Recreate sorter buffers if point count changed
    if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints()) {
      console.debug(`created sort buffers for ${pc.numPoints()} points`);
      this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
    }

    // Reset indirect buffer in sorter
    GPURSSorter.recordResetIndirectBuffer(
      this.sorterStuff.sorterDis,
      this.sorterStuff.sorterUni,
      queue
    );

    // Preprocess: 3D -> 2D splats
    if (stopwatch) stopwatch.start(encoder, 'preprocess');
    const [cameraBG, settingsBG] = this.preprocessStep(queue, pc, renderSettings);
    this.preprocess.run(
      encoder,
      pc,
      cameraBG,                         // group(0)
      this.sorterStuff.sorterBgPre,     // group(2)
      settingsBG                        // group(3)
    );
    if (stopwatch) stopwatch.stop(encoder, 'preprocess');

    // Sorting
    if (stopwatch) stopwatch.start(encoder, 'sorting');
    this.sorter.recordSortIndirect(
      this.sorterStuff.sorterBg,
      this.sorterStuff.sorterDis,
      encoder
    );
    if (stopwatch) stopwatch.stop(encoder, 'sorting');

    // Copy visible instance count from sorter_uni -> draw_indirect_buffer.instance_count (offset 4)
    encoder.copyBufferToBuffer(
      this.sorterStuff.sorterUni,
      0,
      this.drawIndirectBuffer,
      4,
      4
    );

    // === DEBUG: force instance_count = numPoints (wins over previous copy) ===
    {
        const tmp = device.createBuffer({
            label: 'debug instance_count',
            size: 4,
            usage: GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
    });
    // write pc.numPoints() LE u32 into tmp
    new DataView(tmp.getMappedRange()).setUint32(0, pc.numPoints() >>> 0, true);
    tmp.unmap();

    // overwrite just the instanceCount field at +4
    encoder.copyBufferToBuffer(tmp, 0, this.drawIndirectBuffer, 4, 4);
    }
  }

  render(renderPass: GPURenderPassEncoder, pc: PointCloud): void {
    renderPass.setBindGroup(0, pc.getRenderBindGroup());     // points_2d (binding 2)
    renderPass.setBindGroup(1, this.sorterStuff!.sorterRenderBg);
    renderPass.setPipeline(this.pipeline);
    renderPass.drawIndirect(this.drawIndirectBuffer, 0);
  }
}
