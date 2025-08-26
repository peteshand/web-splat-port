package webgpu;

typedef IGPUAdapter = {
	final __brand : String;
	/**
		The set of values in `this`.{@link GPUAdapter#[[adapter]]}.{@link adapter#[[features]]}.
	**/
	final features : GPUSupportedFeatures;
	/**
		The limits in `this`.{@link GPUAdapter#[[adapter]]}.{@link adapter#[[limits]]}.
	**/
	final limits : GPUSupportedLimits;
	/**
		Information about the physical adapter underlying this {@link GPUAdapter}.
		For a given {@link GPUAdapter}, the {@link GPUAdapterInfo} values exposed are constant over time.
		The same object is returned each time. To create that object for the first time:
		<div algorithm=GPUAdapter.info>
		<div data-timeline=content>
		**Called on:** {@link GPUAdapter} `this`.
		**Returns:** {@link GPUAdapterInfo}
		Content timeline steps:
		1. Return a [$new adapter info$] for `this.adapter`.
		</div>
		</div>
	**/
	final info : GPUAdapterInfo;
	/**
		Requests a device from the adapter.
		This is a one-time action: if a device is returned successfully,
		the adapter becomes {@link adapter#[[state]]#"consumed"}.
	**/
	function requestDevice(?descriptor:GPUDeviceDescriptor):js.lib.Promise<GPUDevice>;
};