package webgpu;

typedef GPURequestAdapterOptions = {
	/**
		"Feature level" for the adapter request.
		The allowed <dfn dfn for="">feature level string</dfn> values are:
		<dl dfn-type=dfn dfn-for="feature level string">
		: <dfn noexport>"core"</dfn>
		No effect.
		: <dfn noexport>"compatibility"</dfn>
		No effect.
		Note:
		This value is reserved for future use as a way to opt into additional validation restrictions.
		Applications should not use this value at this time.
	**/
	@:optional
	var featureLevel : String;
	/**
		Optionally provides a hint indicating what class of adapter should be selected from
		the system's available adapters.
		The value of this hint may influence which adapter is chosen, but it must not
		influence whether an adapter is returned or not.
		Note:
		The primary utility of this hint is to influence which GPU is used in a multi-GPU system.
		For instance, some laptops have a low-power integrated GPU and a high-performance
		discrete GPU. This hint may also affect the power configuration of the selected GPU to
		match the requested power preference.
		Note:
		Depending on the exact hardware configuration, such as battery status and attached displays
		or removable GPUs, the user agent may select different adapters given the same power
		preference.
		Typically, given the same hardware configuration and state and
		`powerPreference`, the user agent is likely to select the same adapter.
	**/
	@:optional
	var powerPreference : GPUPowerPreference;
	/**
		When set to `true` indicates that only a fallback adapter may be returned. If the user
		agent does not support a fallback adapter, will cause {@link GPU#requestAdapter} to
		resolve to `null`.
		Note:
		{@link GPU#requestAdapter} may still return a fallback adapter if
		{@link GPURequestAdapterOptions#forceFallbackAdapter} is set to `false` and either no
		other appropriate adapter is available or the user agent chooses to return a
		fallback adapter. Developers that wish to prevent their applications from running on
		fallback adapters should check the {@link GPUAdapter#info}.{@link GPUAdapterInfo#isFallbackAdapter}
		attribute prior to requesting a {@link GPUDevice}.
	**/
	@:optional
	var forceFallbackAdapter : Bool;
	@:optional
	var xrCompatible : Bool;
};