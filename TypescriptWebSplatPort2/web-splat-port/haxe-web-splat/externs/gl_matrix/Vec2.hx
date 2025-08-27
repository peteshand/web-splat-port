package gl_matrix;

@:jsRequire("gl-matrix", "vec2")
extern abstract Vec2(js.lib.Float32Array) from js.lib.Float32Array to js.lib.Float32Array {
  // --- array access ---
  @:arrayAccess public inline function get(i:Int):Float return this[i];
  @:arrayAccess public inline function setAt(i:Int, v:Float):Float { this[i] = v; return v; }

  // --- statics from gl-matrix/vec2 ---
  public static function create():Vec2;
  public static function clone(a:ReadonlyVec2):Vec2;
  public static function fromValues(x:Float, y:Float):Vec2;
  public static function copy(out:Vec2, a:ReadonlyVec2):Vec2;
  public static function set(out:Vec2, x:Float, y:Float):Vec2;

  public static function add(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
  public static function subtract(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
  public static function sub(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;

  public static function multiply(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
  public static function mul(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;

  public static function divide(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
  public static function div(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;

  public static function ceil(out:Vec2, a:ReadonlyVec2):Vec2;
  public static function floor(out:Vec2, a:ReadonlyVec2):Vec2;
  public static function min(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
  public static function max(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
  public static function round(out:Vec2, a:ReadonlyVec2):Vec2;

  public static function scale(out:Vec2, a:ReadonlyVec2, b:Float):Vec2;
  public static function scaleAndAdd(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2, scale:Float):Vec2;

  public static function distance(a:ReadonlyVec2, b:ReadonlyVec2):Float;
  public static function dist(a:ReadonlyVec2, b:ReadonlyVec2):Float;
  public static function squaredDistance(a:ReadonlyVec2, b:ReadonlyVec2):Float;
  public static function sqrDist(a:ReadonlyVec2, b:ReadonlyVec2):Float;

  public static function length(a:ReadonlyVec2):Float;
  public static function len(a:ReadonlyVec2):Float;
  public static function squaredLength(a:ReadonlyVec2):Float;
  public static function sqrLen(a:ReadonlyVec2):Float;

  public static function negate(out:Vec2, a:ReadonlyVec2):Vec2;
  public static function inverse(out:Vec2, a:ReadonlyVec2):Vec2;
  public static function normalize(out:Vec2, a:ReadonlyVec2):Vec2;

  public static function dot(a:ReadonlyVec2, b:ReadonlyVec2):Float;

  // Note: 2D cross returns a 3D vector (z-component carries the magnitude)
  public static function cross(out:Vec3, a:ReadonlyVec2, b:ReadonlyVec2):Vec3;

  public static function lerp(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2, t:Float):Vec2;
  public static function random(out:Vec2, ?scale:Float):Vec2;

  public static function transformMat2(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat2):Vec2;
  public static function transformMat2d(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat2d):Vec2;
  public static function transformMat3(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat3):Vec2;
  public static function transformMat4(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat4):Vec2;

  public static function rotate(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2, rad:Float):Vec2;
  public static function angle(a:ReadonlyVec2, b:ReadonlyVec2):Float;
  public static function zero(out:Vec2):Vec2;
  public static function str(a:ReadonlyVec2):String;
  public static function exactEquals(a:ReadonlyVec2, b:ReadonlyVec2):Bool;
  public static function equals(a:ReadonlyVec2, b:ReadonlyVec2):Bool;

  // Kept loose to match gl-matrix’s various overloads across versions.
  public static function forEach(a:Dynamic, stride:Dynamic, offset:Dynamic, count:Dynamic, fn:Dynamic, arg:Dynamic):Dynamic;
}
