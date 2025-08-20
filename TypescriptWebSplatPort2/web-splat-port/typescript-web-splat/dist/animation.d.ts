import { quat } from 'gl-matrix';
import { PerspectiveCamera } from './camera.js';
/** 1:1 with the Rust trait */
export interface Lerp<T = any> {
    lerp(other: T, amount: number): T;
}
/** 1:1 with the Rust trait */
export interface Sampler<T> {
    sample(v: number): T;
}
/** 1:1 with the Rust struct */
export declare class Transition<T extends Lerp<T>> implements Sampler<T> {
    private from;
    private to;
    private interp_fn;
    constructor(from: T, to: T, interp_fn: (x: number) => number);
    static new<T extends Lerp<T>>(from: T, to: T, interp_fn: (x: number) => number): Transition<T>;
    sample(v: number): T;
}
/** 1:1 with the Rust struct; Catmull–Rom spline over PerspectiveCamera */
export declare class TrackingShot implements Sampler<PerspectiveCamera> {
    private keys;
    private constructor();
    /** Rust: TrackingShot::from_cameras */
    static from_cameras(cameras: PerspectiveCamera[]): TrackingShot;
    /** Rust: num_control_points() */
    num_control_points(): number;
    /** Rust: impl Sampler for TrackingShot { fn sample(&self, v: f32) -> PerspectiveCamera } */
    sample(v: number): PerspectiveCamera;
    private segment_count;
}
/** 1:1 with the Rust struct (seconds, like Duration::as_secs_f32) */
export declare class Animation<T> {
    private duration_s;
    private time_left_s;
    private looping;
    private sampler;
    constructor(duration: number, looping: boolean, sampler: Sampler<T>);
    static new<T>(duration: number, looping: boolean, sampler: Sampler<T>): Animation<T>;
    done(): boolean;
    /** dt is in seconds */
    update(dt: number): T;
    progress(): number;
    set_progress(v: number): void;
    duration(): number;
    set_duration(duration: number): void;
}
/** Unroll quaternion sequence to ensure shortest path (sign flip if dot < 0). */
export declare function unroll(rot: [quat, quat, quat, quat]): [quat, quat, quat, quat];
//# sourceMappingURL=animation.d.ts.map