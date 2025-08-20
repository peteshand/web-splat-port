"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneUtils = exports.Scene = exports.SceneCamera = exports.Split = void 0;
var gl_matrix_1 = require("gl-matrix");
var camera_js_1 = require("./camera.js");
/**
 * Split enum for training/test data
 */
var Split;
(function (Split) {
    Split["Train"] = "train";
    Split["Test"] = "test";
})(Split || (exports.Split = Split = {}));
/**
 * Scene camera representation
 */
var SceneCamera = /** @class */ (function () {
    function SceneCamera(id, imgName, width, height, position, rotation, fx, fy, split) {
        if (split === void 0) { split = Split.Train; }
        this.id = id;
        this.imgName = imgName;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;
        this.fx = fx;
        this.fy = fy;
        this.split = split;
    }
    /**
     * Create SceneCamera from PerspectiveCamera
     */
    SceneCamera.fromPerspective = function (cam, name, id, viewport, split) {
        var fx = (0, camera_js_1.fov2focal)(cam.projection.fovx, viewport.x);
        var fy = (0, camera_js_1.fov2focal)(cam.projection.fovy, viewport.y);
        // Convert quaternion to rotation matrix
        var rot = gl_matrix_1.mat3.create();
        gl_matrix_1.mat3.fromQuat(rot, cam.rotation);
        var rotationArray = [
            [rot[0], rot[1], rot[2]],
            [rot[3], rot[4], rot[5]],
            [rot[6], rot[7], rot[8]]
        ];
        return new SceneCamera(id, name, viewport.x, viewport.y, [cam.position.x, cam.position.y, cam.position.z], rotationArray, fx, fy, split);
    };
    /**
     * Convert to PerspectiveCamera
     */
    SceneCamera.prototype.toPerspectiveCamera = function () {
        var fovx = (0, camera_js_1.focal2fov)(this.fx, this.width);
        var fovy = (0, camera_js_1.focal2fov)(this.fy, this.height);
        // Create rotation matrix from array
        var rot = gl_matrix_1.mat3.fromValues(this.rotation[0][0], this.rotation[0][1], this.rotation[0][2], this.rotation[1][0], this.rotation[1][1], this.rotation[1][2], this.rotation[2][0], this.rotation[2][1], this.rotation[2][2]);
        // Check determinant and fix if needed
        if (gl_matrix_1.mat3.determinant(rot) < 0) {
            // Flip y axis if determinant is -1
            rot[1] = -rot[1];
            rot[4] = -rot[4];
            rot[7] = -rot[7];
        }
        // Convert rotation matrix to quaternion
        var rotation = gl_matrix_1.mat3.create();
        gl_matrix_1.mat3.copy(rotation, rot);
        var position = {
            x: this.position[0],
            y: this.position[1],
            z: this.position[2]
        };
        var projection = new camera_js_1.PerspectiveProjection(fovx, fovy, 0.01, 100.0);
        return new camera_js_1.PerspectiveCamera(position, rotation, projection);
    };
    /**
     * Generate hash for the camera (simplified version)
     */
    SceneCamera.prototype.hash = function () {
        return JSON.stringify({
            imgName: this.imgName,
            width: this.width,
            height: this.height,
            position: this.position,
            rotation: this.rotation,
            fx: this.fx,
            fy: this.fy,
            split: this.split
        });
    };
    /**
     * Clone the camera
     */
    SceneCamera.prototype.clone = function () {
        return new SceneCamera(this.id, this.imgName, this.width, this.height, __spreadArray([], this.position, true), [
            __spreadArray([], this.rotation[0], true),
            __spreadArray([], this.rotation[1], true),
            __spreadArray([], this.rotation[2], true)
        ], this.fx, this.fy, this.split);
    };
    return SceneCamera;
}());
exports.SceneCamera = SceneCamera;
/**
 * Scene containing multiple cameras
 */
