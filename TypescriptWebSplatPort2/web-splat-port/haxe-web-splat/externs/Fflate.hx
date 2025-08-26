@:jsRequire("fflate") @valueModuleOnly extern class Fflate {
	/**
		Asynchronously compresses data with DEFLATE without any wrapper
		
		Asynchronously compresses data with DEFLATE without any wrapper
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function deflate(data:js.lib.Uint8Array, opts:fflate.AsyncDeflateOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Compresses data with DEFLATE without any wrapper
	**/
	static function deflateSync(data:js.lib.Uint8Array, ?opts:fflate.DeflateOptions):js.lib.Uint8Array;
	/**
		Asynchronously expands DEFLATE data with no wrapper
		
		Asynchronously expands DEFLATE data with no wrapper
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function inflate(data:js.lib.Uint8Array, opts:fflate.AsyncInflateOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Expands DEFLATE data with no wrapper
	**/
	static function inflateSync(data:js.lib.Uint8Array, ?opts:fflate.InflateOptions):js.lib.Uint8Array;
	/**
		Asynchronously compresses data with GZIP
		
		Asynchronously compresses data with GZIP
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function gzip(data:js.lib.Uint8Array, opts:fflate.AsyncGzipOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Compresses data with GZIP
	**/
	static function gzipSync(data:js.lib.Uint8Array, ?opts:fflate.GzipOptions):js.lib.Uint8Array;
	/**
		Asynchronously expands GZIP data
		
		Asynchronously expands GZIP data
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function gunzip(data:js.lib.Uint8Array, opts:fflate.AsyncGunzipOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Expands GZIP data
	**/
	static function gunzipSync(data:js.lib.Uint8Array, ?opts:fflate.GunzipOptions):js.lib.Uint8Array;
	/**
		Asynchronously compresses data with Zlib
		
		Asynchronously compresses data with Zlib
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function zlib(data:js.lib.Uint8Array, opts:fflate.AsyncZlibOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Compress data with Zlib
	**/
	static function zlibSync(data:js.lib.Uint8Array, ?opts:fflate.ZlibOptions):js.lib.Uint8Array;
	/**
		Asynchronously expands Zlib data
		
		Asynchronously expands Zlib data
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function unzlib(data:js.lib.Uint8Array, opts:fflate.AsyncUnzlibOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Expands Zlib data
	**/
	static function unzlibSync(data:js.lib.Uint8Array, ?opts:fflate.UnzlibOptions):js.lib.Uint8Array;
	/**
		Asynchrononously expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
		
		Asynchrononously expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function decompress(data:js.lib.Uint8Array, opts:fflate.AsyncInflateOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Expands compressed GZIP, Zlib, or raw DEFLATE data, automatically detecting the format
	**/
	static function decompressSync(data:js.lib.Uint8Array, ?opts:fflate.InflateOptions):js.lib.Uint8Array;
	/**
		Converts a string into a Uint8Array for use with compression/decompression methods
	**/
	static function strToU8(str:String, ?latin1:Bool):js.lib.Uint8Array;
	/**
		Converts a Uint8Array to a string
	**/
	static function strFromU8(dat:js.lib.Uint8Array, ?latin1:Bool):String;
	/**
		Asynchronously creates a ZIP file
		
		Asynchronously creates a ZIP file
	**/
	@:overload(function(data:fflate.AsyncZippable, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function zip(data:fflate.AsyncZippable, opts:fflate.AsyncZipOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Synchronously creates a ZIP file. Prefer using `zip` for better performance
		with more than one file.
	**/
	static function zipSync(data:fflate.Zippable, ?opts:fflate.ZipOptions):js.lib.Uint8Array;
	/**
		Asynchronously decompresses a ZIP archive
		
		Asynchronously decompresses a ZIP archive
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.UnzipCallback):fflate.AsyncTerminable { })
	static function unzip(data:js.lib.Uint8Array, opts:fflate.AsyncUnzipOptions, cb:fflate.UnzipCallback):fflate.AsyncTerminable;
	/**
		Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
		performance with more than one file.
	**/
	static function unzipSync(data:js.lib.Uint8Array, ?opts:fflate.UnzipOptions):fflate.Unzipped;
	/**
		Codes for errors generated within this library
	**/
	static final FlateErrorCode : {
		final UnexpectedEOF : Int;
		final InvalidBlockType : Int;
		final InvalidLengthLiteral : Int;
		final InvalidDistance : Int;
		final StreamFinished : Int;
		final NoStreamHandler : Int;
		final InvalidHeader : Int;
		final NoCallback : Int;
		final InvalidUTF8 : Int;
		final ExtraFieldTooLong : Int;
		final InvalidDate : Int;
		final FilenameTooLong : Int;
		final StreamFinishing : Int;
		final InvalidZipData : Int;
		final UnknownCompressionMethod : Int;
	};
	/**
		Asynchronously compresses data with GZIP
		
		Asynchronously compresses data with GZIP
	**/
	@:overload(function(data:js.lib.Uint8Array, cb:fflate.FlateCallback):fflate.AsyncTerminable { })
	static function compress(data:js.lib.Uint8Array, opts:fflate.AsyncGzipOptions, cb:fflate.FlateCallback):fflate.AsyncTerminable;
	/**
		Compresses data with GZIP
	**/
	static function compressSync(data:js.lib.Uint8Array, ?opts:fflate.GzipOptions):js.lib.Uint8Array;
}