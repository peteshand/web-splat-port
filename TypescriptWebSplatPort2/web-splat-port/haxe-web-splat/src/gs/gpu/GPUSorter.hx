package gs.gpu;

import js.lib.Promise;
import js.lib.ArrayBuffer;
import js.lib.DataView;
import js.lib.Uint8Array;
import js.lib.Float32Array;

// gpu_rs.ts → GPUSorter.hx
// 1:1 port of gpu_rs.rs (WebGPU radix sort for float key-value pairs)

// ===== Constants (must match shaders/radix_sort.wgsl) =====
final HISTOGRAM_WG_SIZE = 256;
final RS_RADIX_LOG2 = 8;
final RS_RADIX_SIZE = 1 << RS_RADIX_LOG2;
final RS_KEYVAL_SIZE = Std.int(32 / RS_RADIX_LOG2);       // 32 bits / 8 = 4 passes
final RS_HISTOGRAM_BLOCK_ROWS = 15;
final RS_SCATTER_BLOCK_ROWS = RS_HISTOGRAM_BLOCK_ROWS;    // DO NOT CHANGE (shader assumes)
final PREFIX_WG_SIZE = 1 << 7;                            // 128
final SCATTER_WG_SIZE = 1 << 8;                           // 256

// ===== Types matching Rust structs =====
typedef PointCloudSortStuff = {
  var numPoints:Int;
  var sorterUni:GPUBuffer;         // "uniform" storage buffer with GeneralInfo
  var sorterDis:GPUBuffer;         // indirect dispatch buffer (IndirectDispatch)
  var sorterBg:GPUBindGroup;       // radix sort main bind group (6 bindings)
  var sorterRenderBg:GPUBindGroup; // render bind group (indices etc.)
  var sorterBgPre:GPUBindGroup;    // preprocess bind group (merged layout for preprocess step)
}

// GeneralInfo (5 x u32) — stored in a STORAGE buffer
typedef GeneralInfo = {
  var keys_size:Int;   // u32
  var padded_size:Int; // u32
  var passes:Int;      // u32
  var even_pass:Int;   // u32
  var odd_pass:Int;    // u32
}

// IndirectDispatch (3 x u32)
typedef IndirectDispatch = {
  var dispatch_x:Int;
  var dispatch_y:Int;
  var dispatch_z:Int;
}

enum State {
  Init;
  Increasing;
  Decreasing;
}

// ===== Utility to write small structs =====
private inline function writeGeneralInfo(info:GeneralInfo):Uint8Array {
  final buf = new ArrayBuffer(20);
  final dv = new DataView(buf);
  dv.setUint32(0,  info.keys_size  >>> 0, true);
  dv.setUint32(4,  info.padded_size>>> 0, true);
  dv.setUint32(8,  info.passes      >>> 0, true);
  dv.setUint32(12, info.even_pass   >>> 0, true);
  dv.setUint32(16, info.odd_pass    >>> 0, true);
  return new Uint8Array(buf);
}

private inline function writeIndirectDispatch(id:IndirectDispatch):Uint8Array {
  final buf = new ArrayBuffer(12);
  final dv = new DataView(buf);
  dv.setUint32(0, id.dispatch_x >>> 0, true);
  dv.setUint32(4, id.dispatch_y >>> 0, true);
  dv.setUint32(8, id.dispatch_z >>> 0, true);
  return new Uint8Array(buf);
}

// Small helper (Haxe replacement for String.replaceAll)
private inline function replaceAll(hay:String, needle:String, repl:String):String {
  return hay.split(needle).join(repl);
}

// ===== GPUSorter =====
class GPUSorter {
  // layouts
  var bind_group_layout:GPUBindGroupLayout;            // full radix layout (6 bindings)
  var render_bind_group_layout:GPUBindGroupLayout;     // render layout (bindings 0,4)
  var preprocess_bind_group_layout:GPUBindGroupLayout; // preprocess layout (bindings 0..3)

  // pipelines
  var zero_p:GPUComputePipeline;
  var histogram_p:GPUComputePipeline;
  var prefix_p:GPUComputePipeline;
  var scatter_even_p:GPUComputePipeline;
  var scatter_odd_p:GPUComputePipeline;

  var subgroup_size:Int;

  private function new() {}

