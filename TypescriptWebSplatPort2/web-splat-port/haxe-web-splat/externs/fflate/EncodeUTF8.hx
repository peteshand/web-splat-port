package fflate;

/**
	Streaming UTF-8 encoding
**/
@:jsRequire("fflate", "EncodeUTF8") extern class EncodeUTF8 {
	/**
		Creates a UTF-8 decoding stream
	**/
	function new(?cb:FlateStreamHandler);
	private var d : Dynamic;
	/**
		Pushes a chunk to be encoded to UTF-8
	**/
	function push(chunk:String, ?final_:Bool):Void;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(data:js.lib.Uint8Array, final_:Bool):Void;
	static var prototype : EncodeUTF8;
}