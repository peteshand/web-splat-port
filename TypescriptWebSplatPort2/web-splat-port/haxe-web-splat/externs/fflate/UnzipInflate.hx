package fflate;

/**
	Streaming DEFLATE decompression for ZIP archives. Prefer AsyncZipInflate for
	better performance.
**/
@:jsRequire("fflate", "UnzipInflate") extern class UnzipInflate {
	/**
		Creates a DEFLATE decompression that can be used in ZIP archives
	**/
	function new();
	private var i : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		Pushes a chunk to be decompressed
	**/
	function push(data:js.lib.Uint8Array, final_:Bool):Void;
	static var prototype : UnzipInflate;
	static var compression : Float;
}