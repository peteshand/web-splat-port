export class WGPUContext {
  device!: GPUDevice;
  queue!: GPUQueue;
  adapter!: GPUAdapter;

  static async new_instance(): Promise<WGPUContext> {
    return WGPUContext.new(undefined, undefined);
  }

  static async new(_instance?: unknown, _surface?: GPUCanvasContext | null): Promise<WGPUContext> {
    if (!('gpu' in navigator)) throw new Error('WebGPU not available');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter');

    // Mirror wasm limits we rely on (keep permissive for browser portability)
    const device = await adapter.requestDevice({
      requiredLimits: { maxComputeWorkgroupStorageSize: 1 << 15 } // 32768
    });

    const ctx = new WGPUContext();
    ctx.adapter = adapter;
    ctx.device = device;
    ctx.queue = device.queue;
    return ctx;
  }
}
