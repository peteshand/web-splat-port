"use strict";
/**
 * TypeScript port of controller.rs
 * Camera controller for user input handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CameraController = void 0;
var gl_matrix_1 = require("gl-matrix");
/**
 * Camera controller for handling user input
 */
var CameraController = /** @class */ (function () {
    function CameraController(speed, sensitivity) {
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
    CameraController.prototype.processKeyboard = function (key, pressed) {
        var amount = pressed ? 1.0 : 0.0;
        var processed = false;
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
    };
    CameraController.prototype.processMouse = function (mouseDx, mouseDy) {
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
    };
    CameraController.prototype.processScroll = function (dy) {
        this.scroll += -dy;
        this.userInput = true;
    };
    /**
     * Moves the controller center to the closest point on a line defined by the camera position and rotation
     * Adjusts the controller up vector by projecting the current up vector onto the plane defined by the camera right vector
     */
    CameraController.prototype.resetToCamera = function (camera) {
        var invView = gl_matrix_1.quat.create();
        gl_matrix_1.quat.invert(invView, camera.rotation);
        var forward = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.transformQuat(forward, [0, 0, 1], invView);
        var right = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.transformQuat(right, [1, 0, 0], invView);
        // Move center point
        this.center = closestPoint(camera.position, { x: forward[0], y: forward[1], z: forward[2] }, this.center);
        // Adjust up vector by projecting it onto the plane defined by the right vector of the camera
        if (this.up) {
            var upVec = gl_matrix_1.vec3.fromValues(this.up.x, this.up.y, this.up.z);
            var rightVec = gl_matrix_1.vec3.fromValues(right[0], right[1], right[2]);
            // Project up onto right
            var projection = gl_matrix_1.vec3.create();
            var dot = gl_matrix_1.vec3.dot(upVec, rightVec);
            gl_matrix_1.vec3.scale(projection, rightVec, dot);
            // Subtract projection from up
            var newUp = gl_matrix_1.vec3.create();
            gl_matrix_1.vec3.subtract(newUp, upVec, projection);
            gl_matrix_1.vec3.normalize(newUp, newUp);
            this.up = { x: newUp[0], y: newUp[1], z: newUp[2] };
        }
    };
    CameraController.prototype.updateCamera = function (camera, dt) {
        var dtSecs = dt / 1000; // Convert milliseconds to seconds
        var dir = gl_matrix_1.vec3.fromValues(camera.position.x - this.center.x, camera.position.y - this.center.y, camera.position.z - this.center.z);
        var distance = gl_matrix_1.vec3.length(dir);
        // Update distance based on scroll
        var newDistance = Math.exp(Math.log(distance) + this.scroll * dtSecs * 10 * this.speed);
        gl_matrix_1.vec3.normalize(dir, dir);
        gl_matrix_1.vec3.scale(dir, dir, newDistance);
        // Get camera axes
        var viewT = gl_matrix_1.mat3.create();
        gl_matrix_1.mat3.fromQuat(viewT, camera.rotation);
        gl_matrix_1.mat3.invert(viewT, viewT);
        var xAxis = gl_matrix_1.vec3.fromValues(viewT[0], viewT[1], viewT[2]);
        var yAxis = this.up ?
            gl_matrix_1.vec3.fromValues(this.up.x, this.up.y, this.up.z) :
            gl_matrix_1.vec3.fromValues(viewT[3], viewT[4], viewT[5]);
        var zAxis = gl_matrix_1.vec3.fromValues(viewT[6], viewT[7], viewT[8]);
        // Calculate offset for panning
        var offset = gl_matrix_1.vec3.create();
        var xOffset = gl_matrix_1.vec3.create();
        var yOffset = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.scale(xOffset, xAxis, this.shift.y * dtSecs * this.speed * 0.1 * distance);
        gl_matrix_1.vec3.scale(yOffset, yAxis, -this.shift.x * dtSecs * this.speed * 0.1 * distance);
        gl_matrix_1.vec3.add(offset, xOffset, yOffset);
        // Apply offset
        this.center.x += offset[0];
        this.center.y += offset[1];
        this.center.z += offset[2];
        camera.position.x += offset[0];
        camera.position.y += offset[1];
        camera.position.z += offset[2];
        // Calculate rotation angles
        var theta = this.rotation.x * dtSecs * this.sensitivity;
        var phi = -this.rotation.y * dtSecs * this.sensitivity;
        var eta = 0;
        if (this.altPressed) {
            eta = -this.rotation.y * dtSecs * this.sensitivity;
            theta = 0;
            phi = 0;
        }
        // Create rotation quaternions
        var rotTheta = gl_matrix_1.quat.create();
        var rotPhi = gl_matrix_1.quat.create();
        var rotEta = gl_matrix_1.quat.create();
        gl_matrix_1.quat.setAxisAngle(rotTheta, yAxis, theta);
        gl_matrix_1.quat.setAxisAngle(rotPhi, xAxis, phi);
        gl_matrix_1.quat.setAxisAngle(rotEta, zAxis, eta);
        // Combine rotations
        var rot = gl_matrix_1.quat.create();
        gl_matrix_1.quat.multiply(rot, rotTheta, rotPhi);
        gl_matrix_1.quat.multiply(rot, rot, rotEta);
        // Apply rotation to direction
        var newDir = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.transformQuat(newDir, dir, rot);
        // Check if we're too close to the up vector
        if (angleShort(yAxis, newDir) < 0.1) {
            gl_matrix_1.vec3.copy(newDir, dir);
        }
        // Update camera position
        camera.position.x = this.center.x + newDir[0];
        camera.position.y = this.center.y + newDir[1];
        camera.position.z = this.center.z + newDir[2];
        // Update camera rotation using lookAt
        var negNewDir = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.negate(negNewDir, newDir);
        // Create look-at quaternion
        var forward = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.normalize(forward, negNewDir);
        var right = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.cross(right, forward, yAxis);
        gl_matrix_1.vec3.normalize(right, right);
        var up = gl_matrix_1.vec3.create();
        gl_matrix_1.vec3.cross(up, right, forward);
        var rotMatrix = gl_matrix_1.mat3.fromValues(right[0], up[0], -forward[0], right[1], up[1], -forward[1], right[2], up[2], -forward[2]);
        gl_matrix_1.quat.fromMat3(camera.rotation, rotMatrix);
        // Apply decay based on framerate (60 FPS reference)
        var decay = Math.pow(0.8, dtSecs * 60);
        if (decay < 1e-4) {
            decay = 0;
        }
        this.rotation.x *= decay;
        this.rotation.y *= decay;
        this.rotation.z *= decay;
        if (gl_matrix_1.vec3.length([this.rotation.x, this.rotation.y, this.rotation.z]) < 1e-4) {
            this.rotation = { x: 0, y: 0, z: 0 };
        }
        this.shift.x *= decay;
        this.shift.y *= decay;
        if (gl_matrix_1.vec2.length([this.shift.x, this.shift.y]) < 1e-4) {
            this.shift = { x: 0, y: 0 };
        }
        this.scroll *= decay;
        if (Math.abs(this.scroll) < 1e-4) {
            this.scroll = 0;
        }
        this.userInput = false;
    };
    return CameraController;
}());
exports.CameraController = CameraController;
/**
 * Find the closest point on a line to a given point
 */
function closestPoint(orig, dir, point) {
    var dirVec = gl_matrix_1.vec3.fromValues(dir.x, dir.y, dir.z);
    gl_matrix_1.vec3.normalize(dirVec, dirVec);
    var lhs = gl_matrix_1.vec3.fromValues(point.x - orig.x, point.y - orig.y, point.z - orig.z);
    var dotP = gl_matrix_1.vec3.dot(lhs, dirVec);
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
    var angle = Math.acos(Math.max(-1, Math.min(1, gl_matrix_1.vec3.dot(a, b) / (gl_matrix_1.vec3.length(a) * gl_matrix_1.vec3.length(b)))));
    if (angle > Math.PI / 2) {
        return Math.PI - angle;
    }
    else {
        return angle;
    }
}
