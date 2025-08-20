"use strict";
/**
 * TypeScript port of lib.rs
 * Main library entry point with re-exports and WebGPU context
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WGPUContext = exports.UniformBuffer = exports.PointCloudSortStuff = exports.GPURSSorter = exports.Split = exports.SceneCamera = exports.Scene = exports.Display = exports.GaussianRenderer = exports.GenericGaussianPointCloud = exports.TrackingShot = exports.Spline = exports.PerspectiveProjection = exports.PerspectiveCamera = exports.PointCloud = void 0;
exports.smoothstep = smoothstep;
// Re-export all modules to avoid conflicts
__exportStar(require("./uniform.js"), exports);
__exportStar(require("./utils.js"), exports);
var pointcloud_js_1 = require("./pointcloud.js");
Object.defineProperty(exports, "PointCloud", { enumerable: true, get: function () { return pointcloud_js_1.PointCloud; } });
var camera_js_1 = require("./camera.js");
Object.defineProperty(exports, "PerspectiveCamera", { enumerable: true, get: function () { return camera_js_1.PerspectiveCamera; } });
Object.defineProperty(exports, "PerspectiveProjection", { enumerable: true, get: function () { return camera_js_1.PerspectiveProjection; } });
var animation_js_1 = require("./animation.js");
Object.defineProperty(exports, "Spline", { enumerable: true, get: function () { return animation_js_1.Spline; } });
Object.defineProperty(exports, "TrackingShot", { enumerable: true, get: function () { return animation_js_1.TrackingShot; } });
__exportStar(require("./controller.js"), exports);
__exportStar(require("./renderer.js"), exports);
__exportStar(require("./scene.js"), exports);
__exportStar(require("./gpu_rs.js"), exports);
__exportStar(require("./io/mod.js"), exports);
var mod_1 = require("./io/mod");
Object.defineProperty(exports, "GenericGaussianPointCloud", { enumerable: true, get: function () { return mod_1.GenericGaussianPointCloud; } });
var renderer_1 = require("./renderer");
Object.defineProperty(exports, "GaussianRenderer", { enumerable: true, get: function () { return renderer_1.GaussianRenderer; } });
Object.defineProperty(exports, "Display", { enumerable: true, get: function () { return renderer_1.Display; } });
var scene_1 = require("./scene");
Object.defineProperty(exports, "Scene", { enumerable: true, get: function () { return scene_1.Scene; } });
Object.defineProperty(exports, "SceneCamera", { enumerable: true, get: function () { return scene_1.SceneCamera; } });
Object.defineProperty(exports, "Split", { enumerable: true, get: function () { return scene_1.Split; } });
var gpu_rs_1 = require("./gpu_rs");
Object.defineProperty(exports, "GPURSSorter", { enumerable: true, get: function () { return gpu_rs_1.GPURSSorter; } });
Object.defineProperty(exports, "PointCloudSortStuff", { enumerable: true, get: function () { return gpu_rs_1.PointCloudSortStuff; } });
var uniform_1 = require("./uniform");
Object.defineProperty(exports, "UniformBuffer", { enumerable: true, get: function () { return uniform_1.UniformBuffer; } });
var WGPUContext = /** @class */ (function () {
    function WGPUContext(device, queue, adapter) {
        this.device = device;
        this.queue = queue;
        this.adapter = adapter;
    }
    WGPUContext.newInstance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var adapter, requiredFeatures, device, queue;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!navigator.gpu) {
                            throw new Error('WebGPU not supported');
                        }
                        return [4 /*yield*/, navigator.gpu.requestAdapter({
                                powerPreference: 'high-performance',
                            })];
                    case 1:
                        adapter = _b.sent();
                        if (!adapter) {
                            throw new Error('No WebGPU adapter found');
                        }
                        console.info("Using ".concat(((_a = adapter.info) === null || _a === void 0 ? void 0 : _a.description) || 'Unknown GPU'));
                        requiredFeatures = [];
                        // Add features if supported
                        if (adapter.features.has('timestamp-query')) {
                            requiredFeatures.push('timestamp-query');
                        }
                        return [4 /*yield*/, adapter.requestDevice({
                                requiredFeatures: requiredFeatures,
                                requiredLimits: {
                                    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                                    maxStorageBuffersPerShaderStage: 12,
                                    maxComputeWorkgroupStorageSize: 1 << 15,
                                },
                            })];
                    case 2:
                        device = _b.sent();
                        queue = device.queue;
                        return [2 /*return*/, new WGPUContext(device, queue, adapter)];
                }
            });
        });
    };
    WGPUContext.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    return WGPUContext;
}());
exports.WGPUContext = WGPUContext;
function smoothstep(x) {
    return x * x * (3.0 - 2.0 * x);
}
/**
 * Create a WebSplat viewer for browser usage
 */
