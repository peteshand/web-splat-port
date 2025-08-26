package webgpu;

@:native("GPUTextureUsage") extern class GPUTextureUsage {
	final COPY_SRC : Float;
	final COPY_DST : Float;
	final TEXTURE_BINDING : Float;
	final STORAGE_BINDING : Float;
	final RENDER_ATTACHMENT : Float;
}