package lib;

typedef SurfaceConfiguration = {
  var format: GPUTextureFormat;
  var width: Int;
  var height: Int;
  var present_mode: String; // 'auto' | 'auto-vsync' | 'auto-no-vsync'
  var alpha_mode: GPUCanvasAlphaMode;
  var view_formats: Array<GPUTextureFormat>;
}
