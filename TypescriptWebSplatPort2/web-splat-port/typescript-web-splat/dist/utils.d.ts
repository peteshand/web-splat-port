import { quat, vec3 } from 'gl-matrix';
/** Map KeyboardEvent.code like "Digit3" -> 3, otherwise null */
export declare function key_to_num(code: string): number | null;
/**
 * GPUStopwatch — mirrors the Rust struct/methods:
 * fields: query_set, query_buffer, query_set_capacity, index, labels
 * methods: new(..), start(..), stop(..), end(..), reset(), take_measurements(..)
 *
 * NOTE: WebGPU timestamp queries may be unavailable; in that case this class
 * degrades to no-ops and returns empty results.
 */
export declare class GPUStopwatch {
    private query_set;
    private query_buffer;
    private query_set_capacity;
    private index;
    private labels;
    private timestamp_period_ns;
    static new(device: GPUDevice, capacity?: number): GPUStopwatch;
    constructor(device: GPUDevice, capacity?: number);
    start(encoder: GPUCommandEncoder, label: string): void;
    stop(encoder: GPUCommandEncoder, label: string): void;
    end(encoder: GPUCommandEncoder): void;
    reset(): void;
    take_measurements(device: GPUDevice, queue: GPUQueue): Promise<Map<string, number>>;
}
/** Simple ring buffer used for fixed-size rolling statistics, etc. */
export declare class RingBuffer<T> {
    private index;
    private size;
    private store;
    constructor(capacity: number);
    push(item: T): void;
    to_array(): T[];
}
/** Number of SH coefficients for degree `sh_deg` ( (n+1)^2 ). */
export declare function sh_num_coefficients(sh_deg: number): number;
/** Inverse of sh_num_coefficients: returns degree if n is a perfect square; else null. */
export declare function sh_deg_from_num_coefs(n: number): number | null;
/**
 * Build the symmetric covariance (upper-triangular packed: m00,m01,m02,m11,m12,m22)
 * from rotation (unit quaternion) and axis scales.
 * Matches Kerbl et al. “3D Gaussian Splatting …”
 */
export declare function build_cov(rotation: quat, scale: vec3): [number, number, number, number, number, number];
/** Numerically stable sigmoid */
export declare function sigmoid(x: number): number;
export declare const buildCov: typeof build_cov;
export declare const shDegFromNumCoefs: typeof sh_deg_from_num_coefs;
export declare const shNumCoefficients: typeof sh_num_coefficients;
//# sourceMappingURL=utils.d.ts.map