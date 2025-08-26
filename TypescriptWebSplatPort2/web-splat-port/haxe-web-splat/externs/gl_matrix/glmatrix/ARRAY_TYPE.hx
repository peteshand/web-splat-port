package gl_matrix.glmatrix;

@:jsRequire("gl-matrix", "glMatrix.ARRAY_TYPE") extern class ARRAY_TYPE {
	function new(length:Float);
	static var prototype : ts.AnyOf2<Array<Dynamic>, js.lib.Float32Array>;
	/**
		Creates an array from an array-like object.
		
		Creates an array from an iterable object.
		
		Creates an array from an iterable object.
		
		Creates an array from an iterable object.
		
		Creates an array from an array-like or iterable object.
		
		Creates an array from an array-like or iterable object.
		
		Creates an array from an array-like or iterable object.
	**/
	static var from : ts.AnyOf2<{
		/**
			Creates an array from an array-like object.
		**/
		@:overload(function<T, U>(arrayLike:js.lib.ArrayLike<T>, mapfn:(v:T, k:Float) -> U, ?thisArg:Dynamic):Array<U> { })
		@:overload(function<T>(iterable:ts.AnyOf2<Iterable<T>, js.lib.ArrayLike<T>>):Array<T> { })
		@:overload(function<T, U>(iterable:ts.AnyOf2<Iterable<T>, js.lib.ArrayLike<T>>, mapfn:(v:T, k:Float) -> U, ?thisArg:Dynamic):Array<U> { })
		@:selfCall
		function call<T>(arrayLike:js.lib.ArrayLike<T>):Array<T>;
	}, {
		/**
			Creates an array from an array-like or iterable object.
		**/
		@:overload(function<T>(arrayLike:js.lib.ArrayLike<T>, mapfn:(v:T, k:Float) -> Float, ?thisArg:Dynamic):js.lib.Float32Array { })
		@:overload(function(arrayLike:Iterable<Float>, ?mapfn:(v:Float, k:Float) -> Float, ?thisArg:Dynamic):js.lib.Float32Array { })
		@:selfCall
		function call(arrayLike:js.lib.ArrayLike<Float>):js.lib.Float32Array;
	}>;
	/**
		Returns a new array from a set of elements.
		
		Returns a new array from a set of elements.
	**/
	dynamic static function of<T>(items:Array<Dynamic>):ts.AnyOf2<js.lib.Float32Array, Array<T>>;
}