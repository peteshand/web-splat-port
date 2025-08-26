package webgpu;

typedef GPUBindingCommandsMixin = {
	/**
		Sets the current {@link GPUBindGroup} for the given index.
		
		Sets the current {@link GPUBindGroup} for the given index, specifying dynamic offsets as a subset
		of a Uint32Array.
	**/
	@:overload(function(index:Float, bindGroup:Null<GPUBindGroup>, dynamicOffsetsData:js.lib.Uint32Array, dynamicOffsetsDataStart:Float, dynamicOffsetsDataLength:Float):Null<Any> { })
	function setBindGroup(index:Float, bindGroup:Null<GPUBindGroup>, ?dynamicOffsets:Iterable<Float>):Null<Any>;
};