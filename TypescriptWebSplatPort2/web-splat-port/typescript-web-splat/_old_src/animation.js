"use strict";
/**
 * TypeScript port of animation.rs
 * Animation system with interpolation and spline support
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Animation = exports.PerspectiveProjectionInterpolate = exports.PerspectiveCameraInterpolate = exports.TrackingShot = exports.Spline = exports.Transition = exports.InterpolationType = void 0;
var gl_matrix_1 = require("gl-matrix");
var camera_js_1 = require("./camera.js");
/**
 * Interpolation types
 */
var InterpolationType;
(function (InterpolationType) {
    InterpolationType[InterpolationType["Step"] = 0] = "Step";
    InterpolationType[InterpolationType["Linear"] = 1] = "Linear";
    InterpolationType[InterpolationType["Cosine"] = 2] = "Cosine";
    InterpolationType[InterpolationType["CatmullRom"] = 3] = "CatmullRom";
    InterpolationType[InterpolationType["CubicBezier"] = 4] = "CubicBezier";
})(InterpolationType || (exports.InterpolationType = InterpolationType = {}));
/**
 * Simple transition between two values
 */
var Transition = /** @class */ (function () {
    function Transition(from, to, interpFn) {
        this.from = from;
        this.to = to;
        this.interpFn = interpFn;
    }
    Transition.prototype.sample = function (v) {
        return this.from.lerp(this.to, this.interpFn(v));
    };
    return Transition;
}());
exports.Transition = Transition;
/**
 * Simple spline implementation for camera tracking shots
 */
var Spline = /** @class */ (function () {
    function Spline(keys) {
        this.keys = keys.sort(function (a, b) { return a.t - b.t; });
    }
    Spline.fromCameras = function (cameras) {
        var keys = [];
        // Add padding cameras for smooth interpolation
        var lastTwo = cameras.slice(-2);
        var firstTwo = cameras.slice(0, 2);
        var allCameras = __spreadArray(__spreadArray(__spreadArray([], lastTwo, true), cameras, true), firstTwo, true);
        allCameras.forEach(function (camera, i) {
            var t = (i - 1) / cameras.length;
            keys.push({
                t: t,
                value: camera,
                interpolation: InterpolationType.CatmullRom
            });
        });
        return new Spline(keys);
    };
    Spline.prototype.sample = function (t) {
        if (this.keys.length === 0)
            return null;
        if (this.keys.length === 1)
            return this.keys[0].value;
        // Clamp t to valid range
        t = Math.max(0, Math.min(1, t));
        // Find surrounding keys
        var i = 0;
        while (i < this.keys.length - 1 && this.keys[i + 1].t <= t) {
            i++;
        }
        if (i === this.keys.length - 1) {
            return this.keys[i].value;
        }
        var key1 = this.keys[i];
        var key2 = this.keys[i + 1];
        var localT = (t - key1.t) / (key2.t - key1.t);
        // Simple linear interpolation for now
        // In a full implementation, you'd handle different interpolation types
        if (key1.value instanceof camera_js_1.PerspectiveCamera && key2.value instanceof camera_js_1.PerspectiveCamera) {
            return key1.value.lerp(key2.value, localT);
        }
        return key1.value;
    };
    Object.defineProperty(Spline.prototype, "length", {
        get: function () {
            return this.keys.length;
        },
        enumerable: false,
        configurable: true
    });
    return Spline;
}());
exports.Spline = Spline;
/**
 * Camera tracking shot using splines
 */
var TrackingShot = /** @class */ (function () {
    function TrackingShot(cameras) {
        this.spline = Spline.fromCameras(cameras);
    }
    TrackingShot.fromCameras = function (cameras) {
        return new TrackingShot(cameras);
    };
    TrackingShot.prototype.sample = function (v) {
        var result = this.spline.sample(v);
        if (!result) {
            throw new Error("Spline sample failed at ".concat(v));
        }
        return result;
    };
    TrackingShot.prototype.numControlPoints = function () {
        return this.spline.length;
    };
    return TrackingShot;
}());
exports.TrackingShot = TrackingShot;
/**
 * PerspectiveCamera interpolation implementation
 */
