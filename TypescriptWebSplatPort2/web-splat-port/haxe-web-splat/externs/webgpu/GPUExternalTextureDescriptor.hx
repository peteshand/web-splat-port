package webgpu;

typedef GPUExternalTextureDescriptor = {
	/**
		The video source to import the external texture from. Source size is determined as described
		by the external source dimensions table.
	**/
	var source : Dynamic;
	/**
		The color space the image contents of {@link GPUExternalTextureDescriptor#source} will be
		converted into when reading.
	**/
	@:optional
	var colorSpace : Dynamic;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};