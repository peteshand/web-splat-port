// gpu_rs.ts
//
// 1:1 port of gpu_rs.rs (WebGPU radix sort for float key-value pairs)
// - Same public API surface (GPURSSorter, PointCloudSortStuff, constants)
// - Same bind group layouts & binding indices
// - Loads shaders from ./shaders/radix_sort.wgsl with injected constants

// ===== Constants (must match shaders/radix_sort.wgsl) =====
export const HISTOGRAM_WG_SIZE = 256;
const RS_RADIX_LOG2 = 8;
const RS_RADIX_SIZE = 1 << RS_RADIX_LOG2;
const RS_KEYVAL_SIZE = 32 / RS_RADIX_LOG2;       // 32 bits / 8 = 4 passes
export const RS_HISTOGRAM_BLOCK_ROWS = 15;
const RS_SCATTER_BLOCK_ROWS = RS_HISTOGRAM_BLOCK_ROWS; // DO NOT CHANGE (shader assumes)
const PREFIX_WG_SIZE = 1 << 7;                   // 128
const SCATTER_WG_SIZE = 1 << 8;                  // 256

// ===== Types matching Rust structs =====
export interface PointCloudSortStuff {
  numPoints: number;
  sorterUni: GPUBuffer;         // "uniform" storage buffer with GeneralInfo
  sorterDis: GPUBuffer;         // indirect dispatch buffer (IndirectDispatch)
  sorterBg: GPUBindGroup;       // radix sort main bind group (6 bindings)
  sorterRenderBg: GPUBindGroup; // render bind group (indices etc.)
  sorterBgPre: GPUBindGroup;    // preprocess bind group (merged layout for preprocess step)
}

// GeneralInfo (5 x u32) — stored in a STORAGE buffer
type GeneralInfo = {
  keys_size: number;   // u32
  padded_size: number; // u32
  passes: number;      // u32
  even_pass: number;   // u32
  odd_pass: number;    // u32
};

// IndirectDispatch (3 x u32)
type IndirectDispatch = {
  dispatch_x: number;
  dispatch_y: number;
  dispatch_z: number;
};

// ===== Utility to write small structs =====
function writeGeneralInfo(info: GeneralInfo): Uint8Array {
  const buf = new ArrayBuffer(20);
  const dv = new DataView(buf);
  dv.setUint32(0, info.keys_size >>> 0, true);
  dv.setUint32(4, info.padded_size >>> 0, true);
  dv.setUint32(8, info.passes >>> 0, true);
  dv.setUint32(12, info.even_pass >>> 0, true);
  dv.setUint32(16, info.odd_pass >>> 0, true);
  return new Uint8Array(buf);
}

function writeIndirectDispatch(id: IndirectDispatch): Uint8Array {
  const buf = new ArrayBuffer(12);
  const dv = new DataView(buf);
  dv.setUint32(0, id.dispatch_x >>> 0, true);
  dv.setUint32(4, id.dispatch_y >>> 0, true);
  dv.setUint32(8, id.dispatch_z >>> 0, true);
  return new Uint8Array(buf);
}

// ===== GPURSSorter =====
export class GPURSSorter {
  private bind_group_layout!: GPUBindGroupLayout;        // full radix layout (6 bindings)
  private render_bind_group_layout!: GPUBindGroupLayout; // render layout (bindings 0,4)
  private preprocess_bind_group_layout!: GPUBindGroupLayout; // preprocess layout (bindings 0..3)

  private zero_p!: GPUComputePipeline;
  private histogram_p!: GPUComputePipeline;
  private prefix_p!: GPUComputePipeline;
  private scatter_even_p!: GPUComputePipeline;
  private scatter_odd_p!: GPUComputePipeline;

  private subgroup_size!: number;

