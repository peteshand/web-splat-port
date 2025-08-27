package gl_matrix;

@:jsRequire("gl-matrix", "quat")
extern abstract Quat(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // array-style access
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  /** Creates a new identity quat */
  public static function create():Quat;
  /** Set a quat to the identity quaternion */
  public static function identity(out:Quat):Quat;

  /** Sets a quat from axis + angle (radians) */
  public static function setAxisAngle(out:Quat, axis:ReadonlyVec3, rad:Float):Quat;

  /** Gets the rotation axis and angle (returns angle in radians, writes axis to out_axis) */
  public static function getAxisAngle(out_axis:Vec3, q:ReadonlyQuat):Float;

  /** Angular distance between two unit quats */
  public static function getAngle(a:ReadonlyQuat, b:ReadonlyQuat):Float;

  /** Multiplies two quats (a * b) */
  public static function multiply(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat):Quat;

  /** Rotate quaternion around axes */
  public static function rotateX(out:Quat, a:ReadonlyQuat, rad:Float):Quat;
  public static function rotateY(out:Quat, a:ReadonlyQuat, rad:Float):Quat;
  public static function rotateZ(out:Quat, a:ReadonlyQuat, rad:Float):Quat;

  /** Compute W from X/Y/Z (assumes unit length) */
  public static function calculateW(out:Quat, a:ReadonlyQuat):Quat;

  /** Quaternion exp/log/pow (unit quat variants) */
  public static function exp(out:Quat, a:ReadonlyQuat):Quat;
  public static function ln(out:Quat, a:ReadonlyQuat):Quat;
  public static function pow(out:Quat, a:ReadonlyQuat, b:Float):Quat;

  /** Spherical lerp */
  public static function slerp(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat, t:Float):Quat;

  /** Random unit quaternion */
  public static function random(out:Quat):Quat;

  /** Inverse / conjugate */
  public static function invert(out:Quat, a:ReadonlyQuat):Quat;
  public static function conjugate(out:Quat, a:ReadonlyQuat):Quat;

  /** From matrices / euler */
  public static function fromMat3(out:Quat, m:ReadonlyMat3):Quat;
  public static function fromEuler(out:Quat, x:Dynamic, y:Dynamic, z:Dynamic):Quat;

  /** Stringify */
  public static function str(a:ReadonlyQuat):String;

  /** Alias for multiply */
  public static function mul(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat):Quat;

  /** Build rotation to rotate vector a to b */
  public static function rotationTo(out:Quat, a:ReadonlyVec3, b:ReadonlyVec3):Quat;

  /** Spherical quadrangle interpolation */
  public static function sqlerp(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat, c:ReadonlyQuat, d:ReadonlyQuat, t:Float):Quat;

  /** Set basis vectors (view/right/up) */
  public static function setAxes(out:Quat, view:ReadonlyVec3, right:ReadonlyVec3, up:ReadonlyVec3):Quat;

  // --- vec4-style helpers that gl-matrix exposes on quat too ---
  public static function clone(a:ReadonlyQuat):Quat;
  public static function fromValues(x:Float, y:Float, z:Float, w:Float):Quat;
  public static function copy(out:Quat, a:ReadonlyQuat):Quat;
  public static function set(out:Quat, x:Float, y:Float, z:Float, w:Float):Quat;
  public static function add(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat):Quat;
  public static function scale(out:Quat, a:ReadonlyQuat, b:Float):Quat;
  public static function dot(a:ReadonlyQuat, b:ReadonlyQuat):Float;
  public static function lerp(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat, t:Float):Quat;
  public static function length(a:ReadonlyQuat):Float;
  public static function len(a:ReadonlyQuat):Float;
  public static function squaredLength(a:ReadonlyQuat):Float;
  public static function sqrLen(a:ReadonlyQuat):Float;
  public static function normalize(out:Quat, a:ReadonlyQuat):Quat;
  public static function exactEquals(a:ReadonlyQuat, b:ReadonlyQuat):Bool;
  public static function equals(a:ReadonlyQuat, b:ReadonlyQuat):Bool;
}
