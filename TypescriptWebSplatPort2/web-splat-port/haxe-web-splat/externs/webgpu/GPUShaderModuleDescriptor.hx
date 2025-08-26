package webgpu;

typedef GPUShaderModuleDescriptor = {
	/**
		The <a href="https://gpuweb.github.io/gpuweb/wgsl/">WGSL</a> source code for the shader
		module.
	**/
	var code : String;
	/**
		A list of {@link GPUShaderModuleCompilationHint}s.
		Any hint provided by an application **should** contain information about one entry point of
		a pipeline that will eventually be created from the entry point.
		Implementations **should** use any information present in the {@link GPUShaderModuleCompilationHint}
		to perform as much compilation as is possible within {@link GPUDevice#createShaderModule}.
		Aside from type-checking, these hints are not validated in any way.
		<div class=note heading>
		Supplying information in {@link GPUShaderModuleDescriptor#compilationHints} does not have any
		observable effect, other than performance. It may be detrimental to performance to
		provide hints for pipelines that never end up being created.
		Because a single shader module can hold multiple entry points, and multiple pipelines
		can be created from a single shader module, it can be more performant for an
		implementation to do as much compilation as possible once in
		{@link GPUDevice#createShaderModule} rather than multiple times in the multiple calls to
		{@link GPUDevice#createComputePipeline()} or {@link GPUDevice#createRenderPipeline}.
		Hints are only applied to the entry points they explicitly name.
		Unlike {@link GPUProgrammableStage#entryPoint | GPUProgrammableStage.entryPoint},
		there is no default, even if only one entry point is present in the module.
		</div>
		Note:
		Hints are not validated in an observable way, but user agents **may** surface identifiable
		errors (like unknown entry point names or incompatible pipeline layouts) to developers,
		for example in the browser developer console.
	**/
	@:optional
	var compilationHints : Iterable<GPUShaderModuleCompilationHint>;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};