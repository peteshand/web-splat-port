package fflate;

/**
	Asynchronous streaming GZIP compression
**/
@:jsRequire("fflate", "AsyncGzip") extern class AsyncGzip {
	/**
		Creates an asynchronous GZIP stream
	**/
	@:overload(function(?cb:AsyncFlateStreamHandler):AsyncGzip { })
	function new(opts:GzipOptions, ?cb:AsyncFlateStreamHandler);
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
		The number of uncompressed bytes buffered in the stream
	**/
	var queuedSize : Float;
	/**
		Pushes a chunk to be GZIPped
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	/**
		Flushes buffered uncompressed data. Useful to immediately retrieve the
		GZIPped output for small inputs.
	**/
	function flush():Void;
	/**
		A method to terminate the stream's internal worker. Subsequent calls to
		push() will silently fail.
	**/
	dynamic function terminate():Void;
	static var prototype : AsyncGzip;
}