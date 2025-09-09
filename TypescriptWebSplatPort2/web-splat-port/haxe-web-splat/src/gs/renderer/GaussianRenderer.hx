package gs.renderer;

import gl_matrix.Mat4;
import js.lib.ArrayBuffer;
import js.lib.ArrayBufferView;
import js.lib.DataView;
import js.lib.Float32Array;
import js.lib.Uint8Array;
import gs.gpu.GPUSorter;
import gs.gpu.GPUSorter.PointCloudSortStuff;
import gs.pointcloud.PointCloud;
import gs.renderer.CameraUniform;
import gs.renderer.PreprocessPipeline;
import gs.renderer.SplattingArgs;
import gs.renderer.SplattingArgsUniform;
import gs.uniform.UniformBuffer;
import gs.utils.GPUStopwatch;

class GaussianRenderer {
  // --- fields (mirror TS) ---
  var pipeline:GPURenderPipeline;
  var cameraUB:UniformBuffer<ArrayBufferView>;
  var settingsUB:UniformBuffer<ArrayBufferView>;
  var preprocess:PreprocessPipeline;

  var drawIndirectBuffer:GPUBuffer;
  var drawIndirect:GPUBindGroup;

  var _colorFormat:GPUTextureFormat;

  var sorter:GPUSorter;
  var sorterStuff:PointCloudSortStuff; // null until created

  var renderSorterLayout:GPUBindGroupLayout;
  var sortPreLayout:GPUBindGroupLayout;

  // reuse buffers for serialization
  var _cu = new CameraUniform();
  var _camBuf:ArrayBuffer = new ArrayBuffer(68 * 4); // 68 f32
  var _camF32:Float32Array;

  var _setBuf:ArrayBuffer = new ArrayBuffer(80);
  var _setDV:DataView;

  var _indirectInitBuf:ArrayBuffer = new ArrayBuffer(16);
  var _indirectInitDV:DataView;

  var _frameIndex = 0;
  var _lastCamHash:String = null;
  var _lastSetHash:String = null;

  private function new(
    pipeline:GPURenderPipeline,
    cameraUB:UniformBuffer<ArrayBufferView>,
    settingsUB:UniformBuffer<ArrayBufferView>,
    preprocess:PreprocessPipeline,
    drawIndirectBuffer:GPUBuffer,
    drawIndirect:GPUBindGroup,
    colorFormat:GPUTextureFormat,
    sorter:GPUSorter,
    renderSorterLayout:GPUBindGroupLayout,
    sortPreLayout:GPUBindGroupLayout
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

    _camF32 = new Float32Array(_camBuf);
    _setDV = new DataView(_setBuf);
    _indirectInitDV = new DataView(_indirectInitBuf);

    // DrawIndirectArgs {4,0,0,0}
    _indirectInitDV.setUint32(0, 4, true);
    _indirectInitDV.setUint32(4, 0, true);
    _indirectInitDV.setUint32(8, 0, true);
    _indirectInitDV.setUint32(12, 0, true);
  }

  public inline function camera():UniformBuffer<ArrayBufferView> return this.cameraUB;
  public inline function render_settings():UniformBuffer<ArrayBufferView> return this.settingsUB;

  // --- static create (matches TS flow) ---
  public static function create(
    device:GPUDevice,
    queue:GPUQueue,
    colorFormat:GPUTextureFormat,
    shDeg:Int,
    compressed:Bool
  ):js.lib.Promise<GaussianRenderer> {
    gs.renderer.Internal.logi('[renderer::new]', 'color_format=' + colorFormat + ', sh_deg=' + shDeg + ', compressed=' + compressed);

    return GPUSorter.create(device, queue).then(sorter -> {
      final pcRenderLayout = PointCloud.bind_group_layout_render(device);
      final renderSorterLayout = GPUSorter.bindGroupLayoutRendering(device);

      final renderPipelineLayout = device.createPipelineLayout({
        label: 'render pipeline layout',
        bindGroupLayouts: [pcRenderLayout, renderSorterLayout]
      });

      // Load WGSL verbatim + debug head/URL
      final url = new js.html.URL('./gs/shaders/gaussian.wgsl', js.Browser.window.location.href).href;
      gs.renderer.Internal.logi('[shader::gaussian url]', url);
      return js.Browser.window.fetch(url)
        .then(res -> res.text())
        .then(gaussianSrc -> {
          trace('[shader::gaussian head] ' + gaussianSrc.substr(0, 120));
          if (gaussianSrc.indexOf('Vec2') >= 0 || gaussianSrc.indexOf('Vec3') >= 0 || gaussianSrc.indexOf('Vec4') >= 0) {
            js.Browser.console.error('[shader::gaussian] Found capitalized Vec* in WGSL (should be vec*). Check path / served file.');
          }

          final gaussianModule = device.createShaderModule({
            label: 'gaussian shader',
            code: gaussianSrc
          });

          final pipeline = device.createRenderPipeline({
            label: 'render pipeline',
            layout: renderPipelineLayout,
            vertex: { module: gaussianModule, entryPoint: 'vs_main' },
            fragment: {
              module: gaussianModule,
              entryPoint: 'fs_main',
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

          final drawIndirectBuffer = device.createBuffer({
            label: 'indirect draw buffer',
            size: 16,
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
          });

          final drawIndirectLayout = GaussianRenderer.bindGroupLayout(device);
          final drawIndirect = device.createBindGroup({
            label: 'draw indirect buffer',
            layout: drawIndirectLayout,
            entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
          });

          final sortPreLayout = GPUSorter.bindGroupLayoutPreprocess(device);
          return PreprocessPipeline.create(device, shDeg, compressed, sortPreLayout).then(preprocess -> {
            final cameraUB = UniformBuffer.createDefault(device, 'camera uniform buffer', 68 * 4);
            final settingsUB = UniformBuffer.createDefault(device, 'render settings uniform buffer', 80);

            gs.renderer.Internal.logi('[renderer::new]', 'buffers ready; draw_indirect.size=' + drawIndirectBuffer.size + ' bytes');

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
          });
        });
    });
  }

  public inline function getColorFormat():GPUTextureFormat return this._colorFormat;

  public static function bindGroupLayout(device:GPUDevice):GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'draw indirect',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
    });
  }

