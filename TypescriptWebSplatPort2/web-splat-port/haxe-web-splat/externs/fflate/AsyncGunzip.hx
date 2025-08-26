package fflate;

/**
	Asynchronous streaming single or multi-member GZIP decompression
**/
@:jsRequire("fflate", "AsyncGunzip") extern class AsyncGunzip {
	/**
		Creates an asynchronous GUNZIP stream
	**/
	@:overload(function(?cb:AsyncFlateStreamHandler):AsyncGunzip { })
	function new(opts:GunzipStreamOptions, ?cb:AsyncFlateStreamHandler);
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
		The handler to call whenever a new GZIP member is found
	**/
	@:optional
	dynamic function onmember(offset:Float):Void;
	/**
		Pushes a chunk to be GUNZIPped
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	/**
		A method to terminate the stream's internal worker. Subsequent calls to
		push() will silently fail.
	**/
	dynamic function terminate():Void;
	static var prototype : AsyncGunzip;
}