  // ---- Creation entrypoint (mirrors async new(device, queue)) ----
  public static function create(device:GPUDevice, queue:GPUQueue):Promise<GPUSorter> {
    return new Promise((resolve, reject) -> {
      final sizes = [1, 8, 16, 32];
      var curIdx = 2; // start at 16 like Rust
      var state = State.Init;
      var biggestThatWorked = 0;
      var curSorter:GPUSorter = null;

      // recursive probe
      function stepProbe():Void {
        if (curIdx >= sizes.length || curIdx < 0) {
          if (curSorter == null || biggestThatWorked == 0) {
            reject('GPUSorter.create(): No workgroup size worked. Unable to use sorter.');
            return;
          }
          resolve(curSorter);
          return;
        }

        final size = sizes[curIdx];
        GPUSorter.newWithSgSize(device, size).then(candidate -> {
          candidate.test_sort(device, queue).then(ok -> {
            if (ok) curSorter = candidate;

            switch (state) {
              case Init:
                if (ok) {
                  biggestThatWorked = size;
                  state = State.Increasing;
                  curIdx += 1;
                } else {
                  state = State.Decreasing;
                  curIdx -= 1;
                }
              case Increasing:
                if (ok) {
                  if (size > biggestThatWorked) biggestThatWorked = size;
                  curIdx += 1;
                } else {
                  if (curSorter == null || biggestThatWorked == 0) {
                    reject('GPUSorter.create(): No workgroup size worked. Unable to use sorter.');
                  } else {
                    resolve(curSorter);
                  }
                  return;
                }
              case Decreasing:
                if (ok) {
                  if (size > biggestThatWorked) biggestThatWorked = size;
                  if (curSorter == null || biggestThatWorked == 0) {
                    reject('GPUSorter.create(): No workgroup size worked. Unable to use sorter.');
                  } else {
                    resolve(curSorter);
                  }
                  return;
                } else {
                  curIdx -= 1;
                }
            }

            if (state == State.Increasing && curIdx >= sizes.length) {
              if (curSorter == null || biggestThatWorked == 0) reject('GPUSorter.create(): No workgroup size worked. Unable to use sorter.') else resolve(curSorter);
              return;
            }
            if (state == State.Decreasing && curIdx < 0) {
              if (curSorter == null || biggestThatWorked == 0) reject('GPUSorter.create(): No workgroup size worked. Unable to use sorter.') else resolve(curSorter);
              return;
            }

            stepProbe();
          }, e -> reject(e));
        }, e -> reject(e));
      }

      stepProbe();
    });
  }