var PerspectiveCameraInterpolate = /** @class */ (function () {
    function PerspectiveCameraInterpolate() {
    }
    PerspectiveCameraInterpolate.prototype.step = function (t, threshold, a, b) {
        return t < threshold ? a : b;
    };
    PerspectiveCameraInterpolate.prototype.lerp = function (t, a, b) {
        return a.lerp(b, t);
    };
    PerspectiveCameraInterpolate.prototype.cosine = function (t, a, b) {
        throw new Error('Cosine interpolation not implemented');
    };
    PerspectiveCameraInterpolate.prototype.cubicHermite = function (t, x, a, b, y) {
        // Unroll quaternion rotations for shortest path
        var rotations = [x[1].rotation, a[1].rotation, b[1].rotation, y[1].rotation];
        var unrolledRotations = this.unrollQuaternions(rotations);
        // Interpolate position
        var positions = [
            [x[1].position.x, x[1].position.y, x[1].position.z],
            [a[1].position.x, a[1].position.y, a[1].position.z],
            [b[1].position.x, b[1].position.y, b[1].position.z],
            [y[1].position.x, y[1].position.y, y[1].position.z]
        ];
        var newPosition = this.cubicHermiteVec3(t, [x[0], positions[0]], [a[0], positions[1]], [b[0], positions[2]], [y[0], positions[3]]);
        // Interpolate rotation
        var newRotation = this.cubicHermiteQuat(t, [x[0], unrolledRotations[0]], [a[0], unrolledRotations[1]], [b[0], unrolledRotations[2]], [y[0], unrolledRotations[3]]);
        gl_matrix_1.quat.normalize(newRotation, newRotation);
        // Interpolate projection
        var newProjection = new PerspectiveProjectionInterpolate().cubicHermite(t, [x[0], x[1].projection], [a[0], a[1].projection], [b[0], b[1].projection], [y[0], y[1].projection]);
        return new camera_js_1.PerspectiveCamera({ x: newPosition[0], y: newPosition[1], z: newPosition[2] }, newRotation, newProjection);
    };
    PerspectiveCameraInterpolate.prototype.quadraticBezier = function (t, a, u, b) {
        throw new Error('Quadratic Bezier interpolation not implemented');
    };
    PerspectiveCameraInterpolate.prototype.cubicBezier = function (t, a, u, v, b) {
        throw new Error('Cubic Bezier interpolation not implemented');
    };
    PerspectiveCameraInterpolate.prototype.cubicBezierMirrored = function (t, a, u, v, b) {
        throw new Error('Cubic Bezier mirrored interpolation not implemented');
    };
    PerspectiveCameraInterpolate.prototype.unrollQuaternions = function (rotations) {
        var result = rotations.map(function (q) { return gl_matrix_1.quat.clone(q); });
        if (result[0][3] < 0) { // w component
            gl_matrix_1.quat.scale(result[0], result[0], -1);
        }
        for (var i = 1; i < 4; i++) {
            if (gl_matrix_1.quat.dot(result[i], result[i - 1]) < 0) {
                gl_matrix_1.quat.scale(result[i], result[i], -1);
            }
        }
        return result;
    };
    PerspectiveCameraInterpolate.prototype.cubicHermiteVec3 = function (t, x, a, b, y) {
        // Simplified cubic hermite interpolation for vec3
        var t2 = t * t;
        var t3 = t2 * t;
        var h1 = 2 * t3 - 3 * t2 + 1;
        var h2 = -2 * t3 + 3 * t2;
        var h3 = t3 - 2 * t2 + t;
        var h4 = t3 - t2;
        return [
            h1 * a[1][0] + h2 * b[1][0] + h3 * (b[1][0] - x[1][0]) + h4 * (y[1][0] - a[1][0]),
            h1 * a[1][1] + h2 * b[1][1] + h3 * (b[1][1] - x[1][1]) + h4 * (y[1][1] - a[1][1]),
            h1 * a[1][2] + h2 * b[1][2] + h3 * (b[1][2] - x[1][2]) + h4 * (y[1][2] - a[1][2])
        ];
    };
    PerspectiveCameraInterpolate.prototype.cubicHermiteQuat = function (t, x, a, b, y) {
        // Simplified quaternion interpolation - use slerp between a and b
        var result = gl_matrix_1.quat.create();
        gl_matrix_1.quat.slerp(result, a[1], b[1], t);
        return result;
    };
    return PerspectiveCameraInterpolate;
}());
exports.PerspectiveCameraInterpolate = PerspectiveCameraInterpolate;
/**
 * PerspectiveProjection interpolation implementation
 */
