package fflate;

/**
	Streaming GZIP compression
**/
@:jsRequire("fflate", "Gzip") extern class Gzip {
	/**
		Creates a GZIP stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Gzip { })
	function new(opts:GzipOptions, ?cb:FlateStreamHandler);
	private var c : Dynamic;
	private var l : Dynamic;
	private var v : Dynamic;
	private var o : Dynamic;
	private var s : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		Pushes a chunk to be GZIPped
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	private var p : Dynamic;
	/**
		Flushes buffered uncompressed data. Useful to immediately retrieve the
		GZIPped output for small inputs.
	**/
	function flush():Void;
	static var prototype : Gzip;
}