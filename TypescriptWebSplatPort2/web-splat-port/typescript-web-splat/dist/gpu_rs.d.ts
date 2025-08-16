export declare const HISTOGRAM_WG_SIZE: number;
export declare const RS_HISTOGRAM_BLOCK_ROWS: number;
export declare class GPURSSorter {
    bindGroupLayout: GPUBindGroupLayout;
    renderBindGroupLayout: GPUBindGroupLayout;
    preprocessBindGroupLayout: GPUBindGroupLayout;
    zeroP: GPUComputePipeline;
    histogramP: GPUComputePipeline;
    prefixP: GPUComputePipeline;
    scatterEvenP: GPUComputePipeline;
    scatterOddP: GPUComputePipeline;
    subgroupSize: number;
    constructor(bindGroupLayout: GPUBindGroupLayout, renderBindGroupLayout: GPUBindGroupLayout, preprocessBindGroupLayout: GPUBindGroupLayout, zeroP: GPUComputePipeline, histogramP: GPUComputePipeline, prefixP: GPUComputePipeline, scatterEvenP: GPUComputePipeline, scatterOddP: GPUComputePipeline, subgroupSize: number);
    static new(device: GPUDevice, queue: GPUQueue): Promise<GPURSSorter>;
    createSortStuff(device: GPUDevice, numPoints: number): PointCloudSortStuff;
    private static newWithSgSize;
    private testSort;
    static bindGroupLayouts(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayoutPreprocess(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayoutRendering(device: GPUDevice): GPUBindGroupLayout;
    private static getScatterHistogramSizes;
    static createKeyvalBuffers(device: GPUDevice, keysize: number, bytesPerPayloadElem: number): [GPUBuffer, GPUBuffer, GPUBuffer, GPUBuffer];
    createInternalMemBuffer(device: GPUDevice, keysize: number): GPUBuffer;
    createBindGroup(device: GPUDevice, keysize: number, internalMemBuffer: GPUBuffer, keyvalA: GPUBuffer, keyvalB: GPUBuffer, payloadA: GPUBuffer, payloadB: GPUBuffer): [GPUBuffer, GPUBuffer, GPUBindGroup];
    createBindGroupRender(device: GPUDevice, generalInfos: GPUBuffer, payloadA: GPUBuffer): GPUBindGroup;
    createBindGroupPreprocess(device: GPUDevice, uniformBuffer: GPUBuffer, dispatchBuffer: GPUBuffer, keyvalA: GPUBuffer, payloadA: GPUBuffer): GPUBindGroup;
    static recordResetIndirectBuffer(indirectBuffer: GPUBuffer, uniformBuffer: GPUBuffer, queue: GPUQueue): void;
    recordCalculateHistogram(bindGroup: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void;
    recordCalculateHistogramIndirect(bindGroup: GPUBindGroup, dispatchBuffer: GPUBuffer, encoder: GPUCommandEncoder): void;
    recordPrefixHistogram(bindGroup: GPUBindGroup, passes: number, encoder: GPUCommandEncoder): void;
    recordScatterKeys(bindGroup: GPUBindGroup, passes: number, keysize: number, encoder: GPUCommandEncoder): void;
    recordScatterKeysIndirect(bindGroup: GPUBindGroup, passes: number, dispatchBuffer: GPUBuffer, encoder: GPUCommandEncoder): void;
    recordSort(bindGroup: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void;
    recordSortIndirect(bindGroup: GPUBindGroup, dispatchBuffer: GPUBuffer, encoder: GPUCommandEncoder): void;
}
export declare class PointCloudSortStuff {
    numPoints: number;
    sorterUni: GPUBuffer;
    sorterDis: GPUBuffer;
    sorterBg: GPUBindGroup;
    sorterRenderBg: GPUBindGroup;
    sorterBgPre: GPUBindGroup;
    constructor(numPoints: number, sorterUni: GPUBuffer, sorterDis: GPUBuffer, sorterBg: GPUBindGroup, sorterRenderBg: GPUBindGroup, sorterBgPre: GPUBindGroup);
}
export declare class IndirectDispatch {
    dispatchX: number;
    dispatchY: number;
    dispatchZ: number;
    constructor(dispatchX: number, dispatchY: number, dispatchZ: number);
}
export declare class GeneralInfo {
    keysSize: number;
    paddedSize: number;
    passes: number;
    evenPass: number;
    oddPass: number;
    constructor(keysSize: number, paddedSize: number, passes: number, evenPass: number, oddPass: number);
}
//# sourceMappingURL=gpu_rs.d.ts.map