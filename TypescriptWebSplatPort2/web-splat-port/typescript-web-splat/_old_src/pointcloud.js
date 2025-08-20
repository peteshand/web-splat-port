"use strict";
/**
 * TypeScript port of pointcloud.rs
 * Point cloud data structures and GPU buffer management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PointCloud = void 0;
exports.createDefaultGaussianCompressed = createDefaultGaussianCompressed;
exports.createDefaultGaussian = createDefaultGaussian;
exports.createDefaultCovariance3D = createDefaultCovariance3D;
exports.createDefaultQuantization = createDefaultQuantization;
exports.createQuantization = createQuantization;
exports.createDefaultGaussianQuantization = createDefaultGaussianQuantization;
exports.createAabb = createAabb;
exports.createUnitAabb = createUnitAabb;
exports.growAabb = growAabb;
exports.getAabbCorners = getAabbCorners;
exports.getAabbCenter = getAabbCenter;
exports.getAabbRadius = getAabbRadius;
exports.getAabbSize = getAabbSize;
exports.growAabbUnion = growAabbUnion;
var uniform_js_1 = require("./uniform.js");
function createDefaultGaussianCompressed() {
    return {
        xyz: { x: 0, y: 0, z: 0 },
        opacity: 0,
        scaleFactor: 0,
        geometryIdx: 0,
        shIdx: 0
    };
}
function createDefaultGaussian() {
    return {
        xyz: { x: 0, y: 0, z: 0 },
        opacity: 0,
        cov: [0, 0, 0, 0, 0, 0]
    };
}
function createDefaultCovariance3D() {
    return {
        data: [0, 0, 0, 0, 0, 0]
    };
}
function createDefaultQuantization() {
    return {
        zeroPoint: 0,
        scale: 1.0,
        _pad: [0, 0]
    };
}
function createQuantization(zeroPoint, scale) {
    return {
        zeroPoint: zeroPoint,
        scale: scale,
        _pad: [0, 0]
    };
}
function createDefaultGaussianQuantization() {
    return {
        colorDc: createDefaultQuantization(),
        colorRest: createDefaultQuantization(),
        opacity: createDefaultQuantization(),
        scalingFactor: createDefaultQuantization()
    };
}
function createAabb(min, max) {
    return { min: min, max: max };
}
function createUnitAabb() {
    return {
        min: { x: -1, y: -1, z: -1 },
        max: { x: 1, y: 1, z: 1 }
    };
}
function growAabb(aabb, pos) {
    aabb.min.x = Math.min(aabb.min.x, pos.x);
    aabb.min.y = Math.min(aabb.min.y, pos.y);
    aabb.min.z = Math.min(aabb.min.z, pos.z);
    aabb.max.x = Math.max(aabb.max.x, pos.x);
    aabb.max.y = Math.max(aabb.max.y, pos.y);
    aabb.max.z = Math.max(aabb.max.z, pos.z);
}
function getAabbCorners(aabb) {
    var corners = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 1 },
        { x: 0, y: 1, z: 1 },
        { x: 1, y: 1, z: 1 }
    ];
    var size = getAabbSize(aabb);
    return corners.map(function (d) { return ({
        x: aabb.min.x + size.x * d.x,
        y: aabb.min.y + size.y * d.y,
        z: aabb.min.z + size.z * d.z
    }); });
}
function getAabbCenter(aabb) {
    return {
        x: (aabb.min.x + aabb.max.x) / 2,
        y: (aabb.min.y + aabb.max.y) / 2,
        z: (aabb.min.z + aabb.max.z) / 2
    };
}
function getAabbRadius(aabb) {
    var dx = aabb.max.x - aabb.min.x;
    var dy = aabb.max.y - aabb.min.y;
    var dz = aabb.max.z - aabb.min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
}
function getAabbSize(aabb) {
    return {
        x: aabb.max.x - aabb.min.x,
        y: aabb.max.y - aabb.min.y,
        z: aabb.max.z - aabb.min.z
    };
}
function growAabbUnion(aabb, other) {
    aabb.min.x = Math.min(aabb.min.x, other.min.x);
    aabb.min.y = Math.min(aabb.min.y, other.min.y);
    aabb.min.z = Math.min(aabb.min.z, other.min.z);
    aabb.max.x = Math.max(aabb.max.x, other.max.x);
    aabb.max.y = Math.max(aabb.max.y, other.max.y);
    aabb.max.z = Math.max(aabb.max.z, other.max.z);
}
/**
 * Main PointCloud class for GPU rendering
 */
