package webgpu;

typedef IGPUCanvasContext = {
	final __brand : String;
	/**
		The canvas this context was created from.
	**/
	final canvas : ts.AnyOf2<js.html.CanvasElement, js.html.OffscreenCanvas>;
	/**
		Configures the context for this canvas.
		This clears the drawing buffer to transparent black (in [$Replace the drawing buffer$]).
	**/
	function configure(configuration:GPUCanvasConfiguration):Null<Any>;
	/**
		Removes the context configuration. Destroys any textures produced while configured.
	**/
	function unconfigure():Null<Any>;
	/**
		Returns the context configuration.
	**/
	function getConfiguration():Null<GPUCanvasConfigurationOut>;
	/**
		Get the {@link GPUTexture} that will be composited to the document by the {@link GPUCanvasContext}
		next.
		Note: The same {@link GPUTexture} object will be returned by every
		call to {@link GPUCanvasContext#getCurrentTexture} until "[$Expire the current texture$]"
		runs, even if that {@link GPUTexture} is destroyed, failed validation, or failed to allocate.
	**/
	function getCurrentTexture():GPUTexture;
};