// renderer.ts
import { mat4, vec2, vec4 } from 'gl-matrix';
import { Camera, PerspectiveCamera, VIEWPORT_Y_FLIP } from './camera';
import { PointCloud } from './pointcloud';
import { UniformBuffer } from './uniform';
import { GPUStopwatch } from './utils';
import { GPURSSorter, PointCloudSortStuff } from './gpu_rs';

/* -------------------------- global logging gate -------------------------- */
// Ensure a single, shared flag exists even if this module loads first/last.
const __g = globalThis as any;
if (typeof __g.__LOGGING_ENABLED__ === 'undefined') {
  __g.__LOGGING_ENABLED__ = true;
}
function loggingEnabled(): boolean {
  return !!(globalThis as any).__LOGGING_ENABLED__;
}

/* -------------------------- logging + helpers -------------------------- */

function logi(tag: string, msg: string, extra?: any) {
  if (!loggingEnabled()) return;
  if (extra !== undefined) {
    console.log(`${tag} ${msg}`, extra);
  } else {
    console.log(`${tag} ${msg}`);
  }
}

function fmtF32Slice(a: ArrayLike<number>): string {
  const out: string[] = [];
  const n = a.length;
  for (let i = 0; i < n; i++) out.push((a[i] as number).toFixed(7));
  return `[${out.join(',')}]`;
}

