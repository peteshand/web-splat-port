package fflate;

/**
	Streaming DEFLATE compression
**/
@:jsRequire("fflate", "Deflate") extern class Deflate {
	/**
		Creates a DEFLATE stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Deflate { })
	function new(opts:DeflateOptions, ?cb:FlateStreamHandler);
	private var b : Dynamic;
	private var s : Dynamic;
	private var o : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	private var p : Dynamic;
	/**
		Pushes a chunk to be deflated
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	/**
		Flushes buffered uncompressed data. Useful to immediately retrieve the
		deflated output for small inputs.
	**/
	function flush():Void;
	static var prototype : Deflate;
}