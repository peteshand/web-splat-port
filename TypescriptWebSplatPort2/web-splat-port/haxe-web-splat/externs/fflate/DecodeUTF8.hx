package fflate;

/**
	Streaming UTF-8 decoding
**/
@:jsRequire("fflate", "DecodeUTF8") extern class DecodeUTF8 {
	/**
		Creates a UTF-8 decoding stream
	**/
	function new(?cb:StringStreamHandler);
	private var p : Dynamic;
	private var t : Dynamic;
	/**
		Pushes a chunk to be decoded from UTF-8 binary
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Void;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:String, final_:Bool):Void;
	static var prototype : DecodeUTF8;
}