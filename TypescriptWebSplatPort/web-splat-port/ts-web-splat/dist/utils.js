import { mat3 } from "gl-matrix";
export function keyToNum(key) {
    switch (key) {
        case "Digit0": return 0;
        case "Digit1": return 1;
        case "Digit2": return 2;
        case "Digit3": return 3;
        case "Digit4": return 4;
        case "Digit5": return 5;
        case "Digit6": return 6;
        case "Digit7": return 7;
        case "Digit8": return 8;
        case "Digit9": return 9;
        default: return null;
    }
}
export class GPUStopwatch {
    querySet;
    queryBuffer;
    querySetCapacity;
    index = 0;
    labels = new Map();
    constructor(device, capacity) {
        this.querySetCapacity = capacity || Math.floor(8192 / 2); // WebGPU max queries / 2
        this.querySet = device.createQuerySet({
            label: "time stamp query set",
            type: "timestamp",
            count: this.querySetCapacity * 2,
        });
        this.queryBuffer = device.createBuffer({
            label: "query set buffer",
            size: this.querySetCapacity * 2 * 8, // 8 bytes per u64
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: false,
        });
    }
    start(encoder, label) {
        if (this.labels.has(label)) {
            throw new Error("cannot start measurement for same label twice");
        }
        if (this.labels.size * 2 >= this.querySetCapacity) {
            throw new Error(`query set capacity (${this.querySetCapacity}) reached`);
        }
        this.labels.set(label, this.index);
        // Note: WebGPU timestamp queries may not be available in all browsers
        // This is a placeholder implementation
        console.warn("GPU timestamp queries not implemented in this WebGPU version");
        this.index += 1;
    }
    stop(encoder, label) {
        const idx = this.labels.get(label);
        if (idx === undefined) {
            throw new Error(`start was not yet called for label ${label}`);
        }
        // Note: WebGPU timestamp queries may not be available in all browsers
        console.warn("GPU timestamp queries not implemented in this WebGPU version");
    }
    end(encoder) {
        encoder.resolveQuerySet(this.querySet, 0, this.querySetCapacity, this.queryBuffer, 0);
        this.index = 0;
    }
    reset() {
        this.labels.clear();
    }
    async takeMeasurements(device, queue) {
        // Note: WebGPU timestamp queries may not be available in all browsers
        // Return placeholder measurements
        const labels = Array.from(this.labels.entries());
        this.labels.clear();
        const durations = new Map();
        for (const [label] of labels) {
            durations.set(label, 0); // Placeholder timing
        }
        return durations;
    }
}
export class RingBuffer {
    index = 0;
    size = 0;
    container;
    constructor(capacity) {
        this.container = new Array(capacity);
    }
    push(item) {
        this.container[this.index] = item;
        this.index = (this.index + 1) % this.container.length;
        this.size = Math.min(this.size + 1, this.container.length);
    }
    toArray() {
        if (this.size === 0)
            return [];
        const start = this.index >= this.size
            ? this.index - this.size
            : this.container.length - (this.size - this.index);
        const result = [];
        for (let i = 0; i < this.size; i++) {
            result.push(this.container[(start + i) % this.container.length]);
        }
        return result;
    }
}
export function shNumCoefficients(shDeg) {
    return (shDeg + 1) * (shDeg + 1);
}
export function shDegFromNumCoefs(n) {
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
export function buildCov(rotation, scale) {
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
    const lt = mat3.create();
    mat3.transpose(lt, l);
    const m = mat3.create();
    mat3.multiply(m, l, lt);
    // Return upper triangular part: [m00, m01, m02, m11, m12, m22]
    return [m[0], m[1], m[2], m[4], m[5], m[8]];
}
/**
 * Numerically stable sigmoid function
 */
export function sigmoid(x) {
    if (x >= 0) {
        return 1 / (1 + Math.exp(-x));
    }
    else {
        const exp_x = Math.exp(x);
        return exp_x / (1 + exp_x);
    }
}