/*
export async function createWebSplatViewer(
    canvas: HTMLCanvasElement,
    pointCloudUrl: string
): Promise<WebSplatViewer> {
    // Initialize WebGPU context
    const wgpuContext = await WGPUContext.newInstance();
    
    // Load point cloud
    const pointCloud = await GenericGaussianPointCloud.load(pointCloudUrl);
    
    // Create viewer instance
    const viewer = new WebSplatViewer(canvas, wgpuContext, pointCloud);
    await viewer.initialize();
    
    return viewer;
}
*/
/**
 * WebSplat viewer class for managing the rendering
 */
/*
export class WebSplatViewer {
    private canvas: HTMLCanvasElement;
    private wgpuContext: WGPUContext;
    private pointCloud: GenericGaussianPointCloud;
    private renderer?: GaussianRenderer;
    private scene?: Scene;
    private camera?: PerspectiveCamera;
    private controller?: Controller;
    private animationId?: number;

    constructor(canvas: HTMLCanvasElement, wgpuContext: WGPUContext, pointCloud: GenericGaussianPointCloud) {
        this.canvas = canvas;
        this.wgpuContext = wgpuContext;
        this.pointCloud = pointCloud;
    }

    async initialize(): Promise<void> {
        // Set up canvas context
        const context = this.canvas.getContext('webgpu');
        if (!context) {
            throw new Error('WebGPU not supported');
        }

        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device: this.wgpuContext.device,
            format: canvasFormat,
        });

        // Initialize scene
        this.scene = new Scene();
        await this.scene.loadPointCloud(this.pointCloud);

        // Initialize camera
        this.camera = new PerspectiveCamera(
            75 * Math.PI / 180, // 75 degrees in radians
            this.canvas.width / this.canvas.height,
            0.1,
            1000.0
        );

        // Position camera based on point cloud bounds
        const center = this.pointCloud.center;
        const radius = getAabbRadius(this.pointCloud.aabb);
        this.camera.setPosition([center.x, center.y, center.z + radius * 2]);
        this.camera.lookAt([center.x, center.y, center.z]);

        // Initialize controller
        this.controller = new Controller(this.canvas, this.camera);

        // Initialize renderer
        this.renderer = new GaussianRenderer(this.wgpuContext, canvasFormat);
        await this.renderer.initialize();

        // Start render loop
        this.startRenderLoop();
    }

    private startRenderLoop(): void {
        const render = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(render);
        };
        render();
    }

    private update(): void {
        if (this.controller) {
            this.controller.update();
        }
    }

    private render(): void {
        if (!this.renderer || !this.scene || !this.camera) {
            return;
        }

        try {
            const context = this.canvas.getContext('webgpu') as GPUCanvasContext;
            const textureView = context.getCurrentTexture().createView();

            this.renderer.render(this.scene, this.camera, textureView);
        } catch (error) {
            console.error('Render error:', error);
        }
    }

    destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.destroy();
        }
    }
}
*/
