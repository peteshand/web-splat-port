package gl_matrix;

@:jsRequire("gl-matrix", "quat2")
extern abstract Quat2(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // allow dq[0..7] read/write
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new identity dual quat */
  public static function create():Quat2;

  /** Creates a new dual quat initialized with values from an existing dual quat */
  public static function clone(a:ReadonlyQuat2):Quat2;

  /** Creates a new dual quat initialized with the given values */
  public static function fromValues(
    x1:Float, y1:Float, z1:Float, w1:Float,
    x2:Float, y2:Float, z2:Float, w2:Float
  ):Quat2;

  /** Creates a new dual quat from the given values (quat and translation) */
  public static function fromRotationTranslationValues(
    x1:Float, y1:Float, z1:Float, w1:Float,
    x2:Float, y2:Float, z2:Float
  ):Quat2;

  /** Creates a dual quat from a quaternion and a translation */
  public static function fromRotationTranslation(out:Quat2, q:ReadonlyQuat, t:ReadonlyVec3):Quat2;

  /** Creates a dual quat from a translation */
  public static function fromTranslation(out:Quat2, t:ReadonlyVec3):Quat2;

  /** Creates a dual quat from a quaternion */
  public static function fromRotation(out:Quat2, q:ReadonlyQuat):Quat2;

  /** Creates a new dual quat from a 4x4 matrix */
  public static function fromMat4(out:Quat2, a:ReadonlyMat4):Quat2;

  /** Copy the values from one dual quat to another */
  public static function copy(out:Quat2, a:ReadonlyQuat2):Quat2;

  /** Set a dual quat to the identity dual quaternion */
  public static function identity(out:Quat2):Quat2;

  /** Set the components of a dual quat to the given values */
  public static function set(
    out:Quat2,
    x1:Float, y1:Float, z1:Float, w1:Float,
    x2:Float, y2:Float, z2:Float, w2:Float
  ):Quat2;

  /** Gets the dual part of a dual quat */
  public static function getDual(out:Quat, a:ReadonlyQuat2):Quat;

  /** Set the dual component from a quaternion */
  public static function setDual(out:Quat2, q:ReadonlyQuat):Quat2;

  /** Gets the translation of a normalized dual quat */
  public static function getTranslation(out:Vec3, a:ReadonlyQuat2):Vec3;

  /** Translates a dual quat by the given vector */
  public static function translate(out:Quat2, a:ReadonlyQuat2, v:ReadonlyVec3):Quat2;

  /** Rotations */
  public static function rotateX(out:Quat2, a:ReadonlyQuat2, rad:Float):Quat2;
  public static function rotateY(out:Quat2, a:ReadonlyQuat2, rad:Float):Quat2;
  public static function rotateZ(out:Quat2, a:ReadonlyQuat2, rad:Float):Quat2;

  /** Rotates dual quat by a quaternion (a * q) */
  public static function rotateByQuatAppend(out:Quat2, a:ReadonlyQuat2, q:ReadonlyQuat):Quat2;

  /** Rotates dual quat by a quaternion (q * a) */
  public static function rotateByQuatPrepend(out:Quat2, q:ReadonlyQuat, a:ReadonlyQuat2):Quat2;

  /** Rotates around an axis (auto-normalizes) */
  public static function rotateAroundAxis(out:Quat2, a:ReadonlyQuat2, axis:ReadonlyVec3, rad:Float):Quat2;

  /** Arithmetic / lerp */
  public static function add(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2):Quat2;
  public static function multiply(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2):Quat2;
  public static function scale(out:Quat2, a:ReadonlyQuat2, b:Float):Quat2;
  public static function lerp(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2, t:Float):Quat2;

  /** Inverse / conjugate / normalize */
  public static function invert(out:Quat2, a:ReadonlyQuat2):Quat2;
  public static function conjugate(out:Quat2, a:ReadonlyQuat2):Quat2;
  public static function normalize(out:Quat2, a:ReadonlyQuat2):Quat2;

  /** Stringify */
  public static function str(a:ReadonlyQuat2):String;

  /** Equality checks */
  public static function exactEquals(a:ReadonlyQuat2, b:ReadonlyQuat2):Bool;
  public static function equals(a:ReadonlyQuat2, b:ReadonlyQuat2):Bool;

  // aliases
  public static function mul(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2):Quat2;

  /** Real/dual getters & setters */
  public static function getReal(out:Quat, a:ReadonlyQuat2):Quat;
  public static function setReal(out:Quat2, q:ReadonlyQuat):Quat2;

  /** Dual-quat dot/length helpers (dot of real parts) */
  public static function dot(a:ReadonlyQuat2, b:ReadonlyQuat2):Float;
  public static function length(a:ReadonlyQuat2):Float;
  public static function len(a:ReadonlyQuat2):Float;
  public static function squaredLength(a:ReadonlyQuat2):Float;
  public static function sqrLen(a:ReadonlyQuat2):Float;
}
