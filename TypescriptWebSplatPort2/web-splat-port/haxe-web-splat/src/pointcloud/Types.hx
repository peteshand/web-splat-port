package pointcloud;

import js.lib.ArrayBuffer;
import js.lib.ArrayBufferView;
import haxe.extern.EitherType;

/** Simple vector/tuple shapes (TS parity) */
typedef Vec3 = { var x:Float; var y:Float; var z:Float; };
typedef Color3 = Array<Float>; // [r,g,b]

typedef Point3f32  = { var x:Float; var y:Float; var z:Float; };
typedef Vector3f32 = { var x:Float; var y:Float; var z:Float; };

/** Uncompressed Gaussian (TS parity) */
typedef Gaussian = {
  var xyz: Point3f32;          // f16 in source; exposed as floats here (TS parity)
  var opacity: Float;          // f16 → float
  var cov: Array<Float>;       // 6x f16 → float[6]
};

/** Compressed Gaussian (TS parity) */
typedef GaussianCompressed = {
  var xyz: Point3f32;          // f16 → float triplet
  var opacity: Int;            // i8
  var scale_factor: Int;       // i8
  var geometry_idx: Int;       // u32
  var sh_idx: Int;             // u32
};

/** Covariance block (TS parity) */
typedef Covariance3D = { var v: Array<Float>; };

/** ABI-friendly unions used by the GPU code paths */
typedef ABOrView = EitherType<ArrayBuffer, ArrayBufferView>;
typedef QuantViewOrStruct = EitherType<ArrayBufferView, pointcloud.Quantization.GaussianQuantization>;

/** Interface that loaders implement (TS/Rust parity) */
interface GenericGaussianPointCloud {
  public var num_points:Int;
  public var sh_deg:Int;
  public function compressed():Bool;

  public function gaussian_buffer():ABOrView; // 3D gaussian source buffer
  public function sh_coefs_buffer():ABOrView; // SH buffer

  // only for compressed:
  public var covars:Null<ABOrView>;
  public var quantization:Null<QuantViewOrStruct>;

  // NOTE: structural shape (TS has a plain object {min,max})
  public var aabb:{ var min:Vec3; var max:Vec3; };
  public var center:Vec3;
  public var up:Null<Vec3>;
  public var mip_splatting:Null<Bool>;
  public var kernel_size:Null<Float>;
  public var background_color:Null<Color3>;
}
