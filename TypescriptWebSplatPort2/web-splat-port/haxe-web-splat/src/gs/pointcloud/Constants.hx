package gs.pointcloud;

// Layout-compatible with WGSL struct Splat (5 x u32 = 20 bytes).
class Constants {
  public static inline var BYTES_PER_SPLAT:Int = 20;

  // Keep this alias to match any existing references in the port
  public static inline var SPLAT2D_BYTES_PER_POINT:Int = BYTES_PER_SPLAT;
}
