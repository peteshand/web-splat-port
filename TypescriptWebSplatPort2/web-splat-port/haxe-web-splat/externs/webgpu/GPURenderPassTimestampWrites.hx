package webgpu;

typedef GPURenderPassTimestampWrites = {
	/**
		The {@link GPUQuerySet}, of type {@link GPUQueryType} `"timestamp"`, that the query results will be
		written to.
	**/
	var querySet : GPUQuerySet;
	/**
		If defined, indicates the query index in {@link GPURenderPassTimestampWrites#querySet} into
		which the timestamp at the beginning of the render pass will be written.
	**/
	@:optional
	var beginningOfPassWriteIndex : Float;
	/**
		If defined, indicates the query index in {@link GPURenderPassTimestampWrites#querySet} into
		which the timestamp at the end of the render pass will be written.
	**/
	@:optional
	var endOfPassWriteIndex : Float;
};