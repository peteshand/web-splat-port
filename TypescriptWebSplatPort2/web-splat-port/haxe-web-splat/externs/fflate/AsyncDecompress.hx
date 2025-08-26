package fflate;

/**
	Asynchronous streaming GZIP, Zlib, or raw DEFLATE decompression
**/
@:jsRequire("fflate", "AsyncDecompress") extern class AsyncDecompress {
	/**
		Creates an asynchronous decompression stream
	**/
	@:overload(function(?cb:AsyncFlateStreamHandler):AsyncDecompress { })
	function new(opts:InflateStreamOptions, ?cb:AsyncFlateStreamHandler);
	private var G : Dynamic;
	private var I : Dynamic;
	private var Z : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		The handler to call whenever buffered source data is processed (i.e. `queuedSize` updates)
	**/
	@:optional
	dynamic function ondrain(size:Float):Void;
	/**
		The number of compressed bytes buffered in the stream
	**/
	var queuedSize : Float;
	private var i : Dynamic;
	/**
		Pushes a chunk to be decompressed
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	static var prototype : AsyncDecompress;
}