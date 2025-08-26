package webgpu;

typedef GPUTextureDescriptor = {
	/**
		The width, height, and depth or layer count of the texture.
	**/
	var size : GPUExtent3DStrict;
	/**
		The number of mip levels the texture will contain.
	**/
	@:optional
	var mipLevelCount : Float;
	/**
		The sample count of the texture. A {@link GPUTextureDescriptor#sampleCount} &gt; `1` indicates
		a multisampled texture.
	**/
	@:optional
	var sampleCount : Float;
	/**
		Whether the texture is one-dimensional, an array of two-dimensional layers, or three-dimensional.
	**/
	@:optional
	var dimension : GPUTextureDimension;
	/**
		The format of the texture.
	**/
	var format : GPUTextureFormat;
	/**
		The allowed usages for the texture.
	**/
	var usage : Float;
	/**
		Specifies what view {@link GPUTextureViewDescriptor#format} values will be allowed when calling
		{@link GPUTexture#createView} on this texture (in addition to the texture's actual
		{@link GPUTextureDescriptor#format}).
		<div class=note heading>
		Adding a format to this list may have a significant performance impact, so it is best
		to avoid adding formats unnecessarily.
		The actual performance impact is highly dependent on the target system; developers must
		test various systems to find out the impact on their particular application.
		For example, on some systems any texture with a {@link GPUTextureDescriptor#format} or
		{@link GPUTextureDescriptor#viewFormats} entry including
		{@link GPUTextureFormat} `"rgba8unorm-srgb"` will perform less optimally than a
		{@link GPUTextureFormat} `"rgba8unorm"` texture which does not.
		Similar caveats exist for other formats and pairs of formats on other systems.
		</div>
		Formats in this list must be texture view format compatible with the texture format.
		<div algorithm data-timeline=const>
		Two {@link GPUTextureFormat}s `format` and `viewFormat` are <dfn dfn for="">texture view format compatible</dfn> if:
		- `format` equals `viewFormat`, or
		- `format` and `viewFormat` differ only in whether they are `srgb` formats (have the `-srgb` suffix).
		</div>
	**/
	@:optional
	var viewFormats : Iterable<GPUTextureFormat>;
	/**
		**PROPOSED** in [Compatibility Mode](https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md).
		
		> [In compatibility mode,]
		> When specifying a texture, a textureBindingViewDimension property
		> determines the views which can be bound from that texture for sampling.
		> Binding a view of a different dimension for sampling than specified at
		> texture creation time will cause a validation error.
	**/
	@:optional
	var textureBindingViewDimension : GPUTextureViewDimension;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};