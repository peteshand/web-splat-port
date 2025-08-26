package fflate;

/**
	A decoder for files in ZIP streams
**/
typedef UnzipDecoder = {
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		Pushes a chunk to be decompressed
	**/
	function push(data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		A method to terminate any internal workers used by the stream. Subsequent
		calls to push() should silently fail.
	**/
	@:optional
	dynamic function terminate():Void;
};