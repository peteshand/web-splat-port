package fflate;

/**
	Streaming DEFLATE decompression
**/
@:jsRequire("fflate", "Inflate") extern class Inflate {
	/**
		Creates a DEFLATE decompression stream
	**/
	@:overload(function(?cb:FlateStreamHandler):Inflate { })
	function new(opts:InflateStreamOptions, ?cb:FlateStreamHandler);
	private var s : Dynamic;
	private var o : Dynamic;
	private var p : Dynamic;
	private var d : Dynamic;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	private var e : Dynamic;
	private var c : Dynamic;
	/**
		Pushes a chunk to be inflated
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	static var prototype : Inflate;
}