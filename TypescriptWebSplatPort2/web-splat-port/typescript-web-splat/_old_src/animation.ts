/**
 * TypeScript port of animation.rs
 * Animation system with interpolation and spline support
 */

import { quat, vec3 } from 'gl-matrix';
import { PerspectiveCamera, PerspectiveProjection, Point3f32 } from './camera.js';

/**
 * Lerp trait for interpolatable types
 */
export interface Lerp<T> {
    lerp(other: T, amount: number): T;
}

/**
 * Sampler trait for animation sampling
 */
export interface Sampler<T> {
    sample(v: number): T;
}

/**
 * Interpolation key for splines
 */
export interface Key<T> {
    t: number;
    value: T;
    interpolation: InterpolationType;
}

/**
 * Interpolation types
 */
export enum InterpolationType {
    Step,
    Linear,
    Cosine,
    CatmullRom,
    CubicBezier
}

/**
 * Interpolation functions interface
 */
export interface Interpolate<T> {
    step(t: number, threshold: number, a: T, b: T): T;
    lerp(t: number, a: T, b: T): T;
    cosine(t: number, a: T, b: T): T;
    cubicHermite(t: number, x: [number, T], a: [number, T], b: [number, T], y: [number, T]): T;
    quadraticBezier(t: number, a: T, u: T, b: T): T;
    cubicBezier(t: number, a: T, u: T, v: T, b: T): T;
    cubicBezierMirrored(t: number, a: T, u: T, v: T, b: T): T;
}

/**
 * Simple transition between two values
 */
export class Transition<T extends Lerp<T>> implements Sampler<T> {
    private from: T;
    private to: T;
    private interpFn: (t: number) => number;

    constructor(from: T, to: T, interpFn: (t: number) => number) {
        this.from = from;
        this.to = to;
        this.interpFn = interpFn;
    }

    sample(v: number): T {
        return this.from.lerp(this.to, this.interpFn(v));
    }
}

/**
 * Simple spline implementation for camera tracking shots
 */
export class Spline<T> {
    private keys: Key<T>[];

    constructor(keys: Key<T>[]) {
        this.keys = keys.sort((a, b) => a.t - b.t);
    }

    static fromCameras(cameras: PerspectiveCamera[]): Spline<PerspectiveCamera> {
        const keys: Key<PerspectiveCamera>[] = [];
        
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

    sample(t: number): T | null {
        if (this.keys.length === 0) return null;
        if (this.keys.length === 1) return this.keys[0].value;

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
            return key1.value.lerp(key2.value, localT) as T;
        }

        return key1.value;
    }

    get length(): number {
        return this.keys.length;
    }
}

/**
 * Camera tracking shot using splines
 */
export class TrackingShot implements Sampler<PerspectiveCamera> {
    private spline: Spline<PerspectiveCamera>;

    constructor(cameras: PerspectiveCamera[]) {
        this.spline = Spline.fromCameras(cameras);
    }

    static fromCameras(cameras: PerspectiveCamera[]): TrackingShot {
        return new TrackingShot(cameras);
    }

    sample(v: number): PerspectiveCamera {
        const result = this.spline.sample(v);
        if (!result) {
            throw new Error(`Spline sample failed at ${v}`);
        }
        return result;
    }

    numControlPoints(): number {
        return this.spline.length;
    }
}

/**
 * PerspectiveCamera interpolation implementation
 */
