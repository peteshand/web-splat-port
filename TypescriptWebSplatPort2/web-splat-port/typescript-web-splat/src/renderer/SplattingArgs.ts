import { vec2 } from 'gl-matrix';
import { PerspectiveCamera } from '../camera';

export interface SplattingArgs {
  camera: PerspectiveCamera;
  viewport: vec2;
  gaussianScaling: number;
  maxShDeg: number;
  showEnvMap: boolean;
  mipSplatting?: boolean;
  kernelSize?: number;
  clippingBox?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  walltime: number; // seconds
  sceneCenter?: [number, number, number];
  sceneExtend?: number;
  backgroundColor: GPUColor;
  resolution: vec2;
}

export const DEFAULT_KERNEL_SIZE = 0.3;
