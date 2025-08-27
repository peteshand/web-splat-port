package webgpu;

@:native("GPUTextureUsage") extern class GPUTextureUsage {
	public static final COPY_SRC : Int;
	public static final COPY_DST : Int;
	public static final TEXTURE_BINDING : Int;
	public static final STORAGE_BINDING : Int;
	public static final RENDER_ATTACHMENT : Int;
}