"use strict";
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
exports.Display = exports.GaussianRenderer = exports.SplattingArgsUniform = exports.DEFAULT_KERNEL_SIZE = exports.CameraUniform = void 0;
var gl_matrix_1 = require("gl-matrix");
var camera_js_1 = require("./camera.js");
var pointcloud_js_1 = require("./pointcloud.js");
var uniform_js_1 = require("./uniform.js");
/**
 * Camera uniform data structure for GPU
 */
var CameraUniform = /** @class */ (function () {
    function CameraUniform() {
        this.viewMatrix = gl_matrix_1.mat4.create();
        this.viewInvMatrix = gl_matrix_1.mat4.create();
        this.projMatrix = gl_matrix_1.mat4.create();
        this.projInvMatrix = gl_matrix_1.mat4.create();
        this.viewport = gl_matrix_1.vec2.fromValues(1.0, 1.0);
        this.focal = gl_matrix_1.vec2.fromValues(1.0, 1.0);
    }
    CameraUniform.prototype.setViewMat = function (viewMatrix) {
        gl_matrix_1.mat4.copy(this.viewMatrix, viewMatrix);
        gl_matrix_1.mat4.invert(this.viewInvMatrix, viewMatrix);
    };
    CameraUniform.prototype.setProjMat = function (projMatrix) {
        var temp = gl_matrix_1.mat4.create();
        gl_matrix_1.mat4.multiply(temp, camera_js_1.VIEWPORT_Y_FLIP, projMatrix);
        gl_matrix_1.mat4.copy(this.projMatrix, temp);
        gl_matrix_1.mat4.invert(this.projInvMatrix, projMatrix);
    };
    CameraUniform.prototype.setCamera = function (camera) {
        this.setProjMat(camera.projMatrix());
        this.setViewMat(camera.viewMatrix());
    };
    CameraUniform.prototype.setViewport = function (viewport) {
        gl_matrix_1.vec2.copy(this.viewport, viewport);
    };
    CameraUniform.prototype.setFocal = function (focal) {
        gl_matrix_1.vec2.copy(this.focal, focal);
    };
    return CameraUniform;
}());
exports.CameraUniform = CameraUniform;
exports.DEFAULT_KERNEL_SIZE = 0.3;
/**
 * Splatting arguments uniform data for GPU
 */
var SplattingArgsUniform = /** @class */ (function () {
    function SplattingArgsUniform() {
        this.clippingBoxMin = gl_matrix_1.vec4.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.0);
        this.clippingBoxMax = gl_matrix_1.vec4.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0.0);
        this.gaussianScaling = 1.0;
        this.maxShDeg = 3;
        this.showEnvMap = 1;
        this.mipSplatting = 0;
        this.kernelSize = exports.DEFAULT_KERNEL_SIZE;
        this.walltime = 0.0;
        this.sceneCenter = gl_matrix_1.vec4.fromValues(0.0, 0.0, 0.0, 0.0);
        this.sceneExtend = 1.0;
        this._pad = 0;
    }
    SplattingArgsUniform.fromArgsAndPc = function (args, pc) {
        var _a, _b, _c, _d, _e, _f;
        var uniform = new SplattingArgsUniform();
        uniform.gaussianScaling = args.gaussianScaling;
        uniform.maxShDeg = args.maxShDeg;
        uniform.showEnvMap = args.showEnvMap ? 1 : 0;
        uniform.mipSplatting = ((_b = (_a = args.mipSplatting) !== null && _a !== void 0 ? _a : (pc.mipSplatting ? pc.mipSplatting() : false)) !== null && _b !== void 0 ? _b : false) ? 1 : 0;
        uniform.kernelSize = (_d = (_c = args.kernelSize) !== null && _c !== void 0 ? _c : (pc.dilationKernelSize ? pc.dilationKernelSize() : exports.DEFAULT_KERNEL_SIZE)) !== null && _d !== void 0 ? _d : exports.DEFAULT_KERNEL_SIZE;
        var bbox = pc.bbox();
        var clippingBox = (_e = args.clippingBox) !== null && _e !== void 0 ? _e : bbox;
        gl_matrix_1.vec4.set(uniform.clippingBoxMin, clippingBox.min.x, clippingBox.min.y, clippingBox.min.z, 0.0);
        gl_matrix_1.vec4.set(uniform.clippingBoxMax, clippingBox.max.x, clippingBox.max.y, clippingBox.max.z, 0.0);
        uniform.walltime = args.walltime;
        var center = pc.center();
        gl_matrix_1.vec4.set(uniform.sceneCenter, center.x, center.y, center.z, 0.0);
        uniform.sceneExtend = Math.max((_f = args.sceneExtend) !== null && _f !== void 0 ? _f : 1.0, 1.0);
        return uniform;
    };
    return SplattingArgsUniform;
}());
exports.SplattingArgsUniform = SplattingArgsUniform;
function loadWGSL(path, header) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(path)];
                case 1:
                    resp = _a.sent();
                    return [4 /*yield*/, resp.text()];
                case 2:
                    body = _a.sent();
                    return [2 /*return*/, (header !== null && header !== void 0 ? header : "") + "\n" + body];
            }
        });
    });
}
/**
 * Preprocess pipeline for converting 3D gaussians to 2D
 */
