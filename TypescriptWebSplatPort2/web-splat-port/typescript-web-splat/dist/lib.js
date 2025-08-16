/**
 * TypeScript port of lib.rs
 * Main library entry point with re-exports and WebGPU context
 */
// Re-export all modules to avoid conflicts
export * from './uniform.js';
export * from './utils.js';
export * from './pointcloud.js';
export * from './camera.js';
export * from './animation.js';
export * from './controller.js';
export * from './renderer.js';
export * from './scene.js';
export * from './gpu_rs.js';
export * from './io/mod.js';
import { GaussianRenderer } from './renderer.js';
import { Scene } from './scene.js';
import { PerspectiveCamera } from './camera.js';
import { Controller } from './controller.js';
import { getAabbRadius } from './pointcloud.js';
export { GenericGaussianPointCloud } from './io/mod';
export { GaussianRenderer, Display } from './renderer';
export { Scene, SceneCamera, Split } from './scene';
export { GPURSSorter, PointCloudSortStuff } from './gpu_rs';
export { UniformBuffer } from './uniform';
export class WGPUContext {
    device;
    queue;
    adapter;
    constructor(device, queue, adapter) {
        this.device = device;
        this.queue = queue;
        this.adapter = adapter;
    }
    static async newInstance() {
        if (!navigator.gpu) {
            throw new Error('WebGPU not supported');
        }
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance',
        });
        if (!adapter) {
            throw new Error('No WebGPU adapter found');
        }
        console.info(`Using ${adapter.info?.description || 'Unknown GPU'}`);
        const requiredFeatures = [];
        // Add features if supported
        if (adapter.features.has('timestamp-query')) {
            requiredFeatures.push('timestamp-query');
        }
        const device = await adapter.requestDevice({
            requiredFeatures,
            requiredLimits: {
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
                maxStorageBuffersPerShaderStage: 12,
                maxComputeWorkgroupStorageSize: 1 << 15,
            },
        });
        const queue = device.queue;
        return new WGPUContext(device, queue, adapter);
    }
    async initialize() {
        // No-op for now
    }
}
export function smoothstep(x) {
    return x * x * (3.0 - 2.0 * x);
}
/**
 * Create a WebSplat viewer for browser usage
 */
export async function createWebSplatViewer(canvas, pointCloud) {
    console.log('Creating WebSplat viewer with canvas:', canvas);
    console.log('Point cloud data:', pointCloud);
    // Initialize WebGPU context
    const wgpuContext = new WGPUContext();
    await wgpuContext.initialize();
    // Create viewer instance
    const viewer = new WebSplatViewer(canvas, wgpuContext, pointCloud);
    await viewer.initialize();
    return viewer;
}
/**
 * WebSplat viewer class for managing the rendering
 */
export class WebSplatViewer {
    canvas;
    wgpuContext;
    pointCloud;
    renderer;
    scene;
    camera;
    controller;
    animationId;
    constructor(canvas, wgpuContext, pointCloud) {
        this.canvas = canvas;
        this.wgpuContext = wgpuContext;
        this.pointCloud = pointCloud;
    }
    async initialize() {
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
        this.camera = new PerspectiveCamera(75 * Math.PI / 180, // 75 degrees in radians
        this.canvas.width / this.canvas.height, 0.1, 1000.0);
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
    startRenderLoop() {
        const render = () => {
            this.update();
            this.render();
            this.animationId = requestAnimationFrame(render);
        };
        render();
    }
    update() {
        if (this.controller) {
            this.controller.update();
        }
    }
    render() {
        if (!this.renderer || !this.scene || !this.camera) {
            return;
        }
        try {
            const context = this.canvas.getContext('webgpu');
            const textureView = context.getCurrentTexture().createView();
            this.renderer.render(this.scene, this.camera, textureView);
        }
        catch (error) {
            console.error('Render error:', error);
        }
    }
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.destroy();
        }
    }
}
//# sourceMappingURL=lib.js.map