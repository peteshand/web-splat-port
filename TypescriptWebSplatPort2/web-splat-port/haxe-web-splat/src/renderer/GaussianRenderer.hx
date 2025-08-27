package renderer;

import gl_matrix.Mat4;
import uniform.UniformBuffer;
import renderer.CameraUniform;
import renderer.SplattingArgs;
import renderer.SplattingArgsUniform;
import pointcloud.PointCloud;
import utils.GPUStopwatch;
import gpu.GPUSorter;

class GaussianRenderer {
  var pipeline:GPURenderPipeline;
  var cameraUB:UniformBuffer<ArrayBufferView>;
  var settingsUB:UniformBuffer<ArrayBufferView>;
  var preprocess:PreprocessPipeline;

  var drawIndirectBuffer:GPUBuffer;
  var drawIndirect:GPUBindGroup;

  var _colorFormat:GPUTextureFormat;

  var sorter:GPUSorter;
  var sorterStuff:{ numPoints:Int, sorterBg:GPUBindGroup, sorterBgPre:GPUBindGroup, sorterDis:GPUBuffer, sorterUni:GPUBuffer };

  var renderSorterLayout:GPUBindGroupLayout;
  var sortPreLayout:GPUBindGroupLayout;

  // reuse buffers for serialization
  var _cu = new CameraUniform();
  var _camBuf = new js.lib.ArrayBuffer(68 * 4); // 68 f32
  var _camF32:js.lib.Float32Array;

  var _setBuf = new js.lib.ArrayBuffer(80);
  var _setDV:js.lib.DataView;

  var _indirectInitBuf = new js.lib.ArrayBuffer(16);
  var _indirectInitDV:js.lib.DataView;

  var _frameIndex = 0;
  var _lastCamHash:String = "";
  var _lastSetHash:String = "";

  public function new(pipeline:GPURenderPipeline, cameraUB:UniformBuffer<ArrayBufferView>, settingsUB:UniformBuffer<ArrayBufferView>, preprocess:PreprocessPipeline, drawIndirectBuffer:GPUBuffer, drawIndirect:GPUBindGroup, colorFormat:GPUTextureFormat, sorter:GPUSorter, renderSorterLayout:GPUBindGroupLayout, sortPreLayout:GPUBindGroupLayout) {
    this.pipeline = pipeline;
    this.cameraUB = cameraUB;
    this.settingsUB = settingsUB;
    this.preprocess = preprocess;
    this.drawIndirectBuffer = drawIndirectBuffer;
    this.drawIndirect = drawIndirect;
    _colorFormat = colorFormat;
    this.sorter = sorter;
    this.renderSorterLayout = renderSorterLayout;
    this.sortPreLayout = sortPreLayout;

    _camF32 = new js.lib.Float32Array(_camBuf);
    _setDV = new js.lib.DataView(_setBuf);
    _indirectInitDV = new js.lib.DataView(_indirectInitBuf);

    // DrawIndirectArgs: { vertex_count=4, instance_count=0, first_vertex=0, first_instance=0 }
    _indirectInitDV.setUint32(0, 4, true);
    _indirectInitDV.setUint32(4, 0, true);
    _indirectInitDV.setUint32(8, 0, true);
    _indirectInitDV.setUint32(12, 0, true);
  }

  public inline function camera():UniformBuffer<ArrayBufferView> return cameraUB;
  public inline function render_settings():UniformBuffer<ArrayBufferView> return settingsUB;

  public static function create(device:GPUDevice, queue:GPUQueue, colorFormat:GPUTextureFormat, shDeg:Int, compressed:Bool):Promise<GaussianRenderer> {
    renderer.Internal.logi('[renderer::new]', 'color_format=' + colorFormat + ', sh_deg=' + shDeg + ', compressed=' + compressed);
    return GPUSorter.create(device, queue).then(function(sorter:GPUSorter) {
      final pcRenderLayout = PointCloud.bind_group_layout_render(device);
      final renderSorterLayout = GPUSorter.bindGroupLayoutRendering(device);

      // NOTE: render pipeline binds only pointcloud+sorter (uniforms are used in preprocess)
      final renderPipelineLayout = device.createPipelineLayout({
        label: 'renderer.pipeline.layout',
        bindGroupLayouts: [pcRenderLayout, renderSorterLayout]
      });

      return js.Browser.window.fetch('./shaders/gaussian.wgsl').then(function(res) return res.text()).then(function(gaussianSrc:String) {
        final gaussianModule = device.createShaderModule({ label: 'renderer.module.gaussian', code: gaussianSrc });

        final pipeline = device.createRenderPipeline({
          label: 'renderer.pipeline',
          layout: renderPipelineLayout,
          vertex: { module: gaussianModule, entryPoint: 'vs_main' },
          fragment: {
            module: gaussianModule,
            entryPoint: 'fs_main',
            targets: [{ format: colorFormat, /* blending set in shader */ }]
          },
          primitive: { topology: 'triangle-strip' }
        });

        final drawIndirectBuffer = device.createBuffer({
          label: 'renderer.drawIndirect',
          size: 16,
          usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });

        final drawIndirectLayout = GaussianRenderer.bindGroupLayout(device);
        final drawIndirect = device.createBindGroup({
          label: 'renderer.drawIndirect.bg',
          layout: drawIndirectLayout,
          entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
        });

        final sortPreLayout = GPUSorter.bindGroupLayoutPreprocess(device);
        return PreprocessPipeline.create(device, shDeg, compressed, sortPreLayout).then(function(preprocess) {
          final cameraUB = UniformBuffer.createDefault(device, 'camera uniform buffer', 68 * 4);
          final settingsUB = UniformBuffer.createDefault(device, 'render settings uniform buffer', 80);

          renderer.Internal.logi('[renderer::new]', 'buffers ready; draw_indirect.size=' + drawIndirectBuffer.size + ' bytes');

          return new GaussianRenderer(pipeline, cameraUB, settingsUB, preprocess, drawIndirectBuffer, drawIndirect, colorFormat, sorter, renderSorterLayout, sortPreLayout);
        });
      });
    });
  }

