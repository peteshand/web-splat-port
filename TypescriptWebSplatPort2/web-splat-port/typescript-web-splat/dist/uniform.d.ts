/**
 * TypeScript port of uniform.rs
 * Manages uniform buffers for WebGPU
 */
export interface BufferData {
}
export declare class UniformBuffer<T extends BufferData> {
    private buffer;
    private data;
    private label;
    private bindGroup;
    constructor(device: GPUDevice, data: T, label?: string);
    static newDefault<T extends BufferData>(device: GPUDevice, defaultData: T, label?: string): UniformBuffer<T>;
    static new<T extends BufferData>(device: GPUDevice, data: T, label?: string): UniformBuffer<T>;
    getBuffer(): GPUBuffer;
    getData(): T;
    getBindGroup(): GPUBindGroup;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    /**
     * Uploads data from CPU to GPU if necessary
     */
    sync(queue: GPUQueue): void;
    static bindingType(): GPUBufferBindingLayout;
    clone(device: GPUDevice, queue: GPUQueue): UniformBuffer<T>;
    /**
     * Get mutable reference to data (equivalent to AsMut<T>)
     */
    asMut(): T;
    /**
     * Convert data to byte array for GPU buffer
     * This is equivalent to bytemuck::cast_slice in Rust
     */
    private castToBytes;
}
//# sourceMappingURL=uniform.d.ts.map