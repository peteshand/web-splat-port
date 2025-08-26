package webgpu;

typedef GPUPipelineLayoutDescriptor = {
	/**
		A list of optional {@link GPUBindGroupLayout}s the pipeline will use. Each element corresponds
		to a @group attribute in the {@link GPUShaderModule}, with the `N`th element corresponding
		with `@group(N)`.
	**/
	var bindGroupLayouts : Iterable<Null<GPUBindGroupLayout>>;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};