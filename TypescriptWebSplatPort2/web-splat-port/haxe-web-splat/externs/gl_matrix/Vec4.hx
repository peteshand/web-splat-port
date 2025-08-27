package gl_matrix;

@:jsRequire("gl-matrix", "vec4")
extern abstract Vec4(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // array-style access
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new, empty vec4 */
  public static function create():Vec4;
  /** Creates a new vec4 initialized with values from an existing vector */
  public static function clone(a:ReadonlyVec4):Vec4;

  /** Creates a new vec4 initialized with the given values */
  public static function fromValues(x:Float, y:Float, z:Float, w:Float):Vec4;
  /** Copy the values from one vec4 to another */
  public static function copy(out:Vec4, a:ReadonlyVec4):Vec4;
  /** Set the components of a vec4 to the given values */
  public static function set(out:Vec4, x:Float, y:Float, z:Float, w:Float):Vec4;

  /** Adds two vec4's */
  public static function add(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  /** Subtracts vector b from vector a */
  public static function subtract(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  /** Multiplies two vec4's */
  public static function multiply(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  /** Divides two vec4's */
  public static function divide(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;

  /** Math.ceil the components of a vec4 */
  public static function ceil(out:Vec4, a:ReadonlyVec4):Vec4;
  /** Math.floor the components of a vec4 */
  public static function floor(out:Vec4, a:ReadonlyVec4):Vec4;
  /** Returns the minimum of two vec4's */
  public static function min(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  /** Returns the maximum of two vec4's */
  public static function max(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  /** Math.round the components of a vec4 */
  public static function round(out:Vec4, a:ReadonlyVec4):Vec4;

  /** Scales a vec4 by a scalar number */
  public static function scale(out:Vec4, a:ReadonlyVec4, b:Float):Vec4;
  /** Adds two vec4's after scaling the second operand by a scalar value */
  public static function scaleAndAdd(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4, scale:Float):Vec4;

  /** Calculates the euclidian distance between two vec4's */
  public static function distance(a:ReadonlyVec4, b:ReadonlyVec4):Float;
  /** Calculates the squared euclidian distance between two vec4's */
  public static function squaredDistance(a:ReadonlyVec4, b:ReadonlyVec4):Float;

  /** Calculates the length of a vec4 */
  public static function length(a:ReadonlyVec4):Float;
  /** Calculates the squared length of a vec4 */
  public static function squaredLength(a:ReadonlyVec4):Float;

  /** Negates the components of a vec4 */
  public static function negate(out:Vec4, a:ReadonlyVec4):Vec4;
  /** Returns the inverse of the components of a vec4 */
  public static function inverse(out:Vec4, a:ReadonlyVec4):Vec4;
  /** Normalize a vec4 */
  public static function normalize(out:Vec4, a:ReadonlyVec4):Vec4;

  /** Calculates the dot product of two vec4's */
  public static function dot(a:ReadonlyVec4, b:ReadonlyVec4):Float;

  /** Returns the cross-product of three vectors in 4D space (keep loose types; varies by gl-matrix versions) */
  public static function cross(out:Dynamic, u:Dynamic, v:Dynamic, w:Dynamic):Vec4;

  /** Performs a linear interpolation between two vec4's */
  public static function lerp(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4, t:Float):Vec4;

  /** Generates a random vector with the given scale */
  public static function random(out:Vec4, ?scale:Float):Vec4;

  /** Transforms the vec4 with a mat4 */
  public static function transformMat4(out:Vec4, a:ReadonlyVec4, m:ReadonlyMat4):Vec4;
  /** Transforms the vec4 with a quat */
  public static function transformQuat(out:Vec4, a:ReadonlyVec4, q:ReadonlyQuat):Vec4;

  /** Set the components of a vec4 to zero */
  public static function zero(out:Vec4):Vec4;
  /** Returns a string representation of a vector */
  public static function str(a:ReadonlyVec4):String;

  /** Exact element-wise equality */
  public static function exactEquals(a:ReadonlyVec4, b:ReadonlyVec4):Bool;
  /** Approximate element-wise equality */
  public static function equals(a:ReadonlyVec4, b:ReadonlyVec4):Bool;

  /** Aliases */
  public static function sub(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  public static function mul(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  public static function div(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
  public static function dist(a:ReadonlyVec4, b:ReadonlyVec4):Float;
  public static function sqrDist(a:ReadonlyVec4, b:ReadonlyVec4):Float;
  public static function len(a:ReadonlyVec4):Float;
  public static function sqrLen(a:ReadonlyVec4):Float;

  // keep loose to match gl-matrix forEach overloads across versions
  public static function forEach(a:Dynamic, stride:Dynamic, offset:Dynamic, count:Dynamic, fn:Dynamic, arg:Dynamic):Dynamic;
}
