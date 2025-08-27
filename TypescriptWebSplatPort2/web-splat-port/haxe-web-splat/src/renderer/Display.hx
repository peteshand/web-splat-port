package renderer;

typedef RenderTarget = { view:GPUTextureView, bindGroup:GPUBindGroup };

class Display {
  var pipeline:GPURenderPipeline;
  var bindGroup:GPUBindGroup;
  var format:GPUTextureFormat;
  var view:GPUTextureView;
  var envBg:GPUBindGroup;
  var hasEnvMap:Bool;

  public function new(pipeline:GPURenderPipeline, format:GPUTextureFormat, view:GPUTextureView, bindGroup:GPUBindGroup, envBg:GPUBindGroup) {
    this.pipeline  = pipeline;
    this.format    = format;
    this.view      = view;
    this.bindGroup = bindGroup;
    this.envBg     = envBg;
    hasEnvMap      = false;
  }

  static function envMapBindGroupLayout(device:GPUDevice):GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'display.env.layout',
      entries: [
        { // binding 0: texture
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        { // binding 1: sampler
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' }
        }
      ]
    });
  }

  static function bindGroupLayout(device:GPUDevice):GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'display.blit.layout',
      entries: [
        { // binding 0: texture
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        { // binding 1: sampler
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' }
        }
      ]
    });
  }

  static function createEnvMapBg(device:GPUDevice, envTexture:Null<GPUTextureView>):GPUBindGroup {
    final placeholderView = device.createTexture({
      label: 'display.env.placeholder',
      format: 'rgba16float',
      // cast to the strict type expected by the externs
      size: (cast { width: 1, height: 1 } : webgpu.GPUExtent3DStrict),
      usage: GPUTextureUsage.TEXTURE_BINDING
    }).createView();

    final textureView = envTexture != null ? envTexture : placeholderView;
    final sampler = device.createSampler({
      label: 'display.env.sampler',
      magFilter: 'linear',
      minFilter: 'linear'
    });

    final layout = envMapBindGroupLayout(device);
    return device.createBindGroup({
      label: 'display.env.bg',
      layout: layout,
      entries: [
        { binding: 0, resource: textureView }, // texture first
        { binding: 1, resource: sampler }      // sampler second
      ]
    });
  }

  static function createRenderTarget(device:GPUDevice, sourceFormat:GPUTextureFormat, width:Int, height:Int):RenderTarget {
    final texture = device.createTexture({
      label: 'display.render.tex',
      format: sourceFormat,
      size: (cast { width: width, height: height } : webgpu.GPUExtent3DStrict),
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    final textureView = texture.createView();
    final sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  
    final layout = bindGroupLayout(device);
    final bindGroup = device.createBindGroup({
      label: 'display.blit.bg',
      layout: layout,
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
  
    return { view: textureView, bindGroup: bindGroup };
  }

  public static function create(
    device:GPUDevice,
    sourceFormat:GPUTextureFormat, // offscreen linear render target (e.g. 'rgba16float' or 'rgba8unorm')
    targetFormat:GPUTextureFormat, // swapchain/deSRGB(surface_format)
    width:Int,
    height:Int
  ):Promise<Display> {
    return window.fetch('./shaders/display.wgsl')
      .then(function(res) return res.text())
      .then(function(code) {
        var module = device.createShaderModule({ label: 'display.module', code: code });
  
        var pipeline = device.createRenderPipeline({
          label: 'display.pipeline',
          layout: device.createPipelineLayout({
            label: 'display.pipeline.layout',
            bindGroupLayouts: [
              bindGroupLayout(device),                // 0: source (texture+sampler)
              envMapBindGroupLayout(device),          // 1: env (texture+sampler)
              UniformBuffer.bind_group_layout(device),// 2: camera
              UniformBuffer.bind_group_layout(device) // 3: render settings
            ]
          }),
          vertex:   { module: module, entryPoint: 'vs_main' },
          fragment: {
            module: module,
            entryPoint: 'fs_main',
            targets: [{ format: targetFormat /* blend/writeMask if needed */ }]
          },
          primitive: { topology: 'triangle-strip' }
        });
  
        var envBg = createEnvMapBg(device, null);
        var rt = createRenderTarget(device, sourceFormat, width, height);
        renderer.Internal.logi('[display::new]', 'render_target ' + width + 'x' + height + ' format=' + sourceFormat);
        return new Display(pipeline, sourceFormat, rt.view, rt.bindGroup, envBg);
      });
  }

  public inline function texture():GPUTextureView return view;

  public function setEnvMap(device:GPUDevice, envTexture:Null<GPUTextureView>) {
    envBg = createEnvMapBg(device, envTexture);
    hasEnvMap = envTexture != null;
    renderer.Internal.logi('[display]', 'set_env_map present=' + Std.string(hasEnvMap));
  }

  public inline function hasEnvMapSet():Bool return hasEnvMap;

  public function resize(device:GPUDevice, width:Int, height:Int) {
    var rt = createRenderTarget(device, format, width, height);
    bindGroup = rt.bindGroup;
    view = rt.view;
    renderer.Internal.logi('[display]', 'resize to ' + width + 'x' + height);
  }

  public function render(encoder:GPUCommandEncoder, viewRgb:GPUTextureView, backgroundColor:GPUColor, camera:GPUBindGroup, renderSettings:GPUBindGroup) {
    var pass = encoder.beginRenderPass({
      label: 'display.render.pass',
      colorAttachments: [{
        view: viewRgb,
        clearValue: backgroundColor,
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    pass.setBindGroup(0, bindGroup);
    pass.setBindGroup(1, envBg);
    pass.setBindGroup(2, camera);
    pass.setBindGroup(3, renderSettings);
    pass.setPipeline(pipeline);
    pass.draw(4, 1);
    pass.end();
  }
}
