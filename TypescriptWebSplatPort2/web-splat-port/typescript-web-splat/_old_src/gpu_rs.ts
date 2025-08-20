/*
    This file implements a gpu version of radix sort. A good introduction to general purpose radix sort can
    be found here: http://www.codercorner.com/RadixSortRevisited.htm

    The gpu radix sort implemented here is a reimplementation of the vulkan radix sort found in the fuchsia repos: https://fuchsia.googlesource.com/fuchsia/+/refs/heads/main/src/graphics/lib/compute/radix_sort/
    Currently only the sorting for floating point key-value pairs is implemented, as only this is needed for this project

    All shaders can be found in shaders/radix_sort.wgsl
*/

// IMPORTANT: the following constants have to be synced with the numbers in radix_sort.wgsl
export const HISTOGRAM_WG_SIZE: number = 256;
const RS_RADIX_LOG2: number = 8; // 8 bit radices
const RS_RADIX_SIZE: number = 1 << RS_RADIX_LOG2; // 256 entries into the radix table
const RS_KEYVAL_SIZE: number = 32 / RS_RADIX_LOG2;
export const RS_HISTOGRAM_BLOCK_ROWS: number = 15;
const RS_SCATTER_BLOCK_ROWS: number = RS_HISTOGRAM_BLOCK_ROWS; // DO NOT CHANGE, shader assume this!!!
const PREFIX_WG_SIZE: number = 1 << 7; // one thread operates on 2 prefixes at the same time
const SCATTER_WG_SIZE: number = 1 << 8;

export class GPURSSorter {
    bindGroupLayout: GPUBindGroupLayout;
    renderBindGroupLayout: GPUBindGroupLayout;
    preprocessBindGroupLayout: GPUBindGroupLayout;
    zeroP: GPUComputePipeline;
    histogramP: GPUComputePipeline;
    prefixP: GPUComputePipeline;
    scatterEvenP: GPUComputePipeline;
    scatterOddP: GPUComputePipeline;
    subgroupSize: number;

    constructor(
        bindGroupLayout: GPUBindGroupLayout,
        renderBindGroupLayout: GPUBindGroupLayout,
        preprocessBindGroupLayout: GPUBindGroupLayout,
        zeroP: GPUComputePipeline,
        histogramP: GPUComputePipeline,
        prefixP: GPUComputePipeline,
        scatterEvenP: GPUComputePipeline,
        scatterOddP: GPUComputePipeline,
        subgroupSize: number
    ) {
        this.bindGroupLayout = bindGroupLayout;
        this.renderBindGroupLayout = renderBindGroupLayout;
        this.preprocessBindGroupLayout = preprocessBindGroupLayout;
        this.zeroP = zeroP;
        this.histogramP = histogramP;
        this.prefixP = prefixP;
        this.scatterEvenP = scatterEvenP;
        this.scatterOddP = scatterOddP;
        this.subgroupSize = subgroupSize;
    }

    // The new call also needs the queue to be able to determine the maximum subgroup size (Does so by running test runs)
    static async new(device: GPUDevice, queue: GPUQueue): Promise<GPURSSorter> {
        let curSorter: GPURSSorter;

        console.debug("Searching for the maximum subgroup size (wgpu currently does not allow to query subgroup sizes)");
        const sizes = [1, 8, 16, 32];
        let curSize = 2;
        
        enum State {
            Init,
            Increasing,
            Decreasing,
        }
        
        let biggestThatWorked = 0;
        let s = State.Init;
        
        while (true) {
            if (curSize >= sizes.length) {
                break;
            }
            console.debug(`Checking sorting with subgroupsize ${sizes[curSize]}`);
            curSorter = GPURSSorter.newWithSgSize(device, sizes[curSize]);
            const sortSuccess = await curSorter.testSort(device, queue);
            console.debug(`${sizes[curSize]} worked: ${sortSuccess}`);
            
            switch (s) {
                case State.Init:
                    if (sortSuccess) {
                        biggestThatWorked = sizes[curSize];
                        s = State.Increasing;
                        curSize += 1;
                    } else {
                        s = State.Decreasing;
                        curSize -= 1;
                    }
                    break;
                case State.Increasing:
                    if (sortSuccess) {
                        if (sizes[curSize] > biggestThatWorked) {
                            biggestThatWorked = sizes[curSize];
                        }
                        curSize += 1;
                    } else {
                        break;
                    }
                    break;
                case State.Decreasing:
                    if (sortSuccess) {
                        if (sizes[curSize] > biggestThatWorked) {
                            biggestThatWorked = sizes[curSize];
                        }
                        break;
                    } else {
                        curSize -= 1;
                    }
                    break;
            }
        }
        
        if (biggestThatWorked === 0) {
            throw new Error("GPURSSorter::new() No workgroup size that works was found. Unable to use sorter");
        }
        
        curSorter = GPURSSorter.newWithSgSize(device, biggestThatWorked);
        console.info(`Created a sorter with subgroup size ${curSorter.subgroupSize}\n`);
        return curSorter;
    }

