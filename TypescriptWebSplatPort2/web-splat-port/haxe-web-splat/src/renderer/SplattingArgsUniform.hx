package renderer;

class SplattingArgsUniform {
  public var clippingBoxMin:js.lib.Float32Array; // Vec4
  public var clippingBoxMax:js.lib.Float32Array; // Vec4
  public var gaussianScaling:Float;
  public var maxShDeg:Int;
  public var showEnvMap:Int;
  public var mipSplatting:Int;

  public var kernelSize:Float;
  public var walltime:Float;
  public var sceneExtend:Float;
  public var _pad:Int;

  public var sceneCenter:js.lib.Float32Array; // Vec4

  public function new() {
    gaussianScaling = 1.0;
    maxShDeg = 3;
    showEnvMap = 1;
    mipSplatting = 0;

    kernelSize = SplattingArgsConst.DEFAULT_KERNEL_SIZE;
    walltime = 0.0;
    sceneExtend = 1.0;
    _pad = 0;

    clippingBoxMin = Vec4.fromValues(
      Math.NEGATIVE_INFINITY,
      Math.NEGATIVE_INFINITY,
      Math.NEGATIVE_INFINITY,
      0.0
    );
    clippingBoxMax = Vec4.fromValues(
      Math.POSITIVE_INFINITY,
      Math.POSITIVE_INFINITY,
      Math.POSITIVE_INFINITY,
      0.0
    );
    sceneCenter = Vec4.fromValues(0, 0, 0, 0);
  }

  public static function fromArgsAndPc(args:renderer.SplattingArgs, pc:pointcloud.PointCloud):SplattingArgsUniform {
    var u = new SplattingArgsUniform();
    u.gaussianScaling = args.gaussianScaling;
    u.maxShDeg = args.maxShDeg;
    u.showEnvMap = args.showEnvMap ? 1 : 0;

    var pcMip = pc.mipSplatting();
    var useMip = (args.mipSplatting != null ? args.mipSplatting : (pcMip != null ? pcMip : false));
    u.mipSplatting = useMip ? 1 : 0;

    var pcKernel = (pc.dilationKernelSize() != null ? pc.dilationKernelSize() : SplattingArgsConst.DEFAULT_KERNEL_SIZE);
    u.kernelSize = (args.kernelSize != null ? args.kernelSize : pcKernel);

    var bbox = pc.bbox();
    var clip = (args.clippingBox != null) ? args.clippingBox : { min: bbox.min, max: bbox.max };
    Vec4.set(u.clippingBoxMin, clip.min.x, clip.min.y, clip.min.z, 0.0);
    Vec4.set(u.clippingBoxMax, clip.max.x, clip.max.y, clip.max.z, 0.0);

    u.walltime = args.walltime;

    var c = pc.center();
    Vec4.set(u.sceneCenter, c.x, c.y, c.z, 0.0);

    var minExtend = bbox.radius();
    var wantExtend = (args.sceneExtend != null ? args.sceneExtend : minExtend);
    u.sceneExtend = Math.max(wantExtend, minExtend);

    return u;
  }
}
