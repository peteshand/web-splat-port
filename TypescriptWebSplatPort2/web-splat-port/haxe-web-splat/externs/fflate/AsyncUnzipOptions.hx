package fflate;

/**
	Options for asynchronously expanding a ZIP archive
**/
typedef AsyncUnzipOptions = {
	/**
		A filter function to extract only certain files from a ZIP archive
	**/
	@:optional
	dynamic function filter(file:UnzipFileInfo):Bool;
};