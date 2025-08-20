"use strict";
/**
 * TypeScript port of camera.rs
 * Camera system with perspective projection and view matrices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEWPORT_Y_FLIP = exports.PerspectiveCamera = exports.PerspectiveProjection = void 0;
exports.world2view = world2view;
exports.buildProj = buildProj;
exports.focal2fov = focal2fov;
exports.fov2focal = fov2focal;
var gl_matrix_1 = require("gl-matrix");
var pointcloud_js_1 = require("./pointcloud.js");
/**
 * Perspective projection parameters
 */
var PerspectiveProjection = /** @class */ (function () {
    function PerspectiveProjection(fovx, fovy, znear, zfar, fov2viewRatio) {
        if (fov2viewRatio === void 0) { fov2viewRatio = 1.0; }
        this.fovx = fovx;
        this.fovy = fovy;
        this.znear = znear;
        this.zfar = zfar;
        this.fov2viewRatio = fov2viewRatio;
    }
    PerspectiveProjection.new = function (viewport, fov, znear, zfar) {
        var vr = viewport.x / viewport.y;
        var fr = fov.x / fov.y;
        return new PerspectiveProjection(fov.x, fov.y, znear, zfar, vr / fr);
    };
    PerspectiveProjection.prototype.projectionMatrix = function () {
        return buildProj(this.znear, this.zfar, this.fovx, this.fovy);
    };
    PerspectiveProjection.prototype.resize = function (width, height) {
        var ratio = width / height;
        if (width > height) {
            this.fovy = this.fovx / ratio * this.fov2viewRatio;
        }
        else {
            this.fovx = this.fovy * ratio * this.fov2viewRatio;
        }
    };
    PerspectiveProjection.prototype.focal = function (viewport) {
        return {
            x: fov2focal(this.fovx, viewport.x),
            y: fov2focal(this.fovy, viewport.y)
        };
    };
    PerspectiveProjection.prototype.lerp = function (other, amount) {
        return new PerspectiveProjection(this.fovx * (1 - amount) + other.fovx * amount, this.fovy * (1 - amount) + other.fovy * amount, this.znear * (1 - amount) + other.znear * amount, this.zfar * (1 - amount) + other.zfar * amount, this.fov2viewRatio * (1 - amount) + other.fov2viewRatio * amount);
    };
    PerspectiveProjection.prototype.hash = function () {
        // Simple hash implementation
        var hash = 0;
        var values = [this.fovx, this.fovy, this.znear, this.zfar, this.fov2viewRatio];
        for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
            var value = values_1[_i];
            var bits = new Float32Array([value])[0];
            hash = ((hash << 5) - hash) + bits;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    };
    return PerspectiveProjection;
}());
exports.PerspectiveProjection = PerspectiveProjection;
/**
 * Perspective camera implementation
 */
