package webgpu;

typedef GPUBindGroupLayoutDescriptor = {
	/**
		A list of entries describing the shader resource bindings for a bind group.
	**/
	var entries : Iterable<GPUBindGroupLayoutEntry>;
	/**
		The initial value of {@link GPUObjectBase#label | GPUObjectBase.label}.
	**/
	@:optional
	var label : String;
};