  // --- serialization (match Rust/TS layout) ---
  function serializeCameraUniform(camera:CameraUniform):Uint8Array {
    final f32 = this._camF32;
    f32.set(gs.renderer.Internal.mat4ColMajorToArray(camera.viewMatrix), 0);
    f32.set(gs.renderer.Internal.mat4ColMajorToArray(camera.viewInvMatrix), 16);
    f32.set(gs.renderer.Internal.mat4ColMajorToArray(camera.projMatrix), 32);
    f32.set(gs.renderer.Internal.mat4ColMajorToArray(camera.projInvMatrix), 48);
    f32[64] = camera.viewport[0];
    f32[65] = camera.viewport[1];
    f32[66] = camera.focal[0];
    f32[67] = camera.focal[1];
    return new Uint8Array(this._camBuf);
  }

  function serializeSettingsUniform(u:SplattingArgsUniform):Uint8Array {
    final dv = this._setDV;
    var off = 0;
    for (i in 0...4) dv.setFloat32(off + i * 4, u.clippingBoxMin[i], true);
    off += 16;
    for (i in 0...4) dv.setFloat32(off + i * 4, u.clippingBoxMax[i], true);
    off += 16;
    dv.setFloat32(off, u.gaussianScaling, true);       off += 4;
    dv.setUint32(off, u.maxShDeg >>> 0, true);         off += 4;
    dv.setUint32(off, u.showEnvMap >>> 0, true);       off += 4;
    dv.setUint32(off, u.mipSplatting >>> 0, true);     off += 4;
    dv.setFloat32(off, u.kernelSize, true);            off += 4;
    dv.setFloat32(off, u.walltime, true);              off += 4;
    dv.setFloat32(off, u.sceneExtend, true);           off += 4;
    dv.setUint32(off, 0, true);                        off += 4; // _pad
    for (i in 0...4) dv.setFloat32(off + i * 4, (i < 3 ? u.sceneCenter[i] : 0), true);
    return new Uint8Array(this._setBuf);
  }

  inline function writeInitialDrawIndirect(queue:GPUQueue):Void {
    queue.writeBuffer(this.drawIndirectBuffer, 0, this._indirectInitBuf);
    gs.renderer.Internal.logi('[preprocess]', 'wrote DrawIndirectArgs { vertex_count=4, instance_count=0, first_vertex=0, first_instance=0 }');
  }

