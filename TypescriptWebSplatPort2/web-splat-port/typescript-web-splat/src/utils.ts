/**
 * TypeScript port of utils.rs
 * Utility functions and classes for GPU operations and data management
 */

import { mat3, quat, vec3 } from 'gl-matrix';

export function keyToNum(key: string): number | null {
    switch (key) {
        case 'Digit0': return 0;
        case 'Digit1': return 1;
        case 'Digit2': return 2;
        case 'Digit3': return 3;
        case 'Digit4': return 4;
        case 'Digit5': return 5;
        case 'Digit6': return 6;
        case 'Digit7': return 7;
        case 'Digit8': return 8;
        case 'Digit9': return 9;
        default: return null;
    }
}

export class GPUStopwatch {
    private querySet: GPUQuerySet;
    private queryBuffer: GPUBuffer;
    private querySetCapacity: number;
    private index: number;
    private labels: Map<string, number>;

    constructor(device: GPUDevice, capacity?: number) {
        this.querySetCapacity = capacity || Math.floor(8192 / 2); // WebGPU max queries / 2
        
        this.querySet = device.createQuerySet({
            label: "time stamp query set",
            type: "timestamp",
            count: this.querySetCapacity * 2
        });

        this.queryBuffer = device.createBuffer({
            label: "query set buffer",
            size: this.querySetCapacity * 2 * 8, // 8 bytes per u64
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: false
        });

        this.labels = new Map();
        this.index = 0;
    }

    start(encoder: GPUCommandEncoder, label: string): void {
        if (this.labels.has(label)) {
        }
        // WebGPU timestamp queries require the 'timestamp-query' feature
        // For now, we'll use a placeholder implementation
    }

    stop(encoder: GPUCommandEncoder, label?: string): void {
        const idx = label ? this.labels.get(label) || this.index : this.index;
        // WebGPU timestamp queries require the 'timestamp-query' feature
        // For now, we'll use a placeholder implementation
        this.index = (this.index + 1) % this.querySetCapacity;
    }

    end(encoder: GPUCommandEncoder): void {
        encoder.resolveQuerySet(
            this.querySet,
            0,
            this.querySetCapacity,
            this.queryBuffer,
            0
        );
        this.index = 0;
    }

    reset(): void {
        this.labels.clear();
    }

    async takeMeasurements(device: GPUDevice, queue: GPUQueue): Promise<Map<string, number>> {
        // Create staging buffer for reading results
        const stagingBuffer = device.createBuffer({
            size: this.queryBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        // Copy query results to staging buffer
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.queryBuffer, 0, stagingBuffer, 0, this.queryBuffer.size);
        queue.submit([encoder.finish()]);

        // Read the results
        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = stagingBuffer.getMappedRange();
        const timestamps = new BigUint64Array(arrayBuffer);

        const durations = new Map<string, number>();
        const labelEntries = Array.from(this.labels.entries());
        
        for (const [label, index] of labelEntries) {
            const startTime = timestamps[index * 2];
            const endTime = timestamps[index * 2 + 1];
            const diffTicks = Number(endTime - startTime);
            // Convert to milliseconds (timestamps are in nanoseconds)
            const diffTimeMs = diffTicks / 1_000_000;
            durations.set(label, diffTimeMs);
        }

        stagingBuffer.unmap();
        stagingBuffer.destroy();
        
        this.labels.clear();
        return durations;
    }
}

export class RingBuffer<T> {
    private index: number;
    private size: number;
    private container: (T | undefined)[];

    constructor(capacity: number) {
        this.index = 0;
        this.size = 0;
        this.container = new Array(capacity);
    }

    push(item: T): void {
        this.container[this.index] = item;
        this.index = (this.index + 1) % this.container.length;
        this.size = Math.min(this.size + 1, this.container.length);
    }

    toArray(): T[] {
        const start = this.index >= this.size 
            ? this.index - this.size 
            : this.container.length - (this.size - this.index);
        
        const result: T[] = [];
        for (let i = 0; i < this.size; i++) {
            const idx = (start + i) % this.container.length;
            const item = this.container[idx];
            if (item !== undefined) {
                result.push(item);
            }
        }
        return result;
    }
}

export function shNumCoefficients(shDeg: number): number {
    return (shDeg + 1) * (shDeg + 1);
}

export function shDegFromNumCoefs(n: number): number | null {
    const sqrt = Math.sqrt(n);
    if (sqrt !== Math.floor(sqrt)) {
        return null;
    }
    return sqrt - 1;
}

/**
 * Builds a covariance matrix based on a quaternion and scale
 * The matrix is symmetric so we only return the upper right half
 * See "3D Gaussian Splatting" Kerbl et al.
 */
export function buildCov(rotation: quat, scale: vec3): [number, number, number, number, number, number] {
    // Convert quaternion to rotation matrix
    const r = mat3.create();
    mat3.fromQuat(r, rotation);
    
    // Create scale matrix
    const s = mat3.create();
    mat3.fromScaling(s, scale);
    
    // L = R * S
    const l = mat3.create();
    mat3.multiply(l, r, s);
    
    // M = L * L^T
    const lTranspose = mat3.create();
    mat3.transpose(lTranspose, l);
    
    const m = mat3.create();
    mat3.multiply(m, l, lTranspose);
    
    // Return upper triangular part: [m00, m01, m02, m11, m12, m22]
    return [
        m[0], m[1], m[2],  // m00, m01, m02
        m[4], m[5],        // m11, m12
        m[8]               // m22
    ];
}

/**
 * Numerically stable sigmoid function
 */
export function sigmoid(x: number): number {
    if (x >= 0) {
        return 1 / (1 + Math.exp(-x));
    } else {
        return Math.exp(x) / (1 + Math.exp(x));
    }
}