export class PerspectiveCameraInterpolate implements Interpolate<PerspectiveCamera> {
    step(t: number, threshold: number, a: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera {
        return t < threshold ? a : b;
    }

    lerp(t: number, a: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera {
        return a.lerp(b, t);
    }

    cosine(t: number, a: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera {
        throw new Error('Cosine interpolation not implemented');
    }

    cubicHermite(
        t: number,
        x: [number, PerspectiveCamera],
        a: [number, PerspectiveCamera],
        b: [number, PerspectiveCamera],
        y: [number, PerspectiveCamera]
    ): PerspectiveCamera {
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
        const newPosition = this.cubicHermiteVec3(t, 
            [x[0], positions[0] as [number, number, number]], 
            [a[0], positions[1] as [number, number, number]], 
            [b[0], positions[2] as [number, number, number]], 
            [y[0], positions[3] as [number, number, number]]
        );

        // Interpolate rotation
        const newRotation = this.cubicHermiteQuat(t,
            [x[0], unrolledRotations[0]],
            [a[0], unrolledRotations[1]],
            [b[0], unrolledRotations[2]],
            [y[0], unrolledRotations[3]]
        );
        quat.normalize(newRotation, newRotation);

        // Interpolate projection
        const newProjection = new PerspectiveProjectionInterpolate().cubicHermite(t,
            [x[0], x[1].projection],
            [a[0], a[1].projection],
            [b[0], b[1].projection],
            [y[0], y[1].projection]
        );

        return new PerspectiveCamera(
            { x: newPosition[0], y: newPosition[1], z: newPosition[2] },
            newRotation,
            newProjection
        );
    }

    quadraticBezier(t: number, a: PerspectiveCamera, u: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera {
        throw new Error('Quadratic Bezier interpolation not implemented');
    }

    cubicBezier(t: number, a: PerspectiveCamera, u: PerspectiveCamera, v: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera {
        throw new Error('Cubic Bezier interpolation not implemented');
    }

    cubicBezierMirrored(t: number, a: PerspectiveCamera, u: PerspectiveCamera, v: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera {
        throw new Error('Cubic Bezier mirrored interpolation not implemented');
    }

    private unrollQuaternions(rotations: quat[]): quat[] {
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

    private cubicHermiteVec3(
        t: number,
        x: [number, [number, number, number]],
        a: [number, [number, number, number]],
        b: [number, [number, number, number]],
        y: [number, [number, number, number]]
    ): [number, number, number] {
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

    private cubicHermiteQuat(
        t: number,
        x: [number, quat],
        a: [number, quat],
        b: [number, quat],
        y: [number, quat]
    ): quat {
        // Simplified quaternion interpolation - use slerp between a and b
        const result = quat.create();
        quat.slerp(result, a[1], b[1], t);
        return result;
    }
}

/**
 * PerspectiveProjection interpolation implementation
 */
export class PerspectiveProjectionInterpolate implements Interpolate<PerspectiveProjection> {
    step(t: number, threshold: number, a: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection {
        return t < threshold ? a : b;
    }

    lerp(t: number, a: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection {
        return a.lerp(b, t);
    }

    cosine(t: number, a: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection {
        throw new Error('Cosine interpolation not implemented');
    }

    cubicHermite(
        t: number,
        x: [number, PerspectiveProjection],
        a: [number, PerspectiveProjection],
        b: [number, PerspectiveProjection],
        y: [number, PerspectiveProjection]
    ): PerspectiveProjection {
        const cubicHermiteFloat = (t: number, x: number, a: number, b: number, y: number): number => {
            const t2 = t * t;
            const t3 = t2 * t;
            const h1 = 2 * t3 - 3 * t2 + 1;
            const h2 = -2 * t3 + 3 * t2;
            const h3 = t3 - 2 * t2 + t;
            const h4 = t3 - t2;
            return h1 * a + h2 * b + h3 * (b - x) + h4 * (y - a);
        };

        return new PerspectiveProjection(
            cubicHermiteFloat(t, x[1].fovx, a[1].fovx, b[1].fovx, y[1].fovx),
            cubicHermiteFloat(t, x[1].fovy, a[1].fovy, b[1].fovy, y[1].fovy),
            cubicHermiteFloat(t, x[1].znear, a[1].znear, b[1].znear, y[1].znear),
            cubicHermiteFloat(t, x[1].zfar, a[1].zfar, b[1].zfar, y[1].zfar),
            cubicHermiteFloat(t, x[1].fov2viewRatio, a[1].fov2viewRatio, b[1].fov2viewRatio, y[1].fov2viewRatio)
        );
    }

    quadraticBezier(t: number, a: PerspectiveProjection, u: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection {
        throw new Error('Quadratic Bezier interpolation not implemented');
    }

    cubicBezier(t: number, a: PerspectiveProjection, u: PerspectiveProjection, v: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection {
        throw new Error('Cubic Bezier interpolation not implemented');
    }

    cubicBezierMirrored(t: number, a: PerspectiveProjection, u: PerspectiveProjection, v: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection {
        throw new Error('Cubic Bezier mirrored interpolation not implemented');
    }
}

/**
 * Generic animation class
 */
export class Animation<T> {
    private duration: number; // Duration in milliseconds
    private timeLeft: number;
    private looping: boolean;
    private sampler: Sampler<T>;

    constructor(duration: number, looping: boolean, sampler: Sampler<T>) {
        this.duration = duration;
        this.timeLeft = duration;
        this.looping = looping;
        this.sampler = sampler;
    }

    done(): boolean {
        if (this.looping) {
            return false;
        }
        return this.timeLeft <= 0;
    }

    update(dt: number): T {
        this.timeLeft -= dt;
        
        if (this.timeLeft <= 0) {
            if (this.looping) {
                this.timeLeft = this.duration + this.timeLeft;
            } else {
                this.timeLeft = 0;
            }
        }
        
        return this.sampler.sample(this.progress());
    }

    progress(): number {
        return 1 - this.timeLeft / this.duration;
    }

    setProgress(v: number): void {
        this.timeLeft = this.duration * (1 - v);
    }

    getDuration(): number {
        return this.duration;
    }

    setDuration(duration: number): void {
        const progress = this.progress();
        this.duration = duration;
        this.setProgress(progress);
    }
}
