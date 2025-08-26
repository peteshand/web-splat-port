package fflate;

/**
	Handler for data (de)compression streams
**/
typedef FlateStreamHandler = (data:js.lib.Uint8Array, final_:Bool) -> Void;