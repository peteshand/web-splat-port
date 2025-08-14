// Mirrors camera.rs
export interface FrustumPlanes {
  near: Float32Array; // vec4
  far: Float32Array;
  left: Float32Array;
  right: Float32Array;
  top: Float32Array;
  bottom: Float32Array;
}

export interface Camera {
  view_matrix(): Float32Array; // 4x4
  proj_matrix(): Float32Array; // 4x4
  position?(): [number, number, number];
}

export class PerspectiveProjection {
  constructor(
    public fovx: number,
    public fovy: number,
    public znear: number,
    public zfar: number,
    public fov2view_ratio: number
  ) {}

  projection_matrix(): Float32Array {
    throw new Error("unimplemented");
  }

  resize(_width: number, _height: number): void {
    // TODO
  }

  focal(_viewport: [number, number]): [number, number] {
    throw new Error("unimplemented");
  }

  lerp(_other: PerspectiveProjection, _amount: number): PerspectiveProjection {
    throw new Error("unimplemented");
  }
}

export class PerspectiveCamera implements Camera {
  constructor(
    public positionVec: [number, number, number],
    public rotationQuat: [number, number, number, number],
    public projection: PerspectiveProjection
  ) {}

  fit_near_far(_aabb: unknown): void {
    // TODO
  }

  view_matrix(): Float32Array {
    throw new Error("unimplemented");
  }

  proj_matrix(): Float32Array {
    return this.projection.projection_matrix();
  }
}

export function focal2fov(focal: number, pixels: number): number {
  return 2 * Math.atan(pixels / (2 * focal));
}
export function fov2focal(fov: number, pixels: number): number {
  return pixels / (2 * Math.tan(fov * 0.5));
}
