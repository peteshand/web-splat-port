"use strict";
/**
 * TypeScript port of io/mod.rs
 * Point cloud I/O system for loading Gaussian splat data
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.GenericGaussianPointCloud = void 0;
var pointcloud_js_1 = require("../pointcloud.js");
var ply_js_1 = require("./ply.js");
var npz_js_1 = require("./npz.js");
// F16 packing utilities
function floatToF16(x) {
    // Round-to-nearest-even conversion works well enough here
    var f32 = new Float32Array(1);
    var u32 = new Uint32Array(f32.buffer);
    f32[0] = x;
    var xBits = u32[0];
    var sign = (xBits >>> 31) & 0x1;
    var exp = (xBits >>> 23) & 0xFF;
    var frac = xBits & 0x7FFFFF;
    if (exp === 0xFF) {
        // Inf/NaN
        var f16 = (sign << 15) | (0x1F << 10) | (frac ? 0x200 : 0);
        return f16 >>> 0;
    }
    // Normalize subnormals
    if (exp === 0) {
        if (frac === 0)
            return (sign << 15) >>> 0;
        // renormalize
        while ((frac & 0x00800000) === 0) {
            frac <<= 1;
            exp--;
        }
        frac &= 0x007FFFFF;
        exp++;
    }
    // Re-bias exponent from 127 to 15
    exp = exp - 127 + 15;
    if (exp >= 0x1F) {
        // Overflow -> Inf
        return ((sign << 15) | (0x1F << 10)) >>> 0;
    }
    else if (exp <= 0) {
        // Subnormal half
        if (exp < -10) {
            // underflow -> signed zero
            return (sign << 15) >>> 0;
        }
        // mantissa | 0x00800000 (implicit 1) shifted by 1-exp
        frac = (frac | 0x00800000) >>> (1 - exp);
        // round
        var halfFrac_1 = (frac + 0x00001000) >>> 13;
        return ((sign << 15) | halfFrac_1) >>> 0;
    }
    // Normalized half
    var halfExp = exp & 0x1F;
    var halfFrac = (frac + 0x00001000) >>> 13; // round
    return ((sign << 15) | (halfExp << 10) | (halfFrac & 0x3FF)) >>> 0;
}
// Pack two f16s (low, high) into a single u32 (little-endian)
function pack2xF16(a, b) {
    return ((b & 0xFFFF) << 16) | (a & 0xFFFF);
}
/**
 * Generic Gaussian point cloud data structure
 */
