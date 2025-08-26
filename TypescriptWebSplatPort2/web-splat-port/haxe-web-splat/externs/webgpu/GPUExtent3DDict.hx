package webgpu;

typedef GPUExtent3DDict = {
	/**
		The width of the extent.
	**/
	var width : Float;
	/**
		The height of the extent.
	**/
	@:optional
	var height : Float;
	/**
		The depth of the extent or the number of array layers it contains.
		If used with a {@link GPUTexture} with a {@link GPUTextureDimension} of {@link GPUTextureDimension} `"3d"`
		defines the depth of the texture. If used with a {@link GPUTexture} with a {@link GPUTextureDimension}
		of {@link GPUTextureDimension} `"2d"` defines the number of array layers in the texture.
	**/
	@:optional
	var depthOrArrayLayers : Float;
};