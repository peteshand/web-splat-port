import { vec3 } from 'gl-matrix';
import { PerspectiveCamera } from './camera.js';
/** Minimal KeyCode union to mirror the Rust winit::keyboard::KeyCode variants used */
export type KeyCode = 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD' | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'KeyQ' | 'KeyE' | 'Space' | 'ShiftLeft';
export declare class CameraController {
    center: vec3;
    up: vec3 | null;
    private amount;
    private shift;
    private rotation;
    private scroll;
    speed: number;
    sensitivity: number;
    left_mouse_pressed: boolean;
    right_mouse_pressed: boolean;
    alt_pressed: boolean;
    user_inptut: boolean;
    constructor(speed: number, sensitivity: number);
    /** Returns true if the key was handled (matches Rust’s bool). */
    process_keyboard(key: KeyCode, pressed: boolean): boolean;
    /** mouse_dx/mouse_dy in pixels (same semantics as Rust). */
    process_mouse(mouse_dx: number, mouse_dy: number): void;
    process_scroll(dy: number): void;
    /** Align controller to the camera’s current line of sight and adjust up. */
    reset_to_camera(camera: PerspectiveCamera): void;
    /**
     * Update camera given dt in seconds (1:1 with Duration semantics).
     * Mutates camera position/rotation.
     */
    update_camera(camera: PerspectiveCamera, dt_seconds: number): void;
}
//# sourceMappingURL=controller.d.ts.map