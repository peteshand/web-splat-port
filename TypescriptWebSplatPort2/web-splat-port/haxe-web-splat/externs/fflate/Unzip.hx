package fflate;

/**
	A ZIP archive decompression stream that emits files as they are discovered
**/
@:jsRequire("fflate", "Unzip") extern class Unzip {
	/**
		Creates a ZIP decompression stream
	**/
	function new(?cb:UnzipFileHandler);
	private var d : Dynamic;
	private var c : Dynamic;
	private var p : Dynamic;
	private var k : Dynamic;
	private var o : Dynamic;
	/**
		Pushes a chunk to be unzipped
	**/
	function push(chunk:js.lib.Uint8Array, ?final_:Bool):Dynamic;
	/**
		Registers a decoder with the stream, allowing for files compressed with
		the compression type provided to be expanded correctly
	**/
	function register(decoder:UnzipDecoderConstructor):Void;
	/**
		The handler to call whenever a file is discovered
	**/
	dynamic function onfile(file:UnzipFile):Void;
	static var prototype : Unzip;
}