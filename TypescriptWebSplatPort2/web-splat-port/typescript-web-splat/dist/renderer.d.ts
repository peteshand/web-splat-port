import { mat4, vec2, vec4 } from 'gl-matrix';
import { Camera, PerspectiveCamera } from './camera.js';
import { PointCloud, Aabb } from './pointcloud.js';
import { UniformBuffer } from './uniform.js';
import { GPUStopwatch } from './utils.js';
/**
 * Camera uniform data structure for GPU
 */
export declare class CameraUniform {
    viewMatrix: mat4;
    viewInvMatrix: mat4;
    projMatrix: mat4;
    projInvMatrix: mat4;
    viewport: vec2;
    focal: vec2;
    constructor();
    setViewMat(viewMatrix: mat4): void;
    setProjMat(projMatrix: mat4): void;
    setCamera(camera: Camera): void;
    setViewport(viewport: vec2): void;
    setFocal(focal: vec2): void;
}
/**
 * Splatting arguments for rendering
 */
export interface SplattingArgs {
    camera: PerspectiveCamera;
    viewport: vec2;
    gaussianScaling: number;
    maxShDeg: number;
    showEnvMap: boolean;
    mipSplatting?: boolean;
    kernelSize?: number;
    clippingBox?: Aabb;
    walltime: number;
    sceneCenter?: [number, number, number];
    sceneExtend?: number;
    backgroundColor: GPUColor;
    resolution: vec2;
}
export declare const DEFAULT_KERNEL_SIZE = 0.3;
/**
 * Splatting arguments uniform data for GPU
 */
export declare class SplattingArgsUniform {
    clippingBoxMin: vec4;
    clippingBoxMax: vec4;
    gaussianScaling: number;
    maxShDeg: number;
    showEnvMap: number;
    mipSplatting: number;
    kernelSize: number;
    walltime: number;
    sceneExtend: number;
    _pad: number;
    sceneCenter: vec4;
    constructor();
    static fromArgsAndPc(args: SplattingArgs, pc: PointCloud): SplattingArgsUniform;
}
/**
 * Preprocess pipeline for converting 3D gaussians to 2D
 */
declare class PreprocessPipeline {
    private pipeline;
    constructor(device: GPUDevice, shDeg: number, compressed: boolean);
    private buildShader;
    run(encoder: GPUCommandEncoder, pc: PointCloud, camera: UniformBuffer<CameraUniform>, renderSettings: UniformBuffer<SplattingArgsUniform>, sortBg: GPUBindGroup): void;
}
/**
 * Main Gaussian renderer
 */
export declare class GaussianRenderer {
    private pipeline;
    private camera;
    private renderSettings;
    private preprocess;
    private drawIndirectBuffer;
    private drawIndirect;
    private _colorFormat;
    private sorter;
    private sorterStuff;
    constructor(device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, shDeg: number, compressed: boolean, pipeline: GPURenderPipeline, camera: UniformBuffer<CameraUniform>, renderSettings: UniformBuffer<SplattingArgsUniform>, preprocess: PreprocessPipeline, drawIndirectBuffer: GPUBuffer, drawIndirect: GPUBindGroup);
    static create(device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, shDeg: number, compressed: boolean): Promise<GaussianRenderer>;
    getCamera(): UniformBuffer<CameraUniform>;
    getRenderSettings(): UniformBuffer<SplattingArgsUniform>;
    private preprocessStep;
    prepare(encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, renderSettings: SplattingArgs, stopwatch?: GPUStopwatch): void;
    render(renderPass: GPURenderPassEncoder, pc: PointCloud): void;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    getColorFormat(): GPUTextureFormat;
}
/**
 * Display pipeline for final rendering to screen
 */
export declare class Display {
    private pipeline;
    private bindGroup;
    private format;
    private view;
    private envBg;
    private hasEnvMap;
    constructor(device: GPUDevice, sourceFormat: GPUTextureFormat, targetFormat: GPUTextureFormat, width: number, height: number);
    texture(): GPUTextureView;
    private static envMapBindGroupLayout;
    private static createEnvMapBg;
    setEnvMap(device: GPUDevice, envTexture: GPUTextureView | null): void;
    hasEnvMapSet(): boolean;
    private static createRenderTarget;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    resize(device: GPUDevice, width: number, height: number): void;
    render(encoder: GPUCommandEncoder, target: GPUTextureView, backgroundColor: GPUColor, camera: UniformBuffer<CameraUniform>, renderSettings: UniformBuffer<SplattingArgsUniform>): void;
}
export {};
//# sourceMappingURL=renderer.d.ts.map