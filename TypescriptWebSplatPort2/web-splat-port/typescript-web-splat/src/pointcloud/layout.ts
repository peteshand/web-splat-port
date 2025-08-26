/* ------------------------------ layout cache ------------------------------ */
type LayoutCache = {
  plain: GPUBindGroupLayout;
  compressed: GPUBindGroupLayout;
  render: GPUBindGroupLayout;
};
const LAYOUTS = new WeakMap<GPUDevice, LayoutCache>();

export function getLayouts(device: GPUDevice): LayoutCache {
  let l = LAYOUTS.get(device);
  if (l) return l;

  const plain = device.createBindGroupLayout({
    label: 'point cloud float bind group layout',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ]
  });

  const compressed = device.createBindGroupLayout({
    label: 'point cloud bind group layout (compressed)',
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ]
  });

  const render = device.createBindGroupLayout({
    label: 'point cloud rendering bind group layout',
    entries: [
      { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }
    ]
  });

  l = { plain, compressed, render };
  LAYOUTS.set(device, l);
  console.log('[pointcloud] getLayouts(): created new layouts');
  return l;
}
