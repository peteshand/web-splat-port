package gl_matrix;

@:jsRequire("gl-matrix", "vec3") @:forward @:forwardStatics extern abstract Vec3(ts.AnyOf2<js.lib.Float32Array, ts.Tuple3<Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple3<Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple3<Float, Float, Float>> {
	/**
		Creates a new, empty vec3
	**/
	static function create():Vec3;
	/**
		Creates a new vec3 initialized with values from an existing vector
	**/
	static function clone(a:ReadonlyVec3):Vec3;
	/**
		Calculates the length of a vec3
	**/
	static function length(a:ReadonlyVec3):Float;
	/**
		Creates a new vec3 initialized with the given values
	**/
	static function fromValues(x:Float, y:Float, z:Float):Vec3;
	/**
		Copy the values from one vec3 to another
	**/
	static function copy(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Set the components of a vec3 to the given values
	**/
	static function set(out:Vec3, x:Float, y:Float, z:Float):Vec3;
	/**
		Adds two vec3's
	**/
	static function add(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Subtracts vector b from vector a
	**/
	static function subtract(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Multiplies two vec3's
	**/
	static function multiply(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Divides two vec3's
	**/
	static function divide(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Math.ceil the components of a vec3
	**/
	static function ceil(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Math.floor the components of a vec3
	**/
	static function floor(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Returns the minimum of two vec3's
	**/
	static function min(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Returns the maximum of two vec3's
	**/
	static function max(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Math.round the components of a vec3
	**/
	static function round(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Scales a vec3 by a scalar number
	**/
	static function scale(out:Vec3, a:ReadonlyVec3, b:Float):Vec3;
	/**
		Adds two vec3's after scaling the second operand by a scalar value
	**/
	static function scaleAndAdd(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, scale:Float):Vec3;
	/**
		Calculates the euclidian distance between two vec3's
	**/
	static function distance(a:ReadonlyVec3, b:ReadonlyVec3):Float;
	/**
		Calculates the squared euclidian distance between two vec3's
	**/
	static function squaredDistance(a:ReadonlyVec3, b:ReadonlyVec3):Float;
	/**
		Calculates the squared length of a vec3
	**/
	static function squaredLength(a:ReadonlyVec3):Float;
	/**
		Negates the components of a vec3
	**/
	static function negate(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Returns the inverse of the components of a vec3
	**/
	static function inverse(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Normalize a vec3
	**/
	static function normalize(out:Vec3, a:ReadonlyVec3):Vec3;
	/**
		Calculates the dot product of two vec3's
	**/
	static function dot(a:ReadonlyVec3, b:ReadonlyVec3):Float;
	/**
		Computes the cross product of two vec3's
	**/
	static function cross(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Performs a linear interpolation between two vec3's
	**/
	static function lerp(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, t:Float):Vec3;
	/**
		Performs a hermite interpolation with two control points
	**/
	static function hermite(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, c:ReadonlyVec3, d:ReadonlyVec3, t:Float):Vec3;
	/**
		Performs a bezier interpolation with two control points
	**/
	static function bezier(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, c:ReadonlyVec3, d:ReadonlyVec3, t:Float):Vec3;
	/**
		Generates a random vector with the given scale
	**/
	static function random(out:Vec3, ?scale:Float):Vec3;
	/**
		Transforms the vec3 with a mat4.
		4th vector component is implicitly '1'
	**/
	static function transformMat4(out:Vec3, a:ReadonlyVec3, m:ReadonlyMat4):Vec3;
	/**
		Transforms the vec3 with a mat3.
	**/
	static function transformMat3(out:Vec3, a:ReadonlyVec3, m:ReadonlyMat3):Vec3;
	/**
		Transforms the vec3 with a quat
		Can also be used for dual quaternions. (Multiply it with the real part)
	**/
	static function transformQuat(out:Vec3, a:ReadonlyVec3, q:ReadonlyQuat):Vec3;
	/**
		Rotate a 3D vector around the x-axis
	**/
	static function rotateX(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, rad:Float):Vec3;
	/**
		Rotate a 3D vector around the y-axis
	**/
	static function rotateY(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, rad:Float):Vec3;
	/**
		Rotate a 3D vector around the z-axis
	**/
	static function rotateZ(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3, rad:Float):Vec3;
	/**
		Get the angle between two 3D vectors
	**/
	static function angle(a:ReadonlyVec3, b:ReadonlyVec3):Float;
	/**
		Set the components of a vec3 to zero
	**/
	static function zero(out:Vec3):Vec3;
	/**
		Returns a string representation of a vector
	**/
	static function str(a:ReadonlyVec3):String;
	/**
		Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyVec3, b:ReadonlyVec3):Bool;
	/**
		Returns whether or not the vectors have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyVec3, b:ReadonlyVec3):Bool;
	/**
		Subtracts vector b from vector a
	**/
	static function sub(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Multiplies two vec3's
	**/
	static function mul(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Divides two vec3's
	**/
	static function div(out:Vec3, a:ReadonlyVec3, b:ReadonlyVec3):Vec3;
	/**
		Calculates the euclidian distance between two vec3's
	**/
	static function dist(a:ReadonlyVec3, b:ReadonlyVec3):Float;
	/**
		Calculates the squared euclidian distance between two vec3's
	**/
	static function sqrDist(a:ReadonlyVec3, b:ReadonlyVec3):Float;
	/**
		Calculates the length of a vec3
	**/
	static function len(a:ReadonlyVec3):Float;
	/**
		Calculates the squared length of a vec3
	**/
	static function sqrLen(a:ReadonlyVec3):Float;
	static function forEach(a:Dynamic, stride:Dynamic, offset:Dynamic, count:Dynamic, fn:Dynamic, arg:Dynamic):Dynamic;
}