var PreprocessPipeline = /** @class */ (function () {
    function PreprocessPipeline(pipeline) {
        this.pipeline = pipeline;
    }
    PreprocessPipeline.create = function (device, shDeg, compressed) {
        return __awaiter(this, void 0, void 0, function () {
            var pipelineLayout, url, code, shader, pipeline;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pipelineLayout = device.createPipelineLayout({
                            label: 'preprocess pipeline layout',
                            bindGroupLayouts: [
                                // group(0): unified (camera @0, settings @1)
                                uniform_js_1.UnifiedUniformBuffer.bindGroupLayout(device),
                                // group(1): point cloud (compressed or not)
                                (compressed ? pointcloud_js_1.PointCloud.bindGroupLayoutCompressed(device)
                                    : pointcloud_js_1.PointCloud.bindGroupLayout(device)),
                                // group(2): sort-pre (stub for now; swap to real sorter later)
                                GaussianRenderer.sortPreBindGroupLayout(device),
                                // NOTE: group(3) not needed if WGSL uses unified g0
                            ]
                        });
                        url = "./shaders/".concat(compressed ? 'preprocess_compressed.wgsl' : 'preprocess.wgsl');
                        return [4 /*yield*/, fetch(url)];
                    case 1: return [4 /*yield*/, (_a.sent()).text()];
                    case 2:
                        code = _a.sent();
                        shader = device.createShaderModule({ label: 'preprocess shader', code: code });
                        pipeline = device.createComputePipeline({
                            label: 'preprocess pipeline',
                            layout: pipelineLayout,
                            compute: { module: shader, entryPoint: 'preprocess' }
                        });
                        return [2 /*return*/, new PreprocessPipeline(pipeline)];
                }
            });
        });
    };
    PreprocessPipeline.prototype.run = function (encoder, pc, unifiedBG, // group(0) — combined camera+settings
    sortPreBG // group(2)
    ) {
        var pass = encoder.beginComputePass({ label: 'preprocess compute pass' });
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, unifiedBG); // camera+settings at g0
        pass.setBindGroup(1, pc.getBindGroup());
        pass.setBindGroup(2, sortPreBG);
        var wgsX = Math.ceil(pc.numPoints() / 256);
        pass.dispatchWorkgroups(wgsX, 1, 1);
        pass.end();
    };
    return PreprocessPipeline;
}());
/**
 * Main Gaussian renderer
 */