    createSortStuff(device: GPUDevice, numPoints: number): PointCloudSortStuff {
        const [sorterBA, sorterBB, sorterPA, sorterPB] = GPURSSorter.createKeyvalBuffers(device, numPoints, 4);
        const sorterInt = this.createInternalMemBuffer(device, numPoints);
        const [sorterUni, sorterDis, sorterBg] = this.createBindGroup(
            device,
            numPoints,
            sorterInt,
            sorterBA,
            sorterBB,
            sorterPA,
            sorterPB
        );
        const sorterRenderBg = this.createBindGroupRender(device, sorterUni, sorterPA);
        const sorterBgPre = this.createBindGroupPreprocess(device, sorterUni, sorterDis, sorterBA, sorterPA);

        return new PointCloudSortStuff(
            numPoints,
            sorterUni,
            sorterDis,
            sorterBg,
            sorterRenderBg,
            sorterBgPre
        );
    }

    private static newWithSgSize(device: GPUDevice, sgSize: number): GPURSSorter {
        // special variables for scatter shade
        const histogramSgSize: number = sgSize;
        const rsSweep0Size: number = RS_RADIX_SIZE / histogramSgSize;
        const rsSweep1Size: number = rsSweep0Size / histogramSgSize;
        const rsSweep2Size: number = rsSweep1Size / histogramSgSize;
        const rsSweepSize: number = rsSweep0Size + rsSweep1Size + rsSweep2Size;
        const _rsSmemPhase1: number = RS_RADIX_SIZE + RS_RADIX_SIZE + rsSweepSize;
        const rsSmemPhase2: number = RS_RADIX_SIZE + RS_SCATTER_BLOCK_ROWS * SCATTER_WG_SIZE;
        // rs_smem_phase_2 will always be larger, so always use phase2
        const rsMemDwords: number = rsSmemPhase2;
        const rsMemSweep0Offset: number = 0;
        const rsMemSweep1Offset: number = rsMemSweep0Offset + rsSweep0Size;
        const rsMemSweep2Offset: number = rsMemSweep1Offset + rsSweep1Size;

        const bindGroupLayout = GPURSSorter.bindGroupLayouts(device);
        const renderBindGroupLayout = GPURSSorter.bindGroupLayoutRendering(device);
        const preprocessBindGroupLayout = GPURSSorter.bindGroupLayoutPreprocess(device);

        const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({
            label: "radix sort pipeline layout",
            bindGroupLayouts: [bindGroupLayout],
        });

        // Load shader from file - in a real implementation, you'd load this from the actual file
        const rawShader = `// Placeholder for radix_sort.wgsl content - should be loaded from file`;
        const shaderWConst = `const histogram_sg_size: u32 = ${histogramSgSize}u;
const histogram_wg_size: u32 = ${HISTOGRAM_WG_SIZE}u;
const rs_radix_log2: u32 = ${RS_RADIX_LOG2}u;
const rs_radix_size: u32 = ${RS_RADIX_SIZE}u;
const rs_keyval_size: u32 = ${RS_KEYVAL_SIZE}u;
const rs_histogram_block_rows: u32 = ${RS_HISTOGRAM_BLOCK_ROWS}u;
const rs_scatter_block_rows: u32 = ${RS_SCATTER_BLOCK_ROWS}u;
const rs_mem_dwords: u32 = ${rsMemDwords}u;
const rs_mem_sweep_0_offset: u32 = ${rsMemSweep0Offset}u;
const rs_mem_sweep_1_offset: u32 = ${rsMemSweep1Offset}u;
const rs_mem_sweep_2_offset: u32 = ${rsMemSweep2Offset}u;
${rawShader}`;

        const shaderCode = shaderWConst
            .replace(/{histogram_wg_size}/g, HISTOGRAM_WG_SIZE.toString())
            .replace(/{prefix_wg_size}/g, PREFIX_WG_SIZE.toString())
            .replace(/{scatter_wg_size}/g, SCATTER_WG_SIZE.toString());

        const shader = device.createShaderModule({
            label: "Radix sort shader",
            code: shaderCode,
        });

        const zeroP = device.createComputePipeline({
            label: "Zero the histograms",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "zero_histograms",
            },
        });

