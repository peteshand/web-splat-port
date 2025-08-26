package fflate;

/**
	Options for expanding a ZIP archive
**/
typedef UnzipOptions = {
	/**
		A filter function to extract only certain files from a ZIP archive
	**/
	@:optional
	dynamic function filter(file:UnzipFileInfo):Bool;
};