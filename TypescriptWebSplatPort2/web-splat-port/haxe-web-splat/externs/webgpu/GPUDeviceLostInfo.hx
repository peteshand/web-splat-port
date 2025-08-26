package webgpu;

@:native("GPUDeviceLostInfo") extern class GPUDeviceLostInfo {
	function new();
	final __brand : String;
	final reason : GPUDeviceLostReason;
	final message : String;
	static var prototype : GPUDeviceLostInfo;
}