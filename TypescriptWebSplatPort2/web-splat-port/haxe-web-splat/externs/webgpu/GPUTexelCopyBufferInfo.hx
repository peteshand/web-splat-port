package webgpu;

typedef GPUTexelCopyBufferInfo = {
	/**
		A buffer which either contains texel data to be copied or will store the texel data being
		copied, depending on the method it is being passed to.
	**/
	var buffer : GPUBuffer;
	/**
		The offset, in bytes, from the beginning of the texel data source (such as a
		{@link GPUTexelCopyBufferInfo#buffer | GPUTexelCopyBufferInfo.buffer}) to the start of the texel data
		within that source.
	**/
	@:optional
	var offset : Float;
	/**
		The stride, in bytes, between the beginning of each texel block row and the subsequent
		texel block row.
		Required if there are multiple texel block rows (i.e. the copy height or depth is more
		than one block).
	**/
	@:optional
	var bytesPerRow : Float;
	/**
		Number of texel block rows per single texel image of the texture.
		{@link GPUTexelCopyBufferLayout#rowsPerImage} &times;
		{@link GPUTexelCopyBufferLayout#bytesPerRow} is the stride, in bytes, between the beginning of each
		texel image of data and the subsequent texel image.
		Required if there are multiple texel images (i.e. the copy depth is more than one).
	**/
	@:optional
	var rowsPerImage : Float;
};