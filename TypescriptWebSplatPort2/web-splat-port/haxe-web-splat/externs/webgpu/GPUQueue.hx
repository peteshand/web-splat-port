package webgpu;

@:native("GPUQueue") extern class GPUQueue {
	function new();
	final __brand : String;
	/**
		Schedules the execution of the command buffers by the GPU on this queue.
		Submitted command buffers cannot be used again.
		 	`commandBuffers`:
	**/
	function submit(commandBuffers:Iterable<GPUCommandBuffer>):Null<Any>;
	/**
		Returns a Promise that resolves once this queue finishes processing all the work submitted
		up to this moment.
		Resolution of this Promise implies the completion of
		{@link GPUBuffer#mapAsync} calls made prior to that call,
		on {@link GPUBuffer}s last used exclusively on that queue.
	**/
	function onSubmittedWorkDone():js.lib.Promise<Null<Any>>;
	/**
		Issues a write operation of the provided data into a {@link GPUBuffer}.
	**/
	function writeBuffer(buffer:GPUBuffer, bufferOffset:Float, data:Dynamic, ?dataOffset:Float, ?size:Float):Null<Any>;
	/**
		Issues a write operation of the provided data into a {@link GPUTexture}.
	**/
	function writeTexture(destination:GPUTexelCopyTextureInfo, data:Dynamic, dataLayout:GPUTexelCopyBufferLayout, size:GPUExtent3DStrict):Null<Any>;
	/**
		Issues a copy operation of the contents of a platform image/canvas
		into the destination texture.
		This operation performs {@link https://www.w3.org/TR/webgpu/#color-space-conversions | color encoding} into the destination
		encoding according to the parameters of {@link GPUCopyExternalImageDestInfo}.
		Copying into a `-srgb` texture results in the same texture bytes, not the same decoded
		values, as copying into the corresponding non-`-srgb` format.
		Thus, after a copy operation, sampling the destination texture has
		different results depending on whether its format is `-srgb`, all else unchanged.
		<!-- POSTV1(srgb-linear): If added, explain here how it interacts. -->
	**/
	function copyExternalImageToTexture(source:GPUCopyExternalImageSourceInfo, destination:GPUCopyExternalImageDestInfo, copySize:GPUExtent3DStrict):Null<Any>;
	var label : String;
	static var prototype : GPUQueue;
}