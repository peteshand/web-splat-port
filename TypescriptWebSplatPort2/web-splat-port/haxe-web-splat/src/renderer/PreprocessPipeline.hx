package renderer;

import uniform.UniformBuffer;
import pointcloud.PointCloud;

class PreprocessPipeline {
  var pipeline:GPUComputePipeline;
  var cameraLayout:GPUBindGroupLayout;
  var pcLayout:GPUBindGroupLayout;
  var sortPreLayout:GPUBindGroupLayout;
  var settingsLayout:GPUBindGroupLayout;

  public function new(
    cameraLayout:GPUBindGroupLayout,
    pcLayout:GPUBindGroupLayout,
    sortPreLayout:GPUBindGroupLayout,
    settingsLayout:GPUBindGroupLayout
  ) {
    this.cameraLayout = cameraLayout;
    this.pcLayout = pcLayout;
    this.sortPreLayout = sortPreLayout;
    this.settingsLayout = settingsLayout;
  }

  public static function create(
    device:GPUDevice,
    shDeg:Int,
    compressed:Bool,
    sortPreLayout:GPUBindGroupLayout
  ):Promise<PreprocessPipeline> {
    final cameraLayout = UniformBuffer.bind_group_layout(device); // group(0)
    final pcLayout = compressed
      ? PointCloud.bind_group_layout_compressed(device)           // group(1)
      : PointCloud.bind_group_layout(device);
    final settingsLayout = UniformBuffer.bind_group_layout(device); // group(3)

    final self = new PreprocessPipeline(cameraLayout, pcLayout, sortPreLayout, settingsLayout);

    final wgslPath = compressed ? './shaders/preprocess_compressed.wgsl' : './shaders/preprocess.wgsl';
    return window.fetch(wgslPath)
      .then(res -> res.text())
      .then((src:String) -> {
        // Match TS/Rust: declare MAX_SH_DEG with explicit u32 type
        final code = 'const MAX_SH_DEG : u32 = ' + (shDeg >>> 0) + 'u;\n' + src;

        final module = device.createShaderModule({ label: 'preprocess.module', code: code });

        final pipelineLayout = device.createPipelineLayout({
          label: 'preprocess.layout',
          bindGroupLayouts: [self.cameraLayout, self.pcLayout, self.sortPreLayout, self.settingsLayout]
        });

        self.pipeline = device.createComputePipeline({
          label: 'preprocess.pipeline',
          layout: pipelineLayout,
          // Match TS entry point name: 'preprocess'
          compute: { module: module, entryPoint: 'preprocess' }
        });

        renderer.Internal.logi('[preprocess::new]', 'sh_deg=' + shDeg + ', compressed=' + compressed);
        return self;
      });
  }

  public function run(
    encoder:GPUCommandEncoder,
    pc:pointcloud.PointCloud,
    cameraBG:GPUBindGroup,
    sortPreBG:GPUBindGroup,
    settingsBG:GPUBindGroup
  ):Void {
    final numPoints = pc.numPoints();
    final wgsX = Math.ceil(numPoints / 256); // workgroup size matches WGSL
    renderer.Internal.logi('[preprocess::run]', 'dispatch_x=' + wgsX + ', num_points=' + numPoints);

    final pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, cameraBG);
    pass.setBindGroup(1, pc.getBindGroup());
    pass.setBindGroup(2, sortPreBG);
    pass.setBindGroup(3, settingsBG);
    pass.dispatchWorkgroups(wgsX, 1, 1);
    pass.end();
  }
}