  public inline function getColorFormat():GPUTextureFormat return _colorFormat;

  public static function bindGroupLayout(device:GPUDevice):GPUBindGroupLayout {
    // Match TS: visibility = COMPUTE, buffer type = 'storage'
    return device.createBindGroupLayout({
      label: 'renderer.drawIndirect.bgl',
      entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }]
    });
  }

  // ---------- serialization (match Rust struct layout) ----------

  function serializeCameraUniform(camera:CameraUniform):js.lib.Uint8Array {
    final f32 = _camF32;
    f32.set(renderer.Internal.mat4ColMajorToArray(camera.viewMatrix), 0);
    f32.set(renderer.Internal.mat4ColMajorToArray(camera.viewInvMatrix), 16);
    f32.set(renderer.Internal.mat4ColMajorToArray(camera.projMatrix), 32);
    f32.set(renderer.Internal.mat4ColMajorToArray(camera.projInvMatrix), 48);
    f32[64] = camera.viewport[0];
    f32[65] = camera.viewport[1];
    f32[66] = camera.focal[0];
    f32[67] = camera.focal[1];
    return new js.lib.Uint8Array(_camBuf);
  }

  function serializeSettingsUniform(u:SplattingArgsUniform):js.lib.Uint8Array {
    final dv = _setDV;
    var off = 0;
    for (i in 0...4) dv.setFloat32(off + i * 4, u.clippingBoxMin[i], true);
    off += 16;
    for (i in 0...4) dv.setFloat32(off + i * 4, u.clippingBoxMax[i], true);
    off += 16;
    dv.setFloat32(off, u.gaussianScaling, true); off += 4;
    dv.setUint32(off, u.maxShDeg, true);         off += 4;
    dv.setUint32(off, u.showEnvMap, true);       off += 4;
    dv.setUint32(off, u.mipSplatting, true);     off += 4;
    dv.setFloat32(off, u.kernelSize, true);      off += 4;
    dv.setFloat32(off, u.walltime, true);        off += 4;
    dv.setFloat32(off, u.sceneExtend, true);     off += 4;
    dv.setUint32(off, 0, true);                  off += 4; // _pad
    for (i in 0...4) dv.setFloat32(off + i * 4, (i < 3 ? u.sceneCenter[i] : 0), true);
    return new js.lib.Uint8Array(_setBuf);
  }

  inline function writeInitialDrawIndirect(queue:GPUQueue):Void {
    queue.writeBuffer(drawIndirectBuffer, 0, _indirectInitBuf);
    renderer.Internal.logi('[preprocess]', 'wrote DrawIndirectArgs { vertex_count=4, instance_count=0, first_vertex=0, first_instance=0 }');
  }

  // ---------- core steps ----------

  function preprocessStep(queue:GPUQueue, pc:PointCloud, renderSettings:renderer.SplattingArgs):Array<GPUBindGroup> {
    final cu = _cu;
    cu.setCamera(renderSettings.camera);
    cu.setViewport(renderSettings.viewport);
    cu.setFocal(renderSettings.camera.projection.focal(renderSettings.viewport));

    // (optional) snapshot VP for logs
    final tmp = Mat4.create();
    Mat4.multiply(tmp, cu.projMatrix, cu.viewMatrix);

    renderer.Internal.logi('[preprocess]', 'viewport=' + cu.viewport[0] + 'x' + cu.viewport[1] + ', focal=(' + cu.focal[0] + ',' + cu.focal[1] + ')');

    final cameraBytes = serializeCameraUniform(cu);
    final camHash = renderer.Internal.hashBytesU64(cameraBytes);
    renderer.Internal.logi('[preprocess]', 'CameraUniform.size=' + cameraBytes.byteLength + ' hash=' + camHash);
    if (renderer.Internal.loggingEnabled()) {
      renderer.Internal.dumpU32('[preprocess] CameraUniform.bytes(u32le)=', cameraBytes);
      _lastCamHash = camHash;
    }

    final su = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
    final settingsBytes = serializeSettingsUniform(su);
    final setHash = renderer.Internal.hashBytesU64(settingsBytes);
    renderer.Internal.logi('[preprocess]', 'SplattingArgsUniform.size=' + settingsBytes.byteLength + ' hash=' + setHash);
    if (renderer.Internal.loggingEnabled()) {
      renderer.Internal.dumpU32('[preprocess] SplattingArgsUniform.bytes(u32le)=', settingsBytes);
      _lastSetHash = setHash;
    }

    cameraUB.setData(new js.lib.Uint8Array(cameraBytes));
    cameraUB.sync(queue);
    settingsUB.setData(new js.lib.Uint8Array(settingsBytes));
    settingsUB.sync(queue);

    writeInitialDrawIndirect(queue);

    // one-shot: disable verbose logs after first successful frame prep
    try { Reflect.setField(js.Browser.window, "__LOGGING_ENABLED__", false); } catch (_:Dynamic) {}

    return [cameraUB.bind_group(), settingsUB.bind_group()];
  }

  public function prepare(encoder:GPUCommandEncoder, device:GPUDevice, queue:GPUQueue, pc:PointCloud, renderSettings:renderer.SplattingArgs, ?stopwatch:utils.GPUStopwatch):Void {
    // (re)create sort buffers on size change
    if (sorterStuff == null || sorterStuff.numPoints != pc.numPoints()) {
      sorterStuff = sorter.createSortStuff(device, pc.numPoints());
      renderer.Internal.logi('[prepare]', 'sorter buffers (num_points=' + sorterStuff.numPoints + '): uni.size=' + sorterStuff.sorterUni.size + ' dis.size=' + sorterStuff.sorterDis.size);
    }

    GPUSorter.recordResetIndirectBuffer(sorterStuff.sorterDis, sorterStuff.sorterUni, queue);
    renderer.Internal.logi('[prepare]', 'reset indirect & uniform sorter buffers');

    if (stopwatch != null) stopwatch.start(encoder, 'preprocess');
    final pair = preprocessStep(queue, pc, renderSettings);
    final cameraBG = pair[0];
    final settingsBG = pair[1];
    preprocess.run(encoder, pc, cameraBG, sorterStuff.sorterBgPre, settingsBG);
    if (stopwatch != null) stopwatch.stop(encoder, 'preprocess');

    if (stopwatch != null) stopwatch.start(encoder, 'sorting');
    sorter.recordSortIndirect(sorterStuff.sorterBg, sorterStuff.sorterDis, encoder);
    if (stopwatch != null) stopwatch.stop(encoder, 'sorting');

    // write instance_count into drawIndirect[+4]
    encoder.copyBufferToBuffer(sorterStuff.sorterUni, 0, drawIndirectBuffer, 4, 4);
    renderer.Internal.logi('[prepare]', 'copied visible instance_count into draw_indirect_buffer[+4]');

    // optional debug readback
    _frameIndex++;
    if (renderer.Internal.DEBUG_READBACK_EVERY_N_FRAMES > 0 && (_frameIndex % renderer.Internal.DEBUG_READBACK_EVERY_N_FRAMES == 0)) {
      try {
        renderer.Internal.readbackBuffer(device, drawIndirectBuffer, 16).then(function(idab:ArrayBuffer) {
          final id = new js.lib.Uint32Array(idab);
          renderer.Internal.readbackBuffer(device, sorterStuff.sorterUni, 4).then(function(visab:ArrayBuffer) {
            final vis = new js.lib.Uint32Array(visab)[0] >>> 0;
            if (renderer.Internal.loggingEnabled()) {
              console.log('[indirect]', { vertexCount: id[0], instanceCount: id[1], firstVertex: id[2], firstInstance: id[3] });
              console.log('[visibleCount]', vis);
            }
          });
        });
      } catch (e) {
        if (renderer.Internal.loggingEnabled()) console.warn('[debug-readback] failed:', e);
      }
    }
  }

  public function render(renderPass:GPURenderPassEncoder, pc:PointCloud):Void {
    renderPass.setBindGroup(0, pc.getRenderBindGroup());
    renderPass.setBindGroup(1, sorterStuff.sorterBg);
    renderPass.setPipeline(pipeline);
    renderPass.drawIndirect(drawIndirectBuffer, 0);
  }
}
