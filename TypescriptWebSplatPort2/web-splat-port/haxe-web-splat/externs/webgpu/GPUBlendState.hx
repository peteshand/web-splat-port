package webgpu;

typedef GPUBlendState = {
	/**
		Defines the blending behavior of the corresponding render target for color channels.
	**/
	var color : GPUBlendComponent;
	/**
		Defines the blending behavior of the corresponding render target for the alpha channel.
	**/
	var alpha : GPUBlendComponent;
};