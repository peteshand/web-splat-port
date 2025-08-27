package gl_matrix;

@:jsRequire("gl-matrix", "glMatrix") @valueModuleOnly
extern class GlMatrix {
  /**
   * Use only Float32Array for vectors/matrices to match our abstracts.
   */
  static function setMatrixArrayType(type:js.lib.Float32ArrayConstructor):Void;

  /** Convert Degree To Radian */
  static function toRadian(a:Float):Float;

  /**
   * Approx-equality with tolerance based on glMatrix.EPSILON.
   */
  static function equals(a:Float, b:Float):Bool;

  /** Common utilities */
  static final EPSILON:Float;

  /**
   * Random number source (override-able). Exposed as a function value.
   */
  static var RANDOM:()->Float;

  /**
   * Optional: expose the constructor gl-matrix uses internally.
   * Keep it Float32ArrayConstructor to align with our design.
   */
  // static var ARRAY_TYPE(default, null):js.lib.Float32ArrayConstructor;
}
