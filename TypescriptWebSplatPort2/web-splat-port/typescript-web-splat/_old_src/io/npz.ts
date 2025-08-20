import { vec3, quat } from 'gl-matrix';
import { GaussianCompressed, GaussianQuantization, Quantization, Covariance3D } from '../pointcloud.js';
import { buildCov, shDegFromNumCoefs, shNumCoefficients } from '../utils.js';
import { GenericGaussianPointCloud, PointCloudReader } from './mod.js';

// NPZ file format interfaces
interface NpzArray {
    shape: number[];
    dtype: string;
    data: ArrayBuffer;
}

interface NpzArchive {
    [key: string]: NpzArray;
}

export class NpzReader implements PointCloudReader {
    private npzFile: NpzArchive;
    private shDeg: number;
    private kernelSize?: number;
    private mipSplatting?: boolean;
    private backgroundColor?: [number, number, number];

    constructor(data: ArrayBuffer) {
        this.npzFile = this.parseNpz(data);
        this.shDeg = this.calculateShDeg();
        this.kernelSize = this.getNpzValue<number>('kernel_size');
        this.mipSplatting = this.getNpzValue<boolean>('mip_splatting');
        this.backgroundColor = this.getBackgroundColor();
    }

    private parseNpz(data: ArrayBuffer): NpzArchive {
        // This is a simplified NPZ parser
        // In a real implementation, you would use a proper NPZ/ZIP library
        // For now, we'll create a placeholder that throws an error
        throw new Error('NPZ parsing not implemented - requires proper ZIP/NPZ library');
    }

