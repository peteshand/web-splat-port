/**
 * TypeScript port of controller.rs
 * Camera controller for user input handling
 */
import { PerspectiveCamera, Point3f32, Vector3f32 } from './camera.js';
/**
 * Camera controller for handling user input
 */
export declare class CameraController {
    center: Point3f32;
    up: Vector3f32 | null;
    private amount;
    private shift;
    private rotation;
    private scroll;
    speed: number;
    sensitivity: number;
    leftMousePressed: boolean;
    rightMousePressed: boolean;
    altPressed: boolean;
    userInput: boolean;
    constructor(speed: number, sensitivity: number);
    processKeyboard(key: string, pressed: boolean): boolean;
    processMouse(mouseDx: number, mouseDy: number): void;
    processScroll(dy: number): void;
    /**
     * Moves the controller center to the closest point on a line defined by the camera position and rotation
     * Adjusts the controller up vector by projecting the current up vector onto the plane defined by the camera right vector
     */
    resetToCamera(camera: PerspectiveCamera): void;
    updateCamera(camera: PerspectiveCamera, dt: number): void;
}
//# sourceMappingURL=controller.d.ts.map