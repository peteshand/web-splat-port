import { mat4 } from 'gl-matrix';
import { UniformBuffer } from '../uniform';
import { CameraUniform } from './CameraUniform';
import { SplattingArgs } from './SplattingArgs';
import { SplattingArgsUniform } from './SplattingArgsUniform';
import { PointCloud } from '../pointcloud/PointCloud';
import { GPUStopwatch } from '../utils';
import { GPURSSorter, PointCloudSortStuff } from '../gpu_rs';
import { PreprocessPipeline } from './PreprocessPipeline';
import {
  logi,
  fmtF32Slice,
  hashBytesU64,
  mat4ColMajorToArray,
  dumpU32,
  readbackBuffer,
  DEBUG_READBACK_EVERY_N_FRAMES,
  loggingEnabled
} from './internal';

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
