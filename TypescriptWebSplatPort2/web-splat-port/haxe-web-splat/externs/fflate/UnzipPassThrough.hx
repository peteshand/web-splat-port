package fflate;

/**
	Streaming pass-through decompression for ZIP archives
**/
@:jsRequire("fflate", "UnzipPassThrough") extern class UnzipPassThrough {
	function new();
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		Pushes a chunk to be decompressed
	**/
	function push(data:js.lib.Uint8Array, final_:Bool):Void;
	static var prototype : UnzipPassThrough;
	static var compression : Float;
}