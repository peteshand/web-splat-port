package fflate;

/**
	Options for decompressing GZIP data asynchronously
**/
typedef AsyncGunzipOptions = {
	/**
		Whether or not to "consume" the source data. This will make the typed array/buffer you pass in
		unusable but will increase performance and reduce memory usage.
	**/
	@:optional
	var consume : Bool;
	/**
		The dictionary used to compress the original data. If no dictionary was used during compression, this option has no effect.
		
		Supplying the wrong dictionary during decompression usually yields corrupt output or causes an invalid distance error.
	**/
	@:optional
	var dictionary : js.lib.Uint8Array;
};