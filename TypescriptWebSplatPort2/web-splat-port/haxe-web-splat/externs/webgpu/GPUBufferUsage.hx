package webgpu;

@:native("GPUBufferUsage")
extern class GPUBufferUsage {
  public static final MAP_READ:Int;
  public static final MAP_WRITE:Int;
  public static final COPY_SRC:Int;
  public static final COPY_DST:Int;
  public static final INDEX:Int;
  public static final VERTEX:Int;
  public static final UNIFORM:Int;
  public static final STORAGE:Int;
  public static final INDIRECT:Int;
  public static final QUERY_RESOLVE:Int;
}