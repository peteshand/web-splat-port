package webgpu;

typedef GPUColorTargetState = {
	/**
		The {@link GPUTextureFormat} of this color target. The pipeline will only be compatible with
		{@link GPURenderPassEncoder}s which use a {@link GPUTextureView} of this format in the
		corresponding color attachment.
	**/
	var format : GPUTextureFormat;
	/**
		The blending behavior for this color target. If left undefined, disables blending for this
		color target.
	**/
	@:optional
	var blend : GPUBlendState;
	/**
		Bitmask controlling which channels are are written to when drawing to this color target.
	**/
	@:optional
	var writeMask : Float;
};