// uniform.ts

function logi(tag: string, msg: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`${tag} ${msg}`, extra);
  } else {
    console.log(`${tag} ${msg}`);
  }
}

// FNV-1a 64-bit
function hashBytesU64View(v: ArrayBufferView): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const u8 = v instanceof Uint8Array ? v : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  for (let i = 0; i < u8.length; i++) {
    h ^= BigInt(u8[i]);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

export class UniformBuffer<T = ArrayBufferView> {
  private _buffer: GPUBuffer;
  private _data: T;
  private _label?: string;
  private _bind_group: GPUBindGroup;

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

    logi('[uniform::new_default]', `label=${String(label)} size=${byteLength} bytes`);

    return new UniformBuffer<T>(buffer, (undefined as unknown as T), label, bind_group);
  }

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

    logi('[uniform::new]', `label=${String(label)} size=${data.byteLength} bytes`);

    return new UniformBuffer<T>(buffer, data, label, bind_group);
  }

  private constructor(buffer: GPUBuffer, data: T, label: string | undefined, bind_group: GPUBindGroup) {
    this._buffer = buffer;
    this._data = data;
    this._label = label;
    this._bind_group = bind_group;
  }

  buffer(): GPUBuffer {
    return this._buffer;
  }
  data(): T {
    return this._data;
  }

  static bind_group_layout(device: GPUDevice): GPUBindGroupLayout {
    return this.bindGroupLayout(device);
  }
  static binding_type(): GPUBufferBindingLayout {
    return this.bindingType();
  }

  sync(queue: GPUQueue): void {
    const v = this._data as unknown as ArrayBufferView;
    if (!v || !(v.buffer instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && v.buffer instanceof SharedArrayBuffer))) {
      throw new Error('UniformBuffer.sync(): data is not an ArrayBufferView. Provide bytes or use setData(bytes) first.');
    }

    const bytesView = v instanceof Uint8Array ? v : new Uint8Array(v.buffer as ArrayBuffer, v.byteOffset, v.byteLength);
    const hash = hashBytesU64View(bytesView);
    logi('[uniform::sync]', `label=${String(this._label)} size=${bytesView.byteLength} hash=${hash}`);

    queue.writeBuffer(this._buffer, 0, v.buffer as ArrayBuffer, v.byteOffset, v.byteLength);
  }

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

  bind_group(): GPUBindGroup {
    return this._bind_group;
  }

  bufferRef(): GPUBuffer {
    return this._buffer;
  }
  dataRef(): T {
    return this._data;
  }
  getBindGroup(): GPUBindGroup {
    return this._bind_group;
  }

  setData(bytes: ArrayBufferView): void {
    this._data = bytes as unknown as T;
  }

  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'uniform bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: UniformBuffer.bindingType()
        }
      ]
    });
  }

  static bindingType(): GPUBufferBindingLayout {
    return {
      type: 'uniform',
      hasDynamicOffset: false
    };
  }
}
