package pointcloud;

typedef LayoutCache = {
  var plain:GPUBindGroupLayout;
  var compressed:GPUBindGroupLayout;
  var render:GPUBindGroupLayout;
};

class Layout {
  static var LAYOUTS:Map<GPUDevice, LayoutCache> = new Map();

  public static function getLayouts(device:GPUDevice):LayoutCache {
    var cached = LAYOUTS.get(device);
    if (cached != null) return cached;

    // plain (preprocess)
    var plain = device.createBindGroupLayout({
      label: 'pc.layout.plain',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
    });

    // compressed (preprocess)
    var compressed = device.createBindGroupLayout({
      label: 'pc.layout.compressed',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
    });

    // render (must be visible to VERTEX, because vs_main uses @group(0)@binding(2))
    var render = device.createBindGroupLayout({
      label: 'pc.layout.render',
      entries: [
        // NOTE: mirror TS: VERTEX | COMPUTE (compute is harmless; VERTEX is required)
        { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
      ]
    });

    var l:LayoutCache = { plain: plain, compressed: compressed, render: render };
    LAYOUTS.set(device, l);
    console.log('[pointcloud] getLayouts(): created new layouts');
    return l;
  }
}
