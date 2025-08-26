package webgpu;

typedef GPUCopyExternalImageSourceInfo = {
	/**
		The source of the texel copy. The copy source data is captured at the moment that
		{@link GPUQueue#copyExternalImageToTexture} is issued. Source size is determined as described
		by the external source dimensions table.
	**/
	var source : Dynamic;
	/**
		Defines the origin of the copy - the minimum (top-left) corner of the source sub-region to copy from.
		Together with `copySize`, defines the full copy sub-region.
	**/
	@:optional
	var origin : GPUOrigin2D;
	/**
		Describes whether the source image is vertically flipped, or not.
		If this option is set to `true`, the copy is flipped vertically: the bottom row of the source
		region is copied into the first row of the destination region, and so on.
		The {@link GPUCopyExternalImageSourceInfo#origin} option is still relative to the top-left corner
		of the source image, increasing downward.
	**/
	@:optional
	var flipY : Bool;
};