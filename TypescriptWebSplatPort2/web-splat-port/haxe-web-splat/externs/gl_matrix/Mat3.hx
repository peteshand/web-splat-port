package gl_matrix;

@:jsRequire("gl-matrix", "mat3")
extern abstract Mat3(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // allow a[0..8] read/write
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new identity mat3 */
  public static function create():Mat3;

  /** Copies the upper-left 3x3 values of a mat4 into out */
  public static function fromMat4(out:Mat3, a:ReadonlyMat4):Mat3;

  /** Creates a new mat3 initialized with values from an existing matrix */
  public static function clone(a:ReadonlyMat3):Mat3;

  /** Copy the values from one mat3 to another */
  public static function copy(out:Mat3, a:ReadonlyMat3):Mat3;

  /** Create a new mat3 with the given values */
  public static function fromValues(
    m00:Float, m01:Float, m02:Float,
    m10:Float, m11:Float, m12:Float,
    m20:Float, m21:Float, m22:Float
  ):Mat3;

  /** Set the components of a mat3 to the given values */
  public static function set(
    out:Mat3,
    m00:Float, m01:Float, m02:Float,
    m10:Float, m11:Float, m12:Float,
    m20:Float, m21:Float, m22:Float
  ):Mat3;

  /** Set a mat3 to the identity matrix */
  public static function identity(out:Mat3):Mat3;

  /** Transpose the values of a mat3 */
  public static function transpose(out:Mat3, a:ReadonlyMat3):Mat3;

  /** Inverts a mat3 */
  public static function invert(out:Mat3, a:ReadonlyMat3):Mat3;

  /** Calculates the adjugate of a mat3 */
  public static function adjoint(out:Mat3, a:ReadonlyMat3):Mat3;

  /** Calculates the determinant of a mat3 */
  public static function determinant(a:ReadonlyMat3):Float;

  /** Multiplies two mat3's */
  public static function multiply(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;

  /** Translate a mat3 by the given vector */
  public static function translate(out:Mat3, a:ReadonlyMat3, v:ReadonlyVec2):Mat3;

  /** Rotates a mat3 by the given angle */
  public static function rotate(out:Mat3, a:ReadonlyMat3, rad:Float):Mat3;

  /** Scales the mat3 by the dimensions in the given vec2 */
  public static function scale(out:Mat3, a:ReadonlyMat3, v:ReadonlyVec2):Mat3;

  /** Creates a matrix from a vector translation */
  public static function fromTranslation(out:Mat3, v:ReadonlyVec2):Mat3;

  /** Creates a matrix from a given angle */
  public static function fromRotation(out:Mat3, rad:Float):Mat3;

  /** Creates a matrix from a vector scaling */
  public static function fromScaling(out:Mat3, v:ReadonlyVec2):Mat3;

  /** Copies the values from a mat2d into a mat3 */
  public static function fromMat2d(out:Mat3, a:ReadonlyMat2d):Mat3;

  /** Calculates a 3x3 matrix from the given quaternion */
  public static function fromQuat(out:Mat3, q:ReadonlyQuat):Mat3;

  /** Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix */
  public static function normalFromMat4(out:Mat3, a:ReadonlyMat4):Mat3;

  /** Generates a 2D projection matrix with the given bounds */
  public static function projection(out:Mat3, width:Float, height:Float):Mat3;

  /** Returns a string representation of a mat3 */
  public static function str(a:ReadonlyMat3):String;

  /** Returns Frobenius norm of a mat3 */
  public static function frob(a:ReadonlyMat3):Float;

  /** Adds two mat3's */
  public static function add(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;

  /** Subtracts matrix b from matrix a */
  public static function subtract(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;

  /** Multiply each element of the matrix by a scalar */
  public static function multiplyScalar(out:Mat3, a:ReadonlyMat3, b:Float):Mat3;

  /** Adds two mat3's after multiplying second operand by a scalar */
  public static function multiplyScalarAndAdd(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3, scale:Float):Mat3;

  /** Exact element-wise equality */
  public static function exactEquals(a:ReadonlyMat3, b:ReadonlyMat3):Bool;

  /** Approximate element-wise equality */
  public static function equals(a:ReadonlyMat3, b:ReadonlyMat3):Bool;

  // aliases
  public static function mul(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
  public static function sub(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
}
