package gl_matrix;

@:jsRequire("gl-matrix", "quat2") @:forward @:forwardStatics extern abstract Quat2(ts.AnyOf2<js.lib.Float32Array, ts.Tuple8<Float, Float, Float, Float, Float, Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple8<Float, Float, Float, Float, Float, Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple8<Float, Float, Float, Float, Float, Float, Float, Float>> {
	/**
		Creates a new identity dual quat
	**/
	static function create():Quat2;
	/**
		Creates a new quat initialized with values from an existing quaternion
	**/
	static function clone(a:ReadonlyQuat2):Quat2;
	/**
		Creates a new dual quat initialized with the given values
	**/
	static function fromValues(x1:Float, y1:Float, z1:Float, w1:Float, x2:Float, y2:Float, z2:Float, w2:Float):Quat2;
	/**
		Creates a new dual quat from the given values (quat and translation)
	**/
	static function fromRotationTranslationValues(x1:Float, y1:Float, z1:Float, w1:Float, x2:Float, y2:Float, z2:Float):Quat2;
	/**
		Creates a dual quat from a quaternion and a translation
	**/
	static function fromRotationTranslation(out:Dynamic, q:ReadonlyQuat, t:ReadonlyVec3):Quat2;
	/**
		Creates a dual quat from a translation
	**/
	static function fromTranslation(out:Dynamic, t:ReadonlyVec3):Quat2;
	/**
		Creates a dual quat from a quaternion
	**/
	static function fromRotation(out:Dynamic, q:ReadonlyQuat):Quat2;
	/**
		Creates a new dual quat from a matrix (4x4)
	**/
	static function fromMat4(out:Quat2, a:ReadonlyMat4):Quat2;
	/**
		Copy the values from one dual quat to another
	**/
	static function copy(out:Quat2, a:ReadonlyQuat2):Quat2;
	/**
		Set a dual quat to the identity dual quaternion
	**/
	static function identity(out:Quat2):Quat2;
	/**
		Set the components of a dual quat to the given values
	**/
	static function set(out:Quat2, x1:Float, y1:Float, z1:Float, w1:Float, x2:Float, y2:Float, z2:Float, w2:Float):Quat2;
	/**
		Gets the dual part of a dual quat
	**/
	static function getDual(out:Quat, a:ReadonlyQuat2):Quat;
	/**
		Set the dual component of a dual quat to the given quaternion
	**/
	static function setDual(out:Quat2, q:ReadonlyQuat):Quat2;
	/**
		Gets the translation of a normalized dual quat
	**/
	static function getTranslation(out:Vec3, a:ReadonlyQuat2):Vec3;
	/**
		Translates a dual quat by the given vector
	**/
	static function translate(out:Quat2, a:ReadonlyQuat2, v:ReadonlyVec3):Quat2;
	/**
		Rotates a dual quat around the X axis
	**/
	static function rotateX(out:Quat2, a:ReadonlyQuat2, rad:Float):Quat2;
	/**
		Rotates a dual quat around the Y axis
	**/
	static function rotateY(out:Quat2, a:ReadonlyQuat2, rad:Float):Quat2;
	/**
		Rotates a dual quat around the Z axis
	**/
	static function rotateZ(out:Quat2, a:ReadonlyQuat2, rad:Float):Quat2;
	/**
		Rotates a dual quat by a given quaternion (a * q)
	**/
	static function rotateByQuatAppend(out:Quat2, a:ReadonlyQuat2, q:ReadonlyQuat):Quat2;
	/**
		Rotates a dual quat by a given quaternion (q * a)
	**/
	static function rotateByQuatPrepend(out:Quat2, q:ReadonlyQuat, a:ReadonlyQuat2):Quat2;
	/**
		Rotates a dual quat around a given axis. Does the normalisation automatically
	**/
	static function rotateAroundAxis(out:Quat2, a:ReadonlyQuat2, axis:ReadonlyVec3, rad:Float):Quat2;
	/**
		Adds two dual quat's
	**/
	static function add(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2):Quat2;
	/**
		Multiplies two dual quat's
	**/
	static function multiply(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2):Quat2;
	/**
		Scales a dual quat by a scalar number
	**/
	static function scale(out:Quat2, a:ReadonlyQuat2, b:Float):Quat2;
	/**
		Performs a linear interpolation between two dual quats's
		NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
	**/
	static function lerp(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2, t:Float):Quat2;
	/**
		Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
	**/
	static function invert(out:Quat2, a:ReadonlyQuat2):Quat2;
	/**
		Calculates the conjugate of a dual quat
		If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.
	**/
	static function conjugate(out:Quat2, a:ReadonlyQuat2):Quat2;
	/**
		Normalize a dual quat
	**/
	static function normalize(out:Quat2, a:ReadonlyQuat2):Quat2;
	/**
		Returns a string representation of a dual quatenion
	**/
	static function str(a:ReadonlyQuat2):String;
	/**
		Returns whether or not the dual quaternions have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyQuat2, b:ReadonlyQuat2):Bool;
	/**
		Returns whether or not the dual quaternions have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyQuat2, b:ReadonlyQuat2):Bool;
	/**
		Multiplies two dual quat's
	**/
	static function mul(out:Quat2, a:ReadonlyQuat2, b:ReadonlyQuat2):Quat2;
	/**
		Gets the real part of a dual quat
	**/
	static function getReal(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Set the real component of a dual quat to the given quaternion
	**/
	static function setReal(out:Vec4, a:ReadonlyVec4):Vec4;
	/**
		Calculates the dot product of two dual quat's (The dot product of the real parts)
	**/
	static function dot(a:ReadonlyVec4, b:ReadonlyVec4):Float;
	/**
		Calculates the length of a dual quat
	**/
	static function length(a:ReadonlyVec4):Float;
	/**
		Alias for {@link quat2.length}
	**/
	static function len(a:ReadonlyVec4):Float;
	/**
		Calculates the squared length of a dual quat
	**/
	static function squaredLength(a:ReadonlyVec4):Float;
	/**
		Alias for {@link quat2.squaredLength}
	**/
	static function sqrLen(a:ReadonlyVec4):Float;
}