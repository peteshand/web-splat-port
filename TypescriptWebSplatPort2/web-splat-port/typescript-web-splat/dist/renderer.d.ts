import { mat4, vec2, vec4 } from 'gl-matrix';
import { Camera, PerspectiveCamera } from './camera.js';
import { PointCloud } from './pointcloud.js';
import { GPUStopwatch } from './utils.js';
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
export interface SplattingArgs {
    camera: PerspectiveCamera;
    viewport: vec2;
    gaussianScaling: number;
    maxShDeg: number;
    showEnvMap: boolean;
    mipSplatting?: boolean;
    kernelSize?: number;
    clippingBox?: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
    walltime: number;
    sceneCenter?: [number, number, number];
    sceneExtend?: number;
    backgroundColor: GPUColor;
    resolution: vec2;
}
export declare const DEFAULT_KERNEL_SIZE = 0.3;
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
export declare class Display {
    private pipeline;
    private bindGroup;
    private format;
    private view;
    private envBg;
    private hasEnvMap;
    private constructor();
    static envMapBindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    static createEnvMapBg(device: GPUDevice, envTexture: GPUTextureView | null): GPUBindGroup;
    static createRenderTarget(device: GPUDevice, format: GPUTextureFormat, width: number, height: number): [GPUTextureView, GPUBindGroup];
    static create(device: GPUDevice, sourceFormat: GPUTextureFormat, targetFormat: GPUTextureFormat, width: number, height: number): Promise<Display>;
    texture(): GPUTextureView;
    setEnvMap(device: GPUDevice, envTexture: GPUTextureView | null): void;
    hasEnvMapSet(): boolean;
    resize(device: GPUDevice, width: number, height: number): void;
    render(encoder: GPUCommandEncoder, target: GPUTextureView, backgroundColor: GPUColor, camera: GPUBindGroup, renderSettings: GPUBindGroup): void;
}
export declare class GaussianRenderer {
    private pipeline;
    private cameraUB;
    private settingsUB;
    private preprocess;
    private drawIndirectBuffer;
    private drawIndirect;
    private _colorFormat;
    private sorter;
    private sorterStuff;
    private renderSorterLayout;
    private sortPreLayout;
    private constructor();
    static create(device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, shDeg: number, compressed: boolean): Promise<GaussianRenderer>;
    private serializeCameraUniform;
    private serializeSettingsUniform;
    private writeInitialDrawIndirect;
    getColorFormat(): GPUTextureFormat;
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout;
    private preprocessStep;
    prepare(encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, renderSettings: SplattingArgs, stopwatch?: GPUStopwatch): void;
    render(renderPass: GPURenderPassEncoder, pc: PointCloud): void;
}
//# sourceMappingURL=renderer.d.ts.map