package webgpu;

typedef GPURenderPassColorAttachment = {
	/**
		Describes the texture subresource that will be output to for this color attachment.
		The subresource is determined by calling [$get as texture view$]({@link GPURenderPassColorAttachment#view}).
	**/
	var view : ts.AnyOf2<GPUTexture, GPUTextureView>;
	/**
		Indicates the depth slice index of {@link GPUTextureViewDimension} `"3d"` {@link GPURenderPassColorAttachment#view}
		that will be output to for this color attachment.
	**/
	@:optional
	var depthSlice : Float;
	/**
		Describes the texture subresource that will receive the resolved output for this color
		attachment if {@link GPURenderPassColorAttachment#view} is multisampled.
		The subresource is determined by calling [$get as texture view$]({@link GPURenderPassColorAttachment#resolveTarget}).
	**/
	@:optional
	var resolveTarget : ts.AnyOf2<GPUTexture, GPUTextureView>;
	/**
		Indicates the value to clear {@link GPURenderPassColorAttachment#view} to prior to executing the
		render pass. If not map/exist|provided, defaults to `{r: 0, g: 0, b: 0, a: 0}`. Ignored
		if {@link GPURenderPassColorAttachment#loadOp} is not {@link GPULoadOp} `"clear"`.
		The components of {@link GPURenderPassColorAttachment#clearValue} are all double values.
		They are converted [$to a texel value of texture format$] matching the render attachment.
		If conversion fails, a validation error is generated.
	**/
	@:optional
	var clearValue : GPUColor;
	/**
		Indicates the load operation to perform on {@link GPURenderPassColorAttachment#view} prior to
		executing the render pass.
		Note: It is recommended to prefer clearing; see {@link GPULoadOp} `"clear"` for details.
	**/
	var loadOp : GPULoadOp;
	/**
		The store operation to perform on {@link GPURenderPassColorAttachment#view}
		after executing the render pass.
	**/
	var storeOp : GPUStoreOp;
};