var PerspectiveProjectionInterpolate = /** @class */ (function () {
    function PerspectiveProjectionInterpolate() {
    }
    PerspectiveProjectionInterpolate.prototype.step = function (t, threshold, a, b) {
        return t < threshold ? a : b;
    };
    PerspectiveProjectionInterpolate.prototype.lerp = function (t, a, b) {
        return a.lerp(b, t);
    };
    PerspectiveProjectionInterpolate.prototype.cosine = function (t, a, b) {
        throw new Error('Cosine interpolation not implemented');
    };
    PerspectiveProjectionInterpolate.prototype.cubicHermite = function (t, x, a, b, y) {
        var cubicHermiteFloat = function (t, x, a, b, y) {
            var t2 = t * t;
            var t3 = t2 * t;
            var h1 = 2 * t3 - 3 * t2 + 1;
            var h2 = -2 * t3 + 3 * t2;
            var h3 = t3 - 2 * t2 + t;
            var h4 = t3 - t2;
            return h1 * a + h2 * b + h3 * (b - x) + h4 * (y - a);
        };
        return new camera_js_1.PerspectiveProjection(cubicHermiteFloat(t, x[1].fovx, a[1].fovx, b[1].fovx, y[1].fovx), cubicHermiteFloat(t, x[1].fovy, a[1].fovy, b[1].fovy, y[1].fovy), cubicHermiteFloat(t, x[1].znear, a[1].znear, b[1].znear, y[1].znear), cubicHermiteFloat(t, x[1].zfar, a[1].zfar, b[1].zfar, y[1].zfar), cubicHermiteFloat(t, x[1].fov2viewRatio, a[1].fov2viewRatio, b[1].fov2viewRatio, y[1].fov2viewRatio));
    };
    PerspectiveProjectionInterpolate.prototype.quadraticBezier = function (t, a, u, b) {
        throw new Error('Quadratic Bezier interpolation not implemented');
    };
    PerspectiveProjectionInterpolate.prototype.cubicBezier = function (t, a, u, v, b) {
        throw new Error('Cubic Bezier interpolation not implemented');
    };
    PerspectiveProjectionInterpolate.prototype.cubicBezierMirrored = function (t, a, u, v, b) {
        throw new Error('Cubic Bezier mirrored interpolation not implemented');
    };
    return PerspectiveProjectionInterpolate;
}());
exports.PerspectiveProjectionInterpolate = PerspectiveProjectionInterpolate;
/**
 * Generic animation class
 */
var Animation = /** @class */ (function () {
    function Animation(duration, looping, sampler) {
        this.duration = duration;
        this.timeLeft = duration;
        this.looping = looping;
        this.sampler = sampler;
    }
    Animation.prototype.done = function () {
        if (this.looping) {
            return false;
        }
        return this.timeLeft <= 0;
    };
    Animation.prototype.update = function (dt) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            if (this.looping) {
                this.timeLeft = this.duration + this.timeLeft;
            }
            else {
                this.timeLeft = 0;
            }
        }
        return this.sampler.sample(this.progress());
    };
    Animation.prototype.progress = function () {
        return 1 - this.timeLeft / this.duration;
    };
    Animation.prototype.setProgress = function (v) {
        this.timeLeft = this.duration * (1 - v);
    };
    Animation.prototype.getDuration = function () {
        return this.duration;
    };
    Animation.prototype.setDuration = function (duration) {
        var progress = this.progress();
        this.duration = duration;
        this.setProgress(progress);
    };
    return Animation;
}());
exports.Animation = Animation;
