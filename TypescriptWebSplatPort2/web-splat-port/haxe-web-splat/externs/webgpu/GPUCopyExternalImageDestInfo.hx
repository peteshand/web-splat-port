package webgpu;

typedef GPUCopyExternalImageDestInfo = {
	/**
		Describes the color space and encoding used to encode data into the destination texture.
		This {@link https://www.w3.org/TR/webgpu/#color-space-conversions | may result} in values outside of the range [0, 1]
		being written to the target texture, if its format can represent them.
		Otherwise, the results are clamped to the target texture format's range.
		Note:
		If {@link GPUCopyExternalImageDestInfo#colorSpace} matches the source image,
		conversion may not be necessary. See {@link https://www.w3.org/TR/webgpu/#color-space-conversion-elision}.
	**/
	@:optional
	var colorSpace : Dynamic;
	/**
		Describes whether the data written into the texture should have its RGB channels
		premultiplied by the alpha channel, or not.
		If this option is set to `true` and the {@link GPUCopyExternalImageSourceInfo#source} is also
		premultiplied, the source RGB values must be preserved even if they exceed their
		corresponding alpha values.
		Note:
		If {@link GPUCopyExternalImageDestInfo#premultipliedAlpha} matches the source image,
		conversion may not be necessary. See {@link https://www.w3.org/TR/webgpu/#color-space-conversion-elision}.
	**/
	@:optional
	var premultipliedAlpha : Bool;
	/**
		Texture to copy to/from.
	**/
	var texture : GPUTexture;
	/**
		Mip-map level of the {@link GPUTexelCopyTextureInfo#texture} to copy to/from.
	**/
	@:optional
	var mipLevel : Float;
	/**
		Defines the origin of the copy - the minimum corner of the texture sub-region to copy to/from.
		Together with `copySize`, defines the full copy sub-region.
	**/
	@:optional
	var origin : GPUOrigin3D;
	/**
		Defines which aspects of the {@link GPUTexelCopyTextureInfo#texture} to copy to/from.
	**/
	@:optional
	var aspect : GPUTextureAspect;
};