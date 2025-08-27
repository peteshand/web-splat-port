package renderer;

import renderer.Internal;

class PreprocessPipeline {
  var pipeline:GPUComputePipeline;
  var cameraLayout:GPUBindGroupLayout;
  var pcLayout:GPUBindGroupLayout;
  var sortPreLayout:GPUBindGroupLayout;
  var settingsLayout:GPUBindGroupLayout;

  public function new(cameraLayout:GPUBindGroupLayout, pcLayout:GPUBindGroupLayout, sortPreLayout:GPUBindGroupLayout, settingsLayout:GPUBindGroupLayout) {
    this.cameraLayout = cameraLayout;
    this.pcLayout = pcLayout;
    this.sortPreLayout = sortPreLayout;
    this.settingsLayout = settingsLayout;
  }

  public static function create(device:GPUDevice, shDeg:Int, compressed:Bool, sortPreLayout:GPUBindGroupLayout):Promise<PreprocessPipeline> {
    var cameraLayout = UniformBuffer.bind_group_layout(device); // group(0)
    var pcLayout = compressed ? pointcloud.PointCloud.bind_group_layout_compressed(device) : pointcloud.PointCloud.bind_group_layout(device); // group(1)
    var settingsLayout = UniformBuffer.bind_group_layout(device); // group(3)

    var self = new PreprocessPipeline(cameraLayout, pcLayout, sortPreLayout, settingsLayout);

    var wgslPath = compressed ? './shaders/preprocess_compressed.wgsl' : './shaders/preprocess.wgsl';
    return window.fetch(wgslPath)
      .then(function(res) return res.text())
      .then(function(src:String) {
        var code = 'const MAX_SH_DEG = ' + shDeg + 'u;\n' + src;
        var module = device.createShaderModule({ label: 'preprocess.module', code: code });
        var pipelineLayout = device.createPipelineLayout({
          label: 'preprocess.layout',
          bindGroupLayouts: [cameraLayout, pcLayout, sortPreLayout, settingsLayout]
        });
        self.pipeline = device.createComputePipeline({
          label: 'preprocess.pipeline',
          layout: pipelineLayout,
          compute: { module: module, entryPoint: 'main' }
        });
        renderer.Internal.logi('[preprocess::new]', 'sh_deg=' + shDeg + ', compressed=' + compressed);
        return self;
      });
  }

  public function run(encoder:GPUCommandEncoder, pc:pointcloud.PointCloud, cameraBG:GPUBindGroup, sortPreBG:GPUBindGroup, settingsBG:GPUBindGroup) {
    var numPoints = pc.numPoints();
    var wgsX = Math.ceil(numPoints / 256); // workgroup size matches WGSL
    renderer.Internal.logi('[preprocess::run]', 'dispatch_x=' + wgsX + ', num_points=' + numPoints);
    var pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, cameraBG);
    pass.setBindGroup(1, pc.getBindGroup());
    pass.setBindGroup(2, sortPreBG);
    pass.setBindGroup(3, settingsBG);
    pass.dispatchWorkgroups(wgsX, 1, 1);
    pass.end();
  }
}
