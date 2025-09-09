package gs.pointcloud.types;

typedef Gaussian = {
  var xyz: Point3f32;          // f16 in source; exposed as floats here (TS parity)
  var opacity: Float;          // f16 → float
  var cov: Array<Float>;       // 6x f16 → float[6]
};
