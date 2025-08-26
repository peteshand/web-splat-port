package fflate;

/**
	Streaming Zlib decompression
**/
@:jsRequire("fflate", "Unzlib") extern class Unzlib {
	/**
		Creates a Zlib decompression stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Unzlib { })
	function new(opts:UnzlibStreamOptions, ?cb:FlateStreamHandler);
	private var v : Dynamic;
	private var p : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		Pushes a chunk to be unzlibbed
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	static var prototype : Unzlib;
}