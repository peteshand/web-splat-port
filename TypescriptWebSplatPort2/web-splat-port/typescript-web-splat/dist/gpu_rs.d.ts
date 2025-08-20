export declare const HISTOGRAM_WG_SIZE = 256;
export declare const RS_HISTOGRAM_BLOCK_ROWS = 15;
export interface PointCloudSortStuff {
    numPoints: number;
    sorterUni: GPUBuffer;
    sorterDis: GPUBuffer;
    sorterBg: GPUBindGroup;
    sorterRenderBg: GPUBindGroup;
    sorterBgPre: GPUBindGroup;
}
export declare class GPURSSorter {
    private bind_group_layout;
    private render_bind_group_layout;
    private preprocess_bind_group_layout;
    private zero_p;
    private histogram_p;
    private prefix_p;
    private scatter_even_p;
    private scatter_odd_p;
    private subgroup_size;
    static create(device: GPUDevice, queue: GPUQueue): Promise<GPURSSorter>;
    private static newWithSgSize;
    static bindGroupLayouts(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayoutPreprocess(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayoutRendering(device: GPUDevice): GPUBindGroupLayout;
    createSortStuff(device: GPUDevice, numPoints: number): PointCloudSortStuff;
    private static getScatterHistogramSizes;
    static createKeyvalBuffers(device: GPUDevice, keysize: number, bytesPerPayloadElem: number): [GPUBuffer, GPUBuffer, GPUBuffer, GPUBuffer];
    createInternalMemBuffer(device: GPUDevice, keysize: number): GPUBuffer;
    createBindGroup(device: GPUDevice, keysize: number, internal_mem_buffer: GPUBuffer, keyval_a: GPUBuffer, keyval_b: GPUBuffer, payload_a: GPUBuffer, payload_b: GPUBuffer): [GPUBuffer, GPUBuffer, GPUBindGroup];
    createBindGroupRender(device: GPUDevice, general_infos: GPUBuffer, payload_a: GPUBuffer): GPUBindGroup;
    createBindGroupPreprocess(device: GPUDevice, uniform_buffer: GPUBuffer, dispatch_buffer: GPUBuffer, keyval_a: GPUBuffer, payload_a: GPUBuffer): GPUBindGroup;
    static recordResetIndirectBuffer(indirect_buffer: GPUBuffer, uniform_buffer: GPUBuffer, queue: GPUQueue): void;
    record_calculate_histogram(bind_group: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void;
    record_calculate_histogram_indirect(bind_group: GPUBindGroup, dispatch_buffer: GPUBuffer, encoder: GPUCommandEncoder): void;
    record_prefix_histogram(bind_group: GPUBindGroup, passes: number, encoder: GPUCommandEncoder): void;
    record_scatter_keys(bind_group: GPUBindGroup, passes: number, keysize: number, encoder: GPUCommandEncoder): void;
    record_scatter_keys_indirect(bind_group: GPUBindGroup, passes: number, dispatch_buffer: GPUBuffer, encoder: GPUCommandEncoder): void;
    record_sort(bind_group: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void;
    recordSortIndirect(bind_group: GPUBindGroup, dispatch_buffer: GPUBuffer, encoder: GPUCommandEncoder): void;
    private test_sort;
}
//# sourceMappingURL=gpu_rs.d.ts.map