var GenericGaussianPointCloud = /** @class */ (function () {
    function GenericGaussianPointCloud(gaussians, shCoefs, compressed, shDeg, numPoints, center, aabb, options) {
        if (options === void 0) { options = {}; }
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
    GenericGaussianPointCloud.load = function (fileData) {
        return __awaiter(this, void 0, void 0, function () {
            var signature, plyMagic, plyReader, npzMagic, npzReader;
            return __generator(this, function (_a) {
                signature = new Uint8Array(fileData.slice(0, 4));
                plyMagic = new TextEncoder().encode('ply\n');
                if (this.arrayStartsWith(signature, plyMagic.slice(0, 3))) {
                    plyReader = new ply_js_1.PlyReader(fileData);
                    return [2 /*return*/, plyReader.read()];
                }
                npzMagic = new Uint8Array([0x50, 0x4B]);
                if (this.arrayStartsWith(signature, npzMagic)) {
                    npzReader = new npz_js_1.NpzReader(fileData);
                    return [2 /*return*/, npzReader.read()];
                }
                throw new Error('Unknown file format');
            });
        });
    };
    GenericGaussianPointCloud.arrayStartsWith = function (array, prefix) {
        if (array.length < prefix.length)
            return false;
        for (var i = 0; i < prefix.length; i++) {
            if (array[i] !== prefix[i])
                return false;
        }
        return true;
    };
    /**
     * Create from uncompressed Gaussian data
     */
    GenericGaussianPointCloud.fromGaussians = function (gaussians, shCoefs, // [point][coef][rgb]
    shDeg, options) {
        if (options === void 0) { options = {}; }
        // Calculate bounding box
        var aabb = (0, pointcloud_js_1.createUnitAabb)();
        var first = true;
        for (var _i = 0, gaussians_1 = gaussians; _i < gaussians_1.length; _i++) {
            var gaussian = gaussians_1[_i];
            var point = {
                x: gaussian.xyz.x,
                y: gaussian.xyz.y,
                z: gaussian.xyz.z
            };
            if (first) {
                aabb.min = __assign({}, point);
                aabb.max = __assign({}, point);
                first = false;
            }
            else {
                (0, pointcloud_js_1.growAabb)(aabb, point);
            }
        }
        // Calculate center and up vector from points
        var points = gaussians.map(function (g) { return ({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z }); });
        var _a = planeFromPoints(points), center = _a[0], up = _a[1];
        // Number of points
        var n = gaussians.length;
        // --- Gaussians: 20 bytes / point (5 x u32) matching WGSL "Gaussian"
        //   pos_opacity: 2 u32 (x,y) & (z,opacity)
        //   cov:         3 u32 (six f16s)
        var gU32 = new Uint32Array(n * 5);
        for (var i = 0; i < n; i++) {
            var g = gaussians[i];
            var o = g.opacity; // already sigmoid'ed in PLY reader
            var p0 = pack2xF16(floatToF16(g.xyz.x), floatToF16(g.xyz.y));
            var p1 = pack2xF16(floatToF16(g.xyz.z), floatToF16(o));
            var c0 = pack2xF16(floatToF16(g.cov[0]), floatToF16(g.cov[1]));
            var c1 = pack2xF16(floatToF16(g.cov[2]), floatToF16(g.cov[3]));
            var c2 = pack2xF16(floatToF16(g.cov[4]), floatToF16(g.cov[5]));
            var base = i * 5;
            gU32[base + 0] = p0;
            gU32[base + 1] = p1;
            gU32[base + 2] = c0;
            gU32[base + 3] = c1;
            gU32[base + 4] = c2;
        }
        var gaussianBytes = new Uint8Array(gU32.buffer);
        // --- SH: 96 bytes / point -> 24 x u32 (i.e., 48 halfs = 16 coefs x vec3)
        // Rust memory is [[f16;3];16] in row-major.
        // We build the same order then reinterpret 2 x u16 as 1 x u32.
        var shU16 = new Uint16Array(n * 16 * 3);
        var maxCoefs = Math.min((shDeg + 1) * (shDeg + 1), 16);
        for (var i = 0; i < n; i++) {
            for (var c = 0; c < 16; c++) {
                var src = c < maxCoefs ? shCoefs[i][c] : [0, 0, 0];
                var idx = (i * 16 + c) * 3;
                shU16[idx + 0] = floatToF16(src[0]);
                shU16[idx + 1] = floatToF16(src[1]);
                shU16[idx + 2] = floatToF16(src[2]);
            }
        }
        // NOTE: We do NOT need to shuffle pairs manually; reinterpreting the
        // underlying buffer as u32 produces the right 2x f16 packing (little-endian).
        var shU32 = new Uint32Array(shU16.buffer);
        var shCoefBytes = new Uint8Array(shU32.buffer);
        // Right before `return new GenericGaussianPointCloud(...)`
        var dbgG = new Uint32Array(gaussianBytes.buffer, 0, Math.min(8, gaussianBytes.byteLength / 4));
        var dbgS = new Uint32Array(shCoefBytes.buffer, 0, Math.min(8, shCoefBytes.byteLength / 4));
        console.log('[PACK] gU32[0..7]=', Array.from(dbgG));
        console.log('[PACK] shU32[0..7]=', Array.from(dbgS));
        return new GenericGaussianPointCloud(gaussianBytes, shCoefBytes, false, // not compressed
        shDeg, gaussians.length, center, aabb, __assign(__assign({}, options), { up: (0, pointcloud_js_1.getAabbRadius)(aabb) >= 10 ? (up || undefined) : undefined }));
    };
    /**
     * Create from compressed Gaussian data
     */
    GenericGaussianPointCloud.fromCompressedGaussians = function (gaussians, shCoefs, shDeg, options) {
        var _a, _b;
        if (options === void 0) { options = {}; }
        // Calculate bounding box
        var aabb = (0, pointcloud_js_1.createUnitAabb)();
        var first = true;
        for (var _i = 0, gaussians_2 = gaussians; _i < gaussians_2.length; _i++) {
            var gaussian = gaussians_2[_i];
            var point = {
                x: gaussian.xyz.x,
                y: gaussian.xyz.y,
                z: gaussian.xyz.z
            };
            if (first) {
                aabb.min = __assign({}, point);
                aabb.max = __assign({}, point);
                first = false;
            }
            else {
                (0, pointcloud_js_1.growAabb)(aabb, point);
            }
        }
        // Calculate center and up vector from points
        var points = gaussians.map(function (g) { return ({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z }); });
        var _c = planeFromPoints(points), center = _c[0], up = _c[1];
        // Number of points
        var n = gaussians.length;
        // --- pack Gaussians (5 u32 per point)
        var gU32 = new Uint32Array(n * 5);
        for (var i = 0; i < n; i++) {
            var g = gaussians[i];
            var p0 = pack2xF16(floatToF16(g.xyz.x), floatToF16(g.xyz.y));
            var p1 = pack2xF16(floatToF16(g.xyz.z), floatToF16(g.opacity));
            // Use covariance from options or default identity-like values
            var covData = ((_b = (_a = options.covars) === null || _a === void 0 ? void 0 : _a[i]) === null || _b === void 0 ? void 0 : _b.data) || [1.0, 0.0, 0.0, 1.0, 0.0, 1.0];
            var c0 = pack2xF16(floatToF16(covData[0]), floatToF16(covData[1]));
            var c1 = pack2xF16(floatToF16(covData[2]), floatToF16(covData[3]));
            var c2 = pack2xF16(floatToF16(covData[4]), floatToF16(covData[5]));
            var base = i * 5;
            gU32[base + 0] = p0;
            gU32[base + 1] = p1;
            gU32[base + 2] = c0;
            gU32[base + 3] = c1;
            gU32[base + 4] = c2;
        }
        var gaussianBytes = new Uint8Array(gU32.buffer);
        // Debug: Print first few packed values
        console.log('[PACK] gU32[0..4]=', gU32.slice(0, 5));
        console.log('[PACK] shU32[0..7]=', new Uint32Array(shCoefs.buffer || shCoefs, 0, 8));
        return new GenericGaussianPointCloud(gaussianBytes, shCoefs, true, // compressed
        shDeg, gaussians.length, center, aabb, __assign(__assign({}, options), { up: (0, pointcloud_js_1.getAabbRadius)(aabb) >= 10 ? (up || undefined) : undefined }));
    };
    /**
     * Get uncompressed Gaussians
     */
    GenericGaussianPointCloud.prototype.getGaussians = function () {
        if (this.compressed) {
            throw new Error('Gaussians are compressed');
        }
        // Would need proper deserialization
        return [];
    };
    /**
     * Get compressed Gaussians
     */
    GenericGaussianPointCloud.prototype.getGaussiansCompressed = function () {
        if (!this.compressed) {
            throw new Error('Gaussians are not compressed');
        }
        // Would need proper deserialization
        return [];
    };
    /**
     * Get SH coefficients buffer
     */
    GenericGaussianPointCloud.prototype.shCoefsBuffer = function () {
        return this.shCoefs;
    };
    /**
     * Get Gaussian buffer
     */
    GenericGaussianPointCloud.prototype.gaussianBuffer = function () {
        return this.gaussians;
    };
    /**
     * Check if compressed
     */
    GenericGaussianPointCloud.prototype.isCompressed = function () {
        return this.compressed;
    };
    return GenericGaussianPointCloud;
}());
exports.GenericGaussianPointCloud = GenericGaussianPointCloud;
/**
 * Fit a plane to a collection of points
 * Fast, and accurate to within a few degrees
 * Returns center point and normal vector (or null if points don't span a plane)
 * See http://www.ilikebigbits.com/2017_09_25_plane_from_points_2.html
 */
function planeFromPoints(points) {
    var n = points.length;
    // Calculate centroid
    var sum = { x: 0, y: 0, z: 0 };
    for (var _i = 0, points_1 = points; _i < points_1.length; _i++) {
        var p = points_1[_i];
        sum.x += p.x;
        sum.y += p.y;
        sum.z += p.z;
    }
    var centroid = {
        x: sum.x / n,
        y: sum.y / n,
        z: sum.z / n
    };
    if (n < 3) {
        return [centroid, null];
    }
    // Calculate full 3x3 covariance matrix, excluding symmetries
    var xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
    for (var _a = 0, points_2 = points; _a < points_2.length; _a++) {
        var p = points_2[_a];
        var r = {
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
    var weightedDir = { x: 0, y: 0, z: 0 };
    // X determinant
    {
        var detX = yy * zz - yz * yz;
        var axisDir = {
            x: detX,
            y: xz * yz - xy * zz,
            z: xy * yz - xz * yy
        };
        var weight = detX * detX;
        if (weightedDir.x * axisDir.x + weightedDir.y * axisDir.y + weightedDir.z * axisDir.z < 0) {
            weight = -weight;
        }
        weightedDir.x += axisDir.x * weight;
        weightedDir.y += axisDir.y * weight;
        weightedDir.z += axisDir.z * weight;
    }
    // Y determinant
    {
        var detY = xx * zz - xz * xz;
        var axisDir = {
            x: xz * yz - xy * zz,
            y: detY,
            z: xy * xz - yz * xx
        };
        var weight = detY * detY;
        if (weightedDir.x * axisDir.x + weightedDir.y * axisDir.y + weightedDir.z * axisDir.z < 0) {
            weight = -weight;
        }
        weightedDir.x += axisDir.x * weight;
        weightedDir.y += axisDir.y * weight;
        weightedDir.z += axisDir.z * weight;
    }
    // Z determinant
    {
        var detZ = xx * yy - xy * xy;
        var axisDir = {
            x: xy * yz - xz * yy,
            y: xy * xz - yz * xx,
            z: detZ
        };
        var weight = detZ * detZ;
        if (weightedDir.x * axisDir.x + weightedDir.y * axisDir.y + weightedDir.z * axisDir.z < 0) {
            weight = -weight;
        }
        weightedDir.x += axisDir.x * weight;
        weightedDir.y += axisDir.y * weight;
        weightedDir.z += axisDir.z * weight;
    }
    // Normalize
    var length = Math.sqrt(weightedDir.x * weightedDir.x + weightedDir.y * weightedDir.y + weightedDir.z * weightedDir.z);
    if (length === 0 || !isFinite(length)) {
        return [centroid, null];
    }
    var normal = {
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
