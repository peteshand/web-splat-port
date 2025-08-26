package fflate;

/**
	A file that can be used to create a ZIP archive
**/
typedef ZippableFile = ts.AnyOf3<js.lib.Uint8Array, Zippable, ts.Tuple2<ts.AnyOf2<js.lib.Uint8Array, Zippable>, ZipOptions>>;