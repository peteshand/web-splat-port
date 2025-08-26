package gl_matrix;

@:jsRequire("gl-matrix", "mat2") @:forward @:forwardStatics extern abstract Mat2(ts.AnyOf2<ts.Tuple4<Float, Float, Float, Float>, js.lib.Float32Array>) from ts.AnyOf2<ts.Tuple4<Float, Float, Float, Float>, js.lib.Float32Array> to ts.AnyOf2<ts.Tuple4<Float, Float, Float, Float>, js.lib.Float32Array> {
	/**
		Creates a new identity mat2
	**/
	static function create():Mat2;
	/**
		Creates a new mat2 initialized with values from an existing matrix
	**/
	static function clone(a:ReadonlyMat2):Mat2;
	/**
		Copy the values from one mat2 to another
	**/
	static function copy(out:Mat2, a:ReadonlyMat2):Mat2;
	/**
		Set a mat2 to the identity matrix
	**/
	static function identity(out:Mat2):Mat2;
	/**
		Create a new mat2 with the given values
	**/
	static function fromValues(m00:Float, m01:Float, m10:Float, m11:Float):Mat2;
	/**
		Set the components of a mat2 to the given values
	**/
	static function set(out:Mat2, m00:Float, m01:Float, m10:Float, m11:Float):Mat2;
	/**
		Transpose the values of a mat2
	**/
	static function transpose(out:Mat2, a:ReadonlyMat2):Mat2;
	/**
		Inverts a mat2
	**/
	static function invert(out:Mat2, a:ReadonlyMat2):Mat2;
	/**
		Calculates the adjugate of a mat2
	**/
	static function adjoint(out:Mat2, a:ReadonlyMat2):Mat2;
	/**
		Calculates the determinant of a mat2
	**/
	static function determinant(a:ReadonlyMat2):Float;
	/**
		Multiplies two mat2's
	**/
	static function multiply(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
	/**
		Rotates a mat2 by the given angle
	**/
	static function rotate(out:Mat2, a:ReadonlyMat2, rad:Float):Mat2;
	/**
		Scales the mat2 by the dimensions in the given vec2
	**/
	static function scale(out:Mat2, a:ReadonlyMat2, v:ReadonlyVec2):Mat2;
	/**
		Creates a matrix from a given angle
		This is equivalent to (but much faster than):
		
		     mat2.identity(dest);
		     mat2.rotate(dest, dest, rad);
	**/
	static function fromRotation(out:Mat2, rad:Float):Mat2;
	/**
		Creates a matrix from a vector scaling
		This is equivalent to (but much faster than):
		
		     mat2.identity(dest);
		     mat2.scale(dest, dest, vec);
	**/
	static function fromScaling(out:Mat2, v:ReadonlyVec2):Mat2;
	/**
		Returns a string representation of a mat2
	**/
	static function str(a:ReadonlyMat2):String;
	/**
		Returns Frobenius norm of a mat2
	**/
	static function frob(a:ReadonlyMat2):Float;
	/**
		Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
	**/
	static function LDU(L:ReadonlyMat2, D:ReadonlyMat2, U:ReadonlyMat2, a:ReadonlyMat2):Array<ReadonlyMat2>;
	/**
		Adds two mat2's
	**/
	static function add(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
	/**
		Subtracts matrix b from matrix a
	**/
	static function subtract(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
	/**
		Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyMat2, b:ReadonlyMat2):Bool;
	/**
		Returns whether or not the matrices have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyMat2, b:ReadonlyMat2):Bool;
	/**
		Multiply each element of the matrix by a scalar.
	**/
	static function multiplyScalar(out:Mat2, a:ReadonlyMat2, b:Float):Mat2;
	/**
		Adds two mat2's after multiplying each element of the second operand by a scalar value.
	**/
	static function multiplyScalarAndAdd(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2, scale:Float):Mat2;
	/**
		Multiplies two mat2's
	**/
	static function mul(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
	/**
		Subtracts matrix b from matrix a
	**/
	static function sub(out:Mat2, a:ReadonlyMat2, b:ReadonlyMat2):Mat2;
}