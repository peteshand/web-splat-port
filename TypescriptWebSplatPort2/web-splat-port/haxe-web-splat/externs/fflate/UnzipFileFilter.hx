package fflate;

/**
	A filter for files to be extracted during the unzipping process
**/
typedef UnzipFileFilter = (file:UnzipFileInfo) -> Bool;