  // ---- Creation entrypoint (mirrors async new(device, queue)) ----
  static async create(device: GPUDevice, queue: GPUQueue): Promise<GPURSSorter> {
    // WebGPU doesn’t expose subgroup size; do the same “probe” as Rust.
    console.debug('Searching for the maximum subgroup size (browser WebGPU cannot query it).');
    const sizes = [1, 8, 16, 32];
    let curIdx = 2; // start at 16 like Rust does (cur_size = 2)
    enum State { Init, Increasing, Decreasing }
    let state: State = State.Init;
    let biggestThatWorked = 0;
    let curSorter: GPURSSorter | null = null;

    while (true) {
      if (curIdx >= sizes.length || curIdx < 0) break;
      console.debug(`Checking sorting with subgroup size ${sizes[curIdx]}`);
      const candidate = await GPURSSorter.newWithSgSize(device, sizes[curIdx]);
      const ok = await candidate.test_sort(device, queue);
      console.debug(`${sizes[curIdx]} worked: ${ok}`);
      if (ok) curSorter = candidate;

      switch (state) {
        case State.Init:
          if (ok) {
            biggestThatWorked = sizes[curIdx];
            state = State.Increasing;
            curIdx += 1;
          } else {
            state = State.Decreasing;
            curIdx -= 1;
          }
          break;
        case State.Increasing:
          if (ok) {
            if (sizes[curIdx] > biggestThatWorked) biggestThatWorked = sizes[curIdx];
            curIdx += 1;
          } else {
            // last ok is the best
            break;
          }
          continue; // to break outer loop if needed
        case State.Decreasing:
          if (ok) {
            if (sizes[curIdx] > biggestThatWorked) biggestThatWorked = sizes[curIdx];
            break;
          } else {
            curIdx -= 1;
          }
          continue;
      }
      if (state === State.Increasing && (curIdx >= sizes.length)) break;
      if (state === State.Decreasing && (curIdx < 0)) break;
    }

    if (!curSorter || biggestThatWorked === 0) {
      throw new Error('GPURSSorter.create(): No workgroup size worked. Unable to use sorter.');
    }
    console.info(`Created a sorter with subgroup size ${curSorter.subgroup_size}`);
    return curSorter;
  }

  // ---- Instance factory with a fixed subgroup size (mirrors new_with_sg_size) ----
  private static async newWithSgSize(device: GPUDevice, sgSize: number): Promise<GPURSSorter> {
    // compute various shared-memory sizes as in Rust
    const histogram_sg_size = sgSize >>> 0;
    const rs_sweep_0_size = RS_RADIX_SIZE / histogram_sg_size;
    const rs_sweep_1_size = Math.floor(rs_sweep_0_size / histogram_sg_size);
    const rs_sweep_2_size = Math.floor(rs_sweep_1_size / histogram_sg_size);
    const rs_sweep_size = rs_sweep_0_size + rs_sweep_1_size + rs_sweep_2_size;
    // phase 2 is the max
    const rs_mem_phase_2 = RS_RADIX_SIZE + RS_SCATTER_BLOCK_ROWS * SCATTER_WG_SIZE;
    const rs_mem_dwords = rs_mem_phase_2;
    const rs_mem_sweep_0_offset = 0;
    const rs_mem_sweep_1_offset = rs_mem_sweep_0_offset + rs_sweep_0_size;
    const rs_mem_sweep_2_offset = rs_mem_sweep_1_offset + rs_sweep_1_size;

    const instance = new GPURSSorter();
    instance.bind_group_layout = GPURSSorter.bindGroupLayouts(device);
    instance.render_bind_group_layout = GPURSSorter.bindGroupLayoutRendering(device);
    instance.preprocess_bind_group_layout = GPURSSorter.bindGroupLayoutPreprocess(device);

    const pipeline_layout = device.createPipelineLayout({
      label: 'radix sort pipeline layout',
      bindGroupLayouts: [instance.bind_group_layout]
    });

    // Load shader and inject constants header + placeholder replacements
    const raw = await (await fetch('./shaders/radix_sort.wgsl')).text();
    const header =
      `const histogram_sg_size: u32 = ${histogram_sg_size}u;
const histogram_wg_size: u32 = ${HISTOGRAM_WG_SIZE}u;
const rs_radix_log2: u32 = ${RS_RADIX_LOG2}u;
const rs_radix_size: u32 = ${RS_RADIX_SIZE}u;
const rs_keyval_size: u32 = ${RS_KEYVAL_SIZE}u;
const rs_histogram_block_rows: u32 = ${RS_HISTOGRAM_BLOCK_ROWS}u;
const rs_scatter_block_rows: u32 = ${RS_SCATTER_BLOCK_ROWS}u;
const rs_mem_dwords: u32 = ${rs_mem_dwords}u;
const rs_mem_sweep_0_offset: u32 = ${rs_mem_sweep_0_offset}u;
const rs_mem_sweep_1_offset: u32 = ${rs_mem_sweep_1_offset}u;
const rs_mem_sweep_2_offset: u32 = ${rs_mem_sweep_2_offset}u;
`;
    // Replace the {histogram_wg_size}, {prefix_wg_size}, {scatter_wg_size} placeholders
    const shader_code = (header + raw)
      .replaceAll('{histogram_wg_size}', String(HISTOGRAM_WG_SIZE))
      .replaceAll('{prefix_wg_size}', String(PREFIX_WG_SIZE))
      .replaceAll('{scatter_wg_size}', String(SCATTER_WG_SIZE));

    const shader = device.createShaderModule({ label: 'Radix sort shader', code: shader_code });

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
    return instance;
  }

