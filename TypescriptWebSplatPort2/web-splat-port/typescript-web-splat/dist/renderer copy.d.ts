import { mat4, vec2, vec4 } from 'gl-matrix';
import { Camera, PerspectiveCamera } from './camera.js';
import { PointCloud } from './pointcloud.js';
import { UniformBuffer, UnifiedUniformBuffer } from './uniform.js';
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
    clippingBox?: any;
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
    private constructor();
    static create(device: GPUDevice, shDeg: number, compressed: boolean): Promise<PreprocessPipeline>;
    run(encoder: GPUCommandEncoder, pc: PointCloud, unifiedBG: GPUBindGroup, // group(0) — combined camera+settings
    sortPreBG: GPUBindGroup): void;
}
/**
 * Main Gaussian renderer
 */
export declare class GaussianRenderer {
    private pipeline;
    private unifiedUniform;
    private preprocess;
    private drawIndirectBuffer;
    private drawIndirect;
    private _colorFormat;
    private sorter;
    private sorterStuff;
    private indicesBuffer;
    private indicesBindGroup;
    private sortPreBuffer;
    private sortPreBindGroup;
    constructor(device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, shDeg: number, compressed: boolean, pipeline: GPURenderPipeline, unifiedUniform: UnifiedUniformBuffer, preprocess: PreprocessPipeline, drawIndirectBuffer: GPUBuffer, drawIndirect: GPUBindGroup);
    private ensureSortPre;
    static sortPreBindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    static create(device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, shDeg: number, compressed: boolean): Promise<GaussianRenderer>;
    private ensureFallbackIndices;
    private static renderBindGroupLayout;
    getDrawIndirectBuffer(): GPUBuffer;
    getUnifiedUniform(): UnifiedUniformBuffer;
    private serializeCameraUniform;
    private serializeSettingsUniform;
    preprocessStep(encoder: GPUCommandEncoder, queue: GPUQueue, pc: PointCloud, renderSettings: SplattingArgs): void;
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
//# sourceMappingURL=renderer%20copy.d.ts.map