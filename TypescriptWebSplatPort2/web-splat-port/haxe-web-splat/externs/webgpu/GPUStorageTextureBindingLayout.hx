package webgpu;

typedef GPUStorageTextureBindingLayout = {
	/**
		The access mode for this binding, indicating readability and writability.
	**/
	@:optional
	var access : GPUStorageTextureAccess;
	/**
		The required {@link GPUTextureViewDescriptor#format} of texture views bound to this binding.
	**/
	var format : GPUTextureFormat;
	/**
		Indicates the required {@link GPUTextureViewDescriptor#dimension} for texture views bound to
		this binding.
	**/
	@:optional
	var viewDimension : GPUTextureViewDimension;
};