        const histogramP = device.createComputePipeline({
            label: "calculate_histogram",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "calculate_histogram",
            },
        });

        const prefixP = device.createComputePipeline({
            label: "prefix_histogram",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "prefix_histogram",
            },
        });

        const scatterEvenP = device.createComputePipeline({
            label: "scatter_even",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "scatter_even",
            },
        });

        const scatterOddP = device.createComputePipeline({
            label: "scatter_odd",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "scatter_odd",
            },
        });

        return new GPURSSorter(
            bindGroupLayout,
            renderBindGroupLayout,
            preprocessBindGroupLayout,
            zeroP,
            histogramP,
            prefixP,
            scatterEvenP,
            scatterOddP,
            histogramSgSize
        );
    }

    private async testSort(device: GPUDevice, queue: GPUQueue): Promise<boolean> {
        // simply runs a small sort and check if the sorting result is correct
        const n = 8192; // means that 2 workgroups are needed for sorting
        const scrambledData: Float32Array = new Float32Array(n);
        const sortedData: Float32Array = new Float32Array(n);
        
        for (let i = 0; i < n; i++) {
            scrambledData[i] = (n - 1 - i) as number;
            sortedData[i] = i as number;
        }

        const internalMemBuffer = this.createInternalMemBuffer(device, n);
        const [keyvalA, keyvalB, payloadA, payloadB] = GPURSSorter.createKeyvalBuffers(device, n, 4);
        const [_uniformBuffer, _dispatchBuffer, bindGroup] = this.createBindGroup(
            device,
            n,
            internalMemBuffer,
            keyvalA,
            keyvalB,
            payloadA,
            payloadB
        );

        uploadToBuffer(keyvalA, device, queue, scrambledData);

        const encoder = device.createCommandEncoder({
            label: "GPURSSorter test_sort",
        });
        this.recordSort(bindGroup, n, encoder);
        const commandBuffer = encoder.finish();
        queue.submit([commandBuffer]);
        await device.queue.onSubmittedWorkDone();

        const sorted = await downloadBuffer<number>(keyvalA, device, queue);
        for (let i = 0; i < n; i++) {
            if (sorted[i] !== sortedData[i]) {
                return false;
            }
        }
        return true;
    }

    // layouts used by the sorting pipeline, as the dispatch buffer has to be in separate bind group
    static bindGroupLayouts(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: "Radix bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
            ],
        });
    }

    // is used by the preprocess pipeline as the limitation of bind groups forces us to only use 1 bind group for the sort infos
    static bindGroupLayoutPreprocess(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: "Radix bind group layout for preprocess pipeline",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType },
                },
            ],
        });
    }

    // used by the renderer, as read_only : false is not allowed without an extension
    static bindGroupLayoutRendering(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: "Radix bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" as GPUBufferBindingType },
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" as GPUBufferBindingType },
                },
            ],
        });
    }

    private static getScatterHistogramSizes(keysize: number): [number, number, number, number, number, number] {
        const scatterBlockKvs = HISTOGRAM_WG_SIZE * RS_SCATTER_BLOCK_ROWS;
        const scatterBlocksRu = Math.ceil(keysize / scatterBlockKvs);
        const countRuScatter = scatterBlocksRu * scatterBlockKvs;

        const histoBlockKvs = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
        const histoBlocksRu = Math.ceil(countRuScatter / histoBlockKvs);
        const countRuHisto = histoBlocksRu * histoBlockKvs;

        return [scatterBlockKvs, scatterBlocksRu, countRuScatter, histoBlockKvs, histoBlocksRu, countRuHisto];
    }

    static createKeyvalBuffers(
        device: GPUDevice,
        keysize: number,
        bytesPerPayloadElem: number
    ): [GPUBuffer, GPUBuffer, GPUBuffer, GPUBuffer] {
        const keysPerWorkgroup = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
        const countRuHisto = Math.ceil((keysize + keysPerWorkgroup) / keysPerWorkgroup + 1) * keysPerWorkgroup;

        const bufferA = device.createBuffer({
            label: "Radix data buffer a",
            size: countRuHisto * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        const bufferB = device.createBuffer({
            label: "Radix data buffer b",
            size: countRuHisto * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        if (bytesPerPayloadElem !== 4) {
            throw new Error("Currently only 4 byte values are allowed");
        }
        
        const payloadSize = Math.max(keysize * bytesPerPayloadElem, 1);
        
        const payloadA = device.createBuffer({
            label: "Radix payload buffer a",
            size: payloadSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        const payloadB = device.createBuffer({
            label: "Radix payload buffer b",
            size: payloadSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        return [bufferA, bufferB, payloadA, payloadB];
    }

    createInternalMemBuffer(device: GPUDevice, keysize: number): GPUBuffer {
        const [, scatterBlocksRu] = GPURSSorter.getScatterHistogramSizes(keysize);
        const histoSize = RS_RADIX_SIZE * 4;
        const internalSize = (RS_KEYVAL_SIZE + scatterBlocksRu - 1 + 1) * histoSize;

        return device.createBuffer({
            label: "Internal radix sort buffer",
            size: internalSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
    }

    createBindGroup(
        device: GPUDevice,
        keysize: number,
        internalMemBuffer: GPUBuffer,
        keyvalA: GPUBuffer,
        keyvalB: GPUBuffer,
        payloadA: GPUBuffer,
        payloadB: GPUBuffer
    ): [GPUBuffer, GPUBuffer, GPUBindGroup] {
        const [, scatterBlocksRu, , , , countRuHisto] = GPURSSorter.getScatterHistogramSizes(keysize);

        const dispatchInfos = new IndirectDispatch(scatterBlocksRu, 1, 1);
        const uniformInfos = new GeneralInfo(keysize, countRuHisto, 4, 0, 0);

        const uniformBuffer = device.createBuffer({
            label: "Radix uniform buffer",
            size: 20,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        
        const uniformData = new Uint32Array(uniformBuffer.getMappedRange());
        uniformData[0] = uniformInfos.keysSize;
        uniformData[1] = uniformInfos.paddedSize;
        uniformData[2] = uniformInfos.passes;
        uniformData[3] = uniformInfos.evenPass;
        uniformData[4] = uniformInfos.oddPass;
        uniformBuffer.unmap();

        const dispatchBuffer = device.createBuffer({
            label: "Dispatch indirect buffer",
            size: 12,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT,
            mappedAtCreation: true,
        });
        
        const dispatchData = new Uint32Array(dispatchBuffer.getMappedRange());
        dispatchData[0] = dispatchInfos.dispatchX;
        dispatchData[1] = dispatchInfos.dispatchY;
        dispatchData[2] = dispatchInfos.dispatchZ;
        dispatchBuffer.unmap();

        const bindGroup = device.createBindGroup({
            label: "Radix bind group",
            layout: this.bindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: { buffer: internalMemBuffer } },
                { binding: 2, resource: { buffer: keyvalA } },
                { binding: 3, resource: { buffer: keyvalB } },
                { binding: 4, resource: { buffer: payloadA } },
                { binding: 5, resource: { buffer: payloadB } },
            ],
        });

        return [uniformBuffer, dispatchBuffer, bindGroup];
    }

    createBindGroupRender(device: GPUDevice, generalInfos: GPUBuffer, payloadA: GPUBuffer): GPUBindGroup {
        return device.createBindGroup({
            label: "Render bind group",
            layout: this.renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: generalInfos } },
                { binding: 4, resource: { buffer: payloadA } },
            ],
        });
    }

    createBindGroupPreprocess(
        device: GPUDevice,
        uniformBuffer: GPUBuffer,
        dispatchBuffer: GPUBuffer,
        keyvalA: GPUBuffer,
        payloadA: GPUBuffer
    ): GPUBindGroup {
        return device.createBindGroup({
            label: "Preprocess bind group",
            layout: this.preprocessBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: { buffer: keyvalA } },
                { binding: 2, resource: { buffer: payloadA } },
                { binding: 3, resource: { buffer: dispatchBuffer } },
            ],
        });
    }

    static recordResetIndirectBuffer(indirectBuffer: GPUBuffer, uniformBuffer: GPUBuffer, queue: GPUQueue): void {
        const zeroData = new Uint8Array(4);
        queue.writeBuffer(indirectBuffer, 0, zeroData);
        queue.writeBuffer(uniformBuffer, 0, zeroData);
    }

    recordCalculateHistogram(bindGroup: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void {
        const [, , , , histBlocksRu] = GPURSSorter.getScatterHistogramSizes(keysize);

        {
            const pass = encoder.beginComputePass({ label: "zeroing the histogram" });
            pass.setPipeline(this.zeroP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(histBlocksRu, 1, 1);
            pass.end();
        }

        {
            const pass = encoder.beginComputePass({ label: "calculate histogram" });
            pass.setPipeline(this.histogramP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(histBlocksRu, 1, 1);
            pass.end();
        }
    }

    recordCalculateHistogramIndirect(bindGroup: GPUBindGroup, dispatchBuffer: GPUBuffer, encoder: GPUCommandEncoder): void {
        {
            const pass = encoder.beginComputePass({ label: "zeroing the histogram" });
            pass.setPipeline(this.zeroP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);
            pass.end();
        }

        {
            const pass = encoder.beginComputePass({ label: "calculate histogram" });
            pass.setPipeline(this.histogramP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);
            pass.end();
        }
    }

    recordPrefixHistogram(bindGroup: GPUBindGroup, passes: number, encoder: GPUCommandEncoder): void {
        const pass = encoder.beginComputePass({ label: "prefix histogram" });
        pass.setPipeline(this.prefixP);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(passes, 1, 1);
        pass.end();
    }

    recordScatterKeys(bindGroup: GPUBindGroup, passes: number, keysize: number, encoder: GPUCommandEncoder): void {
        if (passes !== 4) {
            throw new Error("Currently the amount of passes is hardcoded in the shader");
        }
        
        const [, scatterBlocksRu] = GPURSSorter.getScatterHistogramSizes(keysize);
        const pass = encoder.beginComputePass({ label: "Scatter keyvals" });

        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.scatterEvenP);
        pass.dispatchWorkgroups(scatterBlocksRu, 1, 1);

        pass.setPipeline(this.scatterOddP);
        pass.dispatchWorkgroups(scatterBlocksRu, 1, 1);

        pass.setPipeline(this.scatterEvenP);
        pass.dispatchWorkgroups(scatterBlocksRu, 1, 1);

        pass.setPipeline(this.scatterOddP);
        pass.dispatchWorkgroups(scatterBlocksRu, 1, 1);
        
        pass.end();
    }

    recordScatterKeysIndirect(bindGroup: GPUBindGroup, passes: number, dispatchBuffer: GPUBuffer, encoder: GPUCommandEncoder): void {
        if (passes !== 4) {
            throw new Error("Currently the amount of passes is hardcoded in the shader");
        }

        const pass = encoder.beginComputePass({ label: "Scatter keyvals" });

        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.scatterEvenP);
        pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);

        pass.setPipeline(this.scatterOddP);
        pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);

        pass.setPipeline(this.scatterEvenP);
        pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);

        pass.setPipeline(this.scatterOddP);
        pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);
        
        pass.end();
    }

    recordSort(bindGroup: GPUBindGroup, keysize: number, encoder: GPUCommandEncoder): void {
        this.recordCalculateHistogram(bindGroup, keysize, encoder);
        this.recordPrefixHistogram(bindGroup, 4, encoder);
        this.recordScatterKeys(bindGroup, 4, keysize, encoder);
    }

    recordSortIndirect(bindGroup: GPUBindGroup, dispatchBuffer: GPUBuffer, encoder: GPUCommandEncoder): void {
        this.recordCalculateHistogramIndirect(bindGroup, dispatchBuffer, encoder);
        this.recordPrefixHistogram(bindGroup, 4, encoder);
        this.recordScatterKeysIndirect(bindGroup, 4, dispatchBuffer, encoder);
    }
}

export class PointCloudSortStuff {
    numPoints: number;
    sorterUni: GPUBuffer; // uniform buffer information
    sorterDis: GPUBuffer; // dispatch buffer
    sorterBg: GPUBindGroup; // sorter bind group
    sorterRenderBg: GPUBindGroup; // bind group only with the sorted indices for rendering
    sorterBgPre: GPUBindGroup; // bind group for the preprocess

    constructor(
        numPoints: number,
        sorterUni: GPUBuffer,
        sorterDis: GPUBuffer,
        sorterBg: GPUBindGroup,
        sorterRenderBg: GPUBindGroup,
        sorterBgPre: GPUBindGroup
    ) {
        this.numPoints = numPoints;
        this.sorterUni = sorterUni;
        this.sorterDis = sorterDis;
        this.sorterBg = sorterBg;
        this.sorterRenderBg = sorterRenderBg;
        this.sorterBgPre = sorterBgPre;
    }
}

export class IndirectDispatch {
    dispatchX: number;
    dispatchY: number;
    dispatchZ: number;

    constructor(dispatchX: number, dispatchY: number, dispatchZ: number) {
        this.dispatchX = dispatchX;
        this.dispatchY = dispatchY;
        this.dispatchZ = dispatchZ;
    }
}

export class GeneralInfo {
    keysSize: number;
    paddedSize: number;
    passes: number;
    evenPass: number;
    oddPass: number;

    constructor(keysSize: number, paddedSize: number, passes: number, evenPass: number, oddPass: number) {
        this.keysSize = keysSize;
        this.paddedSize = paddedSize;
        this.passes = passes;
        this.evenPass = evenPass;
        this.oddPass = oddPass;
    }
}

function uploadToBuffer<T>(buffer: GPUBuffer, device: GPUDevice, queue: GPUQueue, values: ArrayLike<T>): void {
    // Convert values to Uint8Array for upload
    let data: Uint8Array;
    if (values instanceof Float32Array) {
        data = new Uint8Array(values.buffer);
    } else if (values instanceof Uint32Array) {
        data = new Uint8Array(values.buffer);
    } else {
        // Generic conversion for other types
        const float32Array = new Float32Array(values as ArrayLike<number>);
        data = new Uint8Array(float32Array.buffer);
    }

    const stagingBuffer = device.createBuffer({
        label: "Staging buffer",
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
    });
    
    new Uint8Array(stagingBuffer.getMappedRange()).set(data);
    stagingBuffer.unmap();

    const encoder = device.createCommandEncoder({ label: "Copy encoder" });
    encoder.copyBufferToBuffer(stagingBuffer, 0, buffer, 0, stagingBuffer.size);
    queue.submit([encoder.finish()]);

    // Wait for completion and cleanup
    device.queue.onSubmittedWorkDone().then(() => {
        stagingBuffer.destroy();
    });
}

async function downloadBuffer<T>(buffer: GPUBuffer, device: GPUDevice, queue: GPUQueue): Promise<T[]> {
    const downloadBuffer = device.createBuffer({
        label: "Download buffer",
        size: buffer.size,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const encoder = device.createCommandEncoder({ label: "Copy encoder" });
    encoder.copyBufferToBuffer(buffer, 0, downloadBuffer, 0, buffer.size);
    queue.submit([encoder.finish()]);

    await downloadBuffer.mapAsync(GPUMapMode.READ);
    const data = downloadBuffer.getMappedRange();
    
    // Convert to appropriate type array
    const float32Array = new Float32Array(data);
    const result = Array.from(float32Array) as T[];
    
    downloadBuffer.unmap();
    downloadBuffer.destroy();
    
    return result;
}
