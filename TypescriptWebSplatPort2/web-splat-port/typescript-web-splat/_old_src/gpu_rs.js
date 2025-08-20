"use strict";
/*
    This file implements a gpu version of radix sort. A good introduction to general purpose radix sort can
    be found here: http://www.codercorner.com/RadixSortRevisited.htm

    The gpu radix sort implemented here is a reimplementation of the vulkan radix sort found in the fuchsia repos: https://fuchsia.googlesource.com/fuchsia/+/refs/heads/main/src/graphics/lib/compute/radix_sort/
    Currently only the sorting for floating point key-value pairs is implemented, as only this is needed for this project

    All shaders can be found in shaders/radix_sort.wgsl
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneralInfo = exports.IndirectDispatch = exports.PointCloudSortStuff = exports.GPURSSorter = exports.RS_HISTOGRAM_BLOCK_ROWS = exports.HISTOGRAM_WG_SIZE = void 0;
// IMPORTANT: the following constants have to be synced with the numbers in radix_sort.wgsl
exports.HISTOGRAM_WG_SIZE = 256;
var RS_RADIX_LOG2 = 8; // 8 bit radices
var RS_RADIX_SIZE = 1 << RS_RADIX_LOG2; // 256 entries into the radix table
var RS_KEYVAL_SIZE = 32 / RS_RADIX_LOG2;
exports.RS_HISTOGRAM_BLOCK_ROWS = 15;
var RS_SCATTER_BLOCK_ROWS = exports.RS_HISTOGRAM_BLOCK_ROWS; // DO NOT CHANGE, shader assume this!!!
var PREFIX_WG_SIZE = 1 << 7; // one thread operates on 2 prefixes at the same time
var SCATTER_WG_SIZE = 1 << 8;
var GPURSSorter = /** @class */ (function () {
    function GPURSSorter(bindGroupLayout, renderBindGroupLayout, preprocessBindGroupLayout, zeroP, histogramP, prefixP, scatterEvenP, scatterOddP, subgroupSize) {
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
    GPURSSorter.new = function (device, queue) {
        return __awaiter(this, void 0, void 0, function () {
            var curSorter, sizes, curSize, State, biggestThatWorked, s, sortSuccess;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.debug("Searching for the maximum subgroup size (wgpu currently does not allow to query subgroup sizes)");
                        sizes = [1, 8, 16, 32];
                        curSize = 2;
                        (function (State) {
                            State[State["Init"] = 0] = "Init";
                            State[State["Increasing"] = 1] = "Increasing";
                            State[State["Decreasing"] = 2] = "Decreasing";
                        })(State || (State = {}));
                        biggestThatWorked = 0;
                        s = State.Init;
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        if (curSize >= sizes.length) {
                            return [3 /*break*/, 3];
                        }
                        console.debug("Checking sorting with subgroupsize ".concat(sizes[curSize]));
                        curSorter = GPURSSorter.newWithSgSize(device, sizes[curSize]);
                        return [4 /*yield*/, curSorter.testSort(device, queue)];
                    case 2:
                        sortSuccess = _a.sent();
                        console.debug("".concat(sizes[curSize], " worked: ").concat(sortSuccess));
                        switch (s) {
                            case State.Init:
                                if (sortSuccess) {
                                    biggestThatWorked = sizes[curSize];
                                    s = State.Increasing;
                                    curSize += 1;
                                }
                                else {
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
                                }
                                else {
                                    break;
                                }
                                break;
                            case State.Decreasing:
                                if (sortSuccess) {
                                    if (sizes[curSize] > biggestThatWorked) {
                                        biggestThatWorked = sizes[curSize];
                                    }
                                    break;
                                }
                                else {
                                    curSize -= 1;
                                }
                                break;
                        }
                        return [3 /*break*/, 1];
                    case 3:
                        if (biggestThatWorked === 0) {
                            throw new Error("GPURSSorter::new() No workgroup size that works was found. Unable to use sorter");
                        }
                        curSorter = GPURSSorter.newWithSgSize(device, biggestThatWorked);
                        console.info("Created a sorter with subgroup size ".concat(curSorter.subgroupSize, "\n"));
                        return [2 /*return*/, curSorter];
                }
            });
        });
    };
    GPURSSorter.prototype.createSortStuff = function (device, numPoints) {
        var _a = GPURSSorter.createKeyvalBuffers(device, numPoints, 4), sorterBA = _a[0], sorterBB = _a[1], sorterPA = _a[2], sorterPB = _a[3];
        var sorterInt = this.createInternalMemBuffer(device, numPoints);
        var _b = this.createBindGroup(device, numPoints, sorterInt, sorterBA, sorterBB, sorterPA, sorterPB), sorterUni = _b[0], sorterDis = _b[1], sorterBg = _b[2];
        var sorterRenderBg = this.createBindGroupRender(device, sorterUni, sorterPA);
        var sorterBgPre = this.createBindGroupPreprocess(device, sorterUni, sorterDis, sorterBA, sorterPA);
        return new PointCloudSortStuff(numPoints, sorterUni, sorterDis, sorterBg, sorterRenderBg, sorterBgPre);
    };
    GPURSSorter.newWithSgSize = function (device, sgSize) {
        // special variables for scatter shade
        var histogramSgSize = sgSize;
        var rsSweep0Size = RS_RADIX_SIZE / histogramSgSize;
        var rsSweep1Size = rsSweep0Size / histogramSgSize;
        var rsSweep2Size = rsSweep1Size / histogramSgSize;
        var rsSweepSize = rsSweep0Size + rsSweep1Size + rsSweep2Size;
        var _rsSmemPhase1 = RS_RADIX_SIZE + RS_RADIX_SIZE + rsSweepSize;
        var rsSmemPhase2 = RS_RADIX_SIZE + RS_SCATTER_BLOCK_ROWS * SCATTER_WG_SIZE;
        // rs_smem_phase_2 will always be larger, so always use phase2
        var rsMemDwords = rsSmemPhase2;
        var rsMemSweep0Offset = 0;
        var rsMemSweep1Offset = rsMemSweep0Offset + rsSweep0Size;
        var rsMemSweep2Offset = rsMemSweep1Offset + rsSweep1Size;
        var bindGroupLayout = GPURSSorter.bindGroupLayouts(device);
        var renderBindGroupLayout = GPURSSorter.bindGroupLayoutRendering(device);
        var preprocessBindGroupLayout = GPURSSorter.bindGroupLayoutPreprocess(device);
        var pipelineLayout = device.createPipelineLayout({
            label: "radix sort pipeline layout",
            bindGroupLayouts: [bindGroupLayout],
        });
        // Load shader from file - in a real implementation, you'd load this from the actual file
        var rawShader = "// Placeholder for radix_sort.wgsl content - should be loaded from file";
        var shaderWConst = "const histogram_sg_size: u32 = ".concat(histogramSgSize, "u;\nconst histogram_wg_size: u32 = ").concat(exports.HISTOGRAM_WG_SIZE, "u;\nconst rs_radix_log2: u32 = ").concat(RS_RADIX_LOG2, "u;\nconst rs_radix_size: u32 = ").concat(RS_RADIX_SIZE, "u;\nconst rs_keyval_size: u32 = ").concat(RS_KEYVAL_SIZE, "u;\nconst rs_histogram_block_rows: u32 = ").concat(exports.RS_HISTOGRAM_BLOCK_ROWS, "u;\nconst rs_scatter_block_rows: u32 = ").concat(RS_SCATTER_BLOCK_ROWS, "u;\nconst rs_mem_dwords: u32 = ").concat(rsMemDwords, "u;\nconst rs_mem_sweep_0_offset: u32 = ").concat(rsMemSweep0Offset, "u;\nconst rs_mem_sweep_1_offset: u32 = ").concat(rsMemSweep1Offset, "u;\nconst rs_mem_sweep_2_offset: u32 = ").concat(rsMemSweep2Offset, "u;\n").concat(rawShader);
        var shaderCode = shaderWConst
            .replace(/{histogram_wg_size}/g, exports.HISTOGRAM_WG_SIZE.toString())
            .replace(/{prefix_wg_size}/g, PREFIX_WG_SIZE.toString())
            .replace(/{scatter_wg_size}/g, SCATTER_WG_SIZE.toString());
        var shader = device.createShaderModule({
            label: "Radix sort shader",
            code: shaderCode,
        });
        var zeroP = device.createComputePipeline({
            label: "Zero the histograms",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "zero_histograms",
            },
        });
        var histogramP = device.createComputePipeline({
            label: "calculate_histogram",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "calculate_histogram",
            },
        });
        var prefixP = device.createComputePipeline({
            label: "prefix_histogram",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "prefix_histogram",
            },
        });
        var scatterEvenP = device.createComputePipeline({
            label: "scatter_even",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "scatter_even",
            },
        });
        var scatterOddP = device.createComputePipeline({
            label: "scatter_odd",
            layout: pipelineLayout,
            compute: {
                module: shader,
                entryPoint: "scatter_odd",
            },
        });
        return new GPURSSorter(bindGroupLayout, renderBindGroupLayout, preprocessBindGroupLayout, zeroP, histogramP, prefixP, scatterEvenP, scatterOddP, histogramSgSize);
    };
    GPURSSorter.prototype.testSort = function (device, queue) {
        return __awaiter(this, void 0, void 0, function () {
            var n, scrambledData, sortedData, i, internalMemBuffer, _a, keyvalA, keyvalB, payloadA, payloadB, _b, _uniformBuffer, _dispatchBuffer, bindGroup, encoder, commandBuffer, sorted, i;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        n = 8192;
                        scrambledData = new Float32Array(n);
                        sortedData = new Float32Array(n);
                        for (i = 0; i < n; i++) {
                            scrambledData[i] = (n - 1 - i);
                            sortedData[i] = i;
                        }
                        internalMemBuffer = this.createInternalMemBuffer(device, n);
                        _a = GPURSSorter.createKeyvalBuffers(device, n, 4), keyvalA = _a[0], keyvalB = _a[1], payloadA = _a[2], payloadB = _a[3];
                        _b = this.createBindGroup(device, n, internalMemBuffer, keyvalA, keyvalB, payloadA, payloadB), _uniformBuffer = _b[0], _dispatchBuffer = _b[1], bindGroup = _b[2];
                        uploadToBuffer(keyvalA, device, queue, scrambledData);
                        encoder = device.createCommandEncoder({
                            label: "GPURSSorter test_sort",
                        });
                        this.recordSort(bindGroup, n, encoder);
                        commandBuffer = encoder.finish();
                        queue.submit([commandBuffer]);
                        return [4 /*yield*/, device.queue.onSubmittedWorkDone()];
                    case 1:
                        _c.sent();
                        return [4 /*yield*/, downloadBuffer(keyvalA, device, queue)];
                    case 2:
                        sorted = _c.sent();
                        for (i = 0; i < n; i++) {
                            if (sorted[i] !== sortedData[i]) {
                                return [2 /*return*/, false];
                            }
                        }
                        return [2 /*return*/, true];
                }
            });
        });
    };
    // layouts used by the sorting pipeline, as the dispatch buffer has to be in separate bind group
    GPURSSorter.bindGroupLayouts = function (device) {
        return device.createBindGroupLayout({
            label: "Radix bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
            ],
        });
    };
    // is used by the preprocess pipeline as the limitation of bind groups forces us to only use 1 bind group for the sort infos
    GPURSSorter.bindGroupLayoutPreprocess = function (device) {
        return device.createBindGroupLayout({
            label: "Radix bind group layout for preprocess pipeline",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" },
                },
            ],
        });
    };
    // used by the renderer, as read_only : false is not allowed without an extension
    GPURSSorter.bindGroupLayoutRendering = function (device) {
        return device.createBindGroupLayout({
            label: "Radix bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: { type: "read-only-storage" },
                },
            ],
        });
    };
    GPURSSorter.getScatterHistogramSizes = function (keysize) {
        var scatterBlockKvs = exports.HISTOGRAM_WG_SIZE * RS_SCATTER_BLOCK_ROWS;
        var scatterBlocksRu = Math.ceil(keysize / scatterBlockKvs);
        var countRuScatter = scatterBlocksRu * scatterBlockKvs;
        var histoBlockKvs = exports.HISTOGRAM_WG_SIZE * exports.RS_HISTOGRAM_BLOCK_ROWS;
        var histoBlocksRu = Math.ceil(countRuScatter / histoBlockKvs);
        var countRuHisto = histoBlocksRu * histoBlockKvs;
        return [scatterBlockKvs, scatterBlocksRu, countRuScatter, histoBlockKvs, histoBlocksRu, countRuHisto];
    };
    GPURSSorter.createKeyvalBuffers = function (device, keysize, bytesPerPayloadElem) {
        var keysPerWorkgroup = exports.HISTOGRAM_WG_SIZE * exports.RS_HISTOGRAM_BLOCK_ROWS;
        var countRuHisto = Math.ceil((keysize + keysPerWorkgroup) / keysPerWorkgroup + 1) * keysPerWorkgroup;
        var bufferA = device.createBuffer({
            label: "Radix data buffer a",
            size: countRuHisto * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        var bufferB = device.createBuffer({
            label: "Radix data buffer b",
            size: countRuHisto * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        if (bytesPerPayloadElem !== 4) {
            throw new Error("Currently only 4 byte values are allowed");
        }
        var payloadSize = Math.max(keysize * bytesPerPayloadElem, 1);
        var payloadA = device.createBuffer({
            label: "Radix payload buffer a",
            size: payloadSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        var payloadB = device.createBuffer({
            label: "Radix payload buffer b",
            size: payloadSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        return [bufferA, bufferB, payloadA, payloadB];
    };
    GPURSSorter.prototype.createInternalMemBuffer = function (device, keysize) {
        var _a = GPURSSorter.getScatterHistogramSizes(keysize), scatterBlocksRu = _a[1];
        var histoSize = RS_RADIX_SIZE * 4;
        var internalSize = (RS_KEYVAL_SIZE + scatterBlocksRu - 1 + 1) * histoSize;
        return device.createBuffer({
            label: "Internal radix sort buffer",
            size: internalSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
    };
    GPURSSorter.prototype.createBindGroup = function (device, keysize, internalMemBuffer, keyvalA, keyvalB, payloadA, payloadB) {
        var _a = GPURSSorter.getScatterHistogramSizes(keysize), scatterBlocksRu = _a[1], countRuHisto = _a[5];
        var dispatchInfos = new IndirectDispatch(scatterBlocksRu, 1, 1);
        var uniformInfos = new GeneralInfo(keysize, countRuHisto, 4, 0, 0);
        var uniformBuffer = device.createBuffer({
            label: "Radix uniform buffer",
            size: 20,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        var uniformData = new Uint32Array(uniformBuffer.getMappedRange());
        uniformData[0] = uniformInfos.keysSize;
        uniformData[1] = uniformInfos.paddedSize;
        uniformData[2] = uniformInfos.passes;
        uniformData[3] = uniformInfos.evenPass;
        uniformData[4] = uniformInfos.oddPass;
        uniformBuffer.unmap();
        var dispatchBuffer = device.createBuffer({
            label: "Dispatch indirect buffer",
            size: 12,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT,
            mappedAtCreation: true,
        });
        var dispatchData = new Uint32Array(dispatchBuffer.getMappedRange());
        dispatchData[0] = dispatchInfos.dispatchX;
        dispatchData[1] = dispatchInfos.dispatchY;
        dispatchData[2] = dispatchInfos.dispatchZ;
        dispatchBuffer.unmap();
        var bindGroup = device.createBindGroup({
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
    };
    GPURSSorter.prototype.createBindGroupRender = function (device, generalInfos, payloadA) {
        return device.createBindGroup({
            label: "Render bind group",
            layout: this.renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: generalInfos } },
                { binding: 4, resource: { buffer: payloadA } },
            ],
        });
    };
    GPURSSorter.prototype.createBindGroupPreprocess = function (device, uniformBuffer, dispatchBuffer, keyvalA, payloadA) {
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
    };
    GPURSSorter.recordResetIndirectBuffer = function (indirectBuffer, uniformBuffer, queue) {
        var zeroData = new Uint8Array(4);
        queue.writeBuffer(indirectBuffer, 0, zeroData);
        queue.writeBuffer(uniformBuffer, 0, zeroData);
    };
    GPURSSorter.prototype.recordCalculateHistogram = function (bindGroup, keysize, encoder) {
        var _a = GPURSSorter.getScatterHistogramSizes(keysize), histBlocksRu = _a[4];
        {
            var pass = encoder.beginComputePass({ label: "zeroing the histogram" });
            pass.setPipeline(this.zeroP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(histBlocksRu, 1, 1);
            pass.end();
        }
        {
            var pass = encoder.beginComputePass({ label: "calculate histogram" });
            pass.setPipeline(this.histogramP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroups(histBlocksRu, 1, 1);
            pass.end();
        }
    };
    GPURSSorter.prototype.recordCalculateHistogramIndirect = function (bindGroup, dispatchBuffer, encoder) {
        {
            var pass = encoder.beginComputePass({ label: "zeroing the histogram" });
            pass.setPipeline(this.zeroP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);
            pass.end();
        }
        {
            var pass = encoder.beginComputePass({ label: "calculate histogram" });
            pass.setPipeline(this.histogramP);
            pass.setBindGroup(0, bindGroup);
            pass.dispatchWorkgroupsIndirect(dispatchBuffer, 0);
            pass.end();
        }
    };
    GPURSSorter.prototype.recordPrefixHistogram = function (bindGroup, passes, encoder) {
        var pass = encoder.beginComputePass({ label: "prefix histogram" });
        pass.setPipeline(this.prefixP);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(passes, 1, 1);
        pass.end();
    };
    GPURSSorter.prototype.recordScatterKeys = function (bindGroup, passes, keysize, encoder) {
        if (passes !== 4) {
            throw new Error("Currently the amount of passes is hardcoded in the shader");
        }
        var _a = GPURSSorter.getScatterHistogramSizes(keysize), scatterBlocksRu = _a[1];
        var pass = encoder.beginComputePass({ label: "Scatter keyvals" });
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
    };
    GPURSSorter.prototype.recordScatterKeysIndirect = function (bindGroup, passes, dispatchBuffer, encoder) {
        if (passes !== 4) {
            throw new Error("Currently the amount of passes is hardcoded in the shader");
        }
        var pass = encoder.beginComputePass({ label: "Scatter keyvals" });
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
    };
    GPURSSorter.prototype.recordSort = function (bindGroup, keysize, encoder) {
        this.recordCalculateHistogram(bindGroup, keysize, encoder);
        this.recordPrefixHistogram(bindGroup, 4, encoder);
        this.recordScatterKeys(bindGroup, 4, keysize, encoder);
    };
    GPURSSorter.prototype.recordSortIndirect = function (bindGroup, dispatchBuffer, encoder) {
        this.recordCalculateHistogramIndirect(bindGroup, dispatchBuffer, encoder);
        this.recordPrefixHistogram(bindGroup, 4, encoder);
        this.recordScatterKeysIndirect(bindGroup, 4, dispatchBuffer, encoder);
    };
    return GPURSSorter;
}());
exports.GPURSSorter = GPURSSorter;
var PointCloudSortStuff = /** @class */ (function () {
    function PointCloudSortStuff(numPoints, sorterUni, sorterDis, sorterBg, sorterRenderBg, sorterBgPre) {
        this.numPoints = numPoints;
        this.sorterUni = sorterUni;
        this.sorterDis = sorterDis;
        this.sorterBg = sorterBg;
        this.sorterRenderBg = sorterRenderBg;
        this.sorterBgPre = sorterBgPre;
    }
    return PointCloudSortStuff;
}());
exports.PointCloudSortStuff = PointCloudSortStuff;
var IndirectDispatch = /** @class */ (function () {
    function IndirectDispatch(dispatchX, dispatchY, dispatchZ) {
        this.dispatchX = dispatchX;
        this.dispatchY = dispatchY;
        this.dispatchZ = dispatchZ;
    }
    return IndirectDispatch;
}());
exports.IndirectDispatch = IndirectDispatch;
var GeneralInfo = /** @class */ (function () {
    function GeneralInfo(keysSize, paddedSize, passes, evenPass, oddPass) {
        this.keysSize = keysSize;
        this.paddedSize = paddedSize;
        this.passes = passes;
        this.evenPass = evenPass;
        this.oddPass = oddPass;
    }
    return GeneralInfo;
}());
exports.GeneralInfo = GeneralInfo;
function uploadToBuffer(buffer, device, queue, values) {
    // Convert values to Uint8Array for upload
    var data;
    if (values instanceof Float32Array) {
        data = new Uint8Array(values.buffer);
    }
    else if (values instanceof Uint32Array) {
        data = new Uint8Array(values.buffer);
    }
    else {
        // Generic conversion for other types
        var float32Array = new Float32Array(values);
        data = new Uint8Array(float32Array.buffer);
    }
    var stagingBuffer = device.createBuffer({
        label: "Staging buffer",
        size: data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
    });
    new Uint8Array(stagingBuffer.getMappedRange()).set(data);
    stagingBuffer.unmap();
    var encoder = device.createCommandEncoder({ label: "Copy encoder" });
    encoder.copyBufferToBuffer(stagingBuffer, 0, buffer, 0, stagingBuffer.size);
    queue.submit([encoder.finish()]);
    // Wait for completion and cleanup
    device.queue.onSubmittedWorkDone().then(function () {
        stagingBuffer.destroy();
    });
}
function downloadBuffer(buffer, device, queue) {
    return __awaiter(this, void 0, void 0, function () {
        var downloadBuffer, encoder, data, float32Array, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    downloadBuffer = device.createBuffer({
                        label: "Download buffer",
                        size: buffer.size,
                        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
                    });
                    encoder = device.createCommandEncoder({ label: "Copy encoder" });
                    encoder.copyBufferToBuffer(buffer, 0, downloadBuffer, 0, buffer.size);
                    queue.submit([encoder.finish()]);
                    return [4 /*yield*/, downloadBuffer.mapAsync(GPUMapMode.READ)];
                case 1:
                    _a.sent();
                    data = downloadBuffer.getMappedRange();
                    float32Array = new Float32Array(data);
                    result = Array.from(float32Array);
                    downloadBuffer.unmap();
                    downloadBuffer.destroy();
                    return [2 /*return*/, result];
            }
        });
    });
}
