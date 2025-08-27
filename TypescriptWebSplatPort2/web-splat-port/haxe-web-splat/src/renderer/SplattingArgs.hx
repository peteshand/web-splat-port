package renderer;

// Keep this as a typedef (not interface) to match TS structural usage
typedef SplattingArgs = {
  var camera:camera.PerspectiveCamera;
  var viewport:js.lib.Float32Array; // Vec2
  var gaussianScaling:Float;
  var maxShDeg:Int;
  var showEnvMap:Bool;
  @:optional var mipSplatting:Bool;
  @:optional var kernelSize:Float;
  @:optional var clippingBox:{ var min:pointcloud.Types.Vec3; var max:pointcloud.Types.Vec3; };
  var walltime:Float; // seconds
  @:optional var sceneCenter:Array<Float>; // [x,y,z]
  @:optional var sceneExtend:Float;
  var backgroundColor:{ var r:Float; var g:Float; var b:Float; var a:Float; };
  var resolution:js.lib.Float32Array; // Vec2
}

class SplattingArgsConst {
  public static inline var DEFAULT_KERNEL_SIZE:Float = 0.3;
}
