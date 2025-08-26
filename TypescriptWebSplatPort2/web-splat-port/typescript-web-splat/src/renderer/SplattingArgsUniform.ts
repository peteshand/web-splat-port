import { vec4 } from 'gl-matrix';
import { PointCloud } from '../pointcloud/PointCloud';
import { SplattingArgs, DEFAULT_KERNEL_SIZE } from './SplattingArgs';

export class SplattingArgsUniform {
  public clippingBoxMin: vec4;
  public clippingBoxMax: vec4;
  public gaussianScaling: number;
  public maxShDeg: number;
  public showEnvMap: number;
  public mipSplatting: number;

  public kernelSize: number;
  public walltime: number;
  public sceneExtend: number;
  public _pad: number;

  public sceneCenter: vec4;

  constructor() {
    this.gaussianScaling = 1.0;
    this.maxShDeg = 3;
    this.showEnvMap = 1;
    this.mipSplatting = 0;

    this.kernelSize = DEFAULT_KERNEL_SIZE;
    this.walltime = 0.0;
    this.sceneExtend = 1.0;
    this._pad = 0;

    this.clippingBoxMin = vec4.fromValues(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      0.0
    );
    this.clippingBoxMax = vec4.fromValues(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      0.0
    );
    this.sceneCenter = vec4.fromValues(0, 0, 0, 0);
  }

  static fromArgsAndPc(args: SplattingArgs, pc: PointCloud): SplattingArgsUniform {
    const u = new SplattingArgsUniform();
    u.gaussianScaling = args.gaussianScaling;
    u.maxShDeg = args.maxShDeg;
    u.showEnvMap = args.showEnvMap ? 1 : 0;

    const pcMip = pc.mipSplatting() ?? false;
    u.mipSplatting = (args.mipSplatting ?? pcMip) ? 1 : 0;

    const pcKernel = pc.dilationKernelSize() ?? DEFAULT_KERNEL_SIZE;
    u.kernelSize = args.kernelSize ?? pcKernel;

    const bbox = pc.bbox();
    const clip = (args.clippingBox ?? bbox) as any;
    vec4.set(u.clippingBoxMin, clip.min.x, clip.min.y, clip.min.z, 0.0);
    vec4.set(u.clippingBoxMax, clip.max.x, clip.max.y, clip.max.z, 0.0);

    u.walltime = args.walltime;

    const c = pc.center();
    vec4.set(u.sceneCenter, c.x, c.y, c.z, 0.0);

    const minExtend = bbox.radius();
    u.sceneExtend = Math.max(args.sceneExtend ?? minExtend, minExtend);

    return u;
  }
}
