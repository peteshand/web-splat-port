package webgpu;

typedef GPUBufferBindingLayout = {
	/**
		Indicates the type required for buffers bound to this bindings.
	**/
	@:optional
	var type : GPUBufferBindingType;
	/**
		Indicates whether this binding requires a dynamic offset.
	**/
	@:optional
	var hasDynamicOffset : Bool;
	/**
		Indicates the minimum {@link GPUBufferBinding#size} of a buffer binding used with this bind point.
		Bindings are always validated against this size in {@link GPUDevice#createBindGroup}.
		If this *is not* `0`, pipeline creation additionally [$validating shader binding|validates$]
		that this value &ge; the minimum buffer binding size of the variable.
		If this *is* `0`, it is ignored by pipeline creation, and instead draw/dispatch commands
		[$Validate encoder bind groups|validate$] that each binding in the {@link GPUBindGroup}
		satisfies the minimum buffer binding size of the variable.
		Note:
		Similar execution-time validation is theoretically possible for other
		binding-related fields specified for early validation, like
		{@link GPUTextureBindingLayout#sampleType} and {@link GPUStorageTextureBindingLayout#format},
		which currently can only be validated in pipeline creation.
		However, such execution-time validation could be costly or unnecessarily complex, so it is
		available only for {@link GPUBufferBindingLayout#minBindingSize} which is expected to have the
		most ergonomic impact.
	**/
	@:optional
	var minBindingSize : Float;
};