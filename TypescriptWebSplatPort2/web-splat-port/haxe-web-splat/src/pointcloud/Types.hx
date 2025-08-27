package pointcloud;

typedef Vec3 = { var x:Float; var y:Float; var z:Float; };
typedef Color3 = Array<Float>; // length 3

typedef Point3f32 = { var x:Float; var y:Float; var z:Float; };
typedef Vector3f32 = { var x:Float; var y:Float; var z:Float; };

typedef Gaussian = {
  var xyz:Array<Int>;     // f16 triplet as raw 16-bit values (source)
  var opacity:Int;        // f16 (raw 16-bit)
  var cov:Array<Int>;     // 6 x f16 (raw 16-bit)
};

typedef GaussianCompressed = {
  var xyz:Int;            // f16 (packed)
  var opacity:Int;        // i8
  var scale_factor:Int;   // i8
  var geometry_idx:Int;   // u32
  var sh_idx:Int;         // u32
};

typedef Covariance3D = { var v:Array<Float>; };

// Union helpers
typedef ABOrView = haxe.extern.EitherType<ArrayBuffer, ArrayBufferView>;
typedef QuantViewOrStruct = haxe.extern.EitherType<ArrayBufferView, pointcloud.Quantization.GaussianQuantization>;

interface GenericGaussianPointCloud {
  public var num_points:Int;
  public var sh_deg:Int;
  public function compressed():Bool;

  public function gaussian_buffer():ABOrView;     // 3D gaussian source buffer
  public function sh_coefs_buffer():ABOrView;     // SH buffer

  // only for compressed:
  public var covars:Null<ABOrView>;                                 // covariance blocks
  public var quantization:Null<QuantViewOrStruct>;                   // bytes or struct

  public var aabb:{ var min:Vec3; var max:Vec3; };
  public var center:Vec3;
  public var up:Null<Vec3>;
  public var mip_splatting:Null<Bool>;
  public var kernel_size:Null<Float>;
  public var background_color:Null<Color3>;
}
