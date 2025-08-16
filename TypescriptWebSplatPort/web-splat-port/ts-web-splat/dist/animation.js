import { vec3, quat } from "gl-matrix";
import { PerspectiveCamera, PerspectiveProjection } from "./camera.js";
export class Transition {
    from;
    to;
    interpFn;
    constructor(from, to, interpFn) {
        this.from = from;
        this.to = to;
        this.interpFn = interpFn;
    }
    static new(from, to, interpFn) {
        return new Transition(from, to, interpFn);
    }
    sample(t) {
        const interpolated = this.interpFn(t);
        return this.from.lerp(this.to, interpolated);
    }
}
export class Animation {
    transition;
    duration; // in milliseconds
    startTime;
    constructor(transition, duration) {
        this.transition = transition;
        this.duration = duration;
    }
    static new(transition, duration) {
        return new Animation(transition, duration);
    }
    start() {
        this.startTime = performance.now();
    }
    sample(currentTime) {
        if (this.startTime === undefined) {
            throw new Error("Animation not started");
        }
        const elapsed = (currentTime || performance.now()) - this.startTime;
        const t = Math.min(elapsed / this.duration, 1.0);
        return this.transition.sample(t);
    }
    isFinished(currentTime) {
        if (this.startTime === undefined)
            return false;
        const elapsed = (currentTime || performance.now()) - this.startTime;
        return elapsed >= this.duration;
    }
}
// Implement Lerp for vec3
export class LerpVec3 {
    value;
    constructor(value) {
        this.value = value;
    }
    lerp(other, amount) {
        const result = vec3.create();
        vec3.lerp(result, this.value, other.value, amount);
        return new LerpVec3(result);
    }
}
// Implement Lerp for quat
export class LerpQuat {
    value;
    constructor(value) {
        this.value = value;
    }
    lerp(other, amount) {
        const result = quat.create();
        quat.slerp(result, this.value, other.value, amount);
        return new LerpQuat(result);
    }
}
// Implement Lerp for numbers
export class LerpNumber {
    value;
    constructor(value) {
        this.value = value;
    }
    lerp(other, amount) {
        return new LerpNumber(this.value + (other.value - this.value) * amount);
    }
}
// Camera-specific lerp implementation
export class LerpCamera {
    camera;
    constructor(camera) {
        this.camera = camera;
    }
    lerp(other, amount) {
        // Lerp position
        const position = vec3.create();
        const pos1 = this.camera.position();
        const pos2 = other.camera.position();
        vec3.lerp(position, pos1, pos2, amount);
        // Slerp rotation (using transform matrices to extract rotation)
        const view1 = this.camera.view_matrix();
        const view2 = other.camera.view_matrix();
        // For simplicity, just copy the first camera's rotation
        // In a full implementation, you'd extract quaternions from view matrices
        const rotation = quat.create();
        quat.identity(rotation);
        // Lerp projection parameters
        const fovy = this.camera.projection.fovy + (other.camera.projection.fovy - this.camera.projection.fovy) * amount;
        const znear = this.camera.projection.znear + (other.camera.projection.znear - this.camera.projection.znear) * amount;
        const zfar = this.camera.projection.zfar + (other.camera.projection.zfar - this.camera.projection.zfar) * amount;
        const fovx = this.camera.projection.fovx + (other.camera.projection.fovx - other.camera.projection.fovx) * amount;
        const fov2view = this.camera.projection.fov2view_ratio + (other.camera.projection.fov2view_ratio - this.camera.projection.fov2view_ratio) * amount;
        const newCamera = new PerspectiveCamera([position[0], position[1], position[2]], [rotation[0], rotation[1], rotation[2], rotation[3]], new PerspectiveProjection(fovx, fovy, znear, zfar, fov2view));
        return new LerpCamera(newCamera);
    }
}
// Common interpolation functions
export const Interpolation = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => {
        if (t < 0.5) {
            return 2 * t * t;
        }
        else {
            return 1 - 2 * (1 - t) * (1 - t);
        }
    },
    smoothstep: (t) => {
        return t * t * (3 - 2 * t);
    },
    smootherstep: (t) => {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
};
// Spline-based animation support
export class SplineKey {
    t;
    value;
    interpolation;
    constructor(t, value, interpolation = Interpolation.linear) {
        this.t = t;
        this.value = value;
        this.interpolation = interpolation;
    }
}
export class Spline {
    keys;
    constructor(keys) {
        this.keys = keys.sort((a, b) => a.t - b.t);
    }
    sample(t) {
        if (this.keys.length === 0) {
            throw new Error("Spline has no keys");
        }
        if (this.keys.length === 1 || t <= this.keys[0].t) {
            return this.keys[0].value;
        }
        if (t >= this.keys[this.keys.length - 1].t) {
            return this.keys[this.keys.length - 1].value;
        }
        // Find the two keys to interpolate between
        let i = 0;
        while (i < this.keys.length - 1 && this.keys[i + 1].t <= t) {
            i++;
        }
        const key0 = this.keys[i];
        const key1 = this.keys[i + 1];
        const localT = (t - key0.t) / (key1.t - key0.t);
        const interpolatedT = key0.interpolation(localT);
        return key0.value.lerp(key1.value, interpolatedT);
    }
}
// Animation sequence for chaining multiple animations
export class AnimationSequence {
    animations;
    currentIndex = 0;
    startTime;
    constructor(animations) {
        this.animations = animations;
    }
    start() {
        this.startTime = performance.now();
        this.currentIndex = 0;
        if (this.animations.length > 0) {
            this.animations[0].start();
        }
    }
    sample(currentTime) {
        if (this.startTime === undefined || this.animations.length === 0) {
            throw new Error("Animation sequence not started or empty");
        }
        const time = currentTime || performance.now();
        // Check if current animation is finished
        while (this.currentIndex < this.animations.length &&
            this.animations[this.currentIndex].isFinished(time)) {
            this.currentIndex++;
            if (this.currentIndex < this.animations.length) {
                this.animations[this.currentIndex].start();
            }
        }
        if (this.currentIndex >= this.animations.length) {
            // Return the last frame of the last animation
            return this.animations[this.animations.length - 1].sample(time);
        }
        return this.animations[this.currentIndex].sample(time);
    }
    isFinished(currentTime) {
        if (this.startTime === undefined)
            return false;
        return this.currentIndex >= this.animations.length;
    }
}
