package gl_matrix;

@:jsRequire("gl-matrix", "mat2d")
extern abstract Mat2d(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // allow a[0..5] read/write
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new identity mat2d */
  public static function create():Mat2d;
  /** Creates a new mat2d initialized with values from an existing matrix */
  public static function clone(a:ReadonlyMat2d):Mat2d;
  /** Copy the values from one mat2d to another */
  public static function copy(out:Mat2d, a:ReadonlyMat2d):Mat2d;
  /** Set a mat2d to the identity matrix */
  public static function identity(out:Mat2d):Mat2d;

  /** Create a new mat2d with the given values (a,b, c,d, tx,ty) */
  public static function fromValues(a:Float, b:Float, c:Float, d:Float, tx:Float, ty:Float):Mat2d;
  /** Set the components of a mat2d to the given values */
  public static function set(out:Mat2d, a:Float, b:Float, c:Float, d:Float, tx:Float, ty:Float):Mat2d;

  /** Inverts a mat2d */
  public static function invert(out:Mat2d, a:ReadonlyMat2d):Mat2d;
  /** Calculates the determinant of a mat2d */
  public static function determinant(a:ReadonlyMat2d):Float;

  /** Multiplies two mat2d's */
  public static function multiply(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
  /** Rotates a mat2d by the given angle */
  public static function rotate(out:Mat2d, a:ReadonlyMat2d, rad:Float):Mat2d;
  /** Scales the mat2d by the dimensions in the given vec2 */
  public static function scale(out:Mat2d, a:ReadonlyMat2d, v:ReadonlyVec2):Mat2d;
  /** Translates the mat2d by the dimensions in the given vec2 */
  public static function translate(out:Mat2d, a:ReadonlyMat2d, v:ReadonlyVec2):Mat2d;

  /** Creates a matrix from a given angle (faster than identity+rotate) */
  public static function fromRotation(out:Mat2d, rad:Float):Mat2d;
  /** Creates a matrix from a vector scaling (faster than identity+scale) */
  public static function fromScaling(out:Mat2d, v:ReadonlyVec2):Mat2d;
  /** Creates a matrix from a vector translation (faster than identity+translate) */
  public static function fromTranslation(out:Mat2d, v:ReadonlyVec2):Mat2d;

  /** Returns a string representation of a mat2d */
  public static function str(a:ReadonlyMat2d):String;
  /** Returns Frobenius norm of a mat2d */
  public static function frob(a:ReadonlyMat2d):Float;

  /** Adds two mat2d's */
  public static function add(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
  /** Subtracts matrix b from matrix a */
  public static function subtract(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;

  /** Multiply each element of the matrix by a scalar. */
  public static function multiplyScalar(out:Mat2d, a:ReadonlyMat2d, b:Float):Mat2d;
  /** Adds two mat2d's after multiplying each element of the second operand by a scalar value. */
  public static function multiplyScalarAndAdd(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d, scale:Float):Mat2d;

  /** Exact element-wise equality */
  public static function exactEquals(a:ReadonlyMat2d, b:ReadonlyMat2d):Bool;
  /** Approximate element-wise equality */
  public static function equals(a:ReadonlyMat2d, b:ReadonlyMat2d):Bool;

  // aliases
  public static function mul(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
  public static function sub(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
}