var GaussianRenderer = /** @class */ (function () {
    function GaussianRenderer(device, queue, colorFormat, shDeg, compressed, pipeline, unifiedUniform, preprocess, drawIndirectBuffer, drawIndirect) {
        this.sorter = null; // Will be initialized when gpu_rs is ported
        this.sorterStuff = null;
        this.indicesBuffer = null;
        this.indicesBindGroup = null;
        this.sortPreBuffer = null;
        this.sortPreBindGroup = null;
        this.pipeline = pipeline;
        this.unifiedUniform = unifiedUniform;
        this.preprocess = preprocess;
        this.drawIndirectBuffer = drawIndirectBuffer;
        this.drawIndirect = drawIndirect;
        this._colorFormat = colorFormat;
    }
    GaussianRenderer.prototype.ensureSortPre = function (device, count) {
        var _a, _b;
        var needed = Math.max(4, count * 4); // one f32 per point (adjust if WGSL needs different)
        if (!this.sortPreBuffer || this.sortPreBuffer.size < needed) {
            (_b = (_a = this.sortPreBuffer) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.sortPreBuffer = device.createBuffer({
                label: 'preprocess sort-pre buffer (stub)',
                size: needed,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.sortPreBindGroup = device.createBindGroup({
                label: 'preprocess sort-pre BG (stub)',
                layout: GaussianRenderer.sortPreBindGroupLayout(device),
                entries: [{ binding: 0, resource: { buffer: this.sortPreBuffer } }]
            });
        }
    };
    GaussianRenderer.sortPreBindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: 'sort-pre bind group layout (stub)',
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
            ]
        });
    };
    GaussianRenderer.create = function (device, queue, colorFormat, shDeg, compressed) {
        return __awaiter(this, void 0, void 0, function () {
            var renderPipelineLayout, shaderResponse, shaderCode, shader, pipeline, drawIndirectBuffer, indirectLayout, drawIndirect, unifiedUniform, preprocess;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        renderPipelineLayout = device.createPipelineLayout({
                            label: 'render pipeline layout',
                            bindGroupLayouts: [
                                pointcloud_js_1.PointCloud.bindGroupLayoutRender(device), // group(0): provides binding(2) points_2d
                                GaussianRenderer.renderBindGroupLayout(device), // group(1): provides binding(4) indices
                            ],
                        });
                        return [4 /*yield*/, fetch('./shaders/gaussian.wgsl')];
                    case 1:
                        shaderResponse = _a.sent();
                        return [4 /*yield*/, shaderResponse.text()];
                    case 2:
                        shaderCode = _a.sent();
                        shader = device.createShaderModule({
                            label: 'gaussian shader',
                            code: shaderCode
                        });
                        pipeline = device.createRenderPipeline({
                            label: 'render pipeline',
                            layout: renderPipelineLayout,
                            vertex: { module: shader, entryPoint: 'vs_main' },
                            fragment: {
                                module: shader,
                                entryPoint: 'fs_main',
                                targets: [{
                                        format: colorFormat,
                                        blend: {
                                            color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                                            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                                        },
                                        writeMask: GPUColorWrite.ALL,
                                    }],
                            },
                            primitive: { topology: 'triangle-strip', frontFace: 'ccw' },
                        });
                        drawIndirectBuffer = device.createBuffer({
                            label: 'indirect draw buffer',
                            size: 16, // DrawIndirectArgs
                            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
                        });
                        indirectLayout = GaussianRenderer.bindGroupLayout(device);
                        drawIndirect = device.createBindGroup({
                            label: 'draw indirect buffer',
                            layout: indirectLayout,
                            entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
                        });
                        unifiedUniform = new uniform_js_1.UnifiedUniformBuffer(device);
                        return [4 /*yield*/, PreprocessPipeline.create(device, shDeg, compressed)];
                    case 3:
                        preprocess = _a.sent();
                        return [2 /*return*/, new GaussianRenderer(device, queue, colorFormat, shDeg, compressed, pipeline, unifiedUniform, preprocess, drawIndirectBuffer, drawIndirect)];
                }
            });
        });
    };
    GaussianRenderer.prototype.ensureFallbackIndices = function (device, queue, count) {
        var _a, _b;
        var neededSize = count * 4;
        if (!this.indicesBuffer || this.indicesBuffer.size < neededSize) {
            (_b = (_a = this.indicesBuffer) === null || _a === void 0 ? void 0 : _a.destroy) === null || _b === void 0 ? void 0 : _b.call(_a);
            this.indicesBuffer = device.createBuffer({
                label: 'fallback indices',
                size: neededSize,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            // Fill 0..N-1 on CPU and upload once
            var arr = new Uint32Array(count);
            for (var i = 0; i < count; i++)
                arr[i] = i;
            queue.writeBuffer(this.indicesBuffer, 0, arr);
            this.indicesBindGroup = device.createBindGroup({
                label: 'indices bind group',
                layout: GaussianRenderer.renderBindGroupLayout(device),
                entries: [{ binding: 4, resource: { buffer: this.indicesBuffer } }]
            });
        }
    };
    GaussianRenderer.renderBindGroupLayout = function (device) {
        // Matches gaussian.wgsl: @group(1) @binding(4) indices : array<u32>
        return device.createBindGroupLayout({
            label: 'render indices bind group layout',
            entries: [
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage' }
                }
            ]
        });
    };
    GaussianRenderer.prototype.getDrawIndirectBuffer = function () {
        return this.drawIndirectBuffer;
    };
    GaussianRenderer.prototype.getUnifiedUniform = function () {
        return this.unifiedUniform;
    };
    GaussianRenderer.prototype.serializeCameraUniform = function (camera) {
        var buf = new ArrayBuffer(272); // CAMERA_SIZE
        var f32 = new Float32Array(buf);
        // view_matrix [0..16)
        f32.set(camera.viewMatrix, 0);
        // view_inv_matrix [16..32)
        f32.set(camera.viewInvMatrix, 16);
        // proj_matrix [32..48)
        f32.set(camera.projMatrix, 32);
        // proj_inv_matrix [48..64)
        f32.set(camera.projInvMatrix, 48);
        // viewport (vec2) [64..66)
        f32[64] = camera.viewport[0];
        f32[65] = camera.viewport[1];
        // focal (vec2) [66..68)
        f32[66] = camera.focal[0];
        f32[67] = camera.focal[1];
        return new Uint8Array(buf);
    };
    GaussianRenderer.prototype.serializeSettingsUniform = function (settings) {
        var _a;
        var buf = new ArrayBuffer(80); // SETTINGS_SIZE
        var dv = new DataView(buf);
        var off = 0;
        // clipping_box_min (vec4)
        for (var i = 0; i < 4; i++)
            dv.setFloat32(off + i * 4, settings.clippingBoxMin[i], true);
        off += 16;
        // clipping_box_max (vec4)
        for (var i = 0; i < 4; i++)
            dv.setFloat32(off + i * 4, settings.clippingBoxMax[i], true);
        off += 16;
        // gaussian_scaling f32
        dv.setFloat32(off, settings.gaussianScaling, true);
        off += 4;
        // max_sh_deg u32
        dv.setUint32(off, settings.maxShDeg >>> 0, true);
        off += 4;
        // show_env_map u32
        dv.setUint32(off, settings.showEnvMap >>> 0, true);
        off += 4;
        // mip_splatting u32
        dv.setUint32(off, settings.mipSplatting >>> 0, true);
        off += 4;
        // kernel_size, walltime, scene_extend (3 * f32)
        dv.setFloat32(off, settings.kernelSize, true);
        off += 4;
        dv.setFloat32(off, settings.walltime, true);
        off += 4;
        dv.setFloat32(off, settings.sceneExtend, true);
        off += 4;
        // _pad u32
        dv.setUint32(off, 0, true);
        off += 4;
        // scene_center vec4
        for (var i = 0; i < 4; i++)
            dv.setFloat32(off + i * 4, (_a = settings.sceneCenter[i]) !== null && _a !== void 0 ? _a : 0, true);
        return new Uint8Array(buf);
    };
    GaussianRenderer.prototype.preprocessStep = function (encoder, queue, pc, renderSettings) {
        // Update unified uniform buffer with camera and settings data
        var cameraUniform = new CameraUniform();
        cameraUniform.setCamera(renderSettings.camera);
        cameraUniform.setViewport(renderSettings.viewport);
        // Calculate focal length from projection parameters
        var focalX = renderSettings.viewport[0] / (2.0 * Math.tan(renderSettings.camera.projection.fovx / 2.0));
        var focalY = renderSettings.viewport[1] / (2.0 * Math.tan(renderSettings.camera.projection.fovy / 2.0));
        cameraUniform.setFocal(gl_matrix_1.vec2.fromValues(focalX, focalY));
        var settingsUniform = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
        // Convert uniform objects to byte arrays
        var cameraBytes = this.serializeCameraUniform(cameraUniform);
        var settingsBytes = this.serializeSettingsUniform(settingsUniform);
        this.unifiedUniform.updateCamera(queue, cameraBytes);
        this.unifiedUniform.updateSettings(queue, settingsBytes);
        // Setup draw indirect buffer
        var drawArgs = new ArrayBuffer(16);
        var view = new DataView(drawArgs);
        view.setUint32(0, 4, true); // vertex_count
        view.setUint32(4, pc.numPoints(), true); // instance_count
        view.setUint32(8, 0, true); // first_vertex
        view.setUint32(12, 0, true); // first_instance
        queue.writeBuffer(this.drawIndirectBuffer, 0, drawArgs);
    };
    GaussianRenderer.prototype.prepare = function (encoder, device, queue, pc, renderSettings, stopwatch) {
        // Initialize sorter stuff if needed
        if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints()) {
            console.log("Created sort buffers for ".concat(pc.numPoints(), " points"));
            if (this.sorter) {
                this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
            }
        }
        if (this.sorter && this.sorterStuff) {
            this.sorter.recordResetIndirectBuffer(this.sorterStuff.sorterDis, this.sorterStuff.sorterUni, queue);
        }
        // Preprocess step
        if (stopwatch) {
            stopwatch.start(encoder, 'preprocess');
        }
        this.preprocessStep(encoder, queue, pc, renderSettings);
        this.ensureSortPre(device, pc.numPoints());
        this.preprocess.run(encoder, pc, this.unifiedUniform.getCombinedBindGroup(), // g0: combined camera+settings
        (this.sorterStuff ? this.sorterStuff.sorterBgPre
            : this.sortPreBindGroup) // g2: real or stub
        );
        /*this.preprocess.run(
            encoder,
            pc,
            this.unifiedUniform.getCameraBindGroup(),
            this.unifiedUniform.getSettingsBindGroup()
          );*/
        if (stopwatch) {
            stopwatch.stop(encoder, 'preprocess');
        }
        // Sorting step
        if (stopwatch) {
            stopwatch.start(encoder, 'sorting');
        }
        if (this.sorter && this.sorterStuff) {
            this.sorter.recordSortIndirect(this.sorterStuff.sorterBg, this.sorterStuff.sorterDis, encoder);
        }
        if (stopwatch) {
            stopwatch.stop(encoder, 'sorting');
        }
        // Copy buffer
        if (this.sorterStuff) {
            encoder.copyBufferToBuffer(this.sorterStuff.sorterUni, 0, this.drawIndirectBuffer, 4, // offset to instance_count
            4 // size of u32
            );
        }
        if (!this.sorterStuff) {
            this.ensureFallbackIndices(device, queue, pc.numPoints());
        }
    };
    GaussianRenderer.prototype.render = function (renderPass, pc) {
        // group(0): point cloud (provides points_2d at binding 2)
        renderPass.setBindGroup(0, pc.getRenderBindGroup());
        // group(1): indices (binding 4): sorter if present, fallback otherwise
        if (this.sorterStuff) {
            renderPass.setBindGroup(1, this.sorterStuff.sorterRenderBg);
        }
        else {
            renderPass.setBindGroup(1, this.indicesBindGroup);
        }
        renderPass.setPipeline(this.pipeline);
        renderPass.drawIndirect(this.drawIndirectBuffer, 0);
    };
    GaussianRenderer.bindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: 'draw indirect',
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                }]
        });
    };
    GaussianRenderer.prototype.getColorFormat = function () {
        return this._colorFormat;
    };
    return GaussianRenderer;
}());
exports.GaussianRenderer = GaussianRenderer;
/**
 * Display pipeline for final rendering to screen
 */
