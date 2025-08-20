// uniform.ts
// 1:1 port of uniform.rs for WebGPU (browser/wasm)

export class UniformBuffer<T = ArrayBufferView> {
    private _buffer: GPUBuffer;
    private _data: T;
    private _label?: string;
    private _bind_group: GPUBindGroup;
  
    // ---- new_default ----
    static newDefault<T = ArrayBufferView>(
      device: GPUDevice,
      label?: string,
      byteLength: number = 256
    ): UniformBuffer<T> {
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
      return new UniformBuffer<T>(buffer, (undefined as unknown as T), label, bind_group);
    }
  
    // ---- new ----
    static new<T extends ArrayBufferView>(
      device: GPUDevice,
      data: T,
      label?: string
    ): UniformBuffer<T> {
      const buffer = device.createBuffer({
        label,
        size: data.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      new Uint8Array(buffer.getMappedRange()).set(
        new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
      );
      buffer.unmap();
  
      const bgLabel = label ? `${label} bind group` : undefined;
      const bind_group = device.createBindGroup({
        label: bgLabel,
        layout: UniformBuffer.bindGroupLayout(device),
        entries: [{ binding: 0, resource: { buffer } }]
      });
  
      return new UniformBuffer<T>(buffer, data, label, bind_group);
    }
  
    private constructor(buffer: GPUBuffer, data: T, label: string | undefined, bind_group: GPUBindGroup) {
      this._buffer = buffer;
      this._data = data;
      this._label = label;
      this._bind_group = bind_group;
    }
  
    /* ----------------------------- Rust-style API ----------------------------- */
  
    // buffer(&self) -> &wgpu::Buffer
    buffer(): GPUBuffer { return this._buffer; }
    // data(&self) -> &T
    data(): T { return this._data; }
  
    // pub fn bind_group_layout(device: &Device) -> BindGroupLayout
    static bind_group_layout(device: GPUDevice): GPUBindGroupLayout {
      return this.bindGroupLayout(device);
    }
    // pub fn binding_type() -> BindingType
    static binding_type(): GPUBufferBindingLayout {
      return this.bindingType();
    }
  
    // pub fn sync(&mut self, queue: &Queue)
    sync(queue: GPUQueue): void {
      const v = this._data as unknown as ArrayBufferView;
      if (!v || !(v.buffer instanceof ArrayBuffer || typeof SharedArrayBuffer !== 'undefined' && v.buffer instanceof SharedArrayBuffer)) {
        throw new Error('UniformBuffer.sync(): data is not an ArrayBufferView. Provide bytes or use setData(bytes) first.');
      }
      // Use the ArrayBuffer overload to satisfy lib.dom WebGPU types
      queue.writeBuffer(this._buffer, 0, v.buffer as ArrayBuffer, v.byteOffset, v.byteLength);
    }
  
    // pub fn clone(&self, device: &Device, queue: &Queue) -> Self
    clone(device: GPUDevice, queue: GPUQueue): UniformBuffer<T> {
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
  
      return new UniformBuffer<T>(buffer, this._data, this._label, bind_group);
    }
  
    // pub fn bind_group(&self) -> &wgpu::BindGroup
    bind_group(): GPUBindGroup { return this._bind_group; }
  
    /* --------------------------- TS-friendly aliases -------------------------- */
  
    bufferRef(): GPUBuffer { return this._buffer; }
    dataRef(): T { return this._data; }
    getBindGroup(): GPUBindGroup { return this._bind_group; }
  
    setData(bytes: ArrayBufferView): void {
      this._data = bytes as unknown as T;
    }
  
    /* --------------------------- Layout helpers (TS) -------------------------- */
  
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
      return device.createBindGroupLayout({
        label: 'uniform bind group layout',
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: UniformBuffer.bindingType()
        }]
      });
    }
  
    static bindingType(): GPUBufferBindingLayout {
      return {
        type: 'uniform',
        hasDynamicOffset: false
        // minBindingSize: can be set if you want strict validation
      };
    }
  }
  