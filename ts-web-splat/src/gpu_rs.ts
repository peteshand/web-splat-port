// Mirrors gpu_rs.rs (skeleton for GPU radix sort)
import { loadWGSL } from "./shaders/loader";

type SortBuffers = {
  infos: GPUBuffer;          // GeneralInfo (5 u32)
  histograms: GPUBuffer;     // see layout in WGSL comments
  keys: GPUBuffer;           // sort_depths
  keys_b: GPUBuffer;         // ping-pong buffer, same size as keys
  payload_a: GPUBuffer;      // sort_indices
  payload_b: GPUBuffer;      // ping-pong indices
};

export class GPURSSorter {
  private device!: GPUDevice;
  private queue!: GPUQueue;
  private module!: GPUShaderModule;
  private bgLayout!: GPUBindGroupLayout; // group(0)
  // Pipelines
  private zeroPipeline!: GPUComputePipeline;
  private histogramPipeline!: GPUComputePipeline;
  private prefixPipeline!: GPUComputePipeline;
  private scatterEvenPipeline!: GPUComputePipeline;
  private scatterOddPipeline!: GPUComputePipeline;

  // Tunables (match placeholders in WGSL)
  private histogramWgSize = 256; // {histogram_wg_size}
  private prefixWgSize = 128;    // {prefix_wg_size}
  private scatterWgSize = 256;   // {scatter_wg_size}
  private rsRadixLog2 = 4;       // 16-way radix
  private rsRadixSize = 1 << this.rsRadixLog2;

