package webgpu;

typedef GPUVertexState = {
	/**
		A list of {@link GPUVertexBufferLayout}s, each defining the layout of vertex attribute data in a
		vertex buffer used by this pipeline.
	**/
	@:optional
	var buffers : Iterable<Null<GPUVertexBufferLayout>>;
	/**
		The {@link GPUShaderModule} containing the code that this programmable stage will execute.
	**/
	var module : GPUShaderModule;
	/**
		The name of the function in {@link GPUProgrammableStage#module} that this stage will use to
		perform its work.
		NOTE: Since the {@link GPUProgrammableStage#entryPoint} dictionary member is
		not required, methods which consume a {@link GPUProgrammableStage} must use the
		"[$get the entry point$]" algorithm to determine which entry point
		it refers to.
	**/
	@:optional
	var entryPoint : String;
	/**
		Specifies the values of pipeline-overridable constants in the shader module
		{@link GPUProgrammableStage#module}.
		Each such pipeline-overridable constant is uniquely identified by a single
		pipeline-overridable constant identifier string, representing the pipeline
		constant ID of the constant if its declaration specifies one, and otherwise the
		constant's identifier name.
		The key of each key-value pair must equal the
		pipeline-overridable constant identifier string|identifier string
		of one such constant, with the comparison performed
		according to the rules for WGSL identifier comparison.
		When the pipeline is executed, that constant will have the specified value.
		Values are specified as <dfn typedef for="">GPUPipelineConstantValue</dfn>, which is a `double`.
		They are converted [$to WGSL type$] of the pipeline-overridable constant (`bool`/`i32`/`u32`/`f32`/`f16`).
		If conversion fails, a validation error is generated.
		<div class=example>
		Pipeline-overridable constants defined in WGSL:
		```wgsl
	**/
	@:optional
	var constants : haxe.DynamicAccess<Float>;
};