package gs.pointcloud.types;

typedef GaussianCompressed = {
  var xyz: Point3f32;          // f16 → float triplet
  var opacity: Int;            // i8
  var scale_factor: Int;       // i8
  var geometry_idx: Int;       // u32
  var sh_idx: Int;             // u32
};