/**
 * TypeScript port of animation.rs
 * Animation system with interpolation and spline support
 */
import { quat } from 'gl-matrix';
import { PerspectiveCamera, PerspectiveProjection } from './camera.js';
/**
 * Interpolation types
 */
export var InterpolationType;
(function (InterpolationType) {
    InterpolationType[InterpolationType["Step"] = 0] = "Step";
    InterpolationType[InterpolationType["Linear"] = 1] = "Linear";
    InterpolationType[InterpolationType["Cosine"] = 2] = "Cosine";
    InterpolationType[InterpolationType["CatmullRom"] = 3] = "CatmullRom";
    InterpolationType[InterpolationType["CubicBezier"] = 4] = "CubicBezier";
})(InterpolationType || (InterpolationType = {}));
/**
 * Simple transition between two values
 */
export class Transition {
    from;
    to;
    interpFn;
    constructor(from, to, interpFn) {
        this.from = from;
        this.to = to;
        this.interpFn = interpFn;
    }
    sample(v) {
        return this.from.lerp(this.to, this.interpFn(v));
    }
}
/**
 * Simple spline implementation for camera tracking shots
 */
export class Spline {
    keys;
    constructor(keys) {
        this.keys = keys.sort((a, b) => a.t - b.t);
    }
    static fromCameras(cameras) {
        const keys = [];
        // Add padding cameras for smooth interpolation
        const lastTwo = cameras.slice(-2);
        const firstTwo = cameras.slice(0, 2);
        const allCameras = [...lastTwo, ...cameras, ...firstTwo];
        allCameras.forEach((camera, i) => {
            const t = (i - 1) / cameras.length;
            keys.push({
                t,
                value: camera,
                interpolation: InterpolationType.CatmullRom
            });
        });
        return new Spline(keys);
    }
    sample(t) {
        if (this.keys.length === 0)
            return null;
        if (this.keys.length === 1)
            return this.keys[0].value;
        // Clamp t to valid range
        t = Math.max(0, Math.min(1, t));
        // Find surrounding keys
        let i = 0;
        while (i < this.keys.length - 1 && this.keys[i + 1].t <= t) {
            i++;
        }
        if (i === this.keys.length - 1) {
            return this.keys[i].value;
        }
        const key1 = this.keys[i];
        const key2 = this.keys[i + 1];
        const localT = (t - key1.t) / (key2.t - key1.t);
        // Simple linear interpolation for now
        // In a full implementation, you'd handle different interpolation types
        if (key1.value instanceof PerspectiveCamera && key2.value instanceof PerspectiveCamera) {
            return key1.value.lerp(key2.value, localT);
        }
        return key1.value;
    }
    get length() {
        return this.keys.length;
    }
}
/**
 * Camera tracking shot using splines
 */
export class TrackingShot {
    spline;
    constructor(cameras) {
        this.spline = Spline.fromCameras(cameras);
    }
    static fromCameras(cameras) {
        return new TrackingShot(cameras);
    }
    sample(v) {
        const result = this.spline.sample(v);
        if (!result) {
            throw new Error(`Spline sample failed at ${v}`);
        }
        return result;
    }
    numControlPoints() {
        return this.spline.length;
    }
}
/**
 * PerspectiveCamera interpolation implementation
 */
