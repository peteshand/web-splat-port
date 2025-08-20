// uniform.ts
// 1:1 port of uniform.rs for WebGPU (browser/wasm)
export class UniformBuffer {
    _buffer;
    _data;
    _label;
    _bind_group;
    // ---- new_default ----
    static newDefault(device, label, byteLength = 256) {
        const buffer = device.createBuffer({
            label,
            size: byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(buffer.getMappedRange()).fill(0);
        buffer.unmap();
        const bgLabel = label ? `${label} bind group` : undefined;
        const bind_group = device.createBindGroup({
            label: bgLabel,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{ binding: 0, resource: { buffer } }]
        });
        // no default T in TS; keep undefined until user sets data
        return new UniformBuffer(buffer, undefined, label, bind_group);
    }
    // ---- new ----
    static new(device, data, label) {
        const buffer = device.createBuffer({
            label,
            size: data.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        buffer.unmap();
        const bgLabel = label ? `${label} bind group` : undefined;
        const bind_group = device.createBindGroup({
            label: bgLabel,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{ binding: 0, resource: { buffer } }]
        });
        return new UniformBuffer(buffer, data, label, bind_group);
    }
    constructor(buffer, data, label, bind_group) {
        this._buffer = buffer;
        this._data = data;
        this._label = label;
        this._bind_group = bind_group;
    }
    /* ----------------------------- Rust-style API ----------------------------- */
    // buffer(&self) -> &wgpu::Buffer
    buffer() { return this._buffer; }
    // data(&self) -> &T
    data() { return this._data; }
    // pub fn bind_group_layout(device: &Device) -> BindGroupLayout
    static bind_group_layout(device) {
        return this.bindGroupLayout(device);
    }
    // pub fn binding_type() -> BindingType
    static binding_type() {
        return this.bindingType();
    }
    // pub fn sync(&mut self, queue: &Queue)
    sync(queue) {
        const v = this._data;
        if (!v || !(v.buffer instanceof ArrayBuffer || typeof SharedArrayBuffer !== 'undefined' && v.buffer instanceof SharedArrayBuffer)) {
            throw new Error('UniformBuffer.sync(): data is not an ArrayBufferView. Provide bytes or use setData(bytes) first.');
        }
        // Use the ArrayBuffer overload to satisfy lib.dom WebGPU types
        queue.writeBuffer(this._buffer, 0, v.buffer, v.byteOffset, v.byteLength);
    }
    // pub fn clone(&self, device: &Device, queue: &Queue) -> Self
    clone(device, queue) {
        const buffer = device.createBuffer({
            label: this._label,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: this._buffer.size,
            mappedAtCreation: false
        });
        const encoder = device.createCommandEncoder({ label: 'copy uniform buffer encode' });
        encoder.copyBufferToBuffer(this._buffer, 0, buffer, 0, this._buffer.size);
        queue.submit([encoder.finish()]);
        const bind_group = device.createBindGroup({
            label: 'uniform bind group',
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{ binding: 0, resource: { buffer } }]
        });
        return new UniformBuffer(buffer, this._data, this._label, bind_group);
    }
    // pub fn bind_group(&self) -> &wgpu::BindGroup
    bind_group() { return this._bind_group; }
    /* --------------------------- TS-friendly aliases -------------------------- */
    bufferRef() { return this._buffer; }
    dataRef() { return this._data; }
    getBindGroup() { return this._bind_group; }
    setData(bytes) {
        this._data = bytes;
    }
    /* --------------------------- Layout helpers (TS) -------------------------- */
    static bindGroupLayout(device) {
        return device.createBindGroupLayout({
            label: 'uniform bind group layout',
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: UniformBuffer.bindingType()
                }]
        });
    }
    static bindingType() {
        return {
            type: 'uniform',
            hasDynamicOffset: false
            // minBindingSize: can be set if you want strict validation
        };
    }
}
//# sourceMappingURL=uniform.js.map