  // ---- Public layout helpers (associated functions in Rust) ----
  static bindGroupLayouts(device: GPUDevice): GPUBindGroupLayout {
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

  static bindGroupLayoutPreprocess(device: GPUDevice): GPUBindGroupLayout {
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

  static bindGroupLayoutRendering(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'Radix bind group layout (render)',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }, // general infos
        { binding: 4, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }, // payload_a (indices)
      ]
    });
  }

  // ---- Public API: allocate per-pointcloud resources (create_sort_stuff) ----
  createSortStuff(device: GPUDevice, numPoints: number): PointCloudSortStuff {
    const [keyval_a, keyval_b, payload_a, payload_b] = GPURSSorter.createKeyvalBuffers(device, numPoints, 4);
    const sorter_int = this.createInternalMemBuffer(device, numPoints);
    const [sorter_uni, sorter_dis, sorter_bg] = this.createBindGroup(
      device, numPoints, sorter_int, keyval_a, keyval_b, payload_a, payload_b
    );
    const sorter_render_bg = this.createBindGroupRender(device, sorter_uni, payload_a);
    const sorter_bg_pre = this.createBindGroupPreprocess(device, sorter_uni, sorter_dis, keyval_a, payload_a);

    return {
      numPoints,
      sorterUni: sorter_uni,
      sorterDis: sorter_dis,
      sorterBg: sorter_bg,
      sorterRenderBg: sorter_render_bg,
      sorterBgPre: sorter_bg_pre,
    };
  }

  // ---- Internal helpers from Rust ----
  private static getScatterHistogramSizes(keysize: number): [number, number, number, number, number, number] {
    const scatter_block_kvs = HISTOGRAM_WG_SIZE * RS_SCATTER_BLOCK_ROWS;
    const scatter_blocks_ru = Math.floor((keysize + scatter_block_kvs - 1) / scatter_block_kvs);
    const count_ru_scatter = scatter_blocks_ru * scatter_block_kvs;

    const histo_block_kvs = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
    const histo_blocks_ru = Math.floor((count_ru_scatter + histo_block_kvs - 1) / histo_block_kvs);
    const count_ru_histo = histo_blocks_ru * histo_block_kvs;

    return [
      scatter_block_kvs,
      scatter_blocks_ru,
      count_ru_scatter,
      histo_block_kvs,
      histo_blocks_ru,
      count_ru_histo
    ];
  }

  static createKeyvalBuffers(
    device: GPUDevice,
    keysize: number,
    bytesPerPayloadElem: number
  ): [GPUBuffer, GPUBuffer, GPUBuffer, GPUBuffer] {
    const keysPerWG = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
    const countRuHisto = (Math.floor((keysize + keysPerWG) / keysPerWG) + 1) * keysPerWG;

    const keyBytes = countRuHisto * 4; // f32
    const buffer_a = device.createBuffer({
      label: 'Radix data buffer a',
      size: keyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    const buffer_b = device.createBuffer({
      label: 'Radix data buffer b',
      size: keyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    if (bytesPerPayloadElem !== 4) throw new Error('Only 4-byte payload elements supported');
    const payloadSize = Math.max(keysize * bytesPerPayloadElem, 1);
    const payload_a = device.createBuffer({
      label: 'Radix payload buffer a',
      size: payloadSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    const payload_b = device.createBuffer({
      label: 'Radix payload buffer b',
      size: payloadSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    return [buffer_a, buffer_b, payload_a, payload_b];
  }

  createInternalMemBuffer(device: GPUDevice, keysize: number): GPUBuffer {
    // Layout:
    // histograms[keyval_size] |
    // partitions[scatter_blocks_ru-1] |
    // workgroup_ids[keyval_size]
    // Size computed like Rust:
    const [, scatter_blocks_ru] = GPURSSorter.getScatterHistogramSizes(keysize);
    const histo_size = RS_RADIX_SIZE * 4; // u32
    const internal_size = (RS_KEYVAL_SIZE + scatter_blocks_ru - 1 + 1) * histo_size;

    return device.createBuffer({
      label: 'Internal radix sort buffer',
      size: internal_size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
  }

  createBindGroup(
    device: GPUDevice,
    keysize: number,
    internal_mem_buffer: GPUBuffer,
    keyval_a: GPUBuffer,
    keyval_b: GPUBuffer,
    payload_a: GPUBuffer,
    payload_b: GPUBuffer
  ): [GPUBuffer, GPUBuffer, GPUBindGroup] {
    const [, scatter_blocks_ru, , , , count_ru_histo] = GPURSSorter.getScatterHistogramSizes(keysize);

    const dispatch_infos: IndirectDispatch = {
      dispatch_x: scatter_blocks_ru >>> 0,
      dispatch_y: 1,
      dispatch_z: 1
    };
    const uniform_infos: GeneralInfo = {
      keys_size: keysize >>> 0,
      padded_size: count_ru_histo >>> 0,
      passes: 4,
      even_pass: 0,
      odd_pass: 0
    };

    const uniform_buffer = device.createBuffer({
      label: 'Radix uniform buffer',
      size: 20,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    {
        const bytes = writeGeneralInfo(uniform_infos);            // Uint8Array
        device.queue.writeBuffer(
          uniform_buffer,
          0,
          bytes.buffer as ArrayBuffer,                             // <-- pass ArrayBuffer
          bytes.byteOffset,
          bytes.byteLength
        );
      }

    const dispatch_buffer = device.createBuffer({
      label: 'Dispatch indirect buffer',
      size: 12,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT
    });
    
    {
        const bytes = writeGeneralInfo(uniform_infos);            // or whatever function you call there
        device.queue.writeBuffer(
            dispatch_buffer,                                    // your buffer at 381
          0,
          bytes.buffer as ArrayBuffer,
          bytes.byteOffset,
          bytes.byteLength
        );
    }

    const bind_group = device.createBindGroup({
      label: 'Radix bind group',
      layout: this.bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: uniform_buffer } },
        { binding: 1, resource: { buffer: internal_mem_buffer } },
        { binding: 2, resource: { buffer: keyval_a } },
        { binding: 3, resource: { buffer: keyval_b } },
        { binding: 4, resource: { buffer: payload_a } },
        { binding: 5, resource: { buffer: payload_b } }
      ]
    });

    return [uniform_buffer, dispatch_buffer, bind_group];
  }

  createBindGroupRender(device: GPUDevice, general_infos: GPUBuffer, payload_a: GPUBuffer): GPUBindGroup {
    return device.createBindGroup({
      label: 'Render bind group',
      layout: this.render_bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: general_infos } },
        { binding: 4, resource: { buffer: payload_a } }
      ]
    });
  }

  createBindGroupPreprocess(
    device: GPUDevice,
    uniform_buffer: GPUBuffer,
    dispatch_buffer: GPUBuffer,
    keyval_a: GPUBuffer,
    payload_a: GPUBuffer
  ): GPUBindGroup {
    return device.createBindGroup({
      label: 'Preprocess bind group',
      layout: this.preprocess_bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: uniform_buffer } },
        { binding: 1, resource: { buffer: keyval_a } },
        { binding: 2, resource: { buffer: payload_a } },
        { binding: 3, resource: { buffer: dispatch_buffer } }
      ]
    });
  }

  // ---- “Static” helper in Rust — keep as static here too ----
  static recordResetIndirectBuffer(indirect_buffer: GPUBuffer, uniform_buffer: GPUBuffer, queue: GPUQueue): void {
    const zero4 = new Uint8Array([0, 0, 0, 0]);
    queue.writeBuffer(indirect_buffer, 0, zero4); // dispatch_x = 0
    queue.writeBuffer(uniform_buffer, 0, zero4);  // keys_size = 0
  }

  // ---- Recorders (compute passes) ----
  record_calculate_histogram(bind_group: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void {
    const [, , , , hist_blocks_ru] = GPURSSorter.getScatterHistogramSizes(keysize);

    {
      const pass = encoder.beginComputePass({ label: 'zeroing the histogram' });
      pass.setPipeline(this.zero_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroups(hist_blocks_ru, 1, 1);
      pass.end();
    }
    {
      const pass = encoder.beginComputePass({ label: 'calculate histogram' });
      pass.setPipeline(this.histogram_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroups(hist_blocks_ru, 1, 1);
      pass.end();
    }
  }

  record_calculate_histogram_indirect(bind_group: GPUBindGroup, dispatch_buffer: GPUBuffer, encoder: GPUCommandEncoder): void {
    {
      const pass = encoder.beginComputePass({ label: 'zeroing the histogram' });
      pass.setPipeline(this.zero_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
      pass.end();
    }
    {
      const pass = encoder.beginComputePass({ label: 'calculate histogram' });
      pass.setPipeline(this.histogram_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
      pass.end();
    }
  }

  // There is no indirect prefix step — number of prefixes depends on passes (4).
  record_prefix_histogram(bind_group: GPUBindGroup, passes: number, encoder: GPUCommandEncoder): void {
    const pass = encoder.beginComputePass({ label: 'prefix histogram' });
    pass.setPipeline(this.prefix_p);
    pass.setBindGroup(0, bind_group);
    pass.dispatchWorkgroups(passes, 1, 1);
    pass.end();
  }

  record_scatter_keys(bind_group: GPUBindGroup, passes: number, keysize: number, encoder: GPUCommandEncoder): void {
    if (passes !== 4) throw new Error('passes must be 4');
    const [, scatter_blocks_ru] = GPURSSorter.getScatterHistogramSizes(keysize);

    const pass = encoder.beginComputePass({ label: 'Scatter keyvals' });
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

  record_scatter_keys_indirect(bind_group: GPUBindGroup, passes: number, dispatch_buffer: GPUBuffer, encoder: GPUCommandEncoder): void {
    if (passes !== 4) throw new Error('passes must be 4');

    const pass = encoder.beginComputePass({ label: 'Scatter keyvals' });
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

  record_sort(bind_group: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void {
    this.record_calculate_histogram(bind_group, keysize, encoder);
    this.record_prefix_histogram(bind_group, 4, encoder);
    this.record_scatter_keys(bind_group, 4, keysize, encoder);
  }

  recordSortIndirect(bind_group: GPUBindGroup, dispatch_buffer: GPUBuffer, encoder: GPUCommandEncoder): void {
    this.record_calculate_histogram_indirect(bind_group, dispatch_buffer, encoder);
    this.record_prefix_histogram(bind_group, 4, encoder);
    this.record_scatter_keys_indirect(bind_group, 4, dispatch_buffer, encoder);
  }

  // ---- Small self-check used during subgroup-size probing (mirrors test_sort) ----
  private async test_sort(device: GPUDevice, queue: GPUQueue): Promise<boolean> {
    const n = 8192;
    const scrambled = new Float32Array(n);
    for (let i = 0; i < n; i++) scrambled[i] = (n - 1 - i);

    const internal_mem_buffer = this.createInternalMemBuffer(device, n);
    const [keyval_a, keyval_b, payload_a, payload_b] = GPURSSorter.createKeyvalBuffers(device, n, 4);
    const [uniform_buffer, dispatch_buffer, bind_group] = this.createBindGroup(
      device, n, internal_mem_buffer, keyval_a, keyval_b, payload_a, payload_b
    );

    // upload keys into keyval_a
    queue.writeBuffer(keyval_a, 0, scrambled.buffer);

    const encoder = device.createCommandEncoder({ label: 'GPURSSorter test_sort' });
    this.record_sort(bind_group, n, encoder);
    queue.submit([encoder.finish()]);
    await queue.onSubmittedWorkDone();

    const sorted = await downloadBufferF32(device, queue, keyval_a, n);
    for (let i = 0; i < n; i++) {
      if (sorted[i] !== i) return false;
    }
    // cleanup (optional in browser)
    uniform_buffer.destroy(); dispatch_buffer.destroy(); internal_mem_buffer.destroy();
    keyval_a.destroy(); keyval_b.destroy(); payload_a.destroy(); payload_b.destroy();
    return true;
  }
}

// ===== Map-read helper (Float32) =====
async function downloadBufferF32(device: GPUDevice, queue: GPUQueue, src: GPUBuffer, count: number): Promise<Float32Array> {
  const byteLength = count * 4;
  const dst = device.createBuffer({
    label: 'Download buffer',
    size: byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
  const encoder = device.createCommandEncoder({ label: 'Copy encoder' });
  encoder.copyBufferToBuffer(src, 0, dst, 0, byteLength);
  queue.submit([encoder.finish()]);
  await queue.onSubmittedWorkDone();

  await dst.mapAsync(GPUMapMode.READ);
  const copy = dst.getMappedRange().slice(0);
  dst.unmap();
  dst.destroy();
  return new Float32Array(copy);
}
