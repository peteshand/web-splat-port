package fflate;

/**
	Streaming Zlib compression
**/
@:jsRequire("fflate", "Zlib") extern class Zlib {
	/**
		Creates a Zlib stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Zlib { })
	function new(opts:ZlibOptions, ?cb:FlateStreamHandler);
	private var c : Dynamic;
	private var v : Dynamic;
	private var o : Dynamic;
	private var s : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		Pushes a chunk to be zlibbed
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	private var p : Dynamic;
	/**
		Flushes buffered uncompressed data. Useful to immediately retrieve the
		zlibbed output for small inputs.
	**/
	function flush():Void;
	static var prototype : Zlib;
}