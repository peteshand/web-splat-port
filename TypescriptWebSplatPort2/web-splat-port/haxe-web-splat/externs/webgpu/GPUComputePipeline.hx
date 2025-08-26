package webgpu;

@:native("GPUComputePipeline") extern class GPUComputePipeline {
	function new();
	final __brand : String;
	var label : String;
	/**
		Gets a {@link GPUBindGroupLayout} that is compatible with the {@link GPUPipelineBase}'s
		{@link GPUBindGroupLayout} at `index`.
	**/
	function getBindGroupLayout(index:Float):GPUBindGroupLayout;
	static var prototype : GPUComputePipeline;
}