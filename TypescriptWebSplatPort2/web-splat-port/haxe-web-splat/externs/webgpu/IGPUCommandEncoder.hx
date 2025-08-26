package webgpu;

typedef IGPUCommandEncoder = {
	final __brand : String;
	/**
		Begins encoding a render pass described by `descriptor`.
	**/
	function beginRenderPass(descriptor:GPURenderPassDescriptor):GPURenderPassEncoder;
	function beginComputePass(?descriptor:GPUComputePassDescriptor):GPUComputePassEncoder;
	/**
		Shorthand, equivalent to {@link GPUCommandEncoder#copyBufferToBuffer}.
		
		Encode a command into the {@link GPUCommandEncoder} that copies data from a sub-region of a
		{@link GPUBuffer} to a sub-region of another {@link GPUBuffer}.
	**/
	@:overload(function(source:GPUBuffer, sourceOffset:Float, destination:GPUBuffer, destinationOffset:Float, ?size:Float):Null<Any> { })
	function copyBufferToBuffer(source:GPUBuffer, destination:GPUBuffer, ?size:Float):Null<Any>;
	/**
		Encode a command into the {@link GPUCommandEncoder} that copies data from a sub-region of a
		{@link GPUBuffer} to a sub-region of one or multiple continuous texture subresources.
	**/
	function copyBufferToTexture(source:GPUTexelCopyBufferInfo, destination:GPUTexelCopyTextureInfo, copySize:GPUExtent3DStrict):Null<Any>;
	/**
		Encode a command into the {@link GPUCommandEncoder} that copies data from a sub-region of one or
		multiple continuous texture subresources to a sub-region of a {@link GPUBuffer}.
	**/
	function copyTextureToBuffer(source:GPUTexelCopyTextureInfo, destination:GPUTexelCopyBufferInfo, copySize:GPUExtent3DStrict):Null<Any>;
	/**
		Encode a command into the {@link GPUCommandEncoder} that copies data from a sub-region of one
		or multiple contiguous texture subresources to another sub-region of one or
		multiple continuous texture subresources.
	**/
	function copyTextureToTexture(source:GPUTexelCopyTextureInfo, destination:GPUTexelCopyTextureInfo, copySize:GPUExtent3DStrict):Null<Any>;
	/**
		Encode a command into the {@link GPUCommandEncoder} that fills a sub-region of a
		{@link GPUBuffer} with zeros.
	**/
	function clearBuffer(buffer:GPUBuffer, ?offset:Float, ?size:Float):Null<Any>;
	/**
		Resolves query results from a {@link GPUQuerySet} out into a range of a {@link GPUBuffer}.
		 	querySet:
		 	firstQuery:
		 	queryCount:
		 	destination:
		 	destinationOffset:
	**/
	function resolveQuerySet(querySet:GPUQuerySet, firstQuery:Float, queryCount:Float, destination:GPUBuffer, destinationOffset:Float):Null<Any>;
	/**
		Completes recording of the commands sequence and returns a corresponding {@link GPUCommandBuffer}.
		 	descriptor:
	**/
	function finish(?descriptor:GPUObjectDescriptorBase):GPUCommandBuffer;
	var label : String;
	/**
		Begins a labeled debug group containing subsequent commands.
	**/
	function pushDebugGroup(groupLabel:String):Null<Any>;
	/**
		Ends the labeled debug group most recently started by {@link GPUDebugCommandsMixin#pushDebugGroup}.
	**/
	function popDebugGroup():Null<Any>;
	/**
		Marks a point in a stream of commands with a label.
	**/
	function insertDebugMarker(markerLabel:String):Null<Any>;
};