  static async new(_device: GPUDevice, _queue: GPUQueue): Promise<GPURSSorter> {
    const s = new GPURSSorter();
    s.device = _device;
    s.queue = _queue;
    const raw = await fetch(new URL("../src-rust-web-splat/src/shaders/radix_sort.wgsl", import.meta.url)).then(r => r.text());
    const code = s.injectConstants(raw);
    s.module = _device.createShaderModule({ code });
    s.bgLayout = _device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // infos
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // histograms
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // keys
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // keys_b
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // payload_a
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // payload_b
      ],
    });
    const layout = _device.createPipelineLayout({ bindGroupLayouts: [s.bgLayout] });
    s.zeroPipeline = _device.createComputePipeline({ layout, compute: { module: s.module, entryPoint: "zero_histograms" } });
    s.histogramPipeline = _device.createComputePipeline({ layout, compute: { module: s.module, entryPoint: "calculate_histogram" } });
    s.prefixPipeline = _device.createComputePipeline({ layout, compute: { module: s.module, entryPoint: "prefix_histogram" } });
    s.scatterEvenPipeline = _device.createComputePipeline({ layout, compute: { module: s.module, entryPoint: "scatter_even" } });
    s.scatterOddPipeline = _device.createComputePipeline({ layout, compute: { module: s.module, entryPoint: "scatter_odd" } });
    return s;
  }

  // Caller allocates keys (depths) and payload_a (indices). We provide helper to create ping-pong buffers and histogram buffer.
  planBuffers(numKeys: number, keys: GPUBuffer, payloadA: GPUBuffer): SortBuffers {
    const padded = Math.ceil(numKeys / (this.histogramWgSize * 15)) * (this.histogramWgSize * 15);
    const infos = this.device.createBuffer({ size: 5 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const keyBytes = padded * 4;
    const keys_b = this.device.createBuffer({ size: keyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const payload_b = this.device.createBuffer({ size: keyBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    // Histogram buffer size estimation: (keyval_size + scatter_blocks_ru - 1) * histo_size + workgroup_ids_size
    const histoSize = this.rsRadixSize;
    const scatterBlockKVs = this.histogramWgSize * 15;
    const scatterBlocksRU = Math.ceil(padded / scatterBlockKVs);
    const keyvalSize = this.rsRadixSize * 4; // 4 passes assumed
    const histoBytes = (keyvalSize + scatterBlocksRU - 1) * histoSize * 4;
    const histograms = this.device.createBuffer({ size: histoBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    return { infos, histograms, keys, keys_b, payload_a: payloadA, payload_b };
  }
  // Encode zero + histogram + prefix + scatter passes
  sort(encoder: GPUCommandEncoder, bufs: SortBuffers, numKeys: number): void {
    const bg = this.device.createBindGroup({
      layout: this.bgLayout,
      entries: [
        { binding: 0, resource: { buffer: bufs.infos } },
        { binding: 1, resource: { buffer: bufs.histograms } },
        { binding: 2, resource: { buffer: bufs.keys } },
        { binding: 3, resource: { buffer: bufs.keys_b } },
        { binding: 4, resource: { buffer: bufs.payload_a } },
        { binding: 5, resource: { buffer: bufs.payload_b } },
      ],
    });
    // Initialize infos
    const passes = 4; // up to 32-bit keys with radix 16
    const even_pass = 0, odd_pass = 1;
    const infosData = new Uint32Array([numKeys >>> 0, (Math.ceil(numKeys / (this.histogramWgSize * 15)) * (this.histogramWgSize * 15)) >>> 0, passes, even_pass, odd_pass]);
    this.queue.writeBuffer(bufs.infos, 0, infosData.buffer);
    // zero_histograms
    {
      const c = encoder.beginComputePass();
      c.setPipeline(this.zeroPipeline);
      c.setBindGroup(0, bg);
      const wg = Math.ceil(infosData[1] / this.histogramWgSize);
      c.dispatchWorkgroups(wg);
      c.end();
    }
    // calculate_histogram
    {
      const c = encoder.beginComputePass();
      c.setPipeline(this.histogramPipeline);
      c.setBindGroup(0, bg);
      const wg = Math.ceil(infosData[1] / (this.histogramWgSize * 15));
      c.dispatchWorkgroups(wg);
      c.end();
    }
    // prefix_histogram
    {
      const c = encoder.beginComputePass();
      c.setPipeline(this.prefixPipeline);
      c.setBindGroup(0, bg);
      // one workgroup per two radix buckets (see shader comments) -> rs_radix_size/2
      c.dispatchWorkgroups(this.rsRadixSize / 2);
      c.end();
    }
    // scatter passes (pairs). keys per workgroup = histogramWgSize * rs_scatter_block_rows
    const keysPerWG = this.histogramWgSize * 15;
    const groups = Math.ceil(infosData[1] / keysPerWG);
    const pairs = Math.ceil(passes / 2);
    for (let i = 0; i < pairs; i++) {
      // even
      {
        const c = encoder.beginComputePass();
        c.setPipeline(this.scatterEvenPipeline);
        c.setBindGroup(0, bg);
        c.dispatchWorkgroups(groups);
        c.end();
      }
      // odd
      {
        const c = encoder.beginComputePass();
        c.setPipeline(this.scatterOddPipeline);
        c.setBindGroup(0, bg);
        c.dispatchWorkgroups(groups);
        c.end();
      }
    }
  }

  private injectConstants(src: string): string {
    const headers = `const histogram_sg_size = 32u;\nconst histogram_wg_size = ${this.histogramWgSize}u;\nconst prefix_wg_size = ${this.prefixWgSize}u;\nconst scatter_wg_size = ${this.scatterWgSize}u;\nconst rs_radix_log2 = ${this.rsRadixLog2}u;\nconst rs_radix_size = ${this.rsRadixSize}u;\nconst rs_keyval_size = ${this.rsRadixSize * 4}u;\nconst rs_histogram_block_rows = 15u;\nconst rs_scatter_block_rows = 15u;\nconst rs_mem_dwords = 2048u;\nconst rs_mem_sweep_0_offset = 0u;\nconst rs_mem_sweep_1_offset = 32u;\nconst rs_mem_sweep_2_offset = 64u;\n`;
    return headers + src
      .replaceAll("{histogram_wg_size}", String(this.histogramWgSize))
      .replaceAll("{prefix_wg_size}", String(this.prefixWgSize))
      .replaceAll("{scatter_wg_size}", String(this.scatterWgSize));
  }
}
