package webgpu;

typedef GPURenderBundleEncoderDescriptor = {
	/**
		If `true`, indicates that the render bundle does not modify the depth component of the
		{@link GPURenderPassDepthStencilAttachment} of any render pass the render bundle is executed
		in.
		See read-only depth-stencil.
	**/
	@:optional
	var depthReadOnly : Bool;
	/**
		If `true`, indicates that the render bundle does not modify the stencil component of the
		{@link GPURenderPassDepthStencilAttachment} of any render pass the render bundle is executed
		in.
		See read-only depth-stencil.
	**/
	@:optional
	var stencilReadOnly : Bool;
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