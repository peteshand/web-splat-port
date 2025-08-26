import { mat4 } from 'gl-matrix';

export interface FrustumPlanes {
  near: [number, number, number, number];
  far: [number, number, number, number];
  left: [number, number, number, number];
  right: [number, number, number, number];
  top: [number, number, number, number];
  bottom: [number, number, number, number];
}

export interface Camera {
  viewMatrix(): mat4;
  projMatrix(): mat4;
  view_matrix?(): mat4;
  proj_matrix?(): mat4;
  frustum_planes?(): FrustumPlanes;
}
