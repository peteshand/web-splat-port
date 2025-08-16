/**
 * TypeScript port of controller.rs
 * Camera controller for user input handling
 */
import { mat3, quat, vec2, vec3 } from 'gl-matrix';
/**
 * Camera controller for handling user input
 */
export class CameraController {
    center;
    up;
    amount;
    shift;
    rotation;
    scroll;
    speed;
    sensitivity;
    leftMousePressed;
    rightMousePressed;
    altPressed;
    userInput;
    constructor(speed, sensitivity) {
        this.center = { x: 0, y: 0, z: 0 };
        this.up = null;
        this.amount = { x: 0, y: 0, z: 0 };
        this.shift = { x: 0, y: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scroll = 0.0;
        this.speed = speed;
        this.sensitivity = sensitivity;
        this.leftMousePressed = false;
        this.rightMousePressed = false;
        this.altPressed = false;
        this.userInput = false;
    }
    processKeyboard(key, pressed) {
        const amount = pressed ? 1.0 : 0.0;
        let processed = false;
        switch (key) {
            case 'KeyW':
            case 'ArrowUp':
                this.amount.z += amount;
                processed = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.amount.z += -amount;
                processed = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.amount.x += -amount;
                processed = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.amount.x += amount;
                processed = true;
                break;
            case 'KeyQ':
                this.rotation.z += amount / this.sensitivity;
                processed = true;
                break;
            case 'KeyE':
                this.rotation.z += -amount / this.sensitivity;
                processed = true;
                break;
            case 'Space':
                this.amount.y += amount;
                processed = true;
                break;
            case 'ShiftLeft':
                this.amount.y += -amount;
                processed = true;
                break;
        }
        this.userInput = processed;
        return processed;
    }
    processMouse(mouseDx, mouseDy) {
        if (this.leftMousePressed) {
            this.rotation.x += mouseDx;
            this.rotation.y += mouseDy;
            this.userInput = true;
        }
        if (this.rightMousePressed) {
            this.shift.y += -mouseDx;
            this.shift.x += mouseDy;
            this.userInput = true;
        }
    }
    processScroll(dy) {
        this.scroll += -dy;
        this.userInput = true;
    }
    /**
     * Moves the controller center to the closest point on a line defined by the camera position and rotation
     * Adjusts the controller up vector by projecting the current up vector onto the plane defined by the camera right vector
     */
    resetToCamera(camera) {
        const invView = quat.create();
        quat.invert(invView, camera.rotation);
        const forward = vec3.create();
        vec3.transformQuat(forward, [0, 0, 1], invView);
        const right = vec3.create();
        vec3.transformQuat(right, [1, 0, 0], invView);
        // Move center point
        this.center = closestPoint(camera.position, { x: forward[0], y: forward[1], z: forward[2] }, this.center);
        // Adjust up vector by projecting it onto the plane defined by the right vector of the camera
        if (this.up) {
            const upVec = vec3.fromValues(this.up.x, this.up.y, this.up.z);
            const rightVec = vec3.fromValues(right[0], right[1], right[2]);
            // Project up onto right
            const projection = vec3.create();
            const dot = vec3.dot(upVec, rightVec);
            vec3.scale(projection, rightVec, dot);
            // Subtract projection from up
            const newUp = vec3.create();
            vec3.subtract(newUp, upVec, projection);
            vec3.normalize(newUp, newUp);
            this.up = { x: newUp[0], y: newUp[1], z: newUp[2] };
        }
    }
    updateCamera(camera, dt) {
        const dtSecs = dt / 1000; // Convert milliseconds to seconds
        let dir = vec3.fromValues(camera.position.x - this.center.x, camera.position.y - this.center.y, camera.position.z - this.center.z);
        const distance = vec3.length(dir);
        // Update distance based on scroll
        const newDistance = Math.exp(Math.log(distance) + this.scroll * dtSecs * 10 * this.speed);
        vec3.normalize(dir, dir);
        vec3.scale(dir, dir, newDistance);
        // Get camera axes
        const viewT = mat3.create();
        mat3.fromQuat(viewT, camera.rotation);
        mat3.invert(viewT, viewT);
        const xAxis = vec3.fromValues(viewT[0], viewT[1], viewT[2]);
        const yAxis = this.up ?
            vec3.fromValues(this.up.x, this.up.y, this.up.z) :
            vec3.fromValues(viewT[3], viewT[4], viewT[5]);
        const zAxis = vec3.fromValues(viewT[6], viewT[7], viewT[8]);
        // Calculate offset for panning
        const offset = vec3.create();
        const xOffset = vec3.create();
        const yOffset = vec3.create();
        vec3.scale(xOffset, xAxis, this.shift.y * dtSecs * this.speed * 0.1 * distance);
        vec3.scale(yOffset, yAxis, -this.shift.x * dtSecs * this.speed * 0.1 * distance);
        vec3.add(offset, xOffset, yOffset);
        // Apply offset
        this.center.x += offset[0];
        this.center.y += offset[1];
        this.center.z += offset[2];
        camera.position.x += offset[0];
        camera.position.y += offset[1];
        camera.position.z += offset[2];
        // Calculate rotation angles
        let theta = this.rotation.x * dtSecs * this.sensitivity;
        let phi = -this.rotation.y * dtSecs * this.sensitivity;
        let eta = 0;
        if (this.altPressed) {
            eta = -this.rotation.y * dtSecs * this.sensitivity;
            theta = 0;
            phi = 0;
        }
        // Create rotation quaternions
        const rotTheta = quat.create();
        const rotPhi = quat.create();
        const rotEta = quat.create();
        quat.setAxisAngle(rotTheta, yAxis, theta);
        quat.setAxisAngle(rotPhi, xAxis, phi);
        quat.setAxisAngle(rotEta, zAxis, eta);
        // Combine rotations
        const rot = quat.create();
        quat.multiply(rot, rotTheta, rotPhi);
        quat.multiply(rot, rot, rotEta);
        // Apply rotation to direction
        const newDir = vec3.create();
        vec3.transformQuat(newDir, dir, rot);
        // Check if we're too close to the up vector
        if (angleShort(yAxis, newDir) < 0.1) {
            vec3.copy(newDir, dir);
        }
        // Update camera position
        camera.position.x = this.center.x + newDir[0];
        camera.position.y = this.center.y + newDir[1];
        camera.position.z = this.center.z + newDir[2];
        // Update camera rotation using lookAt
        const negNewDir = vec3.create();
        vec3.negate(negNewDir, newDir);
        // Create look-at quaternion
        const forward = vec3.create();
        vec3.normalize(forward, negNewDir);
        const right = vec3.create();
        vec3.cross(right, forward, yAxis);
        vec3.normalize(right, right);
        const up = vec3.create();
        vec3.cross(up, right, forward);
        const rotMatrix = mat3.fromValues(right[0], up[0], -forward[0], right[1], up[1], -forward[1], right[2], up[2], -forward[2]);
        quat.fromMat3(camera.rotation, rotMatrix);
        // Apply decay based on framerate (60 FPS reference)
        let decay = Math.pow(0.8, dtSecs * 60);
        if (decay < 1e-4) {
            decay = 0;
        }
        this.rotation.x *= decay;
        this.rotation.y *= decay;
        this.rotation.z *= decay;
        if (vec3.length([this.rotation.x, this.rotation.y, this.rotation.z]) < 1e-4) {
            this.rotation = { x: 0, y: 0, z: 0 };
        }
        this.shift.x *= decay;
        this.shift.y *= decay;
        if (vec2.length([this.shift.x, this.shift.y]) < 1e-4) {
            this.shift = { x: 0, y: 0 };
        }
        this.scroll *= decay;
        if (Math.abs(this.scroll) < 1e-4) {
            this.scroll = 0;
        }
        this.userInput = false;
    }
}
/**
 * Find the closest point on a line to a given point
 */
function closestPoint(orig, dir, point) {
    const dirVec = vec3.fromValues(dir.x, dir.y, dir.z);
    vec3.normalize(dirVec, dirVec);
    const lhs = vec3.fromValues(point.x - orig.x, point.y - orig.y, point.z - orig.z);
    const dotP = vec3.dot(lhs, dirVec);
    return {
        x: orig.x + dirVec[0] * dotP,
        y: orig.y + dirVec[1] * dotP,
        z: orig.z + dirVec[2] * dotP
    };
}
/**
 * Calculate the shorter angle between two vectors
 */
function angleShort(a, b) {
    const angle = Math.acos(Math.max(-1, Math.min(1, vec3.dot(a, b) / (vec3.length(a) * vec3.length(b)))));
    if (angle > Math.PI / 2) {
        return Math.PI - angle;
    }
    else {
        return angle;
    }
}
//# sourceMappingURL=controller.js.map