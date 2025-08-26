package fflate;

/**
	Callback for asynchronous (de)compression methods
**/
typedef FlateCallback = (err:Null<FlateError>, data:js.lib.Uint8Array) -> Void;