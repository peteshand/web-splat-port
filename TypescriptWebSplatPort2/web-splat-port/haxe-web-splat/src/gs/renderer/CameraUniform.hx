package gs.renderer;

import gs.camera.Constants;

class CameraUniform {
  public var viewMatrix:Mat4;
  public var viewInvMatrix:Mat4;
  public var projMatrix:Mat4;
  public var projInvMatrix:Mat4;
  public var viewport:Vec2;
  public var focal:Vec2;

  public function new() {
    viewMatrix    = Mat4.create();
    viewInvMatrix = Mat4.create();
    projMatrix    = Mat4.create();
    projInvMatrix = Mat4.create();
    viewport      = Vec2.fromValues(1, 1);
    focal         = Vec2.fromValues(1, 1);
  }

  public function setViewMat(m:Mat4):Void {
    Mat4.copy(viewMatrix, m);
    Mat4.invert(viewInvMatrix, m);
  }

  public function setProjMat(m:Mat4):Void {
    var flipped = Mat4.create();
    Mat4.multiply(flipped, Constants.VIEWPORT_Y_FLIP, m); // <-- correct name & scope
    Mat4.copy(projMatrix, flipped);
    Mat4.invert(projInvMatrix, m);
  }

  public function setCamera(camera:Camera):Void {
    setProjMat(camera.projMatrix());
    setViewMat(camera.viewMatrix());
  }

  public function setViewport(v:Vec2):Void {
    Vec2.copy(viewport, v);
  }

  public function setFocal(f:Vec2):Void {
    Vec2.copy(focal, f);
  }
}
