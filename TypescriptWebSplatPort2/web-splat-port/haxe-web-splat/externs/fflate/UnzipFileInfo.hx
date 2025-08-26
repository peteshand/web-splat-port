package fflate;

/**
	Information about a file to be extracted from a ZIP archive
**/
typedef UnzipFileInfo = {
	/**
		The name of the file
	**/
	var name : String;
	/**
		The compressed size of the file
	**/
	var size : Float;
	/**
		The original size of the file
	**/
	var originalSize : Float;
	/**
		The compression format for the data stream. This number is determined by
		the spec in PKZIP's APPNOTE.txt, section 4.4.5. For example, 0 = no
		compression, 8 = deflate, 14 = LZMA. If the filter function returns true
		but this value is not 8, the unzip function will throw.
	**/
	var compression : Float;
};