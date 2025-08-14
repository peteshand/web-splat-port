// Mirrors `WGPUContext` in `src/lib.rs`
export class WGPUContext {
  device!: GPUDevice;
  queue!: GPUQueue;
  adapter!: GPUAdapter;

  static async new_instance(): Promise<WGPUContext> {
    const instance = new WGPUContext();
    return instance.new(undefined);
  }

  async new(_surface?: GPUCanvasContext | undefined): Promise<WGPUContext> {
    if (!navigator.gpu) throw new Error("WebGPU not supported");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No GPU adapter available");
    const device = await adapter.requestDevice({});
    this.adapter = adapter;
    this.device = device;
    this.queue = device.queue;
    return this;
  }
}

export interface RenderConfig {
  no_vsync: boolean;
  skybox?: string | null; // path to HDRI; TS alternative to PathBuf
  hdr: boolean;
}
