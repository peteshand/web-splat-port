package gs.lib;

class Smoothstep {
  public static inline function smoothstep(x:Float):Float {
    return x * x * (3.0 - 2.0 * x);
  }
}
