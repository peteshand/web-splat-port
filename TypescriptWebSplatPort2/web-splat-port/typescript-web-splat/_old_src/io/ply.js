"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlyReader = void 0;
var gl_matrix_1 = require("gl-matrix");
var utils_js_1 = require("../utils.js");
var mod_js_1 = require("./mod.js");
var PlyReader = /** @class */ (function () {
    function PlyReader(data) {
        this.offset = 0;
        this.data = data;
        this.dataView = new DataView(data);
        this.header = this.parseHeader();
        this.shDeg = this.fileShDeg();
        this.numPoints = this.getNumPoints();
        this.mipSplatting = this.getMipSplatting();
        this.kernelSize = this.getKernelSize();
        this.backgroundColor = this.getBackgroundColor();
    }
    PlyReader.prototype.parseHeader = function () {
        var decoder = new TextDecoder();
        var headerEnd = 0;
        // Find end of header
        var headerBytes = new Uint8Array(this.data);
        var endHeaderMarker = new TextEncoder().encode('end_header\n');
        for (var i = 0; i <= headerBytes.length - endHeaderMarker.length; i++) {
            var match = true;
            for (var j = 0; j < endHeaderMarker.length; j++) {
                if (headerBytes[i + j] !== endHeaderMarker[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                headerEnd = i + endHeaderMarker.length;
                break;
            }
        }
        var headerText = decoder.decode(headerBytes.slice(0, headerEnd));
        var lines = headerText.split('\n').filter(function (line) { return line.trim(); });
        var header = {
            format: 'binary_little_endian',
            elements: [],
            comments: []
        };
        var currentElement = null;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var parts = line.trim().split(/\s+/);
            if (parts[0] === 'format') {
                header.format = parts[1];
            }
            else if (parts[0] === 'comment') {
                header.comments.push(line.substring(8));
            }
            else if (parts[0] === 'element') {
                if (currentElement) {
                    header.elements.push(currentElement);
                }
                currentElement = {
                    name: parts[1],
                    count: parseInt(parts[2]),
                    properties: []
                };
            }
            else if (parts[0] === 'property' && currentElement) {
                currentElement.properties.push({
                    name: parts[2] || parts[1],
                    type: parts[1]
                });
            }
        }
        if (currentElement) {
            header.elements.push(currentElement);
        }
        this.offset = headerEnd;
        return header;
    };
    PlyReader.prototype.readFloat32 = function (littleEndian) {
        if (littleEndian === void 0) { littleEndian = true; }
        var value = this.dataView.getFloat32(this.offset, littleEndian);
        this.offset += 4;
        return value;
    };
    PlyReader.prototype.readLine = function (shDeg, littleEndian) {
        // Position
        var pos = gl_matrix_1.vec3.fromValues(this.readFloat32(littleEndian), this.readFloat32(littleEndian), this.readFloat32(littleEndian));
        // Skip normals
        this.readFloat32(littleEndian);
        this.readFloat32(littleEndian);
        this.readFloat32(littleEndian);
        // Spherical harmonics
        var sh = Array(16).fill(0).map(function () { return [0, 0, 0]; });
        // First SH coefficient (DC component)
        sh[0][0] = this.readFloat32(littleEndian);
        sh[0][1] = this.readFloat32(littleEndian);
        sh[0][2] = this.readFloat32(littleEndian);
        // Rest of SH coefficients
        var numCoefs = (shDeg + 1) * (shDeg + 1);
        var shRest = [];
        for (var i = 0; i < (numCoefs - 1) * 3; i++) {
            shRest.push(this.readFloat32(littleEndian));
        }
        // Reorder SH coefficients from channel-first to coefficient-first
        for (var i = 0; i < numCoefs - 1; i++) {
            for (var j = 0; j < 3; j++) {
                sh[i + 1][j] = shRest[j * (numCoefs - 1) + i];
            }
        }
        // Opacity
        var opacity = (0, utils_js_1.sigmoid)(this.readFloat32(littleEndian));
        // Scale
        var scale = gl_matrix_1.vec3.fromValues(Math.exp(this.readFloat32(littleEndian)), Math.exp(this.readFloat32(littleEndian)), Math.exp(this.readFloat32(littleEndian)));
        // Rotation quaternion
        var rotation = gl_matrix_1.quat.fromValues(this.readFloat32(littleEndian), this.readFloat32(littleEndian), this.readFloat32(littleEndian), this.readFloat32(littleEndian));
        gl_matrix_1.quat.normalize(rotation, rotation);
        // Build covariance matrix
        var cov = (0, utils_js_1.buildCov)(rotation, scale);
        var gaussian = {
            xyz: { x: pos[0], y: pos[1], z: pos[2] },
            opacity: opacity,
            cov: cov
        };
        return [gaussian, sh];
    };
    PlyReader.prototype.fileShDeg = function () {
        var vertexElement = this.header.elements.find(function (e) { return e.name === 'vertex'; });
        if (!vertexElement) {
            throw new Error('Missing vertex element');
        }
        var numShCoefs = vertexElement.properties.filter(function (p) { return p.name.startsWith('f_'); }).length;
        var shDeg = (0, utils_js_1.shDegFromNumCoefs)(Math.floor(numShCoefs / 3));
        if (shDeg === null) {
            throw new Error("Number of SH coefficients ".concat(numShCoefs, " cannot be mapped to SH degree"));
        }
        return shDeg;
    };
    PlyReader.prototype.getNumPoints = function () {
        var vertexElement = this.header.elements.find(function (e) { return e.name === 'vertex'; });
        if (!vertexElement) {
            throw new Error('Missing vertex element');
        }
        return vertexElement.count;
    };
    PlyReader.prototype.getMipSplatting = function () {
        var mipComment = this.header.comments.find(function (c) { return c.includes('mip'); });
        if (mipComment) {
            var value = mipComment.split('=').pop();
            return value ? value.trim() === 'true' : undefined;
        }
        return undefined;
    };
    PlyReader.prototype.getKernelSize = function () {
        var kernelComment = this.header.comments.find(function (c) { return c.includes('kernel_size'); });
        if (kernelComment) {
            var value = kernelComment.split('=').pop();
            return value ? parseFloat(value.trim()) : undefined;
        }
        return undefined;
    };
    PlyReader.prototype.getBackgroundColor = function () {
        var bgComment = this.header.comments.find(function (c) { return c.includes('background_color'); });
        if (bgComment) {
            var value = bgComment.split('=').pop();
            if (value) {
                var parts = value.split(',').map(function (v) { return parseFloat(v.trim()); });
                if (parts.length === 3) {
                    return [parts[0], parts[1], parts[2]];
                }
            }
        }
        return undefined;
    };
    PlyReader.prototype.read = function () {
        var gaussians = [];
        var shCoefs = [];
        var littleEndian = this.header.format === 'binary_little_endian';
        if (this.header.format === 'ascii') {
            throw new Error('ASCII PLY format not supported');
        }
        for (var i = 0; i < this.numPoints; i++) {
            var _a = this.readLine(this.shDeg, littleEndian), gaussian = _a[0], sh = _a[1];
            gaussians.push(gaussian);
            shCoefs.push(sh);
        }
        return mod_js_1.GenericGaussianPointCloud.fromGaussians(gaussians, shCoefs, this.shDeg, {
            kernelSize: this.kernelSize,
            mipSplatting: this.mipSplatting,
            backgroundColor: this.backgroundColor
        });
    };
    PlyReader.magicBytes = function () {
        return new TextEncoder().encode('ply');
    };
    PlyReader.fileEnding = function () {
        return 'ply';
    };
    return PlyReader;
}());
exports.PlyReader = PlyReader;
