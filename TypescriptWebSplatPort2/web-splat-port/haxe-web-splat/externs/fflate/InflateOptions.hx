package fflate;

/**
	Options for decompressing DEFLATE data
**/
typedef InflateOptions = {
	/**
		The buffer into which to write the decompressed data. Saves memory if you know the decompressed size in advance.
		
		Note that if the decompression result is larger than the size of this buffer, it will be truncated to fit.
	**/
	@:optional
	var out : js.lib.Uint8Array;
	/**
		The dictionary used to compress the original data. If no dictionary was used during compression, this option has no effect.
		
		Supplying the wrong dictionary during decompression usually yields corrupt output or causes an invalid distance error.
	**/
	@:optional
	var dictionary : js.lib.Uint8Array;
};