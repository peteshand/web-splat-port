"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NpzReader = void 0;
var gl_matrix_1 = require("gl-matrix");
var utils_js_1 = require("../utils.js");
var mod_js_1 = require("./mod.js");
var NpzReader = /** @class */ (function () {
    function NpzReader(data) {
        this.npzFile = this.parseNpz(data);
        this.shDeg = this.calculateShDeg();
        this.kernelSize = this.getNpzValue('kernel_size');
        this.mipSplatting = this.getNpzValue('mip_splatting');
        this.backgroundColor = this.getBackgroundColor();
    }
    NpzReader.prototype.parseNpz = function (data) {
        // This is a simplified NPZ parser
        // In a real implementation, you would use a proper NPZ/ZIP library
        // For now, we'll create a placeholder that throws an error
        throw new Error('NPZ parsing not implemented - requires proper ZIP/NPZ library');
    };
    NpzReader.prototype.calculateShDeg = function () {
        if (this.npzFile['features_rest']) {
            var featuresRest = this.npzFile['features_rest'];
            var shDeg = (0, utils_js_1.shDegFromNumCoefs)(featuresRest.shape[1] + 1);
            if (shDeg === null) {
                throw new Error('Invalid number of SH coefficients');
            }
            return shDeg;
        }
        return 0;
    };
    NpzReader.prototype.getBackgroundColor = function () {
        var bgArray = this.getNpzArrayOptional('background_color');
        if (bgArray && bgArray.length >= 3) {
            return [bgArray[0], bgArray[1], bgArray[2]];
        }
        return undefined;
    };
    NpzReader.prototype.getNpzValue = function (fieldName) {
        var array = this.getNpzArrayOptional(fieldName);
        return array && array.length > 0 ? array[0] : undefined;
    };
    NpzReader.prototype.getNpzArrayOptional = function (fieldName) {
        var npzArray = this.npzFile[fieldName];
        if (!npzArray) {
            return undefined;
        }
        return this.parseTypedArray(npzArray);
    };
    NpzReader.prototype.tryGetNpzArray = function (fieldName) {
        var array = this.getNpzArrayOptional(fieldName);
        if (!array) {
            throw new Error("Array ".concat(fieldName, " missing"));
        }
        return array;
    };
    NpzReader.prototype.parseTypedArray = function (npzArray) {
        // Convert ArrayBuffer to typed array based on dtype
        var data = npzArray.data, dtype = npzArray.dtype;
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
                throw new Error("Unsupported dtype: ".concat(dtype));
        }
    };
    NpzReader.prototype.read = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        var startTime = performance.now();
        // Get quantization parameters
        var opacityScale = (_a = this.getNpzValue('opacity_scale')) !== null && _a !== void 0 ? _a : 1.0;
        var opacityZeroPoint = (_b = this.getNpzValue('opacity_zero_point')) !== null && _b !== void 0 ? _b : 0;
        var scalingScale = (_c = this.getNpzValue('scaling_scale')) !== null && _c !== void 0 ? _c : 1.0;
        var scalingZeroPoint = (_d = this.getNpzValue('scaling_zero_point')) !== null && _d !== void 0 ? _d : 0;
        var rotationScale = (_e = this.getNpzValue('rotation_scale')) !== null && _e !== void 0 ? _e : 1.0;
        var rotationZeroPoint = (_f = this.getNpzValue('rotation_zero_point')) !== null && _f !== void 0 ? _f : 0;
        var featuresDcScale = (_g = this.getNpzValue('features_dc_scale')) !== null && _g !== void 0 ? _g : 1.0;
        var featuresDcZeroPoint = (_h = this.getNpzValue('features_dc_zero_point')) !== null && _h !== void 0 ? _h : 0;
        var featuresRestScale = (_j = this.getNpzValue('features_rest_scale')) !== null && _j !== void 0 ? _j : 1.0;
        var featuresRestZeroPoint = (_k = this.getNpzValue('features_rest_zero_point')) !== null && _k !== void 0 ? _k : 0;
        // Optional scaling factor
        var scalingFactor;
        var scalingFactorZeroPoint = 0;
        var scalingFactorScale = 1.0;
        if (this.npzFile['scaling_factor_scale']) {
            scalingFactorScale = (_l = this.getNpzValue('scaling_factor_scale')) !== null && _l !== void 0 ? _l : 1.0;
            scalingFactorZeroPoint = (_m = this.getNpzValue('scaling_factor_zero_point')) !== null && _m !== void 0 ? _m : 0;
            scalingFactor = this.tryGetNpzArray('scaling_factor');
        }
        // Load point data
        var xyzData = this.tryGetNpzArray('xyz');
        var xyz = [];
        for (var i = 0; i < xyzData.length; i += 3) {
            xyz.push({ x: xyzData[i], y: xyzData[i + 1], z: xyzData[i + 2] });
        }
        // Load scaling data
        var scalingData = this.tryGetNpzArray('scaling');
        var scaling = [];
        if (!scalingFactor) {
            // No scaling factor - scaling is not normalized
            for (var i = 0; i < scalingData.length; i += 3) {
                var s1 = Math.exp((scalingData[i] - scalingZeroPoint) * scalingScale);
                var s2 = Math.exp((scalingData[i + 1] - scalingZeroPoint) * scalingScale);
                var s3 = Math.exp((scalingData[i + 2] - scalingZeroPoint) * scalingScale);
                scaling.push(gl_matrix_1.vec3.fromValues(s1, s2, s3));
            }
        }
        else {
            // With scaling factor - normalize scaling
            for (var i = 0; i < scalingData.length; i += 3) {
                var s1 = Math.max(0, (scalingData[i] - scalingZeroPoint) * scalingScale);
                var s2 = Math.max(0, (scalingData[i + 1] - scalingZeroPoint) * scalingScale);
                var s3 = Math.max(0, (scalingData[i + 2] - scalingZeroPoint) * scalingScale);
                var scale = gl_matrix_1.vec3.fromValues(s1, s2, s3);
                gl_matrix_1.vec3.normalize(scale, scale);
                scaling.push(scale);
            }
        }
        // Load rotation data
        var rotationData = this.tryGetNpzArray('rotation');
        var rotation = [];
        for (var i = 0; i < rotationData.length; i += 4) {
            var r0 = (rotationData[i] - rotationZeroPoint) * rotationScale;
            var r1 = (rotationData[i + 1] - rotationZeroPoint) * rotationScale;
            var r2 = (rotationData[i + 2] - rotationZeroPoint) * rotationScale;
            var r3 = (rotationData[i + 3] - rotationZeroPoint) * rotationScale;
            var rot = gl_matrix_1.quat.fromValues(r1, r2, r3, r0); // Note: different order
            gl_matrix_1.quat.normalize(rot, rot);
            rotation.push(rot);
        }
        // Load other data
        var opacity = this.tryGetNpzArray('opacity');
        var featuresDc = this.tryGetNpzArray('features_dc');
        var featuresRest = this.tryGetNpzArray('features_rest');
        // Optional indices
        var featureIndices = this.getNpzArrayOptional('feature_indices');
        var gaussianIndices = this.getNpzArrayOptional('gaussian_indices');
        var numPoints = xyz.length;
        var shDeg = this.shDeg;
        var numShCoeffs = (0, utils_js_1.shNumCoefficients)(shDeg);
        // Create compressed gaussians
        var gaussians = [];
        for (var i = 0; i < numPoints; i++) {
            gaussians.push({
                xyz: xyz[i],
                opacity: opacity[i],
                scaleFactor: scalingFactor ? scalingFactor[i] : 0,
                geometryIdx: gaussianIndices ? gaussianIndices[i] : i,
                shIdx: featureIndices ? featureIndices[i] : i
            });
        }
        // Pack SH coefficients
        var shCoefs = [];
        var shCoeffsLength = numShCoeffs * 3;
        var restNumCoefs = shCoeffsLength - 3;
        for (var i = 0; i < featuresDc.length / 3; i++) {
            // DC component
            shCoefs.push(featuresDc[i * 3 + 0]);
            shCoefs.push(featuresDc[i * 3 + 1]);
            shCoefs.push(featuresDc[i * 3 + 2]);
            // Rest components
            for (var j = 0; j < restNumCoefs; j++) {
                shCoefs.push(featuresRest[i * restNumCoefs + j]);
            }
        }
        // Build covariance matrices
        var covars = [];
        for (var i = 0; i < rotation.length; i++) {
            var cov = (0, utils_js_1.buildCov)(rotation[i], scaling[i]);
            covars.push({ data: cov });
        }
        var duration = performance.now() - startTime;
        console.log("Reading took ".concat(duration.toFixed(2), "ms"));
        var quantization = {
            colorDc: { zeroPoint: featuresDcZeroPoint, scale: featuresDcScale, _pad: [0, 0] },
            colorRest: { zeroPoint: featuresRestZeroPoint, scale: featuresRestScale, _pad: [0, 0] },
            opacity: { zeroPoint: opacityZeroPoint, scale: opacityScale, _pad: [0, 0] },
            scalingFactor: { zeroPoint: scalingFactorZeroPoint, scale: scalingFactorScale, _pad: [0, 0] }
        };
        return mod_js_1.GenericGaussianPointCloud.fromCompressedGaussians(gaussians, new Uint8Array(shCoefs), shDeg, {
            kernelSize: this.kernelSize,
            mipSplatting: this.mipSplatting,
            backgroundColor: this.backgroundColor,
            covars: covars,
            quantization: quantization
        });
    };
    NpzReader.magicBytes = function () {
        return new Uint8Array([0x50, 0x4B, 0x03, 0x04]); // ZIP magic bytes
    };
    NpzReader.fileEnding = function () {
        return 'npz';
    };
    return NpzReader;
}());
exports.NpzReader = NpzReader;