var PointCloud = /** @class */ (function () {
    function PointCloud(device, pc) {
        var _a;
        // Create 2D splat buffer
        this.splat2dBuffer = device.createBuffer({
            label: "2d gaussians buffer",
            size: pc.numPoints * this.getSplatSize(),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: false
        });
        // Create render bind group
        this.renderBindGroup = device.createBindGroup({
            label: "point cloud rendering bind group",
            layout: PointCloud.bindGroupLayoutRender(device),
            entries: [{
                    binding: 2,
                    resource: {
                        buffer: this.splat2dBuffer
                    }
                }]
        });
        // Create vertex buffer (3D gaussians)
        var vertexBuffer = device.createBuffer({
            label: "3d gaussians buffer",
            size: pc.gaussianBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(vertexBuffer.getMappedRange()).set(pc.gaussianBuffer());
        vertexBuffer.unmap();
        // Store reference to gaussian buffer
        this.gaussianBuffer = vertexBuffer;
        // Create SH coefficients buffer
        var shBuffer = device.createBuffer({
            label: "sh coefs buffer",
            size: pc.shCoefsBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(shBuffer.getMappedRange()).set(pc.shCoefsBuffer());
        shBuffer.unmap();
        // Base bind group entries
        var bindGroupEntries = [
            {
                binding: 0,
                resource: { buffer: vertexBuffer }
            },
            {
                binding: 1,
                resource: { buffer: shBuffer }
            },
            {
                binding: 2,
                resource: { buffer: this.splat2dBuffer }
            }
        ];
        // Create bind group based on compression
        if (pc.isCompressed()) {
            // Add covariance buffer
            var covarsBuffer = device.createBuffer({
                label: "Covariances buffer",
                size: (((_a = pc.covars) === null || _a === void 0 ? void 0 : _a.length) || 0) * 6 * 2, // 6 f16 values
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            if (pc.covars) {
                var covarsData = new Uint8Array(covarsBuffer.getMappedRange());
                // Convert covariance data to bytes (simplified)
                var offset = 0;
                for (var _i = 0, _b = pc.covars; _i < _b.length; _i++) {
                    var covar = _b[_i];
                    for (var _c = 0, _d = covar.data; _c < _d.length; _c++) {
                        var value = _d[_c];
                        // Convert f16 to bytes (simplified - in practice need proper f16 conversion)
                        var view = new DataView(covarsData.buffer, offset, 2);
                        view.setUint16(0, Math.floor(value * 1000), true); // Simplified f16 conversion
                        offset += 2;
                    }
                }
            }
            covarsBuffer.unmap();
            // Add quantization uniform buffer
            var quantizationUniform = uniform_js_1.UniformBuffer.new(device, pc.quantization || createDefaultGaussianQuantization(), "quantization uniform buffer");
            bindGroupEntries.push({
                binding: 3,
                resource: { buffer: covarsBuffer }
            }, {
                binding: 4,
                resource: { buffer: quantizationUniform.getBuffer() }
            });
            this.bindGroup = device.createBindGroup({
                label: "point cloud bind group (compressed)",
                layout: PointCloud.bindGroupLayoutCompressed(device),
                entries: bindGroupEntries
            });
        }
        else {
            this.bindGroup = device.createBindGroup({
                label: "point cloud bind group",
                layout: PointCloud.bindGroupLayout(device),
                entries: bindGroupEntries
            });
        }
        // Set properties
        this.numPointsValue = pc.numPoints;
        this.shDegValue = pc.shDeg;
        this.compressedValue = pc.isCompressed();
        this.bboxValue = pc.aabb;
        this.centerValue = pc.center;
        this.upValue = pc.up;
        this.mipSplattingValue = pc.mipSplatting;
        this.kernelSizeValue = pc.kernelSize;
        this.backgroundColorValue = pc.backgroundColor ? {
            r: pc.backgroundColor[0],
            g: pc.backgroundColor[1],
            b: pc.backgroundColor[2],
            a: 1.0
        } : undefined;
    }
    PointCloud.prototype.compressed = function () {
        return this.compressedValue;
    };
    PointCloud.prototype.numPoints = function () {
        return this.numPointsValue;
    };
    PointCloud.prototype.getSplat2dBuffer = function () {
        return this.splat2dBuffer;
    };
    PointCloud.prototype.getGaussianBuffer = function () {
        return this.gaussianBuffer;
    };
    PointCloud.prototype.bbox = function () {
        return this.bboxValue;
    };
    PointCloud.prototype.getBindGroup = function () {
        return this.bindGroup;
    };
    PointCloud.prototype.getRenderBindGroup = function () {
        return this.renderBindGroup;
    };
    PointCloud.prototype.mipSplatting = function () {
        return this.mipSplattingValue;
    };
    PointCloud.prototype.dilationKernelSize = function () {
        return this.kernelSizeValue;
    };
    PointCloud.prototype.center = function () {
        return this.centerValue;
    };
    PointCloud.prototype.up = function () {
        return this.upValue;
    };
    PointCloud.prototype.getSplatSize = function () {
        // Size of Splat struct: Vector4f16 + Vector2f16 + Vector4f16
        // Each f16 is 2 bytes: (4 + 2 + 4) * 2 = 20 bytes
        return 20;
    };
    PointCloud.bindGroupLayoutCompressed = function (device) {
        return device.createBindGroupLayout({
            label: "point cloud bind group layout (compressed)",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage"
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });
    };
    PointCloud.bindGroupLayout = function (device) {
        return device.createBindGroupLayout({
            label: "point cloud float bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage"
                    }
                }
            ]
        });
    };
    PointCloud.bindGroupLayoutRender = function (device) {
        return device.createBindGroupLayout({
            label: "point cloud rendering bind group layout",
            entries: [{
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage"
                    }
                }]
        });
    };
    return PointCloud;
}());
exports.PointCloud = PointCloud;
