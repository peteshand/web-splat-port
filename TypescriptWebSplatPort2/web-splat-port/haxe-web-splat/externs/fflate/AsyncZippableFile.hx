package fflate;

/**
	A file that can be used to asynchronously create a ZIP archive
**/
typedef AsyncZippableFile = ts.AnyOf3<js.lib.Uint8Array, AsyncZippable, ts.Tuple2<ts.AnyOf2<js.lib.Uint8Array, AsyncZippable>, AsyncZipOptions>>;