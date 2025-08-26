package webgpu;

typedef GPUPipelineDescriptorBase = {
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