package webgpu;

typedef GPUDeviceDescriptor = {
	/**
		Specifies the features that are required by the device request.
		The request will fail if the adapter cannot provide these features.
		Exactly the specified set of features, and no more or less, will be allowed in validation
		of API calls on the resulting device.
	**/
	@:optional
	var requiredFeatures : Iterable<GPUFeatureName>;
	/**
		Specifies the limits that are required by the device request.
		The request will fail if the adapter cannot provide these limits.
		Each key with a non-`undefined` value must be the name of a member of supported limits.
		API calls on the resulting device perform validation according to the exact limits of the
		device (not the adapter; see {@link https://www.w3.org/TR/webgpu/#limits}).
		<!-- If we ever need limit types other than GPUSize32/GPUSize64, we can change the value
		type to `double` or `any` in the future and write out the type conversion explicitly (by
		reference to WebIDL spec). Or change the entire type to `any` and add back a `dictionary
		GPULimits` and define the conversion of the whole object by reference to WebIDL. -->
	**/
	@:optional
	var requiredLimits : haxe.DynamicAccess<Null<Float>>;
	/**
		The descriptor for the default {@link GPUQueue}.
	**/
	@:optional
	var defaultQueue : GPUObjectDescriptorBase;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};