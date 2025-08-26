package fflate;

/**
	Options for decompressing a DEFLATE stream
**/
typedef InflateStreamOptions = {
	/**
		The dictionary used to compress the original data. If no dictionary was used during compression, this option has no effect.
		
		Supplying the wrong dictionary during decompression usually yields corrupt output or causes an invalid distance error.
	**/
	@:optional
	var dictionary : js.lib.Uint8Array;
};