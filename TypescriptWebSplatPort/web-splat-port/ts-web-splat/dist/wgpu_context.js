// Mirrors `WGPUContext` in `src/lib.rs`
export class WGPUContext {
    device;
    queue;
    adapter;
    static async new_instance() {
        const instance = new WGPUContext();
        return instance.new(undefined);
    }
    async new(_surface) {
        if (!navigator.gpu)
            throw new Error("WebGPU not supported");
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter)
            throw new Error("No GPU adapter available");
        const device = await adapter.requestDevice({});
        this.adapter = adapter;
        this.device = device;
        this.queue = device.queue;
        return this;
    }
}