  // ---- Instance factory with a fixed subgroup size (mirrors new_with_sg_size) ----
  private static function newWithSgSize(device:GPUDevice, sgSize:Int):Promise<GPUSorter> {
    return new Promise((resolve, reject) -> {
      final histogram_sg_size = sgSize >>> 0;
      final rs_sweep_0_size = Std.int(RS_RADIX_SIZE / histogram_sg_size);
      final rs_sweep_1_size = Std.int(rs_sweep_0_size / histogram_sg_size);
      final rs_sweep_2_size = Std.int(rs_sweep_1_size / histogram_sg_size);
      final rs_sweep_size = rs_sweep_0_size + rs_sweep_1_size + rs_sweep_2_size;
      // phase 2 is the max
      final rs_mem_phase_2 = RS_RADIX_SIZE + RS_SCATTER_BLOCK_ROWS * SCATTER_WG_SIZE;
      final rs_mem_dwords = rs_mem_phase_2;
      final rs_mem_sweep_0_offset = 0;
      final rs_mem_sweep_1_offset = rs_mem_sweep_0_offset + rs_sweep_0_size;
      final rs_mem_sweep_2_offset = rs_mem_sweep_1_offset + rs_sweep_1_size;

      final instance = new GPUSorter();
      instance.bind_group_layout = GPUSorter.bindGroupLayouts(device);
      instance.render_bind_group_layout = GPUSorter.bindGroupLayoutRendering(device);
      instance.preprocess_bind_group_layout = GPUSorter.bindGroupLayoutPreprocess(device);

      final pipeline_layout = device.createPipelineLayout({
        label: 'radix sort pipeline layout',
        bindGroupLayouts: [instance.bind_group_layout]
      });

      // Load shader and inject constants header + placeholder replacements
      final p = js.Syntax.code("(fetch('./gs/shaders/radix_sort.wgsl').then(r=>r.text()))");
      (cast p : Promise<String>).then(raw -> {
        var header =
          'const histogram_sg_size: u32 = ' + histogram_sg_size + 'u;\n' +
          'const histogram_wg_size: u32 = ' + HISTOGRAM_WG_SIZE + 'u;\n' +
          'const rs_radix_log2: u32 = ' + RS_RADIX_LOG2 + 'u;\n' +
          'const rs_radix_size: u32 = ' + RS_RADIX_SIZE + 'u;\n' +
          'const rs_keyval_size: u32 = ' + RS_KEYVAL_SIZE + 'u;\n' +
          'const rs_histogram_block_rows: u32 = ' + RS_HISTOGRAM_BLOCK_ROWS + 'u;\n' +
          'const rs_scatter_block_rows: u32 = ' + RS_SCATTER_BLOCK_ROWS + 'u;\n' +
          'const rs_mem_dwords: u32 = ' + rs_mem_dwords + 'u;\n' +
          'const rs_mem_sweep_0_offset: u32 = ' + rs_mem_sweep_0_offset + 'u;\n' +
          'const rs_mem_sweep_1_offset: u32 = ' + rs_mem_sweep_1_offset + 'u;\n' +
          'const rs_mem_sweep_2_offset: u32 = ' + rs_mem_sweep_2_offset + 'u;\n';

        var shader_code = header + raw;
        // Rust/TS placeholders → concrete numbers
        shader_code = replaceAll(shader_code, '{histogram_wg_size}', Std.string(HISTOGRAM_WG_SIZE));
        shader_code = replaceAll(shader_code, '{prefix_wg_size}', Std.string(PREFIX_WG_SIZE));
        shader_code = replaceAll(shader_code, '{scatter_wg_size}', Std.string(SCATTER_WG_SIZE));
        // Fix old WGSL vector spelling (VecN -> vecN)
        shader_code = replaceAll(shader_code, 'Vec2<', 'vec2<');
        shader_code = replaceAll(shader_code, 'Vec3<', 'vec3<');
        shader_code = replaceAll(shader_code, 'Vec4<', 'vec4<');

        final shader = device.createShaderModule({ label: 'Radix sort shader', code: shader_code });

        instance.zero_p = device.createComputePipeline({
          label: 'Zero the histograms',
          layout: pipeline_layout,
          compute: { module: shader, entryPoint: 'zero_histograms' }
        });
        instance.histogram_p = device.createComputePipeline({
          label: 'calculate_histogram',
          layout: pipeline_layout,
          compute: { module: shader, entryPoint: 'calculate_histogram' }
        });
        instance.prefix_p = device.createComputePipeline({
          label: 'prefix_histogram',
          layout: pipeline_layout,
          compute: { module: shader, entryPoint: 'prefix_histogram' }
        });
        instance.scatter_even_p = device.createComputePipeline({
          label: 'scatter_even',
          layout: pipeline_layout,
          compute: { module: shader, entryPoint: 'scatter_even' }
        });
        instance.scatter_odd_p = device.createComputePipeline({
          label: 'scatter_odd',
          layout: pipeline_layout,
          compute: { module: shader, entryPoint: 'scatter_odd' }
        });

        instance.subgroup_size = histogram_sg_size;
        resolve(instance);
      }, e -> reject(e));
    });
  }

