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

// F16 packing utilities
function floatToF16(x: number): number {
  // Round-to-nearest-even conversion works well enough here
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  f32[0] = x;

  const xBits = u32[0];
  const sign = (xBits >>> 31) & 0x1;
  let exp  = (xBits >>> 23) & 0xFF;
  let frac = xBits & 0x7FFFFF;

  if (exp === 0xFF) {
    // Inf/NaN
    const f16 = (sign << 15) | (0x1F << 10) | (frac ? 0x200 : 0);
    return f16 >>> 0;
  }

  // Normalize subnormals
  if (exp === 0) {
    if (frac === 0) return (sign << 15) >>> 0;
    // renormalize
    while ((frac & 0x00800000) === 0) { frac <<= 1; exp--; }
    frac &= 0x007FFFFF;
    exp++;
  }

  // Re-bias exponent from 127 to 15
  exp = exp - 127 + 15;
  if (exp >= 0x1F) {
    // Overflow -> Inf
    return ((sign << 15) | (0x1F << 10)) >>> 0;
  } else if (exp <= 0) {
    // Subnormal half
    if (exp < -10) {
      // underflow -> signed zero
      return (sign << 15) >>> 0;
    }
    // mantissa | 0x00800000 (implicit 1) shifted by 1-exp
    frac = (frac | 0x00800000) >>> (1 - exp);
    // round
    const halfFrac = (frac + 0x00001000) >>> 13;
    return ((sign << 15) | halfFrac) >>> 0;
  }

  // Normalized half
  const halfExp  = exp & 0x1F;
  const halfFrac = (frac + 0x00001000) >>> 13; // round
  return ((sign << 15) | (halfExp << 10) | (halfFrac & 0x3FF)) >>> 0;
}

// Pack two f16s (low, high) into a single u32 (little-endian)
function pack2xF16(a: number, b: number): number {
  return ((b & 0xFFFF) << 16) | (a & 0xFFFF);
}

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

        // Number of points
        const n = gaussians.length;

        // --- Gaussians: 20 bytes / point (5 x u32) matching WGSL "Gaussian"
        //   pos_opacity: 2 u32 (x,y) & (z,opacity)
        //   cov:         3 u32 (six f16s)
        const gU32 = new Uint32Array(n * 5);
        for (let i = 0; i < n; i++) {
          const g = gaussians[i];
          const o = g.opacity; // already sigmoid'ed in PLY reader

          const p0 = pack2xF16(floatToF16(g.xyz.x), floatToF16(g.xyz.y));
          const p1 = pack2xF16(floatToF16(g.xyz.z), floatToF16(o));

          const c0 = pack2xF16(floatToF16(g.cov[0]), floatToF16(g.cov[1]));
          const c1 = pack2xF16(floatToF16(g.cov[2]), floatToF16(g.cov[3]));
          const c2 = pack2xF16(floatToF16(g.cov[4]), floatToF16(g.cov[5]));

          const base = i * 5;
          gU32[base + 0] = p0;
          gU32[base + 1] = p1;
          gU32[base + 2] = c0;
          gU32[base + 3] = c1;
          gU32[base + 4] = c2;
        }
        
        const gaussianBytes = new Uint8Array(gU32.buffer);

        // --- SH: 96 bytes / point -> 24 x u32 (i.e., 48 halfs = 16 coefs x vec3)
        // Rust memory is [[f16;3];16] in row-major.
        // We build the same order then reinterpret 2 x u16 as 1 x u32.
        const shU16 = new Uint16Array(n * 16 * 3);
        const maxCoefs = Math.min((shDeg + 1) * (shDeg + 1), 16);

        for (let i = 0; i < n; i++) {
          for (let c = 0; c < 16; c++) {
            const src = c < maxCoefs ? shCoefs[i][c] : [0, 0, 0];
            const idx = (i * 16 + c) * 3;
            shU16[idx + 0] = floatToF16(src[0]);
            shU16[idx + 1] = floatToF16(src[1]);
            shU16[idx + 2] = floatToF16(src[2]);
          }
        }
        // NOTE: We do NOT need to shuffle pairs manually; reinterpreting the
        // underlying buffer as u32 produces the right 2x f16 packing (little-endian).
        const shU32 = new Uint32Array(shU16.buffer);
        const shCoefBytes = new Uint8Array(shU32.buffer);

        // Right before `return new GenericGaussianPointCloud(...)`
        const dbgG = new Uint32Array(gaussianBytes.buffer, 0, Math.min(8, gaussianBytes.byteLength/4));
        const dbgS = new Uint32Array(shCoefBytes.buffer, 0, Math.min(8, shCoefBytes.byteLength/4));
        console.log('[PACK] gU32[0..7]=', Array.from(dbgG));
        console.log('[PACK] shU32[0..7]=', Array.from(dbgS));

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

        // Number of points
        const n = gaussians.length;

        // --- pack Gaussians (5 u32 per point)
        const gU32 = new Uint32Array(n * 5);
        for (let i = 0; i < n; i++) {
          const g = gaussians[i];
          const p0 = pack2xF16(floatToF16(g.xyz.x), floatToF16(g.xyz.y));
          const p1 = pack2xF16(floatToF16(g.xyz.z), floatToF16(g.opacity));
          
          // Use covariance from options or default identity-like values
          const covData = options.covars?.[i]?.data || [1.0, 0.0, 0.0, 1.0, 0.0, 1.0];
          const c0 = pack2xF16(floatToF16(covData[0]), floatToF16(covData[1]));
          const c1 = pack2xF16(floatToF16(covData[2]), floatToF16(covData[3]));
          const c2 = pack2xF16(floatToF16(covData[4]), floatToF16(covData[5]));
          
          const base = i * 5;
          gU32[base+0] = p0; gU32[base+1] = p1;
          gU32[base+2] = c0; gU32[base+3] = c1; gU32[base+4] = c2;
        }
        const gaussianBytes = new Uint8Array(gU32.buffer);
        
        // Debug: Print first few packed values
        console.log('[PACK] gU32[0..4]=', gU32.slice(0,5));
        console.log('[PACK] shU32[0..7]=', new Uint32Array(shCoefs.buffer || shCoefs, 0, 8));

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
