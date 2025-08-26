package gl_matrix;

@:jsRequire("gl-matrix", "glMatrix") @valueModuleOnly extern class GlMatrix {
	/**
		Sets the type of array used when creating new vectors and matrices
	**/
	static function setMatrixArrayType(type:ts.AnyOf2<js.lib.ArrayConstructor, js.lib.Float32ArrayConstructor>):Void;
	/**
		Convert Degree To Radian
	**/
	static function toRadian(a:Float):Float;
	/**
		Tests whether or not the arguments have approximately the same value, within an absolute
		or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
		than or equal to 1.0, and a relative tolerance is used for larger values)
	**/
	static function equals(a:Float, b:Float):Bool;
	/**
		Common utilities
	**/
	static final EPSILON : Float;
	static function RANDOM():Float;
}