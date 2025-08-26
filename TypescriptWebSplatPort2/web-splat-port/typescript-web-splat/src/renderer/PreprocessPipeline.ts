import { UniformBuffer } from '../uniform';
import { PointCloud } from '../pointcloud/PointCloud';
import { logi } from './internal';

export class PreprocessPipeline {
  private pipeline!: GPUComputePipeline;
  private cameraLayout: GPUBindGroupLayout;
  private pcLayout: GPUBindGroupLayout;
  private sortPreLayout: GPUBindGroupLayout;
  private settingsLayout: GPUBindGroupLayout;

  private constructor(
    cameraLayout: GPUBindGroupLayout,
    pcLayout: GPUBindGroupLayout,
    sortPreLayout: GPUBindGroupLayout,
    settingsLayout: GPUBindGroupLayout
  ) {
    this.cameraLayout = cameraLayout;
    this.pcLayout = pcLayout;
    this.sortPreLayout = sortPreLayout;
    this.settingsLayout = settingsLayout;
  }

  static async create(
    device: GPUDevice,
    shDeg: number,
    compressed: boolean,
    sortPreLayout: GPUBindGroupLayout
  ): Promise<PreprocessPipeline> {
    const cameraLayout = UniformBuffer.bind_group_layout(device); // group(0)
    const pcLayout = compressed
      ? PointCloud.bind_group_layout_compressed(device) // group(1)
      : PointCloud.bind_group_layout(device);
    const settingsLayout = UniformBuffer.bind_group_layout(device); // group(3)

    const self = new PreprocessPipeline(
      cameraLayout,
      pcLayout,
      sortPreLayout,
      settingsLayout
    );

    const wgslPath = compressed
      ? './shaders/preprocess_compressed.wgsl'
      : './shaders/preprocess.wgsl';
    const src = await (await fetch(wgslPath)).text();
    const code = `const MAX_SH_DEG : u32 = ${shDeg}u;\n${src}`;
    const module = device.createShaderModule({
      label: 'preprocess shader',
      code
    });

    const pipelineLayout = device.createPipelineLayout({
      label: 'preprocess pipeline layout',
      bindGroupLayouts: [
        self.cameraLayout,
        self.pcLayout,
        self.sortPreLayout,
        self.settingsLayout
      ]
    });

    self.pipeline = device.createComputePipeline({
      label: 'preprocess pipeline',
      layout: pipelineLayout,
      compute: { module, entryPoint: 'preprocess' }
    });

    logi('[preprocess::new]', `sh_deg=${shDeg}, compressed=${compressed}`);
    return self;
  }

  run(
    encoder: GPUCommandEncoder,
    pc: PointCloud,
    cameraBG: GPUBindGroup,
    sortPreBG: GPUBindGroup,
    settingsBG: GPUBindGroup
  ): void {
    const wgsX = Math.ceil(pc.numPoints() / 256);
    logi('[preprocess::run]', `dispatch_x=${wgsX}, num_points=${pc.numPoints()}`);
    const pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, cameraBG);
    pass.setBindGroup(1, pc.getBindGroup());
    pass.setBindGroup(2, sortPreBG);
    pass.setBindGroup(3, settingsBG);
    pass.dispatchWorkgroups(wgsX, 1, 1);
    pass.end();
  }
}
