export type SurfaceConfiguration = {
  format: GPUTextureFormat;
  width: number;
  height: number;
  present_mode: 'auto' | 'auto-vsync' | 'auto-no-vsync';
  alpha_mode: GPUCanvasAlphaMode;
  view_formats: GPUTextureFormat[];
};
