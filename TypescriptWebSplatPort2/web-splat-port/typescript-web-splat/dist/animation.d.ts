/**
 * TypeScript port of animation.rs
 * Animation system with interpolation and spline support
 */
import { PerspectiveCamera, PerspectiveProjection } from './camera.js';
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
export declare enum InterpolationType {
    Step = 0,
    Linear = 1,
    Cosine = 2,
    CatmullRom = 3,
    CubicBezier = 4
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
export declare class Transition<T extends Lerp<T>> implements Sampler<T> {
    private from;
    private to;
    private interpFn;
    constructor(from: T, to: T, interpFn: (t: number) => number);
    sample(v: number): T;
}
/**
 * Simple spline implementation for camera tracking shots
 */
export declare class Spline<T> {
    private keys;
    constructor(keys: Key<T>[]);
    static fromCameras(cameras: PerspectiveCamera[]): Spline<PerspectiveCamera>;
    sample(t: number): T | null;
    get length(): number;
}
/**
 * Camera tracking shot using splines
 */
export declare class TrackingShot implements Sampler<PerspectiveCamera> {
    private spline;
    constructor(cameras: PerspectiveCamera[]);
    static fromCameras(cameras: PerspectiveCamera[]): TrackingShot;
    sample(v: number): PerspectiveCamera;
    numControlPoints(): number;
}
/**
 * PerspectiveCamera interpolation implementation
 */
export declare class PerspectiveCameraInterpolate implements Interpolate<PerspectiveCamera> {
    step(t: number, threshold: number, a: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera;
    lerp(t: number, a: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera;
    cosine(t: number, a: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera;
    cubicHermite(t: number, x: [number, PerspectiveCamera], a: [number, PerspectiveCamera], b: [number, PerspectiveCamera], y: [number, PerspectiveCamera]): PerspectiveCamera;
    quadraticBezier(t: number, a: PerspectiveCamera, u: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera;
    cubicBezier(t: number, a: PerspectiveCamera, u: PerspectiveCamera, v: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera;
    cubicBezierMirrored(t: number, a: PerspectiveCamera, u: PerspectiveCamera, v: PerspectiveCamera, b: PerspectiveCamera): PerspectiveCamera;
    private unrollQuaternions;
    private cubicHermiteVec3;
    private cubicHermiteQuat;
}
/**
 * PerspectiveProjection interpolation implementation
 */
export declare class PerspectiveProjectionInterpolate implements Interpolate<PerspectiveProjection> {
    step(t: number, threshold: number, a: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection;
    lerp(t: number, a: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection;
    cosine(t: number, a: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection;
    cubicHermite(t: number, x: [number, PerspectiveProjection], a: [number, PerspectiveProjection], b: [number, PerspectiveProjection], y: [number, PerspectiveProjection]): PerspectiveProjection;
    quadraticBezier(t: number, a: PerspectiveProjection, u: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection;
    cubicBezier(t: number, a: PerspectiveProjection, u: PerspectiveProjection, v: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection;
    cubicBezierMirrored(t: number, a: PerspectiveProjection, u: PerspectiveProjection, v: PerspectiveProjection, b: PerspectiveProjection): PerspectiveProjection;
}
/**
 * Generic animation class
 */
export declare class Animation<T> {
    private duration;
    private timeLeft;
    private looping;
    private sampler;
    constructor(duration: number, looping: boolean, sampler: Sampler<T>);
    done(): boolean;
    update(dt: number): T;
    progress(): number;
    setProgress(v: number): void;
    getDuration(): number;
    setDuration(duration: number): void;
}
//# sourceMappingURL=animation.d.ts.map