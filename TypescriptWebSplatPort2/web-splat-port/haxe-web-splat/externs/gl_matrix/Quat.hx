package gl_matrix;

@:jsRequire("gl-matrix", "quat") @:forward @:forwardStatics extern abstract Quat(ts.AnyOf2<js.lib.Float32Array, ts.Tuple4<Float, Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple4<Float, Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple4<Float, Float, Float, Float>> {
	/**
		Creates a new identity quat
	**/
	static function create():Quat;
	/**
		Set a quat to the identity quaternion
	**/
	static function identity(out:Quat):Quat;
	/**
		Sets a quat from the given angle and rotation axis,
		then returns it.
	**/
	static function setAxisAngle(out:Quat, axis:ReadonlyVec3, rad:Float):Quat;
	/**
		Gets the rotation axis and angle for a given
		  quaternion. If a quaternion is created with
		  setAxisAngle, this method will return the same
		  values as providied in the original parameter list
		  OR functionally equivalent values.
		Example: The quaternion formed by axis [0, 0, 1] and
		  angle -90 is the same as the quaternion formed by
		  [0, 0, 1] and 270. This method favors the latter.
	**/
	static function getAxisAngle(out_axis:Vec3, q:ReadonlyQuat):Float;
	/**
		Gets the angular distance between two unit quaternions
	**/
	static function getAngle(a:ReadonlyQuat, b:ReadonlyQuat):Float;
	/**
		Multiplies two quat's
	**/
	static function multiply(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat):Quat;
	/**
		Rotates a quaternion by the given angle about the X axis
	**/
	static function rotateX(out:Quat, a:ReadonlyQuat, rad:Float):Quat;
	/**
		Rotates a quaternion by the given angle about the Y axis
	**/
	static function rotateY(out:Quat, a:ReadonlyQuat, rad:Float):Quat;
	/**
		Rotates a quaternion by the given angle about the Z axis
	**/
	static function rotateZ(out:Quat, a:ReadonlyQuat, rad:Float):Quat;
	/**
		Calculates the W component of a quat from the X, Y, and Z components.
		Assumes that quaternion is 1 unit in length.
		Any existing W component will be ignored.
	**/
	static function calculateW(out:Quat, a:ReadonlyQuat):Quat;
	/**
		Calculate the exponential of a unit quaternion.
	**/
	static function exp(out:Quat, a:ReadonlyQuat):Quat;
	/**
		Calculate the natural logarithm of a unit quaternion.
	**/
	static function ln(out:Quat, a:ReadonlyQuat):Quat;
	/**
		Calculate the scalar power of a unit quaternion.
	**/
	static function pow(out:Quat, a:ReadonlyQuat, b:Float):Quat;
	/**
		Performs a spherical linear interpolation between two quat
	**/
	static function slerp(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat, t:Float):Quat;
	/**
		Generates a random unit quaternion
	**/
	static function random(out:Quat):Quat;
	/**
		Calculates the inverse of a quat
	**/
	static function invert(out:Quat, a:ReadonlyQuat):Quat;
	/**
		Calculates the conjugate of a quat
		If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
	**/
	static function conjugate(out:Quat, a:ReadonlyQuat):Quat;
	/**
		Creates a quaternion from the given 3x3 rotation matrix.
		
		NOTE: The resultant quaternion is not normalized, so you should be sure
		to renormalize the quaternion yourself where necessary.
	**/
	static function fromMat3(out:Quat, m:ReadonlyMat3):Quat;
	/**
		Creates a quaternion from the given euler angle x, y, z.
	**/
	static function fromEuler(out:Quat, x:Dynamic, y:Dynamic, z:Dynamic):Quat;
	/**
		Returns a string representation of a quatenion
	**/
	static function str(a:ReadonlyQuat):String;
	/**
		Multiplies two quat's
	**/
	static function mul(out:Quat, a:ReadonlyQuat, b:ReadonlyQuat):Quat;
	static function rotationTo(out:Dynamic, a:Dynamic, b:Dynamic):Dynamic;
	static function sqlerp(out:Dynamic, a:Dynamic, b:Dynamic, c:Dynamic, d:Dynamic, t:Dynamic):Dynamic;
	static function setAxes(out:Dynamic, view:Dynamic, right:Dynamic, up:Dynamic):Vec4;
	/**
		Creates a new quat initialized with values from an existing quaternion
	**/
	static function clone(a:ReadonlyVec4):Vec4;
	/**
		Creates a new quat initialized with the given values
	**/
	static function fromValues(x:Float, y:Float, z:Float, w:Float):Vec4;
	/**
		Copy the values from one quat to another
	**/
	static function copy(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Set the components of a quat to the given values
	**/
	static function set(out:Vec4, x:Float, y:Float, z:Float, w:Float):Vec4;
	/**
		Adds two quat's
	**/
	static function add(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4):Vec4;
	/**
		Scales a quat by a scalar number
	**/
	static function scale(out:Vec4, a:ReadonlyVec4, b:Float):Vec4;
	/**
		Calculates the dot product of two quat's
	**/
	static function dot(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Performs a linear interpolation between two quat's
	**/
	static function lerp(out:Vec4, a:ReadonlyVec4, b:ReadonlyVec4, t:Float):Vec4;
	/**
		Calculates the length of a quat
	**/
	static function length(a:ReadonlyVec4):Float;
	/**
		Alias for {@link quat.length}
	**/
	static function len(a:ReadonlyVec4):Float;
	/**
		Calculates the squared length of a quat
	**/
	static function squaredLength(a:ReadonlyVec4):Float;
	/**
		Alias for {@link quat.squaredLength}
	**/
	static function sqrLen(a:ReadonlyVec4):Float;
	/**
		Normalize a quat
	**/
	static function normalize(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyVec4, b:ReadonlyVec4):Bool;
	/**
		Returns whether or not the quaternions have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyVec4, b:ReadonlyVec4):Bool;
}