var Scene = /** @class */ (function () {
    function Scene(cameras) {
        this.extend = this.calculateMaxDistance(cameras.map(function (c) { return ({
            x: c.position[0],
            y: c.position[1],
            z: c.position[2]
        }); }));
        this.cameras = new Map();
        for (var _i = 0, cameras_1 = cameras; _i < cameras_1.length; _i++) {
            var camera = cameras_1[_i];
            if (this.cameras.has(camera.id)) {
                console.warn("Duplicate camera id ".concat(camera.id, " in scene (duplicates were removed)"));
            }
            this.cameras.set(camera.id, camera);
        }
    }
    /**
     * Create scene from cameras array
     */
    Scene.fromCameras = function (cameras) {
        return new Scene(cameras);
    };
    /**
     * Load scene from JSON data
     */
    Scene.fromJson = function (jsonData) {
        var cameras = [];
        for (var i = 0; i < jsonData.length; i++) {
            var data = jsonData[i];
            // According to Kerbl et al "3D Gaussian Splatting for Real-Time Radiance Field Rendering"
            // 7 out of 8 cameras are taken as training images
            var split = i % 8 === 0 ? Split.Test : Split.Train;
            var camera = new SceneCamera(data.id || i, data.img_name || "image_".concat(i), data.width, data.height, data.position, data.rotation, data.fx, data.fy, split);
            cameras.push(camera);
        }
        console.log("Loaded scene file with ".concat(cameras.length, " views"));
        return new Scene(cameras);
    };
    /**
     * Get camera by ID
     */
    Scene.prototype.camera = function (id) {
        var camera = this.cameras.get(id);
        return camera ? camera.clone() : undefined;
    };
    /**
     * Get number of cameras
     */
    Scene.prototype.numCameras = function () {
        return this.cameras.size;
    };
    /**
     * Get cameras filtered by split
     */
    Scene.prototype.getCameras = function (split) {
        var cameras;
        if (split !== undefined) {
            cameras = Array.from(this.cameras.values())
                .filter(function (c) { return c.split === split; })
                .map(function (c) { return c.clone(); });
        }
        else {
            cameras = Array.from(this.cameras.values())
                .map(function (c) { return c.clone(); });
        }
        // Sort by ID
        cameras.sort(function (a, b) { return a.id - b.id; });
        return cameras;
    };
    /**
     * Get scene extend (maximum distance between cameras)
     */
    Scene.prototype.getExtend = function () {
        return this.extend;
    };
    /**
     * Find nearest camera to given position
     */
    Scene.prototype.nearestCamera = function (pos, split) {
        var minDistance = Number.POSITIVE_INFINITY;
        var nearestId;
        for (var _i = 0, _a = this.cameras.values(); _i < _a.length; _i++) {
            var camera = _a[_i];
            // Filter by split if specified
            if (split !== undefined && camera.split !== split) {
                continue;
            }
            var cameraPos = {
                x: camera.position[0],
                y: camera.position[1],
                z: camera.position[2]
            };
            var distance = this.distance2(pos, cameraPos);
            if (distance < minDistance) {
                minDistance = distance;
                nearestId = camera.id;
            }
        }
        return nearestId;
    };
    /**
     * Calculate squared distance between two points
     */
    Scene.prototype.distance2 = function (a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    };
    /**
     * Calculate maximum distance between any two points (naive O(n^2) implementation)
     */
    Scene.prototype.calculateMaxDistance = function (points) {
        var maxDistance = 0;
        for (var i = 0; i < points.length; i++) {
            for (var j = i + 1; j < points.length; j++) {
                var distance = Math.sqrt(this.distance2(points[i], points[j]));
                maxDistance = Math.max(maxDistance, distance);
            }
        }
        return maxDistance;
    };
    return Scene;
}());
exports.Scene = Scene;
/**
 * Utility functions for scene management
 */
var SceneUtils = /** @class */ (function () {
    function SceneUtils() {
    }
    /**
     * Load scene from JSON file
     */
    SceneUtils.loadFromFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var response, jsonData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch(filePath)];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Failed to load scene file: ".concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        jsonData = _a.sent();
                        return [2 /*return*/, Scene.fromJson(jsonData)];
                }
            });
        });
    };
    /**
     * Save scene to JSON format
     */
    SceneUtils.sceneToJson = function (scene) {
        var cameras = scene.getCameras();
        return cameras.map(function (camera) { return ({
            id: camera.id,
            img_name: camera.imgName,
            width: camera.width,
            height: camera.height,
            position: camera.position,
            rotation: camera.rotation,
            fx: camera.fx,
            fy: camera.fy
        }); });
    };
    /**
     * Create a simple test scene with a few cameras
     */
    SceneUtils.createTestScene = function () {
        var cameras = [
            new SceneCamera(0, 'test_0.jpg', 800, 600, [0, 0, 5], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], 400, 400, Split.Train),
            new SceneCamera(1, 'test_1.jpg', 800, 600, [3, 0, 4], [[0.8, 0, 0.6], [0, 1, 0], [-0.6, 0, 0.8]], 400, 400, Split.Test),
            new SceneCamera(2, 'test_2.jpg', 800, 600, [-3, 0, 4], [[0.8, 0, -0.6], [0, 1, 0], [0.6, 0, 0.8]], 400, 400, Split.Train)
        ];
        return Scene.fromCameras(cameras);
    };
    return SceneUtils;
}());
exports.SceneUtils = SceneUtils;
