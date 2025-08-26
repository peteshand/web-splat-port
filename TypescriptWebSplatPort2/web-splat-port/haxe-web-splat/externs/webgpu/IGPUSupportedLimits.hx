package webgpu;

typedef IGPUSupportedLimits = {
	final __brand : String;
	final maxTextureDimension1D : Float;
	final maxTextureDimension2D : Float;
	final maxTextureDimension3D : Float;
	final maxTextureArrayLayers : Float;
	final maxBindGroups : Float;
	final maxBindGroupsPlusVertexBuffers : Float;
	final maxBindingsPerBindGroup : Float;
	final maxDynamicUniformBuffersPerPipelineLayout : Float;
	final maxDynamicStorageBuffersPerPipelineLayout : Float;
	final maxSampledTexturesPerShaderStage : Float;
	final maxSamplersPerShaderStage : Float;
	final maxStorageBuffersPerShaderStage : Float;
	final maxStorageTexturesPerShaderStage : Float;
	final maxUniformBuffersPerShaderStage : Float;
	final maxUniformBufferBindingSize : Float;
	final maxStorageBufferBindingSize : Float;
	final minUniformBufferOffsetAlignment : Float;
	final minStorageBufferOffsetAlignment : Float;
	final maxVertexBuffers : Float;
	final maxBufferSize : Float;
	final maxVertexAttributes : Float;
	final maxVertexBufferArrayStride : Float;
	final maxInterStageShaderVariables : Float;
	final maxColorAttachments : Float;
	final maxColorAttachmentBytesPerSample : Float;
	final maxComputeWorkgroupStorageSize : Float;
	final maxComputeInvocationsPerWorkgroup : Float;
	final maxComputeWorkgroupSizeX : Float;
	final maxComputeWorkgroupSizeY : Float;
	final maxComputeWorkgroupSizeZ : Float;
	final maxComputeWorkgroupsPerDimension : Float;
	/**
		**PROPOSED** in [Compatibility Mode](https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md).
	**/
	@:optional
	final maxStorageBuffersInVertexStage : Float;
	/**
		**PROPOSED** in [Compatibility Mode](https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md).
	**/
	@:optional
	final maxStorageBuffersInFragmentStage : Float;
	/**
		**PROPOSED** in [Compatibility Mode](https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md).
	**/
	@:optional
	final maxStorageTexturesInVertexStage : Float;
	/**
		**PROPOSED** in [Compatibility Mode](https://github.com/gpuweb/gpuweb/blob/main/proposals/compatibility-mode.md).
	**/
	@:optional
	final maxStorageTexturesInFragmentStage : Float;
};