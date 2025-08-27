package gl_matrix;

@:jsRequire("gl-matrix", "mat2")
extern abstract Mat2(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // allow m[i] read/write
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new identity mat2 */
  public static function create():Mat2;
  /** Creates a new mat2 initialized with values from an existing matrix */
  public static function clone(a:ReadonlyMat2):Mat2;
  /** Copy the values from one mat2 to another */
  public static function copy(out:Mat2, a:ReadonlyMat2):Mat2;
  /** Set a mat2 to the identity matrix */
  public static function identity(out:Mat2):Mat2;
  /** Create a new mat2 with the given values */
  public static function fromValues(m00:Float, m01:Float, m10:Float, m11:Float):Mat2;
  /** Set the components of a mat2 to the given values */
  public static function set(out:Mat2, m00:Float, m01:Float, m10:Float, m11:Float):Mat2;
  /** Transpose the values of a mat2 */
  public static function transpose(out:Mat2, a:ReadonlyMat2):Mat2;
  /** Inverts a mat2 */
  public static function invert(out:Mat2, a:ReadonlyMat2):Mat2;
  /** Calculates the adjugate of a mat2 */
  public static function adjoint(out:Mat2, a:ReadonlyMat2):Mat2;
  /** Calculates the determinant of a mat2 */
  public static function determinant(a:ReadonlyMat2):Float;
  /** Multiplies two mat2's */
  public static function multiply(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
  /** Rotates a mat2 by the given angle */
  public static function rotate(out:Mat2, a:ReadonlyMat2, rad:Float):Mat2;
  /** Scales the mat2 by the dimensions in the given vec2 */
  public static function scale(out:Mat2, a:ReadonlyMat2, v:ReadonlyVec2):Mat2;
  /**
   * Creates a matrix from a given angle (faster than identity+rotate)
   */
  public static function fromRotation(out:Mat2, rad:Float):Mat2;
  /**
   * Creates a matrix from a vector scaling (faster than identity+scale)
   */
  public static function fromScaling(out:Mat2, v:ReadonlyVec2):Mat2;
  /** Returns a string representation of a mat2 */
  public static function str(a:ReadonlyMat2):String;
  /** Returns Frobenius norm of a mat2 */
  public static function frob(a:ReadonlyMat2):Float;
  /** L, D and U factorization */
  public static function LDU(L:ReadonlyMat2, D:ReadonlyMat2, U:ReadonlyMat2, a:ReadonlyMat2):Array<ReadonlyMat2>;
  /** Adds two mat2's */
  public static function add(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
  /** Subtracts matrix b from matrix a */
  public static function subtract(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
  /** Exact element-wise equality */
  public static function exactEquals(a:ReadonlyMat2, b:ReadonlyMat2):Bool;
  /** Approximate element-wise equality */
  public static function equals(a:ReadonlyMat2, b:ReadonlyMat2):Bool;
  /** Multiply each element of the matrix by a scalar. */
  public static function multiplyScalar(out:Mat2, a:ReadonlyMat2, b:Float):Mat2;
  /** Adds two mat2's after multiplying each element of the second operand by a scalar value. */
  public static function multiplyScalarAndAdd(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2, scale:Float):Mat2;

  // aliases
  public static function mul(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
  public static function sub(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
}
