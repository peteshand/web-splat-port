package webgpu;

typedef GPURenderPipelineDescriptor = {
	/**
		Describes the vertex shader entry point of the pipeline and its input buffer layouts.
	**/
	var vertex : GPUVertexState;
	/**
		Describes the primitive-related properties of the pipeline.
	**/
	@:optional
	var primitive : GPUPrimitiveState;
	/**
		Describes the optional depth-stencil properties, including the testing, operations, and bias.
	**/
	@:optional
	var depthStencil : GPUDepthStencilState;
	/**
		Describes the multi-sampling properties of the pipeline.
	**/
	@:optional
	var multisample : GPUMultisampleState;
	/**
		Describes the fragment shader entry point of the pipeline and its output colors. If
		not map/exist|provided, the {@link https://www.w3.org/TR/webgpu/#no-color-output} mode is enabled.
	**/
	@:optional
	var fragment : GPUFragmentState;
	/**
		The {@link GPUPipelineLayout} for this pipeline, or {@link GPUAutoLayoutMode} `"auto"` to generate
		the pipeline layout automatically.
		Note: If {@link GPUAutoLayoutMode} `"auto"` is used the pipeline cannot share {@link GPUBindGroup}s
		with any other pipelines.
	**/
	var layout : ts.AnyOf2<GPUPipelineLayout, String>;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};