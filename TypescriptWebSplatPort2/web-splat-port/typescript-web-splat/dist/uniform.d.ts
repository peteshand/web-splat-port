export declare class UniformBuffer<T = ArrayBufferView> {
    private _buffer;
    private _data;
    private _label?;
    private _bind_group;
    static newDefault<T = ArrayBufferView>(device: GPUDevice, label?: string, byteLength?: number): UniformBuffer<T>;
    static new<T extends ArrayBufferView>(device: GPUDevice, data: T, label?: string): UniformBuffer<T>;
    private constructor();
    buffer(): GPUBuffer;
    data(): T;
    static bind_group_layout(device: GPUDevice): GPUBindGroupLayout;
    static binding_type(): GPUBufferBindingLayout;
    sync(queue: GPUQueue): void;
    clone(device: GPUDevice, queue: GPUQueue): UniformBuffer<T>;
    bind_group(): GPUBindGroup;
    bufferRef(): GPUBuffer;
    dataRef(): T;
    getBindGroup(): GPUBindGroup;
    setData(bytes: ArrayBufferView): void;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    static bindingType(): GPUBufferBindingLayout;
}
//# sourceMappingURL=uniform.d.ts.map