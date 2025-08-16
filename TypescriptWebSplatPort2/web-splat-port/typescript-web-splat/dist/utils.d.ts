/**
 * TypeScript port of utils.rs
 * Utility functions and classes for GPU operations and data management
 */
import { quat, vec3 } from 'gl-matrix';
export declare function keyToNum(key: string): number | null;
export declare class GPUStopwatch {
    private querySet;
    private queryBuffer;
    private querySetCapacity;
    private index;
    private labels;
    constructor(device: GPUDevice, capacity?: number);
    start(encoder: GPUCommandEncoder, label: string): void;
    stop(encoder: GPUCommandEncoder, label?: string): void;
    end(encoder: GPUCommandEncoder): void;
    reset(): void;
    takeMeasurements(device: GPUDevice, queue: GPUQueue): Promise<Map<string, number>>;
}
export declare class RingBuffer<T> {
    private index;
    private size;
    private container;
    constructor(capacity: number);
    push(item: T): void;
    toArray(): T[];
}
export declare function shNumCoefficients(shDeg: number): number;
export declare function shDegFromNumCoefs(n: number): number | null;
/**
 * Builds a covariance matrix based on a quaternion and scale
 * The matrix is symmetric so we only return the upper right half
 * See "3D Gaussian Splatting" Kerbl et al.
 */
export declare function buildCov(rotation: quat, scale: vec3): [number, number, number, number, number, number];
/**
 * Numerically stable sigmoid function
 */
export declare function sigmoid(x: number): number;
//# sourceMappingURL=utils.d.ts.map