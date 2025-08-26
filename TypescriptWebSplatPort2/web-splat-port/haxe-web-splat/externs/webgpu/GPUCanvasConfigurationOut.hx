package webgpu;

typedef GPUCanvasConfigurationOut = {
	/**
		{@inheritDoc GPUCanvasConfiguration.viewFormats}
	**/
	var viewFormats : Array<GPUTextureFormat>;
	/**
		{@inheritDoc GPUCanvasConfiguration.toneMapping}
	**/
	@:optional
	var toneMapping : GPUCanvasToneMapping;
	/**
		The {@link GPUDevice} that textures returned by {@link GPUCanvasContext#getCurrentTexture} will be
		compatible with.
	**/
	var device : GPUDevice;
	/**
		The format that textures returned by {@link GPUCanvasContext#getCurrentTexture} will have.
		Must be one of the Supported context formats.
	**/
	var format : GPUTextureFormat;
	/**
		The usage that textures returned by {@link GPUCanvasContext#getCurrentTexture} will have.
		{@link GPUTextureUsage#RENDER_ATTACHMENT} is the default, but is not automatically included
		if the usage is explicitly set. Be sure to include {@link GPUTextureUsage#RENDER_ATTACHMENT}
		when setting a custom usage if you wish to use textures returned by
		{@link GPUCanvasContext#getCurrentTexture} as color targets for a render pass.
	**/
	var usage : Float;
	/**
		The color space that values written into textures returned by
		{@link GPUCanvasContext#getCurrentTexture} should be displayed with.
	**/
	var colorSpace : Dynamic;
	/**
		Determines the effect that alpha values will have on the content of textures returned by
		{@link GPUCanvasContext#getCurrentTexture} when read, displayed, or used as an image source.
	**/
	var alphaMode : GPUCanvasAlphaMode;
};