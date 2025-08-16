import { vec3, quat } from 'gl-matrix';
import { buildCov, shDegFromNumCoefs, shNumCoefficients } from '../utils.js';
import { GenericGaussianPointCloud } from './mod.js';
export class NpzReader {
    npzFile;
    shDeg;
    kernelSize;
    mipSplatting;
    backgroundColor;
    constructor(data) {
        this.npzFile = this.parseNpz(data);
        this.shDeg = this.calculateShDeg();
        this.kernelSize = this.getNpzValue('kernel_size');
        this.mipSplatting = this.getNpzValue('mip_splatting');
        this.backgroundColor = this.getBackgroundColor();
    }
    parseNpz(data) {
        // This is a simplified NPZ parser
        // In a real implementation, you would use a proper NPZ/ZIP library
        // For now, we'll create a placeholder that throws an error
        throw new Error('NPZ parsing not implemented - requires proper ZIP/NPZ library');
    }
    calculateShDeg() {
        if (this.npzFile['features_rest']) {
            const featuresRest = this.npzFile['features_rest'];
            const shDeg = shDegFromNumCoefs(featuresRest.shape[1] + 1);
            if (shDeg === null) {
                throw new Error('Invalid number of SH coefficients');
            }
            return shDeg;
        }
        return 0;
    }
    getBackgroundColor() {
        const bgArray = this.getNpzArrayOptional('background_color');
        if (bgArray && bgArray.length >= 3) {
            return [bgArray[0], bgArray[1], bgArray[2]];
        }
        return undefined;
    }
    getNpzValue(fieldName) {
        const array = this.getNpzArrayOptional(fieldName);
        return array && array.length > 0 ? array[0] : undefined;
    }
    getNpzArrayOptional(fieldName) {
        const npzArray = this.npzFile[fieldName];
        if (!npzArray) {
            return undefined;
        }
        return this.parseTypedArray(npzArray);
    }
    tryGetNpzArray(fieldName) {
        const array = this.getNpzArrayOptional(fieldName);
        if (!array) {
            throw new Error(`Array ${fieldName} missing`);
        }
        return array;
    }
    parseTypedArray(npzArray) {
        // Convert ArrayBuffer to typed array based on dtype
        const { data, dtype } = npzArray;
        switch (dtype) {
            case 'float32':
                return Array.from(new Float32Array(data));
            case 'float64':
                return Array.from(new Float64Array(data));
            case 'int8':
                return Array.from(new Int8Array(data));
            case 'int16':
                return Array.from(new Int16Array(data));
            case 'int32':
                return Array.from(new Int32Array(data));
            case 'uint8':
                return Array.from(new Uint8Array(data));
            case 'uint16':
                return Array.from(new Uint16Array(data));
            case 'uint32':
                return Array.from(new Uint32Array(data));
            default:
                throw new Error(`Unsupported dtype: ${dtype}`);
        }
    }
    read() {
        const startTime = performance.now();
        // Get quantization parameters
        const opacityScale = this.getNpzValue('opacity_scale') ?? 1.0;
        const opacityZeroPoint = this.getNpzValue('opacity_zero_point') ?? 0;
        const scalingScale = this.getNpzValue('scaling_scale') ?? 1.0;
        const scalingZeroPoint = this.getNpzValue('scaling_zero_point') ?? 0;
        const rotationScale = this.getNpzValue('rotation_scale') ?? 1.0;
        const rotationZeroPoint = this.getNpzValue('rotation_zero_point') ?? 0;
        const featuresDcScale = this.getNpzValue('features_dc_scale') ?? 1.0;
        const featuresDcZeroPoint = this.getNpzValue('features_dc_zero_point') ?? 0;
        const featuresRestScale = this.getNpzValue('features_rest_scale') ?? 1.0;
        const featuresRestZeroPoint = this.getNpzValue('features_rest_zero_point') ?? 0;
        // Optional scaling factor
        let scalingFactor;
        let scalingFactorZeroPoint = 0;
        let scalingFactorScale = 1.0;
        if (this.npzFile['scaling_factor_scale']) {
            scalingFactorScale = this.getNpzValue('scaling_factor_scale') ?? 1.0;
            scalingFactorZeroPoint = this.getNpzValue('scaling_factor_zero_point') ?? 0;
            scalingFactor = this.tryGetNpzArray('scaling_factor');
        }
        // Load point data
        const xyzData = this.tryGetNpzArray('xyz');
        const xyz = [];
        for (let i = 0; i < xyzData.length; i += 3) {
            xyz.push({ x: xyzData[i], y: xyzData[i + 1], z: xyzData[i + 2] });
        }
        // Load scaling data
        const scalingData = this.tryGetNpzArray('scaling');
        const scaling = [];
        if (!scalingFactor) {
            // No scaling factor - scaling is not normalized
            for (let i = 0; i < scalingData.length; i += 3) {
                const s1 = Math.exp((scalingData[i] - scalingZeroPoint) * scalingScale);
                const s2 = Math.exp((scalingData[i + 1] - scalingZeroPoint) * scalingScale);
                const s3 = Math.exp((scalingData[i + 2] - scalingZeroPoint) * scalingScale);
                scaling.push(vec3.fromValues(s1, s2, s3));
            }
        }
        else {
            // With scaling factor - normalize scaling
            for (let i = 0; i < scalingData.length; i += 3) {
                const s1 = Math.max(0, (scalingData[i] - scalingZeroPoint) * scalingScale);
                const s2 = Math.max(0, (scalingData[i + 1] - scalingZeroPoint) * scalingScale);
                const s3 = Math.max(0, (scalingData[i + 2] - scalingZeroPoint) * scalingScale);
                const scale = vec3.fromValues(s1, s2, s3);
                vec3.normalize(scale, scale);
                scaling.push(scale);
            }
        }
        // Load rotation data
        const rotationData = this.tryGetNpzArray('rotation');
        const rotation = [];
        for (let i = 0; i < rotationData.length; i += 4) {
            const r0 = (rotationData[i] - rotationZeroPoint) * rotationScale;
            const r1 = (rotationData[i + 1] - rotationZeroPoint) * rotationScale;
            const r2 = (rotationData[i + 2] - rotationZeroPoint) * rotationScale;
            const r3 = (rotationData[i + 3] - rotationZeroPoint) * rotationScale;
            const rot = quat.fromValues(r1, r2, r3, r0); // Note: different order
            quat.normalize(rot, rot);
            rotation.push(rot);
        }
        // Load other data
        const opacity = this.tryGetNpzArray('opacity');
        const featuresDc = this.tryGetNpzArray('features_dc');
        const featuresRest = this.tryGetNpzArray('features_rest');
        // Optional indices
        const featureIndices = this.getNpzArrayOptional('feature_indices');
        const gaussianIndices = this.getNpzArrayOptional('gaussian_indices');
        const numPoints = xyz.length;
        const shDeg = this.shDeg;
        const numShCoeffs = shNumCoefficients(shDeg);
        // Create compressed gaussians
        const gaussians = [];
        for (let i = 0; i < numPoints; i++) {
            gaussians.push({
                xyz: xyz[i],
                opacity: opacity[i],
                scaleFactor: scalingFactor ? scalingFactor[i] : 0,
                geometryIdx: gaussianIndices ? gaussianIndices[i] : i,
                shIdx: featureIndices ? featureIndices[i] : i
            });
        }
        // Pack SH coefficients
        const shCoefs = [];
        const shCoeffsLength = numShCoeffs * 3;
        const restNumCoefs = shCoeffsLength - 3;
        for (let i = 0; i < featuresDc.length / 3; i++) {
            // DC component
            shCoefs.push(featuresDc[i * 3 + 0]);
            shCoefs.push(featuresDc[i * 3 + 1]);
            shCoefs.push(featuresDc[i * 3 + 2]);
            // Rest components
            for (let j = 0; j < restNumCoefs; j++) {
                shCoefs.push(featuresRest[i * restNumCoefs + j]);
            }
        }
        // Build covariance matrices
        const covars = [];
        for (let i = 0; i < rotation.length; i++) {
            const cov = buildCov(rotation[i], scaling[i]);
            covars.push({ data: cov });
        }
        const duration = performance.now() - startTime;
        console.log(`Reading took ${duration.toFixed(2)}ms`);
        const quantization = {
            colorDc: { zeroPoint: featuresDcZeroPoint, scale: featuresDcScale, _pad: [0, 0] },
            colorRest: { zeroPoint: featuresRestZeroPoint, scale: featuresRestScale, _pad: [0, 0] },
            opacity: { zeroPoint: opacityZeroPoint, scale: opacityScale, _pad: [0, 0] },
            scalingFactor: { zeroPoint: scalingFactorZeroPoint, scale: scalingFactorScale, _pad: [0, 0] }
        };
        return GenericGaussianPointCloud.fromCompressedGaussians(gaussians, new Uint8Array(shCoefs), shDeg, {
            kernelSize: this.kernelSize,
            mipSplatting: this.mipSplatting,
            backgroundColor: this.backgroundColor,
            covars: covars,
            quantization: quantization
        });
    }
    static magicBytes() {
        return new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // ZIP magic bytes
    }
    static fileEnding() {
        return 'npz';
    }
}
//# sourceMappingURL=npz.js.map