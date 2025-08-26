package gl_matrix;

@:jsRequire("gl-matrix", "vec2") @:forward @:forwardStatics extern abstract Vec2(ts.AnyOf2<js.lib.Float32Array, ts.Tuple2<Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple2<Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple2<Float, Float>> {
	/**
		Creates a new, empty vec2
	**/
	static function create():Vec2;
	/**
		Creates a new vec2 initialized with values from an existing vector
	**/
	static function clone(a:ReadonlyVec2):Vec2;
	/**
		Creates a new vec2 initialized with the given values
	**/
	static function fromValues(x:Float, y:Float):Vec2;
	/**
		Copy the values from one vec2 to another
	**/
	static function copy(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Set the components of a vec2 to the given values
	**/
	static function set(out:Vec2, x:Float, y:Float):Vec2;
	/**
		Adds two vec2's
	**/
	static function add(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Subtracts vector b from vector a
	**/
	static function subtract(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Multiplies two vec2's
	**/
	static function multiply(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Divides two vec2's
	**/
	static function divide(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Math.ceil the components of a vec2
	**/
	static function ceil(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Math.floor the components of a vec2
	**/
	static function floor(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Returns the minimum of two vec2's
	**/
	static function min(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Returns the maximum of two vec2's
	**/
	static function max(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Math.round the components of a vec2
	**/
	static function round(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Scales a vec2 by a scalar number
	**/
	static function scale(out:Vec2, a:ReadonlyVec2, b:Float):Vec2;
	/**
		Adds two vec2's after scaling the second operand by a scalar value
	**/
	static function scaleAndAdd(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2, scale:Float):Vec2;
	/**
		Calculates the euclidian distance between two vec2's
	**/
	static function distance(a:ReadonlyVec2, b:ReadonlyVec2):Float;
	/**
		Calculates the squared euclidian distance between two vec2's
	**/
	static function squaredDistance(a:ReadonlyVec2, b:ReadonlyVec2):Float;
	/**
		Calculates the length of a vec2
	**/
	static function length(a:ReadonlyVec2):Float;
	/**
		Calculates the squared length of a vec2
	**/
	static function squaredLength(a:ReadonlyVec2):Float;
	/**
		Negates the components of a vec2
	**/
	static function negate(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Returns the inverse of the components of a vec2
	**/
	static function inverse(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Normalize a vec2
	**/
	static function normalize(out:Vec2, a:ReadonlyVec2):Vec2;
	/**
		Calculates the dot product of two vec2's
	**/
	static function dot(a:ReadonlyVec2, b:ReadonlyVec2):Float;
	/**
		Computes the cross product of two vec2's
		Note that the cross product must by definition produce a 3D vector
	**/
	static function cross(out:Vec3, a:ReadonlyVec2, b:ReadonlyVec2):Vec3;
	/**
		Performs a linear interpolation between two vec2's
	**/
	static function lerp(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2, t:Float):Vec2;
	/**
		Generates a random vector with the given scale
	**/
	static function random(out:Vec2, ?scale:Float):Vec2;
	/**
		Transforms the vec2 with a mat2
	**/
	static function transformMat2(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat2):Vec2;
	/**
		Transforms the vec2 with a mat2d
	**/
	static function transformMat2d(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat2d):Vec2;
	/**
		Transforms the vec2 with a mat3
		3rd vector component is implicitly '1'
	**/
	static function transformMat3(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat3):Vec2;
	/**
		Transforms the vec2 with a mat4
		3rd vector component is implicitly '0'
		4th vector component is implicitly '1'
	**/
	static function transformMat4(out:Vec2, a:ReadonlyVec2, m:ReadonlyMat4):Vec2;
	/**
		Rotate a 2D vector
	**/
	static function rotate(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2, rad:Float):Vec2;
	/**
		Get the angle between two 2D vectors
	**/
	static function angle(a:ReadonlyVec2, b:ReadonlyVec2):Float;
	/**
		Set the components of a vec2 to zero
	**/
	static function zero(out:Vec2):Vec2;
	/**
		Returns a string representation of a vector
	**/
	static function str(a:ReadonlyVec2):String;
	/**
		Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyVec2, b:ReadonlyVec2):Bool;
	/**
		Returns whether or not the vectors have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyVec2, b:ReadonlyVec2):Bool;
	/**
		Calculates the length of a vec2
	**/
	static function len(a:ReadonlyVec2):Float;
	/**
		Subtracts vector b from vector a
	**/
	static function sub(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Multiplies two vec2's
	**/
	static function mul(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Divides two vec2's
	**/
	static function div(out:Vec2, a:ReadonlyVec2, b:ReadonlyVec2):Vec2;
	/**
		Calculates the euclidian distance between two vec2's
	**/
	static function dist(a:ReadonlyVec2, b:ReadonlyVec2):Float;
	/**
		Calculates the squared euclidian distance between two vec2's
	**/
	static function sqrDist(a:ReadonlyVec2, b:ReadonlyVec2):Float;
	/**
		Calculates the squared length of a vec2
	**/
	static function sqrLen(a:ReadonlyVec2):Float;
	static function forEach(a:Dynamic, stride:Dynamic, offset:Dynamic, count:Dynamic, fn:Dynamic, arg:Dynamic):Dynamic;
}