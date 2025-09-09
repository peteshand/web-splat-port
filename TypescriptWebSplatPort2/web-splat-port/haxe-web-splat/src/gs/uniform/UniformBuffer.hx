package gs.uniform;

import js.lib.ArrayBufferView;
import js.lib.Uint8Array;
import js.Syntax;

/** Simple logger gate shared across modules. */
private inline function loggingEnabled():Bool {
  return gs.camera.Internal.loggingEnabled();
}
private inline function logi(tag:String, msg:String, ?extra:Dynamic):Void {
  if (!loggingEnabled()) return;
  if (extra != null) console.log(tag + " " + msg, extra) else console.log(tag + " " + msg);
}

/** FNV-1a 64 over a view, returned as 16-char hex string. Uses JS BigInt under the hood. */
private function hashBytesU64View(v:ArrayBufferView):String {
  final u8:Uint8Array = Std.isOfType(v, Uint8Array)
    ? cast v
    : new Uint8Array(cast v.buffer, v.byteOffset, v.byteLength);

  // BigInt arithmetic via js.Syntax.code to avoid __js__ deprecation warnings.
  var h:Dynamic     = Syntax.code("0xcbf29ce484222325n");
  final prime:Dynamic = Syntax.code("0x100000001b3n");
  final mask:Dynamic  = Syntax.code("0xffffffffffffffffn");

  for (i in 0...u8.length) {
    h = Syntax.code("({0} ^ BigInt({1}))", h, u8[i]);
    h = Syntax.code("(({0} * {1}) & {2})", h, prime, mask);
  }
  var hex:String = Syntax.code("{0}.toString(16)", h);
  while (hex.length < 16) hex = "0" + hex;
  return hex;
}

/**
 * UniformBuffer<T> — WebGPU uniform-buffer helper.
 * - `createDefault` allocates zeroed storage of a given byte length.
 * - `create` uploads initial bytes from an ArrayBufferView.
 * - `sync` writes the current data view into the GPU buffer.
 * - `clone` copies the GPU contents into a new GPUBuffer + bind group.
 */
class UniformBuffer<T> {
  private var _buffer:GPUBuffer;
  private var _data:T;
  private var _label:Null<String>;
  private var _bind_group:GPUBindGroup;

  // ------------------- Factory methods -------------------

  public static function createDefault<T>(
    device:GPUDevice,
    ?label:String,
    byteLength:Int = 256
  ):UniformBuffer<T> {
    final buffer = device.createBuffer({
      label: label,
      size: byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint8Array(buffer.getMappedRange()).fill(0);
    buffer.unmap();

    final bgLabel = (label != null) ? (label + " bind group") : null;
    final bind_group = device.createBindGroup({
      label: bgLabel,
      layout: UniformBuffer.bindGroupLayout(device),
      entries: [ { binding: 0, resource: { buffer: buffer } } ]
    });

    logi("[uniform::new_default]", 'label=' + Std.string(label) + ' size=' + byteLength + ' bytes');
    return new UniformBuffer<T>(buffer, (null:Null<T>), label, bind_group);
  }

  public static function create<T: ArrayBufferView>(
    device:GPUDevice,
    data:T,
    ?label:String
  ):UniformBuffer<T> {
    final buffer = device.createBuffer({
      label: label,
      size: data.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    // Copy initial bytes
    final src = new Uint8Array(cast data.buffer, data.byteOffset, data.byteLength);
    new Uint8Array(buffer.getMappedRange()).set(src);
    buffer.unmap();

    final bgLabel = (label != null) ? (label + " bind group") : null;
    final bind_group = device.createBindGroup({
      label: bgLabel,
      layout: UniformBuffer.bindGroupLayout(device),
      entries: [ { binding: 0, resource: { buffer: buffer } } ]
    });

    logi("[uniform::new]", 'label=' + Std.string(label) + ' size=' + data.byteLength + ' bytes');
    return new UniformBuffer<T>(buffer, data, label, bind_group);
  }

  // ------------------- Instance -------------------

  private function new(
    buffer:GPUBuffer,
    data:T,
    label:Null<String>,
    bind_group:GPUBindGroup
  ) {
    this._buffer = buffer;
    this._data = data;
    this._label = label;
    this._bind_group = bind_group;
  }

  public inline function buffer():GPUBuffer return _buffer;
  public inline function data():T return _data;

  /** WebGPU layout helper (alias kept for API parity). */
  public static inline function bind_group_layout(device:GPUDevice):GPUBindGroupLayout
    return bindGroupLayout(device);

  /** WebGPU binding type helper (alias kept for API parity). */
  public static inline function binding_type():Dynamic
    return bindingType();

  /** Write current data bytes to GPU. */
  public function sync(queue:GPUQueue):Void {
    final v:Dynamic = cast _data; // we expect ArrayBufferView
    if (v == null || v.buffer == null) {
      throw 'UniformBuffer.sync(): data is not an ArrayBufferView. Provide bytes or call setData(bytes) first.';
    }

    final bytesView:Uint8Array = Std.isOfType(v, Uint8Array)
      ? cast v
      : new Uint8Array(cast v.buffer, v.byteOffset, v.byteLength);

    final hash = hashBytesU64View(bytesView);
    logi('[uniform::sync]', 'label=' + Std.string(_label) + ' size=' + bytesView.byteLength + ' hash=' + hash);

    queue.writeBuffer(_buffer, 0, cast v.buffer, v.byteOffset, v.byteLength);
  }

  /** GPU-side clone (copies contents, shares CPU-side data ref). */
  public function clone(device:GPUDevice, queue:GPUQueue):UniformBuffer<T> {
    final buffer = device.createBuffer({
      label: _label,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      size: _buffer.size,
      mappedAtCreation: false
    });

    final encoder = device.createCommandEncoder({ label: 'copy uniform buffer encode' });
    encoder.copyBufferToBuffer(_buffer, 0, buffer, 0, _buffer.size);
    queue.submit([encoder.finish()]);

    final bind_group = device.createBindGroup({
      label: 'uniform bind group',
      layout: UniformBuffer.bindGroupLayout(device),
      entries: [ { binding: 0, resource: { buffer: buffer } } ]
    });

    return new UniformBuffer<T>(buffer, _data, _label, bind_group);
  }

  public inline function bind_group():GPUBindGroup return _bind_group;

  // Small API conveniences (mirrors TS names used elsewhere)
  public inline function bufferRef():GPUBuffer return _buffer;
  public inline function dataRef():T return _data;
  public inline function getBindGroup():GPUBindGroup return _bind_group;

  public inline function setData(bytes:ArrayBufferView):Void {
    _data = cast bytes;
  }

  // ------------------- Static layout helpers -------------------

  public static function bindGroupLayout(device:GPUDevice):GPUBindGroupLayout {
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

  public static function bindingType():Dynamic {
    return {
      type: 'uniform',
      hasDynamicOffset: false
    };
  }
}
