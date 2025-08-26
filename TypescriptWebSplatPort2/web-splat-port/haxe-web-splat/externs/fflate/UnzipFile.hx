package fflate;

/**
	Streaming file extraction from ZIP archives
**/
typedef UnzipFile = {
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	/**
		The name of the file
	**/
	var name : String;
	/**
		The compression format for the data stream. This number is determined by
		the spec in PKZIP's APPNOTE.txt, section 4.4.5. For example, 0 = no
		compression, 8 = deflate, 14 = LZMA. If start() is called but there is no
		decompression stream available for this method, start() will throw.
	**/
	var compression : Float;
	/**
		The compressed size of the file. Will not be present for archives created
		in a streaming fashion.
	**/
	@:optional
	var size : Float;
	/**
		The original size of the file. Will not be present for archives created
		in a streaming fashion.
	**/
	@:optional
	var originalSize : Float;
	/**
		Starts reading from the stream. Calling this function will always enable
		this stream, but ocassionally the stream will be enabled even without
		this being called.
	**/
	function start():Void;
	/**
		A method to terminate any internal workers used by the stream. ondata
		will not be called any further.
	**/
	dynamic function terminate():Void;
};