export class PerspectiveCameraInterpolate {
    step(t, threshold, a, b) {
        return t < threshold ? a : b;
    }
    lerp(t, a, b) {
        return a.lerp(b, t);
    }
    cosine(t, a, b) {
        throw new Error('Cosine interpolation not implemented');
    }
    cubicHermite(t, x, a, b, y) {
        // Unroll quaternion rotations for shortest path
        const rotations = [x[1].rotation, a[1].rotation, b[1].rotation, y[1].rotation];
        const unrolledRotations = this.unrollQuaternions(rotations);
        // Interpolate position
        const positions = [
            [x[1].position.x, x[1].position.y, x[1].position.z],
            [a[1].position.x, a[1].position.y, a[1].position.z],
            [b[1].position.x, b[1].position.y, b[1].position.z],
            [y[1].position.x, y[1].position.y, y[1].position.z]
        ];
        const newPosition = this.cubicHermiteVec3(t, [x[0], positions[0]], [a[0], positions[1]], [b[0], positions[2]], [y[0], positions[3]]);
        // Interpolate rotation
        const newRotation = this.cubicHermiteQuat(t, [x[0], unrolledRotations[0]], [a[0], unrolledRotations[1]], [b[0], unrolledRotations[2]], [y[0], unrolledRotations[3]]);
        quat.normalize(newRotation, newRotation);
        // Interpolate projection
        const newProjection = new PerspectiveProjectionInterpolate().cubicHermite(t, [x[0], x[1].projection], [a[0], a[1].projection], [b[0], b[1].projection], [y[0], y[1].projection]);
        return new PerspectiveCamera({ x: newPosition[0], y: newPosition[1], z: newPosition[2] }, newRotation, newProjection);
    }
    quadraticBezier(t, a, u, b) {
        throw new Error('Quadratic Bezier interpolation not implemented');
    }
    cubicBezier(t, a, u, v, b) {
        throw new Error('Cubic Bezier interpolation not implemented');
    }
    cubicBezierMirrored(t, a, u, v, b) {
        throw new Error('Cubic Bezier mirrored interpolation not implemented');
    }
    unrollQuaternions(rotations) {
        const result = rotations.map(q => quat.clone(q));
        if (result[0][3] < 0) { // w component
            quat.scale(result[0], result[0], -1);
        }
        for (let i = 1; i < 4; i++) {
            if (quat.dot(result[i], result[i - 1]) < 0) {
                quat.scale(result[i], result[i], -1);
            }
        }
        return result;
    }
    cubicHermiteVec3(t, x, a, b, y) {
        // Simplified cubic hermite interpolation for vec3
        const t2 = t * t;
        const t3 = t2 * t;
        const h1 = 2 * t3 - 3 * t2 + 1;
        const h2 = -2 * t3 + 3 * t2;
        const h3 = t3 - 2 * t2 + t;
        const h4 = t3 - t2;
        return [
            h1 * a[1][0] + h2 * b[1][0] + h3 * (b[1][0] - x[1][0]) + h4 * (y[1][0] - a[1][0]),
            h1 * a[1][1] + h2 * b[1][1] + h3 * (b[1][1] - x[1][1]) + h4 * (y[1][1] - a[1][1]),
            h1 * a[1][2] + h2 * b[1][2] + h3 * (b[1][2] - x[1][2]) + h4 * (y[1][2] - a[1][2])
        ];
    }
    cubicHermiteQuat(t, x, a, b, y) {
        // Simplified quaternion interpolation - use slerp between a and b
        const result = quat.create();
        quat.slerp(result, a[1], b[1], t);
        return result;
    }
}
/**
 * PerspectiveProjection interpolation implementation
 */
export class PerspectiveProjectionInterpolate {
    step(t, threshold, a, b) {
        return t < threshold ? a : b;
    }
    lerp(t, a, b) {
        return a.lerp(b, t);
    }
    cosine(t, a, b) {
        throw new Error('Cosine interpolation not implemented');
    }
    cubicHermite(t, x, a, b, y) {
        const cubicHermiteFloat = (t, x, a, b, y) => {
            const t2 = t * t;
            const t3 = t2 * t;
            const h1 = 2 * t3 - 3 * t2 + 1;
            const h2 = -2 * t3 + 3 * t2;
            const h3 = t3 - 2 * t2 + t;
            const h4 = t3 - t2;
            return h1 * a + h2 * b + h3 * (b - x) + h4 * (y - a);
        };
        return new PerspectiveProjection(cubicHermiteFloat(t, x[1].fovx, a[1].fovx, b[1].fovx, y[1].fovx), cubicHermiteFloat(t, x[1].fovy, a[1].fovy, b[1].fovy, y[1].fovy), cubicHermiteFloat(t, x[1].znear, a[1].znear, b[1].znear, y[1].znear), cubicHermiteFloat(t, x[1].zfar, a[1].zfar, b[1].zfar, y[1].zfar), cubicHermiteFloat(t, x[1].fov2viewRatio, a[1].fov2viewRatio, b[1].fov2viewRatio, y[1].fov2viewRatio));
    }
    quadraticBezier(t, a, u, b) {
        throw new Error('Quadratic Bezier interpolation not implemented');
    }
    cubicBezier(t, a, u, v, b) {
        throw new Error('Cubic Bezier interpolation not implemented');
    }
    cubicBezierMirrored(t, a, u, v, b) {
        throw new Error('Cubic Bezier mirrored interpolation not implemented');
    }
}
/**
 * Generic animation class
 */
export class Animation {
    duration; // Duration in milliseconds
    timeLeft;
    looping;
    sampler;
    constructor(duration, looping, sampler) {
        this.duration = duration;
        this.timeLeft = duration;
        this.looping = looping;
        this.sampler = sampler;
    }
    done() {
        if (this.looping) {
            return false;
        }
        return this.timeLeft <= 0;
    }
    update(dt) {
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
    }
    progress() {
        return 1 - this.timeLeft / this.duration;
    }
    setProgress(v) {
        this.timeLeft = this.duration * (1 - v);
    }
    getDuration() {
        return this.duration;
    }
    setDuration(duration) {
        const progress = this.progress();
        this.duration = duration;
        this.setProgress(progress);
    }
}
//# sourceMappingURL=animation.js.map