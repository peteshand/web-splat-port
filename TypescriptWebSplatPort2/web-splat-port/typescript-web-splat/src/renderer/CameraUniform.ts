import { mat4, vec2 } from 'gl-matrix';
import { Camera, VIEWPORT_Y_FLIP } from '../camera';

export class CameraUniform {
  public viewMatrix: mat4;
  public viewInvMatrix: mat4;
  public projMatrix: mat4;
  public projInvMatrix: mat4;
  public viewport: vec2;
  public focal: vec2;

  constructor() {
    this.viewMatrix = mat4.create();
    this.viewInvMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.projInvMatrix = mat4.create();
    this.viewport = vec2.fromValues(1, 1);
    this.focal = vec2.fromValues(1, 1);
  }

  setViewMat(viewMatrix: mat4): void {
    mat4.copy(this.viewMatrix, viewMatrix);
    mat4.invert(this.viewInvMatrix, viewMatrix);
  }

  setProjMat(projMatrix: mat4): void {
    const flipped = mat4.create();
    mat4.multiply(flipped, VIEWPORT_Y_FLIP, projMatrix);
    mat4.copy(this.projMatrix, flipped);
    mat4.invert(this.projInvMatrix, projMatrix);
  }

  setCamera(camera: Camera): void {
    this.setProjMat(camera.projMatrix());
    this.setViewMat(camera.viewMatrix());
  }

  setViewport(viewport: vec2): void {
    vec2.copy(this.viewport, viewport);
  }

  setFocal(focal: vec2): void {
    vec2.copy(this.focal, focal);
  }
}
