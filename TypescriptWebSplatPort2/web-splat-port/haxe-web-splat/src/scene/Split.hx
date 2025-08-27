package scene;

/** String enum compatible with JSON "train"/"test". */
@:enum abstract Split(String) from String to String {
  public var Train = "train";
  public var Test  = "test";

  /** Helper to assign Kerbl-style split (every 8th → test). */
  public static inline function fromIndex(i:Int):Split
    return (i % 8 == 0) ? Test : Train;
}
