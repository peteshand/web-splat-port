"use strict";
/**
 * TypeScript port of uniform.rs
 * Manages uniform buffers for WebGPU
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniformBuffer = exports.UnifiedUniformBuffer = exports.SETTINGS_SIZE = exports.CAMERA_SIZE = void 0;
// Unified uniform buffer constants
exports.CAMERA_SIZE = 272; // 4 mat4 + vec2 + vec2
exports.SETTINGS_SIZE = 80; // matches Rust SplattingArgsUniform
var UNIFIED_BUFFER_SIZE = 512;
/**
 * Unified uniform buffer that combines camera and settings uniforms
 * Camera at offset 0 (272 bytes), Settings at offset 256 (80 bytes)
 */
var UnifiedUniformBuffer = /** @class */ (function () {
    function UnifiedUniformBuffer(device, label) {
        // single 512-byte buffer (camera @ 0..272, settings @ 256..336)
        this.buffer = device.createBuffer({
            label: label || 'unified uniform buffer',
            size: UNIFIED_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });
        // CPU copies (optional, kept from your version)
        this.cameraData = new Uint8Array(exports.CAMERA_SIZE);
        this.settingsData = new Uint8Array(exports.SETTINGS_SIZE);
        // Create TWO 1-binding groups over the same buffer, matching WGSL group layout
        // g0: camera
        this.cameraBG = device.createBindGroup({
            label: "".concat(label || 'unified', " camera bg"),
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.buffer,
                        offset: 0,
                        size: exports.CAMERA_SIZE
                    }
                }]
        });
        // g3: settings
        this.settingsBG = device.createBindGroup({
            label: "".concat(label || 'unified', " settings bg"),
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.buffer,
                        offset: 256,
                        size: exports.SETTINGS_SIZE
                    }
                }]
        });
        // NEW: combined bind group with two bindings (0: camera, 1: settings)
        this.combinedBG = device.createBindGroup({
            label: "".concat(label || 'unified', " combined bg"),
            layout: UnifiedUniformBuffer.bindGroupLayout(device),
            entries: [
                { binding: 0, resource: { buffer: this.buffer, offset: 0, size: exports.CAMERA_SIZE } },
                { binding: 1, resource: { buffer: this.buffer, offset: 256, size: exports.SETTINGS_SIZE } },
            ],
        });
    }
    UnifiedUniformBuffer.prototype.getCombinedBindGroup = function () {
        return this.combinedBG;
    };
    // (Keep this static if other code references it; it's no longer used by this class.)
    UnifiedUniformBuffer.bindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: "unified uniform bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: exports.CAMERA_SIZE }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: exports.SETTINGS_SIZE }
                }
            ]
        });
    };
    UnifiedUniformBuffer.prototype.updateCamera = function (queue, cameraBytes) {
        if (cameraBytes.length !== exports.CAMERA_SIZE) {
            console.warn("[UUBO] camera bytes ".concat(cameraBytes.length, ", expected ").concat(exports.CAMERA_SIZE));
        }
        var len = Math.min(cameraBytes.byteLength, exports.CAMERA_SIZE);
        // keep your local mirror (optional)
        this.cameraData.set(cameraBytes.subarray(0, len));
        // NEW: wrap into a fresh Uint8Array so it's typed as ArrayBuffer-backed (not ...Like)
        var view = new Uint8Array(len);
        view.set(cameraBytes.subarray(0, len));
        queue.writeBuffer(this.buffer, 0, view, 0, len);
    };
    UnifiedUniformBuffer.prototype.updateSettings = function (queue, settingsBytes) {
        if (settingsBytes.length !== exports.SETTINGS_SIZE) {
            console.warn("[UUBO] settings bytes ".concat(settingsBytes.length, ", expected ").concat(exports.SETTINGS_SIZE));
        }
        var len = Math.min(settingsBytes.byteLength, exports.SETTINGS_SIZE);
        this.settingsData.set(settingsBytes.subarray(0, len));
        var view = new Uint8Array(len);
        view.set(settingsBytes.subarray(0, len));
        queue.writeBuffer(this.buffer, 256, view, 0, len);
    };
    UnifiedUniformBuffer.prototype.getBuffer = function () {
        return this.buffer;
    };
    // DEPRECATED: your old combined BG. Return camera BG for compatibility if something still calls it.
    UnifiedUniformBuffer.prototype.getBindGroup = function () {
        return this.cameraBG;
    };
    // Use these in the compute pass:
    UnifiedUniformBuffer.prototype.getCameraBindGroup = function () {
        return this.cameraBG;
    };
    UnifiedUniformBuffer.prototype.getSettingsBindGroup = function () {
        return this.settingsBG;
    };
    return UnifiedUniformBuffer;
}());
exports.UnifiedUniformBuffer = UnifiedUniformBuffer;
var UniformBuffer = /** @class */ (function () {
    function UniformBuffer(device, data, label) {
        this.data = data;
        this.label = label || null;
        // Create buffer with data
        var dataArray = this.castToBytes(data);
        this.buffer = device.createBuffer({
            label: label,
            size: dataArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        // Write initial data
        new Uint8Array(this.buffer.getMappedRange()).set(dataArray);
        this.buffer.unmap();
        // Create bind group
        var bgLabel = label ? "".concat(label, " bind group") : undefined;
        this.bindGroup = device.createBindGroup({
            label: bgLabel,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.buffer
                    }
                }]
        });
    }
    UniformBuffer.newDefault = function (device, defaultData, label) {
        return new UniformBuffer(device, defaultData, label);
    };
    UniformBuffer.new = function (device, data, label) {
        return new UniformBuffer(device, data, label);
    };
    UniformBuffer.prototype.getBuffer = function () {
        return this.buffer;
    };
    UniformBuffer.prototype.getData = function () {
        return this.data;
    };
    UniformBuffer.prototype.getBindGroup = function () {
        return this.bindGroup;
    };
    UniformBuffer.bindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: "uniform bind group layout",
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: false
                        // minBindingSize omitted - WebGPU will validate based on actual usage
                    }
                }]
        });
    };
    UniformBuffer.bindGroupLayoutWithSize = function (device, minBindingSize) {
        return device.createBindGroupLayout({
            label: "uniform bind group layout (sized)",
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: false,
                        minBindingSize: minBindingSize
                    }
                }]
        });
    };
    /**
     * Uploads data from CPU to GPU if necessary
     */
    UniformBuffer.prototype.sync = function (queue) {
        var dataBytes = this.castToBytes(this.data);
        // NEW: force an ArrayBuffer-backed view
        var view = new Uint8Array(dataBytes); // copies, but tiny
        queue.writeBuffer(this.buffer, 0, view, 0, view.byteLength);
    };
    UniformBuffer.bindingType = function (minBindingSize) {
        return {
            type: "uniform",
            hasDynamicOffset: false,
            minBindingSize: minBindingSize
        };
    };
    UniformBuffer.prototype.clone = function (device, queue) {
        // Create new buffer with same size
        var newBuffer = device.createBuffer({
            label: this.label || undefined,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: this.buffer.size,
            mappedAtCreation: false
        });
        // Copy buffer contents
        var encoder = device.createCommandEncoder({
            label: "copy uniform buffer encoder"
        });
        encoder.copyBufferToBuffer(this.buffer, 0, newBuffer, 0, this.buffer.size);
        queue.submit([encoder.finish()]);
        // Create new bind group
        var bindGroup = device.createBindGroup({
            label: "uniform bind group",
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: newBuffer
                    }
                }]
        });
        // Create new instance with copied data
        var cloned = Object.create(UniformBuffer.prototype);
        cloned.buffer = newBuffer;
        cloned.data = __assign({}, this.data); // Shallow clone of data
        cloned.label = this.label;
        cloned.bindGroup = bindGroup;
        return cloned;
    };
    /**
     * Get mutable reference to data (equivalent to AsMut<T>)
     */
    UniformBuffer.prototype.asMut = function () {
        return this.data;
    };
    /**
     * Convert data to byte array for GPU buffer
     * This is equivalent to bytemuck::cast_slice in Rust
     */
    UniformBuffer.prototype.castToBytes = function (data) {
        var _a;
        // Single number -> f32
        if (typeof data === 'number') {
            var buf = new ArrayBuffer(4);
            new DataView(buf).setFloat32(0, data, true);
            return new Uint8Array(buf);
        }
        if (typeof data === 'object' && data !== null) {
            // ---- CameraUniform: 4 * mat4<f32> (64 floats = 256 bytes) + vec2 + vec2 (4 floats = 16 bytes) = 272 bytes ----
            if ('viewMatrix' in data && 'viewInvMatrix' in data && 'projMatrix' in data && 'projInvMatrix' in data && 'viewport' in data && 'focal' in data) {
                var buf = new ArrayBuffer(272);
                var f32 = new Float32Array(buf);
                // view_matrix [0..16)
                f32.set(data.viewMatrix, 0);
                // view_inv_matrix [16..32)
                f32.set(data.viewInvMatrix, 16);
                // proj_matrix [32..48)
                f32.set(data.projMatrix, 32);
                // proj_inv_matrix [48..64)
                f32.set(data.projInvMatrix, 48);
                // viewport (vec2) [64..66)
                var vp = data.viewport;
                f32[64] = vp[0];
                f32[65] = vp[1];
                // focal (vec2) [66..68)
                var fc = data.focal;
                f32[66] = fc[0];
                f32[67] = fc[1];
                return new Uint8Array(buf);
            }
            // ---- SplattingArgsUniform (matches Rust struct order & alignment) ----
            // Rust:
            // struct SplattingArgsUniform {
            //   clipping_box_min: vec4<f32>,
            //   clipping_box_max: vec4<f32>,
            //   gaussian_scaling: f32,
            //   max_sh_deg: u32,
            //   show_env_map: u32,
            //   mip_splatting: u32,
            //   kernel_size: f32,
            //   walltime: f32,
            //   scene_extend: f32,
            //   _pad: u32,
            //   scene_center: vec4<f32>,
            // };
            if ('clippingBoxMin' in data && 'clippingBoxMax' in data && 'gaussianScaling' in data && 'maxShDeg' in data) {
                var buf = new ArrayBuffer(80); // multiples of 16; 80 bytes = 5 * 16, ok
                var dv = new DataView(buf);
                var off = 0;
                // clipping_box_min (vec4)
                for (var i = 0; i < 4; i++)
                    dv.setFloat32(off + i * 4, data.clippingBoxMin[i], true);
                off += 16;
                // clipping_box_max (vec4)
                for (var i = 0; i < 4; i++)
                    dv.setFloat32(off + i * 4, data.clippingBoxMax[i], true);
                off += 16;
                // gaussian_scaling f32
                dv.setFloat32(off, data.gaussianScaling, true);
                off += 4;
                // max_sh_deg u32
                dv.setUint32(off, data.maxShDeg >>> 0, true);
                off += 4;
                // show_env_map u32
                dv.setUint32(off, (data.showEnvMap >>> 0) || 0, true);
                off += 4;
                // mip_splatting u32
                dv.setUint32(off, (data.mipSplatting >>> 0) || 0, true);
                off += 4;
                // kernel_size, walltime, scene_extend (3 * f32)
                dv.setFloat32(off, data.kernelSize, true);
                off += 4;
                dv.setFloat32(off, data.walltime, true);
                off += 4;
                dv.setFloat32(off, data.sceneExtend, true);
                off += 4;
                // _pad u32
                dv.setUint32(off, 0, true);
                off += 4;
                // scene_center vec4 (Rust uses vec4; WGSL RenderSettings uses vec3, which reads the first 12 bytes)
                var sc = data.sceneCenter;
                for (var i = 0; i < 4; i++)
                    dv.setFloat32(off + i * 4, (_a = sc[i]) !== null && _a !== void 0 ? _a : 0, true);
                // off += 16; // not needed further
                return new Uint8Array(buf);
            }
            throw new Error("Unsupported object type for GPU buffer: ".concat(Object.keys(data)));
        }
        throw new Error('Unsupported data type for GPU buffer');
    };
    return UniformBuffer;
}());
exports.UniformBuffer = UniformBuffer;
