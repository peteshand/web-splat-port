package gl_matrix;

@:jsRequire("gl-matrix", "vec4") @:forward @:forwardStatics extern abstract Vec4(ts.AnyOf2<js.lib.Float32Array, ts.Tuple4<Float, Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple4<Float, Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple4<Float, Float, Float, Float>> {
	/**
		Creates a new, empty vec4
	**/
	static function create():Vec4;
	/**
		Creates a new vec4 initialized with values from an existing vector
	**/
	static function clone(a:ReadonlyVec4):Vec4;
	/**
		Creates a new vec4 initialized with the given values
	**/
	static function fromValues(x:Float, y:Float, z:Float, w:Float):Vec4;
	/**
		Copy the values from one vec4 to another
	**/
	static function copy(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Set the components of a vec4 to the given values
	**/
	static function set(out:Vec4, x:Float, y:Float, z:Float, w:Float):Vec4;
	/**
		Adds two vec4's
	**/
	static function add(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Subtracts vector b from vector a
	**/
	static function subtract(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Multiplies two vec4's
	**/
	static function multiply(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Divides two vec4's
	**/
	static function divide(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Math.ceil the components of a vec4
	**/
	static function ceil(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Math.floor the components of a vec4
	**/
	static function floor(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Returns the minimum of two vec4's
	**/
	static function min(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Returns the maximum of two vec4's
	**/
	static function max(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Math.round the components of a vec4
	**/
	static function round(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Scales a vec4 by a scalar number
	**/
	static function scale(out:Vec4, a:ReadonlyVec4, b:Float):Vec4;
	/**
		Adds two vec4's after scaling the second operand by a scalar value
	**/
	static function scaleAndAdd(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4, scale:Float):Vec4;
	/**
		Calculates the euclidian distance between two vec4's
	**/
	static function distance(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Calculates the squared euclidian distance between two vec4's
	**/
	static function squaredDistance(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Calculates the length of a vec4
	**/
	static function length(a:ReadonlyVec4):Float;
	/**
		Calculates the squared length of a vec4
	**/
	static function squaredLength(a:ReadonlyVec4):Float;
	/**
		Negates the components of a vec4
	**/
	static function negate(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Returns the inverse of the components of a vec4
	**/
	static function inverse(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Normalize a vec4
	**/
	static function normalize(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Calculates the dot product of two vec4's
	**/
	static function dot(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Returns the cross-product of three vectors in a 4-dimensional space
	**/
	static function cross(out:Dynamic, u:Dynamic, v:Dynamic, w:Dynamic):Vec4;
	/**
		Performs a linear interpolation between two vec4's
	**/
	static function lerp(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4, t:Float):Vec4;
	/**
		Generates a random vector with the given scale
	**/
	static function random(out:Vec4, ?scale:Float):Vec4;
	/**
		Transforms the vec4 with a mat4.
	**/
	static function transformMat4(out:Vec4, a:ReadonlyVec4, m:ReadonlyMat4):Vec4;
	/**
		Transforms the vec4 with a quat
	**/
	static function transformQuat(out:Vec4, a:ReadonlyVec4, q:ReadonlyQuat):Vec4;
	/**
		Set the components of a vec4 to zero
	**/
	static function zero(out:Vec4):Vec4;
	/**
		Returns a string representation of a vector
	**/
	static function str(a:ReadonlyVec4):String;
	/**
		Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyVec4, b:ReadonlyVec4):Bool;
	/**
		Returns whether or not the vectors have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyVec4, b:ReadonlyVec4):Bool;
	/**
		Subtracts vector b from vector a
	**/
	static function sub(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Multiplies two vec4's
	**/
	static function mul(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Divides two vec4's
	**/
	static function div(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Calculates the euclidian distance between two vec4's
	**/
	static function dist(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Calculates the squared euclidian distance between two vec4's
	**/
	static function sqrDist(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Calculates the length of a vec4
	**/
	static function len(a:ReadonlyVec4):Float;
	/**
		Calculates the squared length of a vec4
	**/
	static function sqrLen(a:ReadonlyVec4):Float;
	static function forEach(a:Dynamic, stride:Dynamic, offset:Dynamic, count:Dynamic, fn:Dynamic, arg:Dynamic):Dynamic;
}