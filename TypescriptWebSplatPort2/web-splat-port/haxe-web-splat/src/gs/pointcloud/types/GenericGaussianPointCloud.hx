package gs.pointcloud.types;

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
