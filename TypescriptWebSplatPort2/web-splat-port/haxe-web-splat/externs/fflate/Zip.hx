package fflate;

/**
	A zippable archive to which files can incrementally be added
**/
@:jsRequire("fflate", "Zip") extern class Zip {
	/**
		Creates an empty ZIP archive to which files can be added
	**/
	function new(?cb:AsyncFlateStreamHandler);
	private var u : Dynamic;
	private var d : Dynamic;
	/**
		Adds a file to the ZIP archive
	**/
	function add(file:ZipInputFile):Void;
	/**
		Ends the process of adding files and prepares to emit the final chunks.
		This *must* be called after adding all desired files for the resulting
		ZIP file to work properly.
	**/
	function end():Void;
	private var e : Dynamic;
	/**
		A method to terminate any internal workers used by the stream. Subsequent
		calls to add() will fail.
	**/
	function terminate():Void;
	/**
		The handler to call whenever data is available
	**/
	dynamic function ondata(err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool):Void;
	static var prototype : Zip;
}