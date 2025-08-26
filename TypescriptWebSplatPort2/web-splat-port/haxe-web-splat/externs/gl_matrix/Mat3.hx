package gl_matrix;

@:jsRequire("gl-matrix", "mat3") @:forward @:forwardStatics extern abstract Mat3(ts.AnyOf2<js.lib.Float32Array, ts.Tuple9<Float, Float, Float, Float, Float, Float, Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple9<Float, Float, Float, Float, Float, Float, Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple9<Float, Float, Float, Float, Float, Float, Float, Float, Float>> {
	/**
		Creates a new identity mat3
	**/
	static function create():Mat3;
	/**
		Copies the upper-left 3x3 values into the given mat3.
	**/
	static function fromMat4(out:Mat3, a:ReadonlyMat4):Mat3;
	/**
		Creates a new mat3 initialized with values from an existing matrix
	**/
	static function clone(a:ReadonlyMat3):Mat3;
	/**
		Copy the values from one mat3 to another
	**/
	static function copy(out:Mat3, a:ReadonlyMat3):Mat3;
	/**
		Create a new mat3 with the given values
	**/
	static function fromValues(m00:Float, m01:Float, m02:Float, m10:Float, m11:Float, m12:Float, m20:Float, m21:Float, m22:Float):Mat3;
	/**
		Set the components of a mat3 to the given values
	**/
	static function set(out:Mat3, m00:Float, m01:Float, m02:Float, m10:Float, m11:Float, m12:Float, m20:Float, m21:Float, m22:Float):Mat3;
	/**
		Set a mat3 to the identity matrix
	**/
	static function identity(out:Mat3):Mat3;
	/**
		Transpose the values of a mat3
	**/
	static function transpose(out:Mat3, a:ReadonlyMat3):Mat3;
	/**
		Inverts a mat3
	**/
	static function invert(out:Mat3, a:ReadonlyMat3):Mat3;
	/**
		Calculates the adjugate of a mat3
	**/
	static function adjoint(out:Mat3, a:ReadonlyMat3):Mat3;
	/**
		Calculates the determinant of a mat3
	**/
	static function determinant(a:ReadonlyMat3):Float;
	/**
		Multiplies two mat3's
	**/
	static function multiply(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
	/**
		Translate a mat3 by the given vector
	**/
	static function translate(out:Mat3, a:ReadonlyMat3, v:ReadonlyVec2):Mat3;
	/**
		Rotates a mat3 by the given angle
	**/
	static function rotate(out:Mat3, a:ReadonlyMat3, rad:Float):Mat3;
	/**
		Scales the mat3 by the dimensions in the given vec2
	**/
	static function scale(out:Mat3, a:ReadonlyMat3, v:ReadonlyVec2):Mat3;
	/**
		Creates a matrix from a vector translation
		This is equivalent to (but much faster than):
		
		     mat3.identity(dest);
		     mat3.translate(dest, dest, vec);
	**/
	static function fromTranslation(out:Mat3, v:ReadonlyVec2):Mat3;
	/**
		Creates a matrix from a given angle
		This is equivalent to (but much faster than):
		
		     mat3.identity(dest);
		     mat3.rotate(dest, dest, rad);
	**/
	static function fromRotation(out:Mat3, rad:Float):Mat3;
	/**
		Creates a matrix from a vector scaling
		This is equivalent to (but much faster than):
		
		     mat3.identity(dest);
		     mat3.scale(dest, dest, vec);
	**/
	static function fromScaling(out:Mat3, v:ReadonlyVec2):Mat3;
	/**
		Copies the values from a mat2d into a mat3
	**/
	static function fromMat2d(out:Mat3, a:ReadonlyMat2d):Mat3;
	/**
		Calculates a 3x3 matrix from the given quaternion
	**/
	static function fromQuat(out:Mat3, q:ReadonlyQuat):Mat3;
	/**
		Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
	**/
	static function normalFromMat4(out:Mat3, a:ReadonlyMat4):Mat3;
	/**
		Generates a 2D projection matrix with the given bounds
	**/
	static function projection(out:Mat3, width:Float, height:Float):Mat3;
	/**
		Returns a string representation of a mat3
	**/
	static function str(a:ReadonlyMat3):String;
	/**
		Returns Frobenius norm of a mat3
	**/
	static function frob(a:ReadonlyMat3):Float;
	/**
		Adds two mat3's
	**/
	static function add(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
	/**
		Subtracts matrix b from matrix a
	**/
	static function subtract(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
	/**
		Multiply each element of the matrix by a scalar.
	**/
	static function multiplyScalar(out:Mat3, a:ReadonlyMat3, b:Float):Mat3;
	/**
		Adds two mat3's after multiplying each element of the second operand by a scalar value.
	**/
	static function multiplyScalarAndAdd(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3, scale:Float):Mat3;
	/**
		Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyMat3, b:ReadonlyMat3):Bool;
	/**
		Returns whether or not the matrices have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyMat3, b:ReadonlyMat3):Bool;
	/**
		Multiplies two mat3's
	**/
	static function mul(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
	/**
		Subtracts matrix b from matrix a
	**/
	static function sub(out:Mat3, a:ReadonlyMat3, b:ReadonlyMat3):Mat3;
}