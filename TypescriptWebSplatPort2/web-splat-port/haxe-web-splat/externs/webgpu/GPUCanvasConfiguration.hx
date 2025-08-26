package webgpu;

typedef GPUCanvasConfiguration = {
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
	@:optional
	var usage : Float;
	/**
		The formats that views created from textures returned by
		{@link GPUCanvasContext#getCurrentTexture} may use.
	**/
	@:optional
	var viewFormats : Iterable<GPUTextureFormat>;
	/**
		The color space that values written into textures returned by
		{@link GPUCanvasContext#getCurrentTexture} should be displayed with.
	**/
	@:optional
	var colorSpace : Dynamic;
	/**
		The tone mapping determines how the content of textures returned by
		{@link GPUCanvasContext#getCurrentTexture} are to be displayed.
		Note: If an implementation doesn't support HDR WebGPU canvases, it should also not expose this member, to allow for feature detection. See {@link GPUCanvasContext#getConfiguration}.
	**/
	@:optional
	var toneMapping : GPUCanvasToneMapping;
	/**
		Determines the effect that alpha values will have on the content of textures returned by
		{@link GPUCanvasContext#getCurrentTexture} when read, displayed, or used as an image source.
	**/
	@:optional
	var alphaMode : GPUCanvasAlphaMode;
};