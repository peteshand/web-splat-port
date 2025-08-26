package webgpu;

typedef GPUBindGroupEntry = {
	/**
		A unique identifier for a resource binding within the {@link GPUBindGroup}, corresponding to a
		{@link GPUBindGroupLayoutEntry#binding | GPUBindGroupLayoutEntry.binding} and a @binding
		attribute in the {@link GPUShaderModule}.
	**/
	var binding : Float;
	/**
		The resource to bind, which may be a {@link GPUSampler}, {@link GPUTexture}, {@link GPUTextureView},
		{@link GPUBuffer}, {@link GPUBufferBinding}, or {@link GPUExternalTexture}.
	**/
	var resource : GPUBindingResource;
};