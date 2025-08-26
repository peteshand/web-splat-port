package fflate;

/**
	A constructor for a decoder for unzip streams
**/
typedef UnzipDecoderConstructor = {
	/**
		The compression format for the data stream. This number is determined by
		the spec in PKZIP's APPNOTE.txt, section 4.4.5. For example, 0 = no
		compression, 8 = deflate, 14 = LZMA
	**/
	var compression : Float;
};