package gl_matrix;

@:jsRequire("gl-matrix", "mat4")
extern abstract Mat4(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // allow a[0..15] read/write
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new identity mat4 */
  public static function create():Mat4;
  /** Creates a new mat4 initialized with values from an existing matrix */
  public static function clone(a:ReadonlyMat4):Mat4;
  /** Copy the values from one mat4 to another */
  public static function copy(out:Mat4, a:ReadonlyMat4):Mat4;

  /** Create a new mat4 with the given values */
  public static function fromValues(
    m00:Float, m01:Float, m02:Float, m03:Float,
    m10:Float, m11:Float, m12:Float, m13:Float,
    m20:Float, m21:Float, m22:Float, m23:Float,
    m30:Float, m31:Float, m32:Float, m33:Float
  ):Mat4;

  /** Set the components of a mat4 to the given values */
  public static function set(
    out:Mat4,
    m00:Float, m01:Float, m02:Float, m03:Float,
    m10:Float, m11:Float, m12:Float, m13:Float,
    m20:Float, m21:Float, m22:Float, m23:Float,
    m30:Float, m31:Float, m32:Float, m33:Float
  ):Mat4;

  /** Set to identity */
  public static function identity(out:Mat4):Mat4;
  /** Transpose */
  public static function transpose(out:Mat4, a:ReadonlyMat4):Mat4;
  /** Invert */
  public static function invert(out:Mat4, a:ReadonlyMat4):Mat4;
  /** Adjugate */
  public static function adjoint(out:Mat4, a:ReadonlyMat4):Mat4;
  /** Determinant */
  public static function determinant(a:ReadonlyMat4):Float;

  /** Multiply a * b */
  public static function multiply(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;

  /** Translate by vec3 */
  public static function translate(out:Mat4, a:ReadonlyMat4, v:ReadonlyVec3):Mat4;
  /** Scale by vec3 */
  public static function scale(out:Mat4, a:ReadonlyMat4, v:ReadonlyVec3):Mat4;

  /** Rotate by rad around axis */
  public static function rotate(out:Mat4, a:ReadonlyMat4, rad:Float, axis:ReadonlyVec3):Mat4;
  public static function rotateX(out:Mat4, a:ReadonlyMat4, rad:Float):Mat4;
  public static function rotateY(out:Mat4, a:ReadonlyMat4, rad:Float):Mat4;
  public static function rotateZ(out:Mat4, a:ReadonlyMat4, rad:Float):Mat4;

  /** Construct helpers */
  public static function fromTranslation(out:Mat4, v:ReadonlyVec3):Mat4;
  public static function fromScaling(out:Mat4, v:ReadonlyVec3):Mat4;
  public static function fromRotation(out:Mat4, rad:Float, axis:ReadonlyVec3):Mat4;
  public static function fromXRotation(out:Mat4, rad:Float):Mat4;
  public static function fromYRotation(out:Mat4, rad:Float):Mat4;
  public static function fromZRotation(out:Mat4, rad:Float):Mat4;

  /** From quaternion + translation (+scale / +origin) */
  public static function fromRotationTranslation(out:Mat4, q:Dynamic, v:ReadonlyVec3):Mat4;
  public static function fromQuat2(out:Mat4, a:ReadonlyQuat2):Mat4;
  public static function fromRotationTranslationScale(out:Mat4, q:Dynamic, v:ReadonlyVec3, s:ReadonlyVec3):Mat4;
  public static function fromRotationTranslationScaleOrigin(out:Mat4, q:Dynamic, v:ReadonlyVec3, s:ReadonlyVec3, o:ReadonlyVec3):Mat4;
  public static function fromQuat(out:Mat4, q:ReadonlyQuat):Mat4;

  /** Decompose helpers */
  public static function getTranslation(out:Vec3, mat:ReadonlyMat4):Vec3;
  public static function getScaling(out:Vec3, mat:ReadonlyMat4):Vec3;
  public static function getRotation(out:Quat, mat:ReadonlyMat4):Quat;

  /** Projections / frustum / look-at */
  public static function frustum(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
  public static function perspectiveNO(out:Mat4, fovy:Float, aspect:Float, near:Float, far:Float):Mat4;
  public static function perspectiveZO(out:Mat4, fovy:Float, aspect:Float, near:Float, far:Float):Mat4;
  public static function perspective(out:Mat4, fovy:Float, aspect:Float, near:Float, far:Float):Mat4;
  public static function orthoNO(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
  public static function orthoZO(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
  public static function ortho(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
  public static function lookAt(out:Mat4, eye:ReadonlyVec3, center:ReadonlyVec3, up:ReadonlyVec3):Mat4;
  public static function targetTo(out:Mat4, eye:ReadonlyVec3, target:Dynamic, up:ReadonlyVec3):Mat4;

  /** Misc */
  public static function str(a:ReadonlyMat4):String;
  public static function frob(a:ReadonlyMat4):Float;
  public static function add(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
  public static function subtract(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
  public static function multiplyScalar(out:Mat4, a:ReadonlyMat4, b:Float):Mat4;
  public static function multiplyScalarAndAdd(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4, scale:Float):Mat4;
  public static function exactEquals(a:ReadonlyMat4, b:ReadonlyMat4):Bool;
  public static function equals(a:ReadonlyMat4, b:ReadonlyMat4):Bool;

  // aliases
  public static function mul(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
  public static function sub(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
}
