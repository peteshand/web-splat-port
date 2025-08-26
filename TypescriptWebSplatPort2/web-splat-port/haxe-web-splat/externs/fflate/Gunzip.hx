package fflate;

/**
	Streaming single or multi-member GZIP decompression
**/
@:jsRequire("fflate", "Gunzip") extern class Gunzip {
	/**
		Creates a GUNZIP stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Gunzip { })
	function new(opts:GunzipStreamOptions, ?cb:FlateStreamHandler);
	private var v : Dynamic;
	private var r : Dynamic;
	private var o : Dynamic;
	private var p : Dynamic;
	private var s : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		The handler to call whenever a new GZIP member is found
	**/
	@:optional
	dynamic function onmember(offset:Float):Void;
	/**
		Pushes a chunk to be GUNZIPped
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	static var prototype : Gunzip;
}