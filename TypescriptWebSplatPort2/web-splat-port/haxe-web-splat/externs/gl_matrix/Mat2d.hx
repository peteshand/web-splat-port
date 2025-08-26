package gl_matrix;

@:jsRequire("gl-matrix", "mat2d") @:forward @:forwardStatics extern abstract Mat2d(ts.AnyOf2<js.lib.Float32Array, ts.Tuple6<Float, Float, Float, Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple6<Float, Float, Float, Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple6<Float, Float, Float, Float, Float, Float>> {
	/**
		Creates a new identity mat2d
	**/
	static function create():Mat2d;
	/**
		Creates a new mat2d initialized with values from an existing matrix
	**/
	static function clone(a:ReadonlyMat2d):Mat2d;
	/**
		Copy the values from one mat2d to another
	**/
	static function copy(out:Mat2d, a:ReadonlyMat2d):Mat2d;
	/**
		Set a mat2d to the identity matrix
	**/
	static function identity(out:Mat2d):Mat2d;
	/**
		Create a new mat2d with the given values
	**/
	static function fromValues(a:Float, b:Float, c:Float, d:Float, tx:Float, ty:Float):Mat2d;
	/**
		Set the components of a mat2d to the given values
	**/
	static function set(out:Mat2d, a:Float, b:Float, c:Float, d:Float, tx:Float, ty:Float):Mat2d;
	/**
		Inverts a mat2d
	**/
	static function invert(out:Mat2d, a:ReadonlyMat2d):Mat2d;
	/**
		Calculates the determinant of a mat2d
	**/
	static function determinant(a:ReadonlyMat2d):Float;
	/**
		Multiplies two mat2d's
	**/
	static function multiply(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
	/**
		Rotates a mat2d by the given angle
	**/
	static function rotate(out:Mat2d, a:ReadonlyMat2d, rad:Float):Mat2d;
	/**
		Scales the mat2d by the dimensions in the given vec2
	**/
	static function scale(out:Mat2d, a:ReadonlyMat2d, v:ReadonlyVec2):Mat2d;
	/**
		Translates the mat2d by the dimensions in the given vec2
	**/
	static function translate(out:Mat2d, a:ReadonlyMat2d, v:ReadonlyVec2):Mat2d;
	/**
		Creates a matrix from a given angle
		This is equivalent to (but much faster than):
		
		     mat2d.identity(dest);
		     mat2d.rotate(dest, dest, rad);
	**/
	static function fromRotation(out:Mat2d, rad:Float):Mat2d;
	/**
		Creates a matrix from a vector scaling
		This is equivalent to (but much faster than):
		
		     mat2d.identity(dest);
		     mat2d.scale(dest, dest, vec);
	**/
	static function fromScaling(out:Mat2d, v:ReadonlyVec2):Mat2d;
	/**
		Creates a matrix from a vector translation
		This is equivalent to (but much faster than):
		
		     mat2d.identity(dest);
		     mat2d.translate(dest, dest, vec);
	**/
	static function fromTranslation(out:Mat2d, v:ReadonlyVec2):Mat2d;
	/**
		Returns a string representation of a mat2d
	**/
	static function str(a:ReadonlyMat2d):String;
	/**
		Returns Frobenius norm of a mat2d
	**/
	static function frob(a:ReadonlyMat2d):Float;
	/**
		Adds two mat2d's
	**/
	static function add(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
	/**
		Subtracts matrix b from matrix a
	**/
	static function subtract(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
	/**
		Multiply each element of the matrix by a scalar.
	**/
	static function multiplyScalar(out:Mat2d, a:ReadonlyMat2d, b:Float):Mat2d;
	/**
		Adds two mat2d's after multiplying each element of the second operand by a scalar value.
	**/
	static function multiplyScalarAndAdd(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d, scale:Float):Mat2d;
	/**
		Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyMat2d, b:ReadonlyMat2d):Bool;
	/**
		Returns whether or not the matrices have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyMat2d, b:ReadonlyMat2d):Bool;
	/**
		Multiplies two mat2d's
	**/
	static function mul(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
	/**
		Subtracts matrix b from matrix a
	**/
	static function sub(out:Mat2d, a:ReadonlyMat2d, b:ReadonlyMat2d):Mat2d;
}