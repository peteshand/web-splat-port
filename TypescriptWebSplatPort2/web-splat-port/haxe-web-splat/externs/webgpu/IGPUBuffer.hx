package webgpu;

typedef IGPUBuffer = {
	final __brand : String;
	final size : Float;
	final usage : Float;
	final mapState : GPUBufferMapState;
	/**
		Maps the given range of the {@link GPUBuffer} and resolves the returned Promise when the
		{@link GPUBuffer}'s content is ready to be accessed with {@link GPUBuffer#getMappedRange}.
		The resolution of the returned Promise **only** indicates that the buffer has been mapped.
		It does not guarantee the completion of any other operations visible to the content timeline,
		and in particular does not imply that any other Promise returned from
		{@link GPUQueue#onSubmittedWorkDone()} or {@link GPUBuffer#mapAsync} on other {@link GPUBuffer}s
		have resolved.
		The resolution of the Promise returned from {@link GPUQueue#onSubmittedWorkDone}
		**does** imply the completion of
		{@link GPUBuffer#mapAsync} calls made prior to that call,
		on {@link GPUBuffer}s last used exclusively on that queue.
	**/
	function mapAsync(mode:Float, ?offset:Float, ?size:Float):js.lib.Promise<Null<Any>>;
	/**
		Returns an ArrayBuffer with the contents of the {@link GPUBuffer} in the given mapped range.
	**/
	function getMappedRange(?offset:Float, ?size:Float):js.lib.ArrayBuffer;
	/**
		Unmaps the mapped range of the {@link GPUBuffer} and makes its contents available for use by the
		GPU again.
	**/
	function unmap():Null<Any>;
	/**
		Destroys the {@link GPUBuffer}.
		Note: It is valid to destroy a buffer multiple times.
		Note: Since no further operations can be enqueued using this buffer, implementations can
		free resource allocations, including mapped memory that was just unmapped.
	**/
	function destroy():Null<Any>;
	var label : String;
};