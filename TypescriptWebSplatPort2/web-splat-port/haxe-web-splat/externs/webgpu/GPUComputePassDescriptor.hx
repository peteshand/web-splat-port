package webgpu;

typedef GPUComputePassDescriptor = {
	/**
		Defines which timestamp values will be written for this pass, and where to write them to.
	**/
	@:optional
	var timestampWrites : GPUComputePassTimestampWrites;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};