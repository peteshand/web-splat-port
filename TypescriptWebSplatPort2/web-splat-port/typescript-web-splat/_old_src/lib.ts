/**
 * TypeScript port of lib.rs
 * Main library entry point with re-exports and WebGPU context
 */

// Re-export all modules to avoid conflicts
export * from './uniform.js';
export * from './utils.js';
export { PointCloud, Aabb } from './pointcloud.js';
export { Camera, PerspectiveCamera, PerspectiveProjection, Point3f32, Vector3f32 } from './camera.js';
export { Lerp, Interpolate, Spline, Sampler, TrackingShot } from './animation.js';
export * from './controller.js';
export * from './renderer.js';
export * from './scene.js';
export * from './gpu_rs.js';
export * from './io/mod.js';

// Import types and classes for internal use
import { GenericGaussianPointCloud } from './io/mod.js';
import { GaussianRenderer } from './renderer.js';
import { Scene } from './scene.js';
import { PerspectiveCamera } from './camera.js';
// import { Controller } from './controller.js';
import { getAabbRadius } from './pointcloud.js';

export { GenericGaussianPointCloud } from './io/mod';
export { GaussianRenderer, SplattingArgs, Display } from './renderer';
export { Scene, SceneCamera, Split } from './scene';
export { GPURSSorter, PointCloudSortStuff } from './gpu_rs';
export { UniformBuffer } from './uniform';

// Type definitions for configuration
export interface RenderConfig {
    noVsync: boolean;
    skybox?: string;
    hdr: boolean;
}

export class WGPUContext {
    device: GPUDevice;
    queue: GPUQueue;
    adapter: GPUAdapter;

    constructor(device: GPUDevice, queue: GPUQueue, adapter: GPUAdapter) {
        this.device = device;
        this.queue = queue;
        this.adapter = adapter;
    }

    static async newInstance(): Promise<WGPUContext> {
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

        const requiredFeatures: GPUFeatureName[] = [];
        
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

    async initialize(): Promise<void> {
        // No-op for now
    }
}

export function smoothstep(x: number): number {
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
