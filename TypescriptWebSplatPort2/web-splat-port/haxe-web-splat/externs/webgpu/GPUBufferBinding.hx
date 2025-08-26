package webgpu;

typedef GPUBufferBinding = {
	/**
		The {@link GPUBuffer} to bind.
	**/
	var buffer : GPUBuffer;
	/**
		The offset, in bytes, from the beginning of {@link GPUBufferBinding#buffer} to the
		beginning of the range exposed to the shader by the buffer binding.
	**/
	@:optional
	var offset : Float;
	/**
		The size, in bytes, of the buffer binding.
		If not map/exist|provided, specifies the range starting at
		{@link GPUBufferBinding#offset} and ending at the end of {@link GPUBufferBinding#buffer}.
	**/
	@:optional
	var size : Float;
};