var Display = /** @class */ (function () {
    function Display(device, sourceFormat, targetFormat, width, height) {
        var pipelineLayout = device.createPipelineLayout({
            label: 'display pipeline layout',
            bindGroupLayouts: [
                Display.bindGroupLayout(device),
                Display.envMapBindGroupLayout(device),
                uniform_js_1.UniformBuffer.bindGroupLayout(device), // Camera uniform
                uniform_js_1.UniformBuffer.bindGroupLayout(device), // Render settings uniform
            ]
        });
        // Load display shader
        var shader = device.createShaderModule({
            label: 'display shader',
            code: "\n                // Placeholder display shader\n                @vertex\n                fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {\n                    var pos = array<vec2<f32>, 4>(\n                        vec2<f32>(-1.0, -1.0),\n                        vec2<f32>( 1.0, -1.0),\n                        vec2<f32>(-1.0,  1.0),\n                        vec2<f32>( 1.0,  1.0)\n                    );\n                    return vec4<f32>(pos[vertex_index], 0.0, 1.0);\n                }\n\n                @fragment\n                fn fs_main() -> @location(0) vec4<f32> {\n                    return vec4<f32>(1.0, 0.0, 0.0, 1.0);\n                }\n            "
        });
        this.pipeline = device.createRenderPipeline({
            label: 'display pipeline',
            layout: pipelineLayout,
            vertex: {
                module: shader,
                entryPoint: 'vs_main'
            },
            fragment: {
                module: shader,
                entryPoint: 'fs_main',
                targets: [{
                        format: targetFormat,
                        blend: {
                            color: {
                                srcFactor: 'one',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            },
                            alpha: {
                                srcFactor: 'one',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            }
                        },
                        writeMask: GPUColorWrite.ALL
                    }]
            },
            primitive: {
                topology: 'triangle-strip'
            }
        });
        this.envBg = Display.createEnvMapBg(device, null);
        var _a = Display.createRenderTarget(device, sourceFormat, width, height), view = _a[0], bindGroup = _a[1];
        this.format = sourceFormat;
        this.view = view;
        this.bindGroup = bindGroup;
        this.hasEnvMap = false;
    }
    Display.prototype.texture = function () {
        return this.view;
    };
    Display.envMapBindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: 'env map bind group layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'float',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'filtering'
                    }
                }
            ]
        });
    };
    Display.createEnvMapBg = function (device, envTexture) {
        var placeholderTexture = device.createTexture({
            label: 'placeholder',
            size: { width: 1, height: 1 },
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING
        }).createView();
        var textureView = envTexture || placeholderTexture;
        var sampler = device.createSampler({
            label: 'env map sampler',
            magFilter: 'linear',
            minFilter: 'linear'
        });
        return device.createBindGroup({
            label: 'env map bind group',
            layout: Display.envMapBindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: textureView
                },
                {
                    binding: 1,
                    resource: sampler
                }
            ]
        });
    };
    Display.prototype.setEnvMap = function (device, envTexture) {
        this.envBg = Display.createEnvMapBg(device, envTexture);
        this.hasEnvMap = envTexture !== null;
    };
    Display.prototype.hasEnvMapSet = function () {
        return this.hasEnvMap;
    };
    Display.createRenderTarget = function (device, format, width, height) {
        var texture = device.createTexture({
            label: 'display render image',
            size: { width: width, height: height },
            format: format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });
        var textureView = texture.createView();
        var sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });
        var bindGroup = device.createBindGroup({
            label: 'render target bind group',
            layout: Display.bindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: textureView
                },
                {
                    binding: 1,
                    resource: sampler
                }
            ]
        });
        return [textureView, bindGroup];
    };
    Display.bindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: 'display bind group layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'float',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'filtering'
                    }
                }
            ]
        });
    };
    Display.prototype.resize = function (device, width, height) {
        var _a = Display.createRenderTarget(device, this.format, width, height), view = _a[0], bindGroup = _a[1];
        this.bindGroup = bindGroup;
        this.view = view;
    };
    Display.prototype.render = function (encoder, target, backgroundColor, camera, renderSettings) {
        var renderPass = encoder.beginRenderPass({
            label: 'render pass',
            colorAttachments: [{
                    view: target,
                    clearValue: backgroundColor,
                    loadOp: 'clear',
                    storeOp: 'store'
                }]
        });
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setBindGroup(1, this.envBg);
        renderPass.setBindGroup(2, camera.getBindGroup());
        renderPass.setBindGroup(3, renderSettings.getBindGroup());
        renderPass.setPipeline(this.pipeline);
        renderPass.draw(4, 1);
        renderPass.end();
    };
    return Display;
}());
exports.Display = Display;
