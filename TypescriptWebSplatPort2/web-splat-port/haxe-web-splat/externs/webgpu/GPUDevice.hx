package webgpu;

@:native("GPUDevice") extern class GPUDevice {
	function new();
	@:overload(function(type:String, listener:js.html.EventListenerOrEventListenerObject, ?options:ts.AnyOf2<Bool, js.html.AddEventListenerOptions>):Void { })
	function addEventListener<K>(type:K, listener:(ev:Dynamic) -> Dynamic, ?options:ts.AnyOf2<Bool, js.html.AddEventListenerOptions>):Void;
	@:overload(function(type:String, listener:js.html.EventListenerOrEventListenerObject, ?options:ts.AnyOf2<Bool, js.html.EventListenerOptions>):Void { })
	function removeEventListener<K>(type:K, listener:(ev:Dynamic) -> Dynamic, ?options:ts.AnyOf2<Bool, js.html.EventListenerOptions>):Void;
	final __brand : String;
	/**
		A set containing the {@link GPUFeatureName} values of the features
		supported by the device (i.e. the ones with which it was created).
	**/
	final features : GPUSupportedFeatures;
	/**
		Exposes the limits supported by the device
		(which are exactly the ones with which it was created).
	**/
	final limits : GPUSupportedLimits;
	/**
		Information about the physical adapter which created the device
		that this GPUDevice refers to.
		For a given GPUDevice, the GPUAdapterInfo values exposed are constant
		over time.
	**/
	final adapterInfo : GPUAdapterInfo;
	/**
		The primary {@link GPUQueue} for this device.
	**/
	final queue : GPUQueue;
	/**
		Destroys the device, preventing further operations on it.
		Outstanding asynchronous operations will fail.
		Note: It is valid to destroy a device multiple times.
		Note: Since no further operations can be enqueued on this device, implementations can abort
		outstanding asynchronous operations immediately and free resource allocations, including
		mapped memory that was just unmapped.
	**/
	function destroy():Null<Any>;
	/**
		Creates a {@link GPUBuffer}.
	**/
	function createBuffer(descriptor:GPUBufferDescriptor):GPUBuffer;
	/**
		Creates a {@link GPUTexture}.
	**/
	function createTexture(descriptor:GPUTextureDescriptor):GPUTexture;
	/**
		Creates a {@link GPUSampler}.
	**/
	function createSampler(?descriptor:GPUSamplerDescriptor):GPUSampler;
	/**
		Creates a {@link GPUExternalTexture} wrapping the provided image source.
	**/
	function importExternalTexture(descriptor:GPUExternalTextureDescriptor):GPUExternalTexture;
	/**
		Creates a {@link GPUBindGroupLayout}.
	**/
	function createBindGroupLayout(descriptor:GPUBindGroupLayoutDescriptor):GPUBindGroupLayout;
	/**
		Creates a {@link GPUPipelineLayout}.
	**/
	function createPipelineLayout(descriptor:GPUPipelineLayoutDescriptor):GPUPipelineLayout;
	/**
		Creates a {@link GPUBindGroup}.
	**/
	function createBindGroup(descriptor:GPUBindGroupDescriptor):GPUBindGroup;
	/**
		Creates a {@link GPUShaderModule}.
	**/
	function createShaderModule(descriptor:GPUShaderModuleDescriptor):GPUShaderModule;
	/**
		Creates a {@link GPUComputePipeline} using immediate pipeline creation.
	**/
	function createComputePipeline(descriptor:GPUComputePipelineDescriptor):GPUComputePipeline;
	/**
		Creates a {@link GPURenderPipeline} using immediate pipeline creation.
	**/
	function createRenderPipeline(descriptor:GPURenderPipelineDescriptor):GPURenderPipeline;
	/**
		Creates a {@link GPUComputePipeline} using async pipeline creation.
		The returned Promise resolves when the created pipeline
		is ready to be used without additional delay.
		If pipeline creation fails, the returned Promise rejects with an {@link GPUPipelineError}.
		(A {@link GPUError} is not dispatched to the device.)
		Note: Use of this method is preferred whenever possible, as it prevents blocking the
		queue timeline work on pipeline compilation.
	**/
	function createComputePipelineAsync(descriptor:GPUComputePipelineDescriptor):js.lib.Promise<GPUComputePipeline>;
	/**
		Creates a {@link GPURenderPipeline} using async pipeline creation.
		The returned Promise resolves when the created pipeline
		is ready to be used without additional delay.
		If pipeline creation fails, the returned Promise rejects with an {@link GPUPipelineError}.
		(A {@link GPUError} is not dispatched to the device.)
		Note: Use of this method is preferred whenever possible, as it prevents blocking the
		queue timeline work on pipeline compilation.
	**/
	function createRenderPipelineAsync(descriptor:GPURenderPipelineDescriptor):js.lib.Promise<GPURenderPipeline>;
	/**
		Creates a {@link GPUCommandEncoder}.
	**/
	function createCommandEncoder(?descriptor:GPUObjectDescriptorBase):GPUCommandEncoder;
	/**
		Creates a {@link GPURenderBundleEncoder}.
	**/
	function createRenderBundleEncoder(descriptor:GPURenderBundleEncoderDescriptor):GPURenderBundleEncoder;
	/**
		Creates a {@link GPUQuerySet}.
	**/
	function createQuerySet(descriptor:GPUQuerySetDescriptor):GPUQuerySet;
	/**
		A slot-backed attribute holding a promise which is created with the device, remains
		pending for the lifetime of the device, then resolves when the device is lost.
		Upon initialization, it is set to a new promise.
	**/
	final lost : js.lib.Promise<GPUDeviceLostInfo>;
	/**
		Pushes a new GPU error scope onto the {@link GPUDevice}.`[[errorScopeStack]]` for `this`.
	**/
	function pushErrorScope(filter:GPUErrorFilter):Null<Any>;
	/**
		Pops a GPU error scope off the {@link GPUDevice}.`[[errorScopeStack]]` for `this`
		and resolves to **any** {@link GPUError} observed by the error scope, or `null` if none.
		There is no guarantee of the ordering of promise resolution.
	**/
	function popErrorScope():js.lib.Promise<Null<GPUError>>;
	/**
		An event handler IDL attribute for the `uncapturederror` event type.
	**/
	@:optional
	dynamic function onuncapturederror(ev:GPUUncapturedErrorEvent):Dynamic;
	/**
		Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
	**/
	function dispatchEvent(event:js.html.Event):Bool;
	var label : String;
	static var prototype : GPUDevice;
}