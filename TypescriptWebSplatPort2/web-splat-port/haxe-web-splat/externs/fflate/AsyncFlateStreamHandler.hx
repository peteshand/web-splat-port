package fflate;

/**
	Handler for asynchronous data (de)compression streams
**/
typedef AsyncFlateStreamHandler = (err:Null<FlateError>, data:js.lib.Uint8Array, final_:Bool) -> Void;