  // ---- Public layout helpers (associated functions in Rust) ----
  public static function bindGroupLayouts(device:GPUDevice):GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'Radix bind group layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // general infos
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // internal mem
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // keyval_a
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // keyval_b
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // payload_a
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // payload_b
      ]
    });
  }

  public static function bindGroupLayoutPreprocess(device:GPUDevice):GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'Radix bind group layout for preprocess pipeline',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // general infos
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // keyval_a
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // payload_a
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }, // dispatch
      ]
    });
  }

  public static function bindGroupLayoutRendering(device:GPUDevice):GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'Radix bind group layout (render)',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }, // general infos
        { binding: 4, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }, // payload_a (indices)
      ]
    });
  }

  // ---- Public API: allocate per-pointcloud resources (create_sort_stuff) ----
  public function createSortStuff(device:GPUDevice, numPoints:Int):PointCloudSortStuff {
    final kv = GPUSorter.createKeyvalBuffers(device, numPoints, 4);
    final keyval_a = kv[0], keyval_b = kv[1], payload_a = kv[2], payload_b = kv[3];

    final sorter_int = this.createInternalMemBuffer(device, numPoints);
    final created = this.createBindGroup(device, numPoints, sorter_int, keyval_a, keyval_b, payload_a, payload_b);
    final sorter_uni = created[0];
    final sorter_dis = created[1];
    final sorter_bg  = created[2];

    final sorter_render_bg = this.createBindGroupRender(device, sorter_uni, payload_a);
    final sorter_bg_pre = this.createBindGroupPreprocess(device, sorter_uni, sorter_dis, keyval_a, payload_a);

    return {
      numPoints: numPoints,
      sorterUni: sorter_uni,
      sorterDis: sorter_dis,
      sorterBg: sorter_bg,
      sorterRenderBg: sorter_render_bg,
      sorterBgPre: sorter_bg_pre
    };
  }

  // ---- Internal helpers from Rust ----
  private static function getScatterHistogramSizes(keysize:Int):Array<Int> {
    final scatter_block_kvs = HISTOGRAM_WG_SIZE * RS_SCATTER_BLOCK_ROWS;
    final scatter_blocks_ru = Std.int((keysize + scatter_block_kvs - 1) / scatter_block_kvs);
    final count_ru_scatter = scatter_blocks_ru * scatter_block_kvs;

    final histo_block_kvs = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
    final histo_blocks_ru = Std.int((count_ru_scatter + histo_block_kvs - 1) / histo_block_kvs);
    final count_ru_histo = histo_blocks_ru * histo_block_kvs;

    return [
      scatter_block_kvs,
      scatter_blocks_ru,
      count_ru_scatter,
      histo_block_kvs,
      histo_blocks_ru,
      count_ru_histo
    ];
  }

  public static function createKeyvalBuffers(device:GPUDevice, keysize:Int, bytesPerPayloadElem:Int):Array<GPUBuffer> {
    final keysPerWG = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
    final countRuHisto = (Std.int((keysize + keysPerWG) / keysPerWG) + 1) * keysPerWG;

    final keyBytes = countRuHisto * 4; // f32
    final buffer_a = device.createBuffer({
      label: 'Radix data buffer a',
      size: keyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    final buffer_b = device.createBuffer({
      label: 'Radix data buffer b',
      size: keyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    if (bytesPerPayloadElem != 4) throw 'Only 4-byte payload elements supported';
    final payloadSize = Std.int(Math.max(keysize * bytesPerPayloadElem, 1));
    final payload_a = device.createBuffer({
      label: 'Radix payload buffer a',
      size: payloadSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    final payload_b = device.createBuffer({
      label: 'Radix payload buffer b',
      size: payloadSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    return [buffer_a, buffer_b, payload_a, payload_b];
  }

  public function createInternalMemBuffer(device:GPUDevice, keysize:Int):GPUBuffer {
    // histograms[keyval_size] | partitions[scatter_blocks_ru-1] | workgroup_ids[keyval_size]
    final parts = GPUSorter.getScatterHistogramSizes(keysize);
    final scatter_blocks_ru = parts[1];
    final histo_size = RS_RADIX_SIZE * 4; // u32
    final internal_size = (RS_KEYVAL_SIZE + scatter_blocks_ru - 1 + 1) * histo_size;

    return device.createBuffer({
      label: 'Internal radix sort buffer',
      size: internal_size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
  }

  public function createBindGroup(device:GPUDevice, keysize:Int, internal_mem_buffer:GPUBuffer, keyval_a:GPUBuffer, keyval_b:GPUBuffer, payload_a:GPUBuffer, payload_b:GPUBuffer):Array<Dynamic> {
    final sizes = GPUSorter.getScatterHistogramSizes(keysize);
    final scatter_blocks_ru = sizes[1];
    final count_ru_histo = sizes[5];

    final dispatch_infos:IndirectDispatch = {
      dispatch_x: scatter_blocks_ru >>> 0,
      dispatch_y: 1,
      dispatch_z: 1
    };
    final uniform_infos:GeneralInfo = {
      keys_size: keysize >>> 0,
      padded_size: count_ru_histo >>> 0,
      passes: 4,
      even_pass: 0,
      odd_pass: 0
    };

    final uniform_buffer = device.createBuffer({
      label: 'Radix uniform buffer',
      size: 20,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    {
      final bytes = writeGeneralInfo(uniform_infos);
      device.queue.writeBuffer(uniform_buffer, 0, (bytes.buffer:ArrayBuffer), bytes.byteOffset, bytes.byteLength);
    }

    final dispatch_buffer = device.createBuffer({
      label: 'Dispatch indirect buffer',
      size: 12,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT
    });
    {
      final bytes = writeIndirectDispatch(dispatch_infos);
      device.queue.writeBuffer(dispatch_buffer, 0, (bytes.buffer:ArrayBuffer), bytes.byteOffset, bytes.byteLength);
    }

    final bind_group = device.createBindGroup({
      label: 'Radix bind group',
      layout: this.bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: uniform_buffer } },
        { binding: 1, resource: { buffer: internal_mem_buffer } },
        { binding: 2, resource: { buffer: keyval_a } },
        { binding: 3, resource: { buffer: keyval_b } },
        { binding: 4, resource: { buffer: payload_a } },
        { binding: 5, resource: { buffer: payload_b } },
      ]
    });

    return [uniform_buffer, dispatch_buffer, bind_group];
  }

  public function createBindGroupRender(device:GPUDevice, general_infos:GPUBuffer, payload_a:GPUBuffer):GPUBindGroup {
    return device.createBindGroup({
      label: 'Render bind group',
      layout: this.render_bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: general_infos } },
        { binding: 4, resource: { buffer: payload_a } },
      ]
    });
  }

  public function createBindGroupPreprocess(device:GPUDevice, uniform_buffer:GPUBuffer, dispatch_buffer:GPUBuffer, keyval_a:GPUBuffer, payload_a:GPUBuffer):GPUBindGroup {
    return device.createBindGroup({
      label: 'Preprocess bind group',
      layout: this.preprocess_bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: uniform_buffer } },
        { binding: 1, resource: { buffer: keyval_a } },
        { binding: 2, resource: { buffer: payload_a } },
        { binding: 3, resource: { buffer: dispatch_buffer } },
      ]
    });
  }

  // ---- “Static” helper in Rust — keep as static here too ----
  public static function recordResetIndirectBuffer(indirect_buffer:GPUBuffer, uniform_buffer:GPUBuffer, queue:GPUQueue):Void {
    final zero4 = new Uint8Array([0, 0, 0, 0]);
    queue.writeBuffer(indirect_buffer, 0, zero4);
    queue.writeBuffer(uniform_buffer, 0, zero4);
  }

  // ---- Recorders (compute passes) ----
  public function record_calculate_histogram(bind_group:GPUBindGroup, keysize:Int, encoder:GPUCommandEncoder):Void {
    final sizes = GPUSorter.getScatterHistogramSizes(keysize);
    final hist_blocks_ru = sizes[4];

    {
      final pass = encoder.beginComputePass({ label: 'zeroing the histogram' });
      pass.setPipeline(this.zero_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroups(hist_blocks_ru, 1, 1);
      pass.end();
    }
    {
      final pass = encoder.beginComputePass({ label: 'calculate histogram' });
      pass.setPipeline(this.histogram_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroups(hist_blocks_ru, 1, 1);
      pass.end();
    }
  }

  public function record_calculate_histogram_indirect(bind_group:GPUBindGroup, dispatch_buffer:GPUBuffer, encoder:GPUCommandEncoder):Void {
    {
      final pass = encoder.beginComputePass({ label: 'zeroing the histogram' });
      pass.setPipeline(this.zero_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
      pass.end();
    }
    {
      final pass = encoder.beginComputePass({ label: 'calculate histogram' });
      pass.setPipeline(this.histogram_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
      pass.end();
    }
  }

  public function record_prefix_histogram(bind_group:GPUBindGroup, passes:Int, encoder:GPUCommandEncoder):Void {
    final pass = encoder.beginComputePass({ label: 'prefix histogram' });
    pass.setPipeline(this.prefix_p);
    pass.setBindGroup(0, bind_group);
    pass.dispatchWorkgroups(passes, 1, 1);
    pass.end();
  }

  public function record_scatter_keys(bind_group:GPUBindGroup, passes:Int, keysize:Int, encoder:GPUCommandEncoder):Void {
    if (passes != 4) throw 'passes must be 4';
    final sizes = GPUSorter.getScatterHistogramSizes(keysize);
    final scatter_blocks_ru = sizes[1];

    final pass = encoder.beginComputePass({ label: 'Scatter keyvals' });
    pass.setBindGroup(0, bind_group);

    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);

    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);

    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);

    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);

    pass.end();
  }

  public function record_scatter_keys_indirect(bind_group:GPUBindGroup, passes:Int, dispatch_buffer:GPUBuffer, encoder:GPUCommandEncoder):Void {
    if (passes != 4) throw 'passes must be 4';

    final pass = encoder.beginComputePass({ label: 'Scatter keyvals' });
    pass.setBindGroup(0, bind_group);

    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);

    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);

    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);

    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);

    pass.end();
  }

  public function record_sort(bind_group:GPUBindGroup, keysize:Int, encoder:GPUCommandEncoder):Void {
    this.record_calculate_histogram(bind_group, keysize, encoder);
    this.record_prefix_histogram(bind_group, 4, encoder);
    this.record_scatter_keys(bind_group, 4, keysize, encoder);
  }

  public function recordSortIndirect(bind_group:GPUBindGroup, dispatch_buffer:GPUBuffer, encoder:GPUCommandEncoder):Void {
    this.record_calculate_histogram_indirect(bind_group, dispatch_buffer, encoder);
    this.record_prefix_histogram(bind_group, 4, encoder);
    this.record_scatter_keys_indirect(bind_group, 4, dispatch_buffer, encoder);
  }

  // ---- Small self-check used during subgroup-size probing (mirrors test_sort) ----
  private function test_sort(device:GPUDevice, queue:GPUQueue):Promise<Bool> {
    return new Promise((resolve, reject) -> {
      final n = 8192;
      final scrambled = new Float32Array(n);
      for (i in 0...n) scrambled[i] = (n - 1 - i);

      final internal_mem_buffer = this.createInternalMemBuffer(device, n);
      final kv = GPUSorter.createKeyvalBuffers(device, n, 4);
      final keyval_a = kv[0], keyval_b = kv[1], payload_a = kv[2], payload_b = kv[3];
      final created = this.createBindGroup(device, n, internal_mem_buffer, keyval_a, keyval_b, payload_a, payload_b);
      final uniform_buffer = created[0];
      final dispatch_buffer = created[1];
      final bind_group = created[2];

      // upload keys into keyval_a
      queue.writeBuffer(keyval_a, 0, scrambled.buffer);

      final encoder = device.createCommandEncoder({ label: 'GPUSorter test_sort' });
      this.record_sort(bind_group, n, encoder);
      queue.submit([encoder.finish()]);

      // wait for submit to finish
      final p = js.Syntax.code("queue.onSubmittedWorkDone()");
      (cast p : Promise<Dynamic>).then(_ -> {
        downloadBufferF32(device, queue, keyval_a, n).then(sorted -> {
          for (i in 0...n) {
            if (sorted[i] != i) {
              // cleanup
              uniform_buffer.destroy(); dispatch_buffer.destroy(); internal_mem_buffer.destroy();
              keyval_a.destroy(); keyval_b.destroy(); payload_a.destroy(); payload_b.destroy();
              resolve(false);
              return;
            }
          }
          // cleanup
          uniform_buffer.destroy(); dispatch_buffer.destroy(); internal_mem_buffer.destroy();
          keyval_a.destroy(); keyval_b.destroy(); payload_a.destroy(); payload_b.destroy();
          resolve(true);
        }, e -> reject(e));
      }, e -> reject(e));
    });
  }
}

// ===== Map-read helper (Float32) =====
private function downloadBufferF32(device:GPUDevice, queue:GPUQueue, src:GPUBuffer, count:Int):Promise<Float32Array> {
  return new Promise((resolve, reject) -> {
    final byteLength = count * 4;
    final dst = device.createBuffer({
      label: 'Download buffer',
      size: byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    final encoder = device.createCommandEncoder({ label: 'Copy encoder' });
    encoder.copyBufferToBuffer(src, 0, dst, 0, byteLength);
    queue.submit([encoder.finish()]);

    // wait for submit
    final p = js.Syntax.code("queue.onSubmittedWorkDone()");
    (cast p : Promise<Dynamic>).then(_ -> {
      // map for read
      final p2 = js.Syntax.code("dst.mapAsync(GPUMapMode.READ)");
      (cast p2 : Promise<Dynamic>).then(_2 -> {
        final copy:js.lib.ArrayBuffer = dst.getMappedRange().slice(0);
        dst.unmap();
        dst.destroy();
        resolve(new Float32Array(copy));
      }, e -> reject(e));
    }, e -> reject(e));
  });
}
