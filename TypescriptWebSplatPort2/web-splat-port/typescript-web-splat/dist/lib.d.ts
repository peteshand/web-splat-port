/**
 * TypeScript port of lib.rs
 * Main library entry point with re-exports and WebGPU context
 */
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
import { GenericGaussianPointCloud } from './io/mod.js';
export { GenericGaussianPointCloud } from './io/mod';
export { GaussianRenderer, SplattingArgs, Display } from './renderer';
export { Scene, SceneCamera, Split } from './scene';
export { GPURSSorter, PointCloudSortStuff } from './gpu_rs';
export { UniformBuffer } from './uniform';
export interface RenderConfig {
    noVsync: boolean;
    skybox?: string;
    hdr: boolean;
}
export declare class WGPUContext {
    device: GPUDevice;
    queue: GPUQueue;
    adapter: GPUAdapter;
    constructor(device: GPUDevice, queue: GPUQueue, adapter: GPUAdapter);
    static newInstance(): Promise<WGPUContext>;
    initialize(): Promise<void>;
}
export declare function smoothstep(x: number): number;
/**
 * Create a WebSplat viewer for browser usage
 */
export declare function createWebSplatViewer(canvas: HTMLCanvasElement, pointCloud: GenericGaussianPointCloud): Promise<WebSplatViewer>;
/**
 * WebSplat viewer class for managing the rendering
 */
export declare class WebSplatViewer {
    private canvas;
    private wgpuContext;
    private pointCloud;
    private renderer?;
    private scene?;
    private camera?;
    private controller?;
    private animationId?;
    constructor(canvas: HTMLCanvasElement, wgpuContext: WGPUContext, pointCloud: GenericGaussianPointCloud);
    initialize(): Promise<void>;
    private startRenderLoop;
    private update;
    private render;
    destroy(): void;
}
//# sourceMappingURL=lib.d.ts.map