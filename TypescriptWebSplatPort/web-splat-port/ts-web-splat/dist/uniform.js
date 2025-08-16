export class UniformBuffer {
    buffer;
    data;
    label;
    bindGroup;
    constructor(device, data, label) {
        this.data = data;
        this.label = label;
        // Create buffer with data
        const dataArray = new Uint8Array(this.getByteLength());
        this.writeDataToArray(dataArray, data);
        this.buffer = device.createBuffer({
            label: label,
            size: dataArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Uint8Array(this.buffer.getMappedRange()).set(dataArray);
        this.buffer.unmap();
        // Create bind group
        const bgLabel = label ? `${label} bind group` : undefined;
        this.bindGroup = device.createBindGroup({
            label: bgLabel,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: { buffer: this.buffer }
                }]
        });
    }
    static newDefault(device, defaultValue, label) {
        return new UniformBuffer(device, defaultValue, label);
    }
    getBuffer() {
        return this.buffer;
    }
    getData() {
        return this.data;
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
                        minBindingSize: undefined, // Will be set based on data size
                    }
                }]
        });
    }
    // Upload data from CPU to GPU if necessary
    sync(queue) {
        const dataArray = new Uint8Array(this.getByteLength());
        this.writeDataToArray(dataArray, this.data);
        queue.writeBuffer(this.buffer, 0, dataArray);
    }
    static bindingType() {
        return {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: undefined,
        };
    }
    clone(device, queue) {
        const newBuffer = device.createBuffer({
            label: this.label,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: this.buffer.size,
            mappedAtCreation: false,
        });
        const encoder = device.createCommandEncoder({
            label: "copy uniform buffer encode"
        });
        encoder.copyBufferToBuffer(this.buffer, 0, newBuffer, 0, this.buffer.size);
        queue.submit([encoder.finish()]);
        const bindGroup = device.createBindGroup({
            label: "uniform bind group",
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: { buffer: newBuffer }
                }]
        });
        const cloned = Object.create(UniformBuffer.prototype);
        cloned.buffer = newBuffer;
        cloned.data = this.data; // Shallow copy - assumes T is copyable
        cloned.label = this.label;
        cloned.bindGroup = bindGroup;
        return cloned;
    }
    getBindGroup() {
        return this.bindGroup;
    }
    // Mutable access to data
    asMut() {
        return this.data;
    }
    // Helper methods for data serialization - matches Rust bytemuck behavior
    getByteLength() {
        if (typeof this.data === 'object' && this.data !== null) {
            // Calculate size based on object properties (similar to Rust mem::size_of)
            let size = 0;
            for (const [key, value] of Object.entries(this.data)) {
                if (typeof value === 'number') {
                    size += 4; // f32 or u32
                }
                else if (Array.isArray(value)) {
                    size += value.length * 4; // Array of f32/u32
                }
                else if (value && typeof value === 'object') {
                    // Nested object - recursively calculate
                    size += this.calculateObjectSize(value);
                }
            }
            // Align to 16-byte boundary for uniform buffer requirements
            return Math.ceil(size / 16) * 16;
        }
        return 16; // Minimum uniform buffer size
    }
    calculateObjectSize(obj) {
        let size = 0;
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'number') {
                size += 4;
            }
            else if (Array.isArray(value)) {
                size += value.length * 4;
            }
            else if (value && typeof value === 'object') {
                size += this.calculateObjectSize(value);
            }
        }
        return size;
    }
    writeDataToArray(array, data) {
        const view = new DataView(array.buffer);
        let offset = 0;
        if (typeof data === 'number') {
            view.setFloat32(offset, data, true);
        }
        else if (typeof data === 'object' && data !== null) {
            offset = this.writeObjectToView(view, data, offset);
        }
    }
    writeObjectToView(view, obj, offset) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'number') {
                view.setFloat32(offset, value, true);
                offset += 4;
            }
            else if (Array.isArray(value)) {
                for (const item of value) {
                    if (typeof item === 'number') {
                        view.setFloat32(offset, item, true);
                        offset += 4;
                    }
                }
            }
            else if (value && typeof value === 'object') {
                offset = this.writeObjectToView(view, value, offset);
            }
        }
        return offset;
    }
}
