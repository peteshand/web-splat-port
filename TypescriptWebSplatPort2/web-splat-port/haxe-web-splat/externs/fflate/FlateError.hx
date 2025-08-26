package fflate;

/**
	An error generated within this library
**/
typedef FlateError = {
	/**
		The code associated with this error
	**/
	var code : Float;
	var name : String;
	var message : String;
	@:optional
	var stack : String;
};