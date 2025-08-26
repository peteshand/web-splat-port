import { UniformBuffer } from '../uniform';
import { logi } from './internal';

export class Display {
  private pipeline: GPURenderPipeline;
  private bindGroup: GPUBindGroup;
  private format: GPUTextureFormat;
  private view: GPUTextureView;
  private envBg: GPUBindGroup;
  private hasEnvMap: boolean;

  private constructor(
    pipeline: GPURenderPipeline,
    format: GPUTextureFormat,
    view: GPUTextureView,
    bindGroup: GPUBindGroup,
    envBg: GPUBindGroup
  ) {
    this.pipeline = pipeline;
    this.format = format;
    this.view = view;
    this.bindGroup = bindGroup;
    this.envBg = envBg;
    this.hasEnvMap = false;
  }

  static envMapBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'env map bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' }
        }
      ]
    });
  }

  static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      label: 'display bind group layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float', viewDimension: '2d' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' }
        }
      ]
    });
  }

  static createEnvMapBg(
    device: GPUDevice,
    envTexture: GPUTextureView | null
  ): GPUBindGroup {
    const placeholderTexture = device
      .createTexture({
        label: 'placeholder',
        size: { width: 1, height: 1 },
        format: 'rgba16float',
        usage: GPUTextureUsage.TEXTURE_BINDING
      })
      .createView();
    const textureView = envTexture ?? placeholderTexture;
    const sampler = device.createSampler({
      label: 'env map sampler',
      magFilter: 'linear',
      minFilter: 'linear'
    });
    return device.createBindGroup({
      label: 'env map bind group',
      layout: Display.envMapBindGroupLayout(device),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
  }

  static createRenderTarget(
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number
  ): [GPUTextureView, GPUBindGroup] {
    const texture = device.createTexture({
      label: 'display render image',
      size: { width, height },
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const textureView = texture.createView();
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    const bindGroup = device.createBindGroup({
      label: 'render target bind group',
      layout: Display.bindGroupLayout(device),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
    return [textureView, bindGroup];
  }

  static async create(
    device: GPUDevice,
    sourceFormat: GPUTextureFormat,
    targetFormat: GPUTextureFormat,
    width: number,
    height: number
  ): Promise<Display> {
    const pipelineLayout = device.createPipelineLayout({
      label: 'display pipeline layout',
      bindGroupLayouts: [
        Display.bindGroupLayout(device),
        Display.envMapBindGroupLayout(device),
        UniformBuffer.bind_group_layout(device),
        UniformBuffer.bind_group_layout(device)
      ]
    });

    const displaySrc = await (await fetch('./shaders/display.wgsl')).text();
    const module = device.createShaderModule({
      label: 'display shader',
      code: displaySrc
    });

    const pipeline = device.createRenderPipeline({
      label: 'display pipeline',
      layout: pipelineLayout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [
          {
            format: targetFormat,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            },
            writeMask: GPUColorWrite.ALL
          }
        ]
      },
      primitive: { topology: 'triangle-strip' }
    });

    const envBg = Display.createEnvMapBg(device, null);
    const [view, bindGroup] = Display.createRenderTarget(
      device,
      sourceFormat,
      width,
      height
    );
    logi('[display::new]', `render_target ${width}x${height} format=${sourceFormat}`);
    return new Display(pipeline, sourceFormat, view, bindGroup, envBg);
  }

  texture(): GPUTextureView {
    return this.view;
  }

  setEnvMap(device: GPUDevice, envTexture: GPUTextureView | null): void {
    this.envBg = Display.createEnvMapBg(device, envTexture);
    this.hasEnvMap = envTexture !== null;
    logi('[display]', `set_env_map present=${this.hasEnvMap}`);
  }

  hasEnvMapSet(): boolean {
    return this.hasEnvMap;
  }

  resize(device: GPUDevice, width: number, height: number): void {
    const [view, bindGroup] = Display.createRenderTarget(
      device,
      this.format,
      width,
      height
    );
    this.bindGroup = bindGroup;
    this.view = view;
    logi('[display]', `resize to ${width}x${height}`);
  }

  render(
    encoder: GPUCommandEncoder,
    target: GPUTextureView,
    backgroundColor: GPUColor,
    camera: GPUBindGroup,
    renderSettings: GPUBindGroup
  ): void {
    const pass = encoder.beginRenderPass({
      label: 'render pass',
      colorAttachments: [
        {
          view: target,
          clearValue: backgroundColor,
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    });
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, this.envBg);
    pass.setBindGroup(2, camera);
    pass.setBindGroup(3, renderSettings);
    pass.setPipeline(this.pipeline);
    pass.draw(4, 1);
    pass.end();
  }
}
