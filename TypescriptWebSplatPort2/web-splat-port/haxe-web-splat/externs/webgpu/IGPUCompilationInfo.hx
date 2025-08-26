package webgpu;

typedef IGPUCompilationInfo = {
	final __brand : String;
	final messages : haxe.ds.ReadOnlyArray<GPUCompilationMessage>;
};