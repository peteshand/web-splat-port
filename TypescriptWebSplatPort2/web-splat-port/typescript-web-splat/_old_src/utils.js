"use strict";
/**
 * TypeScript port of utils.rs
 * Utility functions and classes for GPU operations and data management
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RingBuffer = exports.GPUStopwatch = void 0;
exports.keyToNum = keyToNum;
exports.shNumCoefficients = shNumCoefficients;
exports.shDegFromNumCoefs = shDegFromNumCoefs;
exports.buildCov = buildCov;
exports.sigmoid = sigmoid;
var gl_matrix_1 = require("gl-matrix");
function keyToNum(key) {
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
var GPUStopwatch = /** @class */ (function () {
    function GPUStopwatch(device, capacity) {
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
    GPUStopwatch.prototype.start = function (encoder, label) {
        if (this.labels.has(label)) {
        }
        // WebGPU timestamp queries require the 'timestamp-query' feature
        // For now, we'll use a placeholder implementation
    };
    GPUStopwatch.prototype.stop = function (encoder, label) {
        var idx = label ? this.labels.get(label) || this.index : this.index;
        // WebGPU timestamp queries require the 'timestamp-query' feature
        // For now, we'll use a placeholder implementation
        this.index = (this.index + 1) % this.querySetCapacity;
    };
    GPUStopwatch.prototype.end = function (encoder) {
        encoder.resolveQuerySet(this.querySet, 0, this.querySetCapacity, this.queryBuffer, 0);
        this.index = 0;
    };
    GPUStopwatch.prototype.reset = function () {
        this.labels.clear();
    };
    GPUStopwatch.prototype.takeMeasurements = function (device, queue) {
        return __awaiter(this, void 0, void 0, function () {
            var stagingBuffer, encoder, arrayBuffer, timestamps, durations, labelEntries, _i, labelEntries_1, _a, label, index, startTime, endTime, diffTicks, diffTimeMs;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        stagingBuffer = device.createBuffer({
                            size: this.queryBuffer.size,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        });
                        encoder = device.createCommandEncoder();
                        encoder.copyBufferToBuffer(this.queryBuffer, 0, stagingBuffer, 0, this.queryBuffer.size);
                        queue.submit([encoder.finish()]);
                        // Read the results
                        return [4 /*yield*/, stagingBuffer.mapAsync(GPUMapMode.READ)];
                    case 1:
                        // Read the results
                        _b.sent();
                        arrayBuffer = stagingBuffer.getMappedRange();
                        timestamps = new BigUint64Array(arrayBuffer);
                        durations = new Map();
                        labelEntries = Array.from(this.labels.entries());
                        for (_i = 0, labelEntries_1 = labelEntries; _i < labelEntries_1.length; _i++) {
                            _a = labelEntries_1[_i], label = _a[0], index = _a[1];
                            startTime = timestamps[index * 2];
                            endTime = timestamps[index * 2 + 1];
                            diffTicks = Number(endTime - startTime);
                            diffTimeMs = diffTicks / 1000000;
                            durations.set(label, diffTimeMs);
                        }
                        stagingBuffer.unmap();
                        stagingBuffer.destroy();
                        this.labels.clear();
                        return [2 /*return*/, durations];
                }
            });
        });
    };
    return GPUStopwatch;
}());
exports.GPUStopwatch = GPUStopwatch;
var RingBuffer = /** @class */ (function () {
    function RingBuffer(capacity) {
        this.index = 0;
        this.size = 0;
        this.container = new Array(capacity);
    }
    RingBuffer.prototype.push = function (item) {
        this.container[this.index] = item;
        this.index = (this.index + 1) % this.container.length;
        this.size = Math.min(this.size + 1, this.container.length);
    };
    RingBuffer.prototype.toArray = function () {
        var start = this.index >= this.size
            ? this.index - this.size
            : this.container.length - (this.size - this.index);
        var result = [];
        for (var i = 0; i < this.size; i++) {
            var idx = (start + i) % this.container.length;
            var item = this.container[idx];
            if (item !== undefined) {
                result.push(item);
            }
        }
        return result;
    };
    return RingBuffer;
}());
exports.RingBuffer = RingBuffer;
function shNumCoefficients(shDeg) {
    return (shDeg + 1) * (shDeg + 1);
}
function shDegFromNumCoefs(n) {
    var sqrt = Math.sqrt(n);
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
function buildCov(rotation, scale) {
    // Convert quaternion to rotation matrix
    var r = gl_matrix_1.mat3.create();
    gl_matrix_1.mat3.fromQuat(r, rotation);
    // Create scale matrix
    var s = gl_matrix_1.mat3.create();
    gl_matrix_1.mat3.fromScaling(s, scale);
    // L = R * S
    var l = gl_matrix_1.mat3.create();
    gl_matrix_1.mat3.multiply(l, r, s);
    // M = L * L^T
    var lTranspose = gl_matrix_1.mat3.create();
    gl_matrix_1.mat3.transpose(lTranspose, l);
    var m = gl_matrix_1.mat3.create();
    gl_matrix_1.mat3.multiply(m, l, lTranspose);
    // Return upper triangular part: [m00, m01, m02, m11, m12, m22]
    return [
        m[0], m[1], m[2], // m00, m01, m02
        m[4], m[5], // m11, m12
        m[8] // m22
    ];
}
/**
 * Numerically stable sigmoid function
 */
function sigmoid(x) {
    if (x >= 0) {
        return 1 / (1 + Math.exp(-x));
    }
    else {
        return Math.exp(x) / (1 + Math.exp(x));
    }
}
