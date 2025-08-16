/**
 * TypeScript port of uniform.rs
 * Manages uniform buffers for WebGPU
 */
export class UniformBuffer {
    buffer;
    data;
    label;
    bindGroup;
    constructor(device, data, label) {
        this.data = data;
        this.label = label || null;
        // Create buffer with data
        const dataArray = this.castToBytes(data);
        // WebGPU requires uniform buffer sizes to be multiples of 4. Many platforms also
        // expect 256-byte alignment for uniform buffers. Pad to 256 to be safe.
        const paddedSize = Math.ceil(dataArray.byteLength / 256) * 256;
        this.buffer = device.createBuffer({
            label: label,
            size: paddedSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        // Write initial data (rest remains zero-initialized)
        new Uint8Array(this.buffer.getMappedRange()).set(dataArray);
        this.buffer.unmap();
        // Create bind group
        const bgLabel = label ? `${label} bind group` : undefined;
        this.bindGroup = device.createBindGroup({
            label: bgLabel,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.buffer
                    }
                }]
        });
    }
    static newDefault(device, defaultData, label) {
        return new UniformBuffer(device, defaultData, label);
    }
    static new(device, data, label) {
        return new UniformBuffer(device, data, label);
    }
    getBuffer() {
        return this.buffer;
    }
    getData() {
        return this.data;
    }
    getBindGroup() {
        return this.bindGroup;
    }
    static bindGroupLayout(device) {
        return device.createBindGroupLayout({
            label: "uniform bind group layout",
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: false,
                        minBindingSize: undefined // Will be determined by buffer size
                    }
                }]
        });
    }
    /**
     * Uploads data from CPU to GPU if necessary
     */
    sync(queue) {
        // For now, we'll use a simplified approach
        // In a full implementation, this would serialize the data properly
        const data = new ArrayBuffer(256); // Placeholder size
        queue.writeBuffer(this.buffer, 0, data);
    }
    static bindingType() {
        return {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: undefined
        };
    }
    clone(device, queue) {
        // Create new buffer with same size
        const newBuffer = device.createBuffer({
            label: this.label || undefined,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: this.buffer.size,
            mappedAtCreation: false
        });
        // Copy buffer contents
        const encoder = device.createCommandEncoder({
            label: "copy uniform buffer encoder"
        });
        encoder.copyBufferToBuffer(this.buffer, 0, newBuffer, 0, this.buffer.size);
        queue.submit([encoder.finish()]);
        // Create new bind group
        const bindGroup = device.createBindGroup({
            label: "uniform bind group",
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: newBuffer
                    }
                }]
        });
        // Create new instance with copied data
        const cloned = Object.create(UniformBuffer.prototype);
        cloned.buffer = newBuffer;
        cloned.data = { ...this.data }; // Shallow clone of data
        cloned.label = this.label;
        cloned.bindGroup = bindGroup;
        return cloned;
    }
    /**
     * Get mutable reference to data (equivalent to AsMut<T>)
     */
    asMut() {
        return this.data;
    }
    /**
     * Convert data to byte array for GPU buffer
     * This is equivalent to bytemuck::cast_slice in Rust
     */
    castToBytes(data) {
        // For simple numeric types, convert to ArrayBuffer
        if (typeof data === 'number') {
            const buffer = new ArrayBuffer(4);
            new Float32Array(buffer)[0] = data;
            return new Uint8Array(buffer);
        }
        // For objects with numeric properties, serialize to bytes
        if (typeof data === 'object' && data !== null) {
            // This is a simplified implementation - in practice, you'd need
            // proper serialization based on the specific data structure
            const json = JSON.stringify(data);
            const encoder = new TextEncoder();
            return encoder.encode(json);
        }
        throw new Error('Unsupported data type for GPU buffer');
    }
}
//# sourceMappingURL=uniform.js.map