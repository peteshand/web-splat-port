package webgpu;

@:native("GPUCompilationInfo") extern class GPUCompilationInfo {
	function new();
	final __brand : String;
	final messages : haxe.ds.ReadOnlyArray<GPUCompilationMessage>;
	static var prototype : GPUCompilationInfo;
}