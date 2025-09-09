package gs.renderer;

typedef SplattingArgs = {
  var camera:PerspectiveCamera;
  var viewport:js.lib.Float32Array; // Vec2
  var gaussianScaling:Float;
  var maxShDeg:Int;
  var showEnvMap:Bool;
  @:optional var mipSplatting:Bool;
  @:optional var kernelSize:Float;
  @:optional var clippingBox:{ var min:Vec3; var max:Vec3; };
  var walltime:Float; // seconds
  @:optional var sceneCenter:Array<Float>; // [x,y,z]
  @:optional var sceneExtend:Float;
  var backgroundColor:{ var r:Float; var g:Float; var b:Float; var a:Float; };
  var resolution:js.lib.Float32Array; // Vec2
}
