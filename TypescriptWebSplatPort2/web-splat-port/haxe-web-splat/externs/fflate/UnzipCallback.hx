package fflate;

/**
	Callback for asynchronous ZIP decompression
**/
typedef UnzipCallback = (err:Null<FlateError>, data:Unzipped) -> Void;