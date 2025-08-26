package webgpu;

typedef IGPUCompilationMessage = {
	final __brand : String;
	/**
		The human-readable, localizable text for this compilation message.
		Note: The {@link GPUCompilationMessage#message} should follow the best practices for language
		and direction information. This includes making use of any future standards which may
		emerge regarding the reporting of string language and direction metadata.
		<p class="note editorial"><span class=marker>Editorial note:</span>
		At the time of this writing, no language/direction recommendation is available that provides
		compatibility and consistency with legacy APIs, but when there is, adopt it formally.
	**/
	final message : String;
	/**
		The severity level of the message.
		If the {@link GPUCompilationMessage#type} is {@link GPUCompilationMessageType} `"error"`, it
		corresponds to a shader-creation error.
	**/
	final type : GPUCompilationMessageType;
	/**
		The line number in the shader {@link GPUShaderModuleDescriptor#code} the
		{@link GPUCompilationMessage#message} corresponds to. Value is one-based, such that a lineNum of
		`1` indicates the first line of the shader {@link GPUShaderModuleDescriptor#code}. Lines are
		delimited by line breaks.
		If the {@link GPUCompilationMessage#message} corresponds to a substring this points to
		the line on which the substring begins. Must be `0` if the {@link GPUCompilationMessage#message}
		does not correspond to any specific point in the shader {@link GPUShaderModuleDescriptor#code}.
	**/
	final lineNum : Float;
	/**
		The offset, in UTF-16 code units, from the beginning of line {@link GPUCompilationMessage#lineNum}
		of the shader {@link GPUShaderModuleDescriptor#code} to the point or beginning of the substring
		that the {@link GPUCompilationMessage#message} corresponds to. Value is one-based, such that a
		{@link GPUCompilationMessage#linePos} of `1` indicates the first code unit of the line.
		If {@link GPUCompilationMessage#message} corresponds to a substring this points to the
		first UTF-16 code unit of the substring. Must be `0` if the {@link GPUCompilationMessage#message}
		does not correspond to any specific point in the shader {@link GPUShaderModuleDescriptor#code}.
	**/
	final linePos : Float;
	/**
		The offset from the beginning of the shader {@link GPUShaderModuleDescriptor#code} in UTF-16
		code units to the point or beginning of the substring that {@link GPUCompilationMessage#message}
		corresponds to. Must reference the same position as {@link GPUCompilationMessage#lineNum} and
		{@link GPUCompilationMessage#linePos}. Must be `0` if the {@link GPUCompilationMessage#message}
		does not correspond to any specific point in the shader {@link GPUShaderModuleDescriptor#code}.
	**/
	final offset : Float;
	/**
		The number of UTF-16 code units in the substring that {@link GPUCompilationMessage#message}
		corresponds to. If the message does not correspond with a substring then
		{@link GPUCompilationMessage#length} must be 0.
	**/
	final length : Float;
};