package gl_matrix;

@:jsRequire("gl-matrix", "vec3")
extern abstract Vec3(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // array-style access
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new, empty vec3 */
  public static function create():Vec3;
  /** Creates a new vec3 initialized with values from an existing vector */
  public static function clone(a:ReadonlyVec3):Vec3;

  /** Calculates the length of a vec3 */
  public static function length(a:ReadonlyVec3):Float;

  /** Creates a new vec3 initialized with the given values */
  public static function fromValues(x:Float, y:Float, z:Float):Vec3;
  /** Copy the values from one vec3 to another */
  public static function copy(out:Vec3, a:ReadonlyVec3):Vec3;
  /** Set the components of a vec3 to the given values */
  public static function set(out:Vec3, x:Float, y:Float, z:Float):Vec3;

  /** Adds two vec3's */
  public static function add(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  /** Subtracts vector b from vector a */
  public static function subtract(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  /** Multiplies two vec3's */
  public static function multiply(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  /** Divides two vec3's */
  public static function divide(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;

  /** Math.ceil the components of a vec3 */
  public static function ceil(out:Vec3, a:ReadonlyVec3):Vec3;
  /** Math.floor the components of a vec3 */
  public static function floor(out:Vec3, a:ReadonlyVec3):Vec3;
  /** Returns the minimum of two vec3's */
  public static function min(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  /** Returns the maximum of two vec3's */
  public static function max(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  /** Math.round the components of a vec3 */
  public static function round(out:Vec3, a:ReadonlyVec3):Vec3;

  /** Scales a vec3 by a scalar number */
  public static function scale(out:Vec3, a:ReadonlyVec3, b:Float):Vec3;
  /** Adds two vec3's after scaling the second operand by a scalar value */
  public static function scaleAndAdd(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, scale:Float):Vec3;

  /** Calculates the euclidian distance between two vec3's */
  public static function distance(a:ReadonlyVec3, b:ReadonlyVec3):Float;
  /** Calculates the squared euclidian distance between two vec3's */
  public static function squaredDistance(a:ReadonlyVec3, b:ReadonlyVec3):Float;

  /** Calculates the squared length of a vec3 */
  public static function squaredLength(a:ReadonlyVec3):Float;

  /** Negates the components of a vec3 */
  public static function negate(out:Vec3, a:ReadonlyVec3):Vec3;
  /** Returns the inverse of the components of a vec3 */
  public static function inverse(out:Vec3, a:ReadonlyVec3):Vec3;
  /** Normalize a vec3 */
  public static function normalize(out:Vec3, a:ReadonlyVec3):Vec3;

  /** Calculates the dot product of two vec3's */
  public static function dot(a:ReadonlyVec3, b:ReadonlyVec3):Float;
  /** Computes the cross product of two vec3's */
  public static function cross(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;

  /** Performs a linear interpolation between two vec3's */
  public static function lerp(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, t:Float):Vec3;
  /** Performs a hermite interpolation with two control points */
  public static function hermite(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, c:ReadonlyVec3, d:ReadonlyVec3, t:Float):Vec3;
  /** Performs a bezier interpolation with two control points */
  public static function bezier(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, c:ReadonlyVec3, d:ReadonlyVec3, t:Float):Vec3;

  /** Generates a random vector with the given scale */
  public static function random(out:Vec3, ?scale:Float):Vec3;

  /** Transforms the vec3 with a mat4 (w assumed 1) */
  public static function transformMat4(out:Vec3, a:ReadonlyVec3, m:ReadonlyMat4):Vec3;
  /** Transforms the vec3 with a mat3 */
  public static function transformMat3(out:Vec3, a:ReadonlyVec3, m:ReadonlyMat3):Vec3;
  /** Transforms the vec3 with a quat */
  public static function transformQuat(out:Vec3, a:ReadonlyVec3, q:ReadonlyQuat):Vec3;

  /** Rotate a 3D vector around the x-axis */
  public static function rotateX(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, rad:Float):Vec3;
  /** Rotate a 3D vector around the y-axis */
  public static function rotateY(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, rad:Float):Vec3;
  /** Rotate a 3D vector around the z-axis */
  public static function rotateZ(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, rad:Float):Vec3;

  /** Get the angle between two 3D vectors */
  public static function angle(a:ReadonlyVec3, b:ReadonlyVec3):Float;

  /** Set the components of a vec3 to zero */
  public static function zero(out:Vec3):Vec3;
  /** Returns a string representation of a vector */
  public static function str(a:ReadonlyVec3):String;

  /** Exact element-wise equality */
  public static function exactEquals(a:ReadonlyVec3, b:ReadonlyVec3):Bool;
  /** Approximate element-wise equality */
  public static function equals(a:ReadonlyVec3, b:ReadonlyVec3):Bool;

  /** Aliases */
  public static function sub(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  public static function mul(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  public static function div(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
  public static function dist(a:ReadonlyVec3, b:ReadonlyVec3):Float;
  public static function sqrDist(a:ReadonlyVec3, b:ReadonlyVec3):Float;
  public static function len(a:ReadonlyVec3):Float;
  public static function sqrLen(a:ReadonlyVec3):Float;

  // keep loose to match gl-matrix forEach overloads across versions
  public static function forEach(a:Dynamic, stride:Dynamic, offset:Dynamic, count:Dynamic, fn:Dynamic, arg:Dynamic):Dynamic;
}
