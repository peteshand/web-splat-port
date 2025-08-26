package fflate;

/**
	Handler for new GZIP members in concatenated GZIP streams. Useful for building indices used to perform random-access reads on compressed files.
**/
typedef GunzipMemberHandler = (offset:Float) -> Void;