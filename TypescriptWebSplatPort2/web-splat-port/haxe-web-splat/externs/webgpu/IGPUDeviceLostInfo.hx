package webgpu;

typedef IGPUDeviceLostInfo = {
	final __brand : String;
	final reason : GPUDeviceLostReason;
	final message : String;
};