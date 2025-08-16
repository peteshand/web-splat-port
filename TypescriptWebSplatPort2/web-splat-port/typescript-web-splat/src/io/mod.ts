/**
 * TypeScript port of io/mod.rs
 * Point cloud I/O system for loading Gaussian splat data
 */

import { 
    Aabb, 
    Covariance3D, 
    Gaussian, 
    GaussianCompressed, 
    GaussianQuantization,
    Point3f32,
    Vector3f32,
    createUnitAabb,
    growAabb,
    getAabbRadius,
    createDefaultGaussianQuantization
} from '../pointcloud.js';
import { PlyReader } from './ply.js';
import { NpzReader } from './npz.js';

/**
 * Point cloud reader interface
 */
export interface PointCloudReader {
    read(): GenericGaussianPointCloud;
}

/**
 * Generic Gaussian point cloud data structure
 */
export class GenericGaussianPointCloud {
    public gaussians: Uint8Array;
    public shCoefs: Uint8Array;
    public compressed: boolean;
    public covars?: Covariance3D[];
    public quantization?: GaussianQuantization;
    public shDeg: number;
    public numPoints: number;
    public kernelSize?: number;
    public mipSplatting?: boolean;
    public backgroundColor?: [number, number, number];
    public up?: Vector3f32;
    public center: Point3f32;
    public aabb: Aabb;

    constructor(
        gaussians: Uint8Array,
        shCoefs: Uint8Array,
        compressed: boolean,
        shDeg: number,
        numPoints: number,
        center: Point3f32,
        aabb: Aabb,
        options: {
            covars?: Covariance3D[];
            quantization?: GaussianQuantization;
            kernelSize?: number;
            mipSplatting?: boolean;
            backgroundColor?: [number, number, number];
            up?: Vector3f32;
        } = {}
    ) {
        this.gaussians = gaussians;
        this.shCoefs = shCoefs;
        this.compressed = compressed;
        this.shDeg = shDeg;
        this.numPoints = numPoints;
        this.center = center;
        this.aabb = aabb;
        this.covars = options.covars;
        this.quantization = options.quantization;
        this.kernelSize = options.kernelSize;
        this.mipSplatting = options.mipSplatting;
        this.backgroundColor = options.backgroundColor;
        this.up = options.up;
    }

    /**
     * Load point cloud from file data
     */
    static async load(fileData: ArrayBuffer): Promise<GenericGaussianPointCloud> {
        const signature = new Uint8Array(fileData.slice(0, 4));
        
        // Check for PLY format
        const plyMagic = new TextEncoder().encode('ply\n');
        if (this.arrayStartsWith(signature, plyMagic.slice(0, 3))) {
            const plyReader = new PlyReader(fileData);
            return plyReader.read();
        }
        
        // Check for NPZ format
        const npzMagic = new Uint8Array([0x50, 0x4B]); // PK (ZIP signature)
        if (this.arrayStartsWith(signature, npzMagic)) {
            const npzReader = new NpzReader(fileData);
            return npzReader.read();
        }
        
        throw new Error('Unknown file format');
    }

    private static arrayStartsWith(array: Uint8Array, prefix: Uint8Array): boolean {
        if (array.length < prefix.length) return false;
        for (let i = 0; i < prefix.length; i++) {
            if (array[i] !== prefix[i]) return false;
        }
        return true;
    }

    /**
     * Create from uncompressed Gaussian data
     */
    static fromGaussians(
        gaussians: Gaussian[],
        shCoefs: number[][][], // [point][coef][rgb]
        shDeg: number,
        options: {
            kernelSize?: number;
            mipSplatting?: boolean;
            backgroundColor?: [number, number, number];
            covars?: Covariance3D[];
            quantization?: GaussianQuantization;
        } = {}
    ): GenericGaussianPointCloud {
        // Calculate bounding box
        let aabb = createUnitAabb();
        let first = true;
        
        for (const gaussian of gaussians) {
            const point: Point3f32 = {
                x: gaussian.xyz.x,
                y: gaussian.xyz.y,
                z: gaussian.xyz.z
            };
            
            if (first) {
                aabb.min = { ...point };
                aabb.max = { ...point };
                first = false;
            } else {
                growAabb(aabb, point);
            }
        }

        // Calculate center and up vector from points
        const points = gaussians.map(g => ({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z }));
        const [center, up] = planeFromPoints(points);

        // Convert to byte arrays (simplified - would need proper serialization)
        const gaussianBytes = new Uint8Array(gaussians.length * 32); // Approximate size
        const shCoefBytes = new Uint8Array(shCoefs.length * 16 * 3 * 2); // f16 * 3 colors * 16 coefs

        return new GenericGaussianPointCloud(
            gaussianBytes,
            shCoefBytes,
            false, // not compressed
            shDeg,
            gaussians.length,
            center,
            aabb,
            {
                ...options,
                up: getAabbRadius(aabb) >= 10 ? (up || undefined) : undefined
            }
        );
    }