    private calculateShDeg(): number {
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

    private getBackgroundColor(): [number, number, number] | undefined {
        const bgArray = this.getNpzArrayOptional<number>('background_color');
        if (bgArray && bgArray.length >= 3) {
            return [bgArray[0], bgArray[1], bgArray[2]];
        }
        return undefined;
    }

    private getNpzValue<T>(fieldName: string): T | undefined {
        const array = this.getNpzArrayOptional<T>(fieldName);
        return array && array.length > 0 ? array[0] : undefined;
    }

    private getNpzArrayOptional<T>(fieldName: string): T[] | undefined {
        const npzArray = this.npzFile[fieldName];
        if (!npzArray) {
            return undefined;
        }
        return this.parseTypedArray<T>(npzArray);
    }

    private tryGetNpzArray<T>(fieldName: string): T[] {
        const array = this.getNpzArrayOptional<T>(fieldName);
        if (!array) {
            throw new Error(`Array ${fieldName} missing`);
        }
        return array;
    }

    private parseTypedArray<T>(npzArray: NpzArray): T[] {
        // Convert ArrayBuffer to typed array based on dtype
        const { data, dtype } = npzArray;
        
        switch (dtype) {
            case 'float32':
                return Array.from(new Float32Array(data)) as T[];
            case 'float64':
                return Array.from(new Float64Array(data)) as T[];
            case 'int8':
                return Array.from(new Int8Array(data)) as T[];
            case 'int16':
                return Array.from(new Int16Array(data)) as T[];
            case 'int32':
                return Array.from(new Int32Array(data)) as T[];
            case 'uint8':
                return Array.from(new Uint8Array(data)) as T[];
            case 'uint16':
                return Array.from(new Uint16Array(data)) as T[];
            case 'uint32':
                return Array.from(new Uint32Array(data)) as T[];
            default:
                throw new Error(`Unsupported dtype: ${dtype}`);
        }
    }

    read(): GenericGaussianPointCloud {
        const startTime = performance.now();

        // Get quantization parameters
        const opacityScale = this.getNpzValue<number>('opacity_scale') ?? 1.0;
        const opacityZeroPoint = this.getNpzValue<number>('opacity_zero_point') ?? 0;

        const scalingScale = this.getNpzValue<number>('scaling_scale') ?? 1.0;
        const scalingZeroPoint = this.getNpzValue<number>('scaling_zero_point') ?? 0;

        const rotationScale = this.getNpzValue<number>('rotation_scale') ?? 1.0;
        const rotationZeroPoint = this.getNpzValue<number>('rotation_zero_point') ?? 0;

        const featuresDcScale = this.getNpzValue<number>('features_dc_scale') ?? 1.0;
        const featuresDcZeroPoint = this.getNpzValue<number>('features_dc_zero_point') ?? 0;

        const featuresRestScale = this.getNpzValue<number>('features_rest_scale') ?? 1.0;
        const featuresRestZeroPoint = this.getNpzValue<number>('features_rest_zero_point') ?? 0;

        // Optional scaling factor
        let scalingFactor: number[] | undefined;
        let scalingFactorZeroPoint = 0;
        let scalingFactorScale = 1.0;

        if (this.npzFile['scaling_factor_scale']) {
            scalingFactorScale = this.getNpzValue<number>('scaling_factor_scale') ?? 1.0;
            scalingFactorZeroPoint = this.getNpzValue<number>('scaling_factor_zero_point') ?? 0;
            scalingFactor = this.tryGetNpzArray<number>('scaling_factor');
        }

        // Load point data
        const xyzData = this.tryGetNpzArray<number>('xyz');
        const xyz: { x: number, y: number, z: number }[] = [];
        for (let i = 0; i < xyzData.length; i += 3) {
            xyz.push({ x: xyzData[i], y: xyzData[i + 1], z: xyzData[i + 2] });
        }

        // Load scaling data
        const scalingData = this.tryGetNpzArray<number>('scaling');
        const scaling: vec3[] = [];
        
        if (!scalingFactor) {
            // No scaling factor - scaling is not normalized
            for (let i = 0; i < scalingData.length; i += 3) {
                const s1 = Math.exp((scalingData[i] - scalingZeroPoint) * scalingScale);
                const s2 = Math.exp((scalingData[i + 1] - scalingZeroPoint) * scalingScale);
                const s3 = Math.exp((scalingData[i + 2] - scalingZeroPoint) * scalingScale);
                scaling.push(vec3.fromValues(s1, s2, s3));
            }
        } else {
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
        const rotationData = this.tryGetNpzArray<number>('rotation');
        const rotation: quat[] = [];
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
        const opacity = this.tryGetNpzArray<number>('opacity');
        const featuresDc = this.tryGetNpzArray<number>('features_dc');
        const featuresRest = this.tryGetNpzArray<number>('features_rest');

        // Optional indices
        const featureIndices = this.getNpzArrayOptional<number>('feature_indices');
        const gaussianIndices = this.getNpzArrayOptional<number>('gaussian_indices');

        const numPoints = xyz.length;
        const shDeg = this.shDeg;
        const numShCoeffs = shNumCoefficients(shDeg);

        // Create compressed gaussians
        const gaussians: GaussianCompressed[] = [];
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
        const shCoefs: number[] = [];
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
        const covars: Covariance3D[] = [];
        for (let i = 0; i < rotation.length; i++) {
            const cov = buildCov(rotation[i], scaling[i]);
            covars.push({ data: cov });
        }

        const duration = performance.now() - startTime;
        console.log(`Reading took ${duration.toFixed(2)}ms`);

        const quantization = {
            colorDc: { zeroPoint: featuresDcZeroPoint, scale: featuresDcScale, _pad: [0, 0] as [number, number] },
            colorRest: { zeroPoint: featuresRestZeroPoint, scale: featuresRestScale, _pad: [0, 0] as [number, number] },
            opacity: { zeroPoint: opacityZeroPoint, scale: opacityScale, _pad: [0, 0] as [number, number] },
            scalingFactor: { zeroPoint: scalingFactorZeroPoint, scale: scalingFactorScale, _pad: [0, 0] as [number, number] }
        };

        return GenericGaussianPointCloud.fromCompressedGaussians(
            gaussians,
            new Uint8Array(shCoefs),
            shDeg,
            {
                kernelSize: this.kernelSize,
                mipSplatting: this.mipSplatting,
                backgroundColor: this.backgroundColor,
                covars: covars,
                quantization: quantization
            }
        );
    }

    static magicBytes(): Uint8Array {
        return new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // ZIP magic bytes
    }

    static fileEnding(): string {
        return 'npz';
    }
}