  // --- preprocess step (exact TS order & logs) ---
  function preprocessStep(
    queue:GPUQueue,
    pc:PointCloud,
    renderSettings:SplattingArgs
  ):Array<GPUBindGroup> {
    final cu = this._cu;

    // Update camera uniform
    cu.setCamera(renderSettings.camera);
    cu.setViewport(renderSettings.viewport);
    cu.setFocal(renderSettings.camera.projection.focal(renderSettings.viewport));

    // Snapshot matrices for logging
    final V = gs.renderer.Internal.mat4ColMajorToArray(cu.viewMatrix);
    final P = gs.renderer.Internal.mat4ColMajorToArray(cu.projMatrix);
    final VP = new Float32Array(16);
    {
      final tmp = Mat4.create();
      Mat4.multiply(tmp, cu.projMatrix, cu.viewMatrix);
      VP.set(tmp);
    }

    gs.renderer.Internal.logi('[preprocess]', 'viewport=' + cu.viewport[0] + 'x' + cu.viewport[1] + ', focal=(' + cu.focal[0] + ',' + cu.focal[1] + ')');
    gs.renderer.Internal.logi('[preprocess]', 'view=' + gs.renderer.Internal.fmtF32Slice(V));
    gs.renderer.Internal.logi('[preprocess]', 'proj=' + gs.renderer.Internal.fmtF32Slice(P));
    gs.renderer.Internal.logi('[preprocess]', 'viewProj=' + gs.renderer.Internal.fmtF32Slice(VP));

    // Camera bytes + hash
    final cameraBytes = serializeCameraUniform(cu);
    final camHash = gs.renderer.Internal.hashBytesU64(cameraBytes);
    gs.renderer.Internal.logi('[preprocess]', 'CameraUniform.size=' + cameraBytes.byteLength + ' hash=' + camHash);
    if (this._lastCamHash != camHash) {
      gs.renderer.Internal.dumpU32('[preprocess] CameraUniform.bytes(u32le)=', cameraBytes);
      this._lastCamHash = camHash;
    }

    // Settings bytes + hash
    final su = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
    final settingsBytes = serializeSettingsUniform(su);
    final setHash = gs.renderer.Internal.hashBytesU64(settingsBytes);
    gs.renderer.Internal.logi('[preprocess]', 'SplattingArgsUniform.size=' + settingsBytes.byteLength + ' hash=' + setHash);
    if (this._lastSetHash != setHash) {
      gs.renderer.Internal.dumpU32('[preprocess] SplattingArgsUniform.bytes(u32le)=', settingsBytes);
      this._lastSetHash = setHash;
    }

    // Upload
    this.cameraUB.setData(new Uint8Array(cameraBytes));
    this.cameraUB.sync(queue);
    this.settingsUB.setData(new Uint8Array(settingsBytes));
    this.settingsUB.sync(queue);

    // init indirect
    this.writeInitialDrawIndirect(queue);

    // gate verbose logs after first good frame
    try js.Syntax.code("window.__LOGGING_ENABLED__ = false;") catch (_:Dynamic) {}

    return [this.cameraUB.bind_group(), this.settingsUB.bind_group()];
  }

  // --- main prepare (matches TS signature & flow) ---
  public function prepare(
    encoder:GPUCommandEncoder,
    device:GPUDevice,
    queue:GPUQueue,
    pc:PointCloud,
    renderSettings:SplattingArgs,
    ?stopwatch:GPUStopwatch
  ):Void {
    // (re)alloc sorter buffers if point count changed
    if (this.sorterStuff == null || this.sorterStuff.numPoints != pc.numPoints()) {
      this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
      final ss = this.sorterStuff;
      gs.renderer.Internal.logi('[prepare]', 'sorter buffers (num_points=' + ss.numPoints + '): uni.size=' + ss.sorterUni.size + ' dis.size=' + ss.sorterDis.size);
    } 

    GPUSorter.recordResetIndirectBuffer(
      this.sorterStuff.sorterDis,
      this.sorterStuff.sorterUni,
      queue
    );
    gs.renderer.Internal.logi('[prepare]', 'reset indirect & uniform sorter buffers');

    if (stopwatch != null) stopwatch.start(encoder, 'preprocess');
    final tmp = this.preprocessStep(queue, pc, renderSettings);
    final cameraBG = tmp[0], settingsBG = tmp[1];
    this.preprocess.run(
      encoder,
      pc,
      cameraBG,
      this.sorterStuff.sorterBgPre,
      settingsBG
    );
    if (stopwatch != null) stopwatch.stop(encoder, 'preprocess');

    if (stopwatch != null) stopwatch.start(encoder, 'sorting');
    this.sorter.recordSortIndirect(
      this.sorterStuff.sorterBg,
      this.sorterStuff.sorterDis,
      encoder
    );
    if (stopwatch != null) stopwatch.stop(encoder, 'sorting');

    // copy visible instance_count -> drawIndirect[+4]
    encoder.copyBufferToBuffer(this.sorterStuff.sorterUni, 0, this.drawIndirectBuffer, 4, 4);
    gs.renderer.Internal.logi('[prepare]', 'copied visible instance_count into draw_indirect_buffer[+4]');

    this._frameIndex++;
  }

  public function render(renderPass:GPURenderPassEncoder, pc:PointCloud):Void {
    renderPass.setBindGroup(0, pc.getRenderBindGroup());
    renderPass.setBindGroup(1, this.sorterStuff.sorterRenderBg);
    renderPass.setPipeline(this.pipeline);
    renderPass.drawIndirect(this.drawIndirectBuffer, 0);
  }
}
