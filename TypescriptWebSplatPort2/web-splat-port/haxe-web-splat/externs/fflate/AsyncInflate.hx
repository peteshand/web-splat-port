package fflate;

/**
	Asynchronous streaming DEFLATE decompression
**/
@:jsRequire("fflate", "AsyncInflate") extern class AsyncInflate {
	/**
		Creates an asynchronous DEFLATE decompression stream
	**/
	@:overload(function(?cb:AsyncFlateStreamHandler):AsyncInflate { })
	function new(opts:InflateStreamOptions, ?cb:AsyncFlateStreamHandler);
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
	/**
		Pushes a chunk to be inflated
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	/**
		A method to terminate the stream's internal worker. Subsequent calls to
		push() will silently fail.
	**/
	dynamic function terminate():Void;
	static var prototype : AsyncInflate;
}