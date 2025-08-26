package fflate;

/**
	Streaming GZIP, Zlib, or raw DEFLATE decompression
**/
@:jsRequire("fflate", "Decompress") extern class Decompress {
	/**
		Creates a decompression stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Decompress { })
	function new(opts:InflateStreamOptions, ?cb:FlateStreamHandler);
	private var G : Dynamic;
	private var I : Dynamic;
	private var Z : Dynamic;
	private var o : Dynamic;
	private var s : Dynamic;
	private var p : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	private var i : Dynamic;
	/**
		Pushes a chunk to be decompressed
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	static var prototype : Decompress;
}