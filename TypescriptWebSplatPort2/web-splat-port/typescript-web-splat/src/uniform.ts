/**
 * TypeScript port of uniform.rs
 * Manages uniform buffers for WebGPU
 */

// Type constraints equivalent to Rust's NoUninit + Pod
export interface BufferData {
    // Data that can be safely cast to bytes for GPU buffers
}

export class UniformBuffer<T extends BufferData> {
    private buffer: GPUBuffer;
    private data: T;
    private label: string | null;
    private bindGroup: GPUBindGroup;

    constructor(
        device: GPUDevice,
        data: T,
        label?: string
    ) {
        this.data = data;
        this.label = label || null;

        // Create buffer with data
        const dataArray = this.castToBytes(data);
        this.buffer = device.createBuffer({
            label: label,
            size: dataArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // Write initial data
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

    static newDefault<T extends BufferData>(
        device: GPUDevice,
        defaultData: T,
        label?: string
    ): UniformBuffer<T> {
        return new UniformBuffer(device, defaultData, label);
    }

    static new<T extends BufferData>(
        device: GPUDevice,
        data: T,
        label?: string
    ): UniformBuffer<T> {
        return new UniformBuffer(device, data, label);
    }

    getBuffer(): GPUBuffer {
        return this.buffer;
    }

    getData(): T {
        return this.data;
    }

    getBindGroup(): GPUBindGroup {
        return this.bindGroup;
    }

    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
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
    sync(queue: GPUQueue): void {
        // For now, we'll use a simplified approach
        // In a full implementation, this would serialize the data properly
        const data = new ArrayBuffer(256); // Placeholder size
        queue.writeBuffer(this.buffer, 0, data);
    }

    static bindingType(): GPUBufferBindingLayout {
        return {
            type: "uniform" as const,
            hasDynamicOffset: false,
            minBindingSize: undefined
        };
    }

    clone(device: GPUDevice, queue: GPUQueue): UniformBuffer<T> {
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
        encoder.copyBufferToBuffer(
            this.buffer, 0,
            newBuffer, 0,
            this.buffer.size
        );
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
    asMut(): T {
        return this.data;
    }

    /**
     * Convert data to byte array for GPU buffer
     * This is equivalent to bytemuck::cast_slice in Rust
     */
    private castToBytes(data: T): Uint8Array {
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