var PerspectiveCamera = /** @class */ (function () {
    function PerspectiveCamera(position, rotation, projection) {
        this.position = position;
        this.rotation = gl_matrix_1.quat.clone(rotation);
        this.projection = projection;
    }
    PerspectiveCamera.createDefault = function () {
        return new PerspectiveCamera({ x: 0, y: 0, z: -1 }, gl_matrix_1.quat.fromValues(0, 0, 0, 1), // Identity quaternion
        new PerspectiveProjection(Math.PI / 4, // 45 degrees in radians
        Math.PI / 4, 0.1, 100.0, 1.0));
    };
    PerspectiveCamera.prototype.fitNearFar = function (aabb) {
        // Set camera near and far plane
        var center = (0, pointcloud_js_1.getAabbCenter)(aabb);
        var radius = (0, pointcloud_js_1.getAabbRadius)(aabb);
        var distance = gl_matrix_1.vec3.distance([this.position.x, this.position.y, this.position.z], [center.x, center.y, center.z]);
        var zfar = distance + radius;
        var znear = Math.max(distance - radius, zfar / 1000);
        this.projection.zfar = zfar;
        this.projection.znear = znear;
    };
    PerspectiveCamera.prototype.viewMatrix = function () {
        var rotation = gl_matrix_1.mat3.create();
        gl_matrix_1.mat3.fromQuat(rotation, this.rotation);
        var translation = gl_matrix_1.vec3.fromValues(this.position.x, this.position.y, this.position.z);
        return world2view(rotation, translation);
    };
    PerspectiveCamera.prototype.projMatrix = function () {
        return this.projection.projectionMatrix();
    };
    PerspectiveCamera.prototype.getPosition = function () {
        return this.position;
    };
    PerspectiveCamera.prototype.frustumPlanes = function () {
        var p = this.projMatrix();
        var v = this.viewMatrix();
        var pv = gl_matrix_1.mat4.create();
        gl_matrix_1.mat4.multiply(pv, p, v);
        var planes = new Array(6);
        for (var i = 0; i < 6; i++) {
            planes[i] = gl_matrix_1.vec4.create();
        }
        // Extract frustum planes from projection-view matrix
        // Left plane
        gl_matrix_1.vec4.set(planes[0], pv[3] + pv[0], pv[7] + pv[4], pv[11] + pv[8], pv[15] + pv[12]);
        // Right plane  
        gl_matrix_1.vec4.set(planes[1], pv[3] - pv[0], pv[7] - pv[4], pv[11] - pv[8], pv[15] - pv[12]);
        // Bottom plane
        gl_matrix_1.vec4.set(planes[2], pv[3] + pv[1], pv[7] + pv[5], pv[11] + pv[9], pv[15] + pv[13]);
        // Top plane
        gl_matrix_1.vec4.set(planes[3], pv[3] - pv[1], pv[7] - pv[5], pv[11] - pv[9], pv[15] - pv[13]);
        // Near plane
        gl_matrix_1.vec4.set(planes[4], pv[3] + pv[2], pv[7] + pv[6], pv[11] + pv[10], pv[15] + pv[14]);
        // Far plane
        gl_matrix_1.vec4.set(planes[5], pv[3] - pv[2], pv[7] - pv[6], pv[11] - pv[10], pv[15] - pv[14]);
        // Normalize planes
        for (var i = 0; i < 6; i++) {
            gl_matrix_1.vec4.normalize(planes[i], planes[i]);
        }
        return {
            near: { x: planes[4][0], y: planes[4][1], z: planes[4][2], w: planes[4][3] },
            far: { x: planes[5][0], y: planes[5][1], z: planes[5][2], w: planes[5][3] },
            left: { x: planes[0][0], y: planes[0][1], z: planes[0][2], w: planes[0][3] },
            right: { x: planes[1][0], y: planes[1][1], z: planes[1][2], w: planes[1][3] },
            top: { x: planes[3][0], y: planes[3][1], z: planes[3][2], w: planes[3][3] },
            bottom: { x: planes[2][0], y: planes[2][1], z: planes[2][2], w: planes[2][3] }
        };
    };
    PerspectiveCamera.prototype.lerp = function (other, amount) {
        // Using SLERP interpolation for quaternions
        var newRotation = gl_matrix_1.quat.create();
        gl_matrix_1.quat.slerp(newRotation, this.rotation, other.rotation, amount);
        var newPosition = {
            x: this.position.x * (1 - amount) + other.position.x * amount,
            y: this.position.y * (1 - amount) + other.position.y * amount,
            z: this.position.z * (1 - amount) + other.position.z * amount
        };
        var newProjection = this.projection.lerp(other.projection, amount);
        return new PerspectiveCamera(newPosition, newRotation, newProjection);
    };
    PerspectiveCamera.prototype.hash = function () {
        var viewMatrix = this.viewMatrix();
        var projMatrix = this.projMatrix();
        var hash = 0;
        // Hash view matrix
        for (var i = 0; i < 16; i++) {
            var bits = new Float32Array([viewMatrix[i]])[0];
            hash = ((hash << 5) - hash) + bits;
            hash = hash & hash;
        }
        // Hash projection matrix
        for (var i = 0; i < 16; i++) {
            var bits = new Float32Array([projMatrix[i]])[0];
            hash = ((hash << 5) - hash) + bits;
            hash = hash & hash;
        }
        return hash;
    };
    return PerspectiveCamera;
}());
exports.PerspectiveCamera = PerspectiveCamera;
// Viewport Y-flip matrix constant
exports.VIEWPORT_Y_FLIP = gl_matrix_1.mat4.fromValues(1.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
/**
 * Convert world space to view space
 */
function world2view(r, t) {
    var rt = gl_matrix_1.mat4.create();
    // Set rotation part
    rt[0] = r[0];
    rt[1] = r[1];
    rt[2] = r[2];
    rt[3] = 0;
    rt[4] = r[3];
    rt[5] = r[4];
    rt[6] = r[5];
    rt[7] = 0;
    rt[8] = r[6];
    rt[9] = r[7];
    rt[10] = r[8];
    rt[11] = 0;
    // Set translation part
    rt[12] = t[0];
    rt[13] = t[1];
    rt[14] = t[2];
    rt[15] = 1;
    // Invert and transpose
    var inverted = gl_matrix_1.mat4.create();
    gl_matrix_1.mat4.invert(inverted, rt);
    gl_matrix_1.mat4.transpose(inverted, inverted);
    return inverted;
}
/**
 * Build projection matrix
 */
function buildProj(znear, zfar, fovX, fovY) {
    var tanHalfFovY = Math.tan(fovY / 2);
    var tanHalfFovX = Math.tan(fovX / 2);
    var top = tanHalfFovY * znear;
    var bottom = -top;
    var right = tanHalfFovX * znear;
    var left = -right;
    var p = gl_matrix_1.mat4.create();
    p[0] = 2.0 * znear / (right - left);
    p[5] = 2.0 * znear / (top - bottom);
    p[8] = (right + left) / (right - left);
    p[9] = (top + bottom) / (top - bottom);
    p[10] = zfar / (zfar - znear);
    p[11] = -(zfar * znear) / (zfar - znear);
    p[14] = 1.0;
    p[15] = 0.0;
    // Transpose the matrix
    gl_matrix_1.mat4.transpose(p, p);
    return p;
}
/**
 * Convert focal length to field of view
 */
function focal2fov(focal, pixels) {
    return 2 * Math.atan(pixels / (2 * focal));
}
/**
 * Convert field of view to focal length
 */
function fov2focal(fov, pixels) {
    return pixels / (2 * Math.tan(fov * 0.5));
}
