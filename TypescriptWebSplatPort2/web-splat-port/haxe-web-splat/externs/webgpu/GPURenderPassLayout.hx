package webgpu;

typedef GPURenderPassLayout = {
	/**
		A list of the {@link GPUTextureFormat}s of the color attachments for this pass or bundle.
	**/
	var colorFormats : Iterable<Null<GPUTextureFormat>>;
	/**
		The {@link GPUTextureFormat} of the depth/stencil attachment for this pass or bundle.
	**/
	@:optional
	var depthStencilFormat : GPUTextureFormat;
	/**
		Number of samples per pixel in the attachments for this pass or bundle.
	**/
	@:optional
	var sampleCount : Float;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};