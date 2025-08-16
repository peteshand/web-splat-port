/**
 * TypeScript port of pointcloud.rs
 * Point cloud data structures and GPU buffer management
 */
import { UniformBuffer } from './uniform.js';
export function createDefaultGaussianCompressed() {
    return {
        xyz: { x: 0, y: 0, z: 0 },
        opacity: 0,
        scaleFactor: 0,
        geometryIdx: 0,
        shIdx: 0
    };
}
export function createDefaultGaussian() {
    return {
        xyz: { x: 0, y: 0, z: 0 },
        opacity: 0,
        cov: [0, 0, 0, 0, 0, 0]
    };
}
export function createDefaultCovariance3D() {
    return {
        data: [0, 0, 0, 0, 0, 0]
    };
}
export function createDefaultQuantization() {
    return {
        zeroPoint: 0,
        scale: 1.0,
        _pad: [0, 0]
    };
}
export function createQuantization(zeroPoint, scale) {
    return {
        zeroPoint,
        scale,
        _pad: [0, 0]
    };
}
export function createDefaultGaussianQuantization() {
    return {
        colorDc: createDefaultQuantization(),
        colorRest: createDefaultQuantization(),
        opacity: createDefaultQuantization(),
        scalingFactor: createDefaultQuantization()
    };
}
export function createAabb(min, max) {
    return { min, max };
}
export function createUnitAabb() {
    return {
        min: { x: -1, y: -1, z: -1 },
        max: { x: 1, y: 1, z: 1 }
    };
}
export function growAabb(aabb, pos) {
    aabb.min.x = Math.min(aabb.min.x, pos.x);
    aabb.min.y = Math.min(aabb.min.y, pos.y);
    aabb.min.z = Math.min(aabb.min.z, pos.z);
    aabb.max.x = Math.max(aabb.max.x, pos.x);
    aabb.max.y = Math.max(aabb.max.y, pos.y);
    aabb.max.z = Math.max(aabb.max.z, pos.z);
}
export function getAabbCorners(aabb) {
    const corners = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 1 },
        { x: 0, y: 1, z: 1 },
        { x: 1, y: 1, z: 1 }
    ];
    const size = getAabbSize(aabb);
    return corners.map(d => ({
        x: aabb.min.x + size.x * d.x,
        y: aabb.min.y + size.y * d.y,
        z: aabb.min.z + size.z * d.z
    }));
}
export function getAabbCenter(aabb) {
    return {
        x: (aabb.min.x + aabb.max.x) / 2,
        y: (aabb.min.y + aabb.max.y) / 2,
        z: (aabb.min.z + aabb.max.z) / 2
    };
}
export function getAabbRadius(aabb) {
    const dx = aabb.max.x - aabb.min.x;
    const dy = aabb.max.y - aabb.min.y;
    const dz = aabb.max.z - aabb.min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
}
export function getAabbSize(aabb) {
    return {
        x: aabb.max.x - aabb.min.x,
        y: aabb.max.y - aabb.min.y,
        z: aabb.max.z - aabb.min.z
    };
}
export function growAabbUnion(aabb, other) {
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
export class PointCloud {
    splat2dBuffer;
    bindGroup;
    renderBindGroup;
    numPointsValue;
    shDegValue;
    bboxValue;
    compressedValue;
    centerValue;
    upValue;
    mipSplattingValue;
    kernelSizeValue;
    backgroundColorValue;
    constructor(device, pc) {
        // Create 2D splat buffer
        this.splat2dBuffer = device.createBuffer({
            label: "2d gaussians buffer",
            size: pc.numPoints * this.getSplatSize(),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
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
        const vertexBuffer = device.createBuffer({
            label: "3d gaussians buffer",
            size: pc.gaussianBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(vertexBuffer.getMappedRange()).set(pc.gaussianBuffer());
        vertexBuffer.unmap();
        // Create SH coefficients buffer
        const shBuffer = device.createBuffer({
            label: "sh coefs buffer",
            size: pc.shCoefsBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint8Array(shBuffer.getMappedRange()).set(pc.shCoefsBuffer());
        shBuffer.unmap();
        // Base bind group entries
        const bindGroupEntries = [
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
            const covarsBuffer = device.createBuffer({
                label: "Covariances buffer",
                size: (pc.covars?.length || 0) * 6 * 2, // 6 f16 values
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            if (pc.covars) {
                const covarsData = new Uint8Array(covarsBuffer.getMappedRange());
                // Convert covariance data to bytes (simplified)
                let offset = 0;
                for (const covar of pc.covars) {
                    for (const value of covar.data) {
                        // Convert f16 to bytes (simplified - in practice need proper f16 conversion)
                        const view = new DataView(covarsData.buffer, offset, 2);
                        view.setUint16(0, Math.floor(value * 1000), true); // Simplified f16 conversion
                        offset += 2;
                    }
                }
            }
            covarsBuffer.unmap();
            // Add quantization uniform buffer
            const quantizationUniform = UniformBuffer.new(device, pc.quantization || createDefaultGaussianQuantization(), "quantization uniform buffer");
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
    compressed() {
        return this.compressedValue;
    }
    numPoints() {
        return this.numPointsValue;
    }
    bbox() {
        return this.bboxValue;
    }
    getBindGroup() {
        return this.bindGroup;
    }
    getRenderBindGroup() {
        return this.renderBindGroup;
    }
    mipSplatting() {
        return this.mipSplattingValue;
    }
    dilationKernelSize() {
        return this.kernelSizeValue;
    }
    center() {
        return this.centerValue;
    }
    up() {
        return this.upValue;
    }
    getSplatSize() {
        // Size of Splat struct: Vector4f16 + Vector2f16 + Vector4f16
        // Each f16 is 2 bytes: (4 + 2 + 4) * 2 = 20 bytes
        return 20;
    }
    static bindGroupLayoutCompressed(device) {
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
    }
    static bindGroupLayout(device) {
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
    }
    static bindGroupLayoutRender(device) {
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
    }
}
//# sourceMappingURL=pointcloud.js.map