    /**
     * Create from compressed Gaussian data
     */
    static fromCompressedGaussians(
        gaussians: GaussianCompressed[],
        shCoefs: Uint8Array,
        shDeg: number,
        options: {
            kernelSize?: number;
            mipSplatting?: boolean;
            backgroundColor?: [number, number, number];
            covars?: Covariance3D[];
            quantization?: GaussianQuantization;
        } = {}
    ): GenericGaussianPointCloud {
        // Calculate bounding box
        let aabb = createUnitAabb();
        let first = true;
        
        for (const gaussian of gaussians) {
            const point: Point3f32 = {
                x: gaussian.xyz.x,
                y: gaussian.xyz.y,
                z: gaussian.xyz.z
            };
            
            if (first) {
                aabb.min = { ...point };
                aabb.max = { ...point };
                first = false;
            } else {
                growAabb(aabb, point);
            }
        }

        // Calculate center and up vector from points
        const points = gaussians.map(g => ({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z }));
        const [center, up] = planeFromPoints(points);

        // Convert to byte arrays (simplified)
        const gaussianBytes = new Uint8Array(gaussians.length * 20); // Approximate size for compressed

        return new GenericGaussianPointCloud(
            gaussianBytes,
            shCoefs,
            true, // compressed
            shDeg,
            gaussians.length,
            center,
            aabb,
            {
                ...options,
                up: getAabbRadius(aabb) >= 10 ? (up || undefined) : undefined
            }
        );
    }

    /**
     * Get uncompressed Gaussians
     */
    getGaussians(): Gaussian[] {
        if (this.compressed) {
            throw new Error('Gaussians are compressed');
        }
        // Would need proper deserialization
        return [];
    }

    /**
     * Get compressed Gaussians
     */
    getGaussiansCompressed(): GaussianCompressed[] {
        if (!this.compressed) {
            throw new Error('Gaussians are not compressed');
        }
        // Would need proper deserialization
        return [];
    }

    /**
     * Get SH coefficients buffer
     */
    shCoefsBuffer(): Uint8Array {
        return this.shCoefs;
    }

    /**
     * Get Gaussian buffer
     */
    gaussianBuffer(): Uint8Array {
        return this.gaussians;
    }

    /**
     * Check if compressed
     */
    isCompressed(): boolean {
        return this.compressed;
    }
}


/**
 * Fit a plane to a collection of points
 * Fast, and accurate to within a few degrees
 * Returns center point and normal vector (or null if points don't span a plane)
 * See http://www.ilikebigbits.com/2017_09_25_plane_from_points_2.html
 */
function planeFromPoints(points: Point3f32[]): [Point3f32, Vector3f32 | null] {
    const n = points.length;
    
    // Calculate centroid
    let sum = { x: 0, y: 0, z: 0 };
    for (const p of points) {
        sum.x += p.x;
        sum.y += p.y;
        sum.z += p.z;
    }
    const centroid = {
        x: sum.x / n,
        y: sum.y / n,
        z: sum.z / n
    };
    
    if (n < 3) {
        return [centroid, null];
    }

    // Calculate full 3x3 covariance matrix, excluding symmetries
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;

    for (const p of points) {
        const r = {
            x: p.x - centroid.x,
            y: p.y - centroid.y,
            z: p.z - centroid.z
        };
        xx += r.x * r.x;
        xy += r.x * r.y;
        xz += r.x * r.z;
        yy += r.y * r.y;
        yz += r.y * r.z;
        zz += r.z * r.z;
    }

    xx /= n;
    xy /= n;
    xz /= n;
    yy /= n;
    yz /= n;
    zz /= n;

    let weightedDir = { x: 0, y: 0, z: 0 };

    // X determinant
    {
        const detX = yy * zz - yz * yz;
        const axisDir = {
            x: detX,
            y: xz * yz - xy * zz,
            z: xy * yz - xz * yy
        };
        let weight = detX * detX;
        if (weightedDir.x * axisDir.x + weightedDir.y * axisDir.y + weightedDir.z * axisDir.z < 0) {
            weight = -weight;
        }
        weightedDir.x += axisDir.x * weight;
        weightedDir.y += axisDir.y * weight;
        weightedDir.z += axisDir.z * weight;
    }

    // Y determinant
    {
        const detY = xx * zz - xz * xz;
        const axisDir = {
            x: xz * yz - xy * zz,
            y: detY,
            z: xy * xz - yz * xx
        };
        let weight = detY * detY;
        if (weightedDir.x * axisDir.x + weightedDir.y * axisDir.y + weightedDir.z * axisDir.z < 0) {
            weight = -weight;
        }
        weightedDir.x += axisDir.x * weight;
        weightedDir.y += axisDir.y * weight;
        weightedDir.z += axisDir.z * weight;
    }

    // Z determinant
    {
        const detZ = xx * yy - xy * xy;
        const axisDir = {
            x: xy * yz - xz * yy,
            y: xy * xz - yz * xx,
            z: detZ
        };
        let weight = detZ * detZ;
        if (weightedDir.x * axisDir.x + weightedDir.y * axisDir.y + weightedDir.z * axisDir.z < 0) {
            weight = -weight;
        }
        weightedDir.x += axisDir.x * weight;
        weightedDir.y += axisDir.y * weight;
        weightedDir.z += axisDir.z * weight;
    }

    // Normalize
    const length = Math.sqrt(weightedDir.x * weightedDir.x + weightedDir.y * weightedDir.y + weightedDir.z * weightedDir.z);
    if (length === 0 || !isFinite(length)) {
        return [centroid, null];
    }

    let normal = {
        x: weightedDir.x / length,
        y: weightedDir.y / length,
        z: weightedDir.z / length
    };

    // Ensure normal points up
    if (normal.y < 0) {
        normal = { x: -normal.x, y: -normal.y, z: -normal.z };
    }

    return [centroid, normal];
}