// FNV-1a 64-bit
function hashBytesU64(bytes: ArrayBufferView): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const u8 =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < u8.length; i++) {
    h ^= BigInt(u8[i]);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

function mat4ColMajorToArray(m: mat4): Float32Array {
  // gl-matrix stores column-major in a Float32Array already
  return new Float32Array(m);
}

/* -------------------------- debug readback + dumps -------------------------- */

const DEBUG_READBACK_EVERY_N_FRAMES = 1; // set to 0 to disable

function u8ToU32LE(u8: Uint8Array): Uint32Array {
  const n = Math.floor(u8.byteLength / 4);
  return new Uint32Array(u8.buffer, u8.byteOffset, n);
}
function u8ToF32(u8: Uint8Array): Float32Array {
  const n = Math.floor(u8.byteLength / 4);
  return new Float32Array(u8.buffer, u8.byteOffset, n);
}
function dumpU32(label: string, u8: Uint8Array) {
  if (!loggingEnabled()) return;
  const u32 = u8ToU32LE(u8);
  console.log(label, Array.from(u32));
}

async function readbackBuffer(
  device: GPUDevice,
  src: GPUBuffer,
  size: number
): Promise<ArrayBuffer> {
  // copy into a MAP_READ buffer and submit immediately
  const rb = device.createBuffer({
    size: (size + 255) & ~255, // 256 alignment
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const enc = device.createCommandEncoder({ label: 'rb-encoder' });
  enc.copyBufferToBuffer(src, 0, rb, 0, size);
  device.queue.submit([enc.finish()]);
  await rb.mapAsync(GPUMapMode.READ);
  const slice = rb.getMappedRange().slice(0, size);
  rb.unmap();
  return slice;
}

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
    this.viewport = vec2.fromValues(1, 1);
    this.focal = vec2.fromValues(1, 1);
  }

  setViewMat(viewMatrix: mat4): void {
    mat4.copy(this.viewMatrix, viewMatrix);
    mat4.invert(this.viewInvMatrix, viewMatrix);
  }

  setProjMat(projMatrix: mat4): void {
    const flipped = mat4.create();
    mat4.multiply(flipped, VIEWPORT_Y_FLIP, projMatrix);
    mat4.copy(this.projMatrix, flipped);
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
      ? PointCloud.bind_group_layout_compressed(device) // group(1)
      : PointCloud.bind_group_layout(device);
    const settingsLayout = UniformBuffer.bind_group_layout(device); // group(3)

    const self = new PreprocessPipeline(
      cameraLayout,
      pcLayout,
      sortPreLayout,
      settingsLayout
    );

    const wgslPath = compressed
      ? './shaders/preprocess_compressed.wgsl'
      : './shaders/preprocess.wgsl';
    const src = await (await fetch(wgslPath)).text();
    const code = `const MAX_SH_DEG : u32 = ${shDeg}u;\n${src}`;
    const module = device.createShaderModule({
      label: 'preprocess shader',
      code
    });

    const pipelineLayout = device.createPipelineLayout({
      label: 'preprocess pipeline layout',
      bindGroupLayouts: [
        self.cameraLayout,
        self.pcLayout,
        self.sortPreLayout,
        self.settingsLayout
      ]
    });

    self.pipeline = device.createComputePipeline({
      label: 'preprocess pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'preprocess' }
    });

    logi('[preprocess::new]', `sh_deg=${shDeg}, compressed=${compressed}`);
    return self;
  }

  run(
    encoder: GPUCommandEncoder,
    pc: PointCloud,
    cameraBG: GPUBindGroup,
    sortPreBG: GPUBindGroup,
    settingsBG: GPUBindGroup
  ): void {
    const wgsX = Math.ceil(pc.numPoints() / 256);
    logi('[preprocess::run]', `dispatch_x=${wgsX}, num_points=${pc.numPoints()}`);
    const pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, cameraBG);
    pass.setBindGroup(1, pc.getBindGroup());
    pass.setBindGroup(2, sortPreBG);
    pass.setBindGroup(3, settingsBG);
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
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' }
        }
      ]
    });
  }

  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'display bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' }
        }
      ]
    });
  }

  static createEnvMapBg(
    device: GPUDevice,
    envTexture: GPUTextureView | null
  ): GPUBindGroup {
    const placeholderTexture = device
      .createTexture({
        label: 'placeholder',
        size: { width: 1, height: 1 },
        format: 'rgba16float',
        usage: GPUTextureUsage.TEXTURE_BINDING
      })
      .createView();
    const textureView = envTexture ?? placeholderTexture;
    const sampler = device.createSampler({
      label: 'env map sampler',
      magFilter: 'linear',
      minFilter: 'linear'
    });
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
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
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
        Display.bindGroupLayout(device),
        Display.envMapBindGroupLayout(device),
        UniformBuffer.bind_group_layout(device),
        UniformBuffer.bind_group_layout(device)
      ]
    });

    const displaySrc = await (await fetch('./shaders/display.wgsl')).text();
    const module = device.createShaderModule({
      label: 'display shader',
      code: displaySrc
    });

    const pipeline = device.createRenderPipeline({
      label: 'display pipeline',
      layout: pipelineLayout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [
          {
            format: targetFormat,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            },
            writeMask: GPUColorWrite.ALL
          }
        ]
      },
      primitive: { topology: 'triangle-strip' }
    });

    const envBg = Display.createEnvMapBg(device, null);
    const [view, bindGroup] = Display.createRenderTarget(
      device,
      sourceFormat,
      width,
      height
    );
    logi('[display::new]', `render_target ${width}x${height} format=${sourceFormat}`);
    return new Display(pipeline, sourceFormat, view, bindGroup, envBg);
  }

  texture(): GPUTextureView {
    return this.view;
  }

  setEnvMap(device: GPUDevice, envTexture: GPUTextureView | null): void {
    this.envBg = Display.createEnvMapBg(device, envTexture);
    this.hasEnvMap = envTexture !== null;
    logi('[display]', `set_env_map present=${this.hasEnvMap}`);
  }

  hasEnvMapSet(): boolean {
    return this.hasEnvMap;
  }

  resize(device: GPUDevice, width: number, height: number): void {
    const [view, bindGroup] = Display.createRenderTarget(
      device,
      this.format,
      width,
      height
    );
    this.bindGroup = bindGroup;
    this.view = view;
    logi('[display]', `resize to ${width}x${height}`);
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
      colorAttachments: [
        {
          view: target,
          clearValue: backgroundColor,
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
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

  private renderSorterLayout: GPUBindGroupLayout;
  private sortPreLayout: GPUBindGroupLayout;

  // reuse buffers for serialization
  private _cu = new CameraUniform();
  private _camBuf = new ArrayBuffer(68 * 4); // 68 f32
  private _camF32 = new Float32Array(this._camBuf);

  private _setBuf = new ArrayBuffer(80);
  private _setDV = new DataView(this._setBuf);

  private _indirectInitBuf = new ArrayBuffer(16);
  private _indirectInitDV = new DataView(this._indirectInitBuf);

  // frame counter for debug throttling
  private _frameIndex = 0;

  // last-hash tracking (so we only dump bytes when payload actually changes)
  private _lastCamHash: string | null = null;
  private _lastSetHash: string | null = null;

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

    this._indirectInitDV.setUint32(0, 4, true);
    this._indirectInitDV.setUint32(4, 0, true);
    this._indirectInitDV.setUint32(8, 0, true);
    this._indirectInitDV.setUint32(12, 0, true);
  }

  public camera(): UniformBuffer<ArrayBufferView> {
    return this.cameraUB;
  }
  public render_settings(): UniformBuffer<ArrayBufferView> {
    return this.settingsUB;
  }

  static async create(
    device: GPUDevice,
    queue: GPUQueue,
    colorFormat: GPUTextureFormat,
    shDeg: number,
    compressed: boolean
  ): Promise<GaussianRenderer> {
    logi(
      '[renderer::new]',
      `color_format=${colorFormat}, sh_deg=${shDeg}, compressed=${compressed}`
    );

    const sorter = await GPURSSorter.create(device, queue);

    const pcRenderLayout = PointCloud.bind_group_layout_render(device);
    const renderSorterLayout = GPURSSorter.bindGroupLayoutRendering(device);

    const renderPipelineLayout = device.createPipelineLayout({
      label: 'render pipeline layout',
      bindGroupLayouts: [pcRenderLayout, renderSorterLayout]
    });

    const gaussianSrc = await (await fetch('./shaders/gaussian.wgsl')).text();
    const gaussianModule = device.createShaderModule({
      label: 'gaussian shader',
      code: gaussianSrc
    });

    const pipeline = device.createRenderPipeline({
      label: 'render pipeline',
      layout: renderPipelineLayout,
      vertex: { module: gaussianModule, entryPoint: 'vs_main' },
      fragment: {
        module: gaussianModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: colorFormat,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            },
            writeMask: GPUColorWrite.ALL
          }
        ]
      },
      primitive: { topology: 'triangle-strip', frontFace: 'ccw' }
    });

    const drawIndirectBuffer = device.createBuffer({
      label: 'indirect draw buffer',
      size: 16,
      usage:
        GPUBufferUsage.INDIRECT |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST |
        GPUBufferUsage.COPY_SRC
    });

    const drawIndirectLayout = GaussianRenderer.bindGroupLayout(device);
    const drawIndirect = device.createBindGroup({
      label: 'draw indirect buffer',
      layout: drawIndirectLayout,
      entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
    });

    const sortPreLayout = GPURSSorter.bindGroupLayoutPreprocess(device);
    const preprocess = await PreprocessPipeline.create(
      device,
      shDeg,
      compressed,
      sortPreLayout
    );

    const cameraUB = UniformBuffer.newDefault(
      device,
      'camera uniform buffer',
      68 * 4
    );
    const settingsUB = UniformBuffer.newDefault(
      device,
      'render settings uniform buffer',
      80
    );

    logi(
      '[renderer::new]',
      `buffers ready; draw_indirect.size=${drawIndirectBuffer.size} bytes`
    );

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

  getColorFormat(): GPUTextureFormat {
    return this._colorFormat;
  }

  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'draw indirect',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
    });
  }

  /* ---------- serialization (match Rust struct layout) ---------- */

  private serializeCameraUniform(camera: CameraUniform): Uint8Array {
    const f32 = this._camF32;
    f32.set(mat4ColMajorToArray(camera.viewMatrix), 0);
    f32.set(mat4ColMajorToArray(camera.viewInvMatrix), 16);
    f32.set(mat4ColMajorToArray(camera.projMatrix), 32);
    f32.set(mat4ColMajorToArray(camera.projInvMatrix), 48);
    f32[64] = camera.viewport[0];
    f32[65] = camera.viewport[1];
    f32[66] = camera.focal[0];
    f32[67] = camera.focal[1];
    return new Uint8Array(this._camBuf);
  }

  private serializeSettingsUniform(u: SplattingArgsUniform): Uint8Array {
    const dv = this._setDV;
    let off = 0;
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.clippingBoxMin[i], true);
    off += 16;
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.clippingBoxMax[i], true);
    off += 16;
    dv.setFloat32(off, u.gaussianScaling, true);
    off += 4;
    dv.setUint32(off, u.maxShDeg >>> 0, true);
    off += 4;
    dv.setUint32(off, u.showEnvMap >>> 0, true);
    off += 4;
    dv.setUint32(off, u.mipSplatting >>> 0, true);
    off += 4;
    dv.setFloat32(off, u.kernelSize, true);
    off += 4;
    dv.setFloat32(off, u.walltime, true);
    off += 4;
    dv.setFloat32(off, u.sceneExtend, true);
    off += 4;
    dv.setUint32(off, 0, true); // _pad
    off += 4;
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.sceneCenter[i] ?? 0, true);
    return new Uint8Array(this._setBuf);
  }

  private writeInitialDrawIndirect(queue: GPUQueue): void {
    queue.writeBuffer(this.drawIndirectBuffer, 0, this._indirectInitBuf);
    logi(
      '[preprocess]',
      'wrote DrawIndirectArgs { vertex_count=4, instance_count=0, first_vertex=0, first_instance=0 }'
    );
  }

  /* ---------- core steps ---------- */

  private preprocessStep(
    queue: GPUQueue,
    pc: PointCloud,
    renderSettings: SplattingArgs
  ): [GPUBindGroup, GPUBindGroup] {
    const cu = this._cu;

    // Update camera uniform
    cu.setCamera(renderSettings.camera);
    cu.setViewport(renderSettings.viewport);
    cu.setFocal(renderSettings.camera.projection.focal(renderSettings.viewport));

    // Snapshots for logging
    const V = mat4ColMajorToArray(cu.viewMatrix);
    const P = mat4ColMajorToArray(cu.projMatrix);
    const VP = new Float32Array(16);
    {
      const tmp = mat4.create();
      mat4.multiply(tmp, cu.projMatrix, cu.viewMatrix);
      VP.set(tmp);
    }

    logi(
      '[preprocess]',
      `viewport=${cu.viewport[0]}x${cu.viewport[1]}, focal=(${cu.focal[0]},${cu.focal[1]})`
    );
    logi('[preprocess]', `view=${fmtF32Slice(V)}`);
    logi('[preprocess]', `proj=${fmtF32Slice(P)}`);
    logi('[preprocess]', `viewProj=${fmtF32Slice(VP)}`);

    const cameraBytes = this.serializeCameraUniform(cu);
    const camHash = hashBytesU64(cameraBytes);
    logi(
      '[preprocess]',
      `CameraUniform.size=${cameraBytes.byteLength} hash=${camHash}`
    );
    if (this._lastCamHash !== camHash) {
      dumpU32('[preprocess] CameraUniform.bytes(u32le)=', cameraBytes);
      this._lastCamHash = camHash;
    }

    const su = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
    const settingsBytes = this.serializeSettingsUniform(su);
    const setHash = hashBytesU64(settingsBytes);
    logi(
      '[preprocess]',
      `SplattingArgsUniform.size=${settingsBytes.byteLength} hash=${setHash}`
    );
    if (this._lastSetHash !== setHash) {
      dumpU32('[preprocess] SplattingArgsUniform.bytes(u32le)=', settingsBytes);
      this._lastSetHash = setHash;
    }

    // Upload to GPU
    this.cameraUB.setData(new Uint8Array(cameraBytes));
    this.cameraUB.sync(queue);
    this.settingsUB.setData(new Uint8Array(settingsBytes));
    this.settingsUB.sync(queue);

    // init indirect
    this.writeInitialDrawIndirect(queue);

    // **One-shot gate flip after first successful frame prep**
    (globalThis as any).__LOGGING_ENABLED__ = false;

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
    // (re)create sort buffers on size change
    if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints()) {
      this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
      const ss = this.sorterStuff;
      logi(
        '[prepare]',
        `sorter buffers (num_points=${ss.numPoints}): uni.size=${ss.sorterUni.size} dis.size=${ss.sorterDis.size}`
      );
    }

    GPURSSorter.recordResetIndirectBuffer(
      this.sorterStuff.sorterDis,
      this.sorterStuff.sorterUni,
      queue
    );
    logi('[prepare]', 'reset indirect & uniform sorter buffers');

    if (stopwatch) stopwatch.start(encoder, 'preprocess');
    const [cameraBG, settingsBG] = this.preprocessStep(queue, pc, renderSettings);
    this.preprocess.run(
      encoder,
      pc,
      cameraBG,
      this.sorterStuff.sorterBgPre,
      settingsBG
    );
    if (stopwatch) stopwatch.stop(encoder, 'preprocess');

    if (stopwatch) stopwatch.start(encoder, 'sorting');
    this.sorter.recordSortIndirect(
      this.sorterStuff.sorterBg,
      this.sorterStuff.sorterDis,
      encoder
    );
    if (stopwatch) stopwatch.stop(encoder, 'sorting');

    // write instance_count into drawIndirect[+4]
    encoder.copyBufferToBuffer(this.sorterStuff.sorterUni, 0, this.drawIndirectBuffer, 4, 4);
    logi('[prepare]', 'copied visible instance_count into draw_indirect_buffer[+4]');

    // Optional: read back indirect + visible for this frame
    this._frameIndex++;
    if (
      DEBUG_READBACK_EVERY_N_FRAMES > 0 &&
      (this._frameIndex % DEBUG_READBACK_EVERY_N_FRAMES === 0)
    ) {
      (async () => {
        try {
          const idab = await readbackBuffer(device, this.drawIndirectBuffer, 16);
          const id = new Uint32Array(idab);
          const visab = await readbackBuffer(device, this.sorterStuff!.sorterUni, 4);
          const vis = new Uint32Array(visab)[0] >>> 0;

          if (loggingEnabled()) {
            console.log('[indirect]', {
              vertexCount: id[0] >>> 0,
              instanceCount: id[1] >>> 0,
              firstVertex: id[2] >>> 0,
              firstInstance: id[3] >>> 0
            });
            console.log('[visibleCount]', vis);
          }
        } catch (e) {
          if (loggingEnabled()) console.warn('[debug-readback] failed:', e);
        }
      })();
    }
  }

  render(renderPass: GPURenderPassEncoder, pc: PointCloud): void {
    renderPass.setBindGroup(0, pc.getRenderBindGroup());
    renderPass.setBindGroup(1, this.sorterStuff!.sorterRenderBg);
    renderPass.setPipeline(this.pipeline);
    renderPass.drawIndirect(this.drawIndirectBuffer, 0);
  }
}
