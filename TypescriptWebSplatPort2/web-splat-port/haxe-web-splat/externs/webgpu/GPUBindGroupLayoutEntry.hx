package webgpu;

typedef GPUBindGroupLayoutEntry = {
	/**
		A unique identifier for a resource binding within the {@link GPUBindGroupLayout}, corresponding
		to a {@link GPUBindGroupEntry#binding | GPUBindGroupEntry.binding} and a @binding
		attribute in the {@link GPUShaderModule}.
	**/
	var binding : Float;
	/**
		A bitset of the members of {@link GPUShaderStage}.
		Each set bit indicates that a {@link GPUBindGroupLayoutEntry}'s resource
		will be accessible from the associated shader stage.
	**/
	var visibility : Float;
	@:optional
	var buffer : GPUBufferBindingLayout;
	@:optional
	var sampler : GPUSamplerBindingLayout;
	@:optional
	var texture : GPUTextureBindingLayout;
	@:optional
	var storageTexture : GPUStorageTextureBindingLayout;
	/**
		Exactly one of these members must be set, indicating the binding type.
		The contents of the member specify options specific to that type.
		The corresponding resource in {@link GPUDevice#createBindGroup} requires
		the corresponding binding resource type for this binding.
	**/
	@:optional
	var externalTexture : GPUExternalTextureBindingLayout;
};