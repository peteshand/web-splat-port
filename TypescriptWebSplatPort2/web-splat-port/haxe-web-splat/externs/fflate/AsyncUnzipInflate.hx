package fflate;

/**
	Asynchronous streaming DEFLATE decompression for ZIP archives
**/
@:jsRequire("fflate", "AsyncUnzipInflate") extern class AsyncUnzipInflate {
	/**
		Creates a DEFLATE decompression that can be used in ZIP archives
	**/
	function new(_:String, ?sz:Float);
	private var i : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		A method to terminate any internal workers used by the stream. Subsequent
		calls to push() should silently fail.
	**/
	dynamic function terminate():Void;
	/**
		Pushes a chunk to be decompressed
	**/
	function push(data:js.lib.Uint8Array, final_:Bool):Void;
	static var prototype : AsyncUnzipInflate;
	static var compression : Float;
}