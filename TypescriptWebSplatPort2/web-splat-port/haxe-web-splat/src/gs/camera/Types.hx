package gs.camera;

import gl_matrix.Mat4; // provides Mat4

/** A frustum plane is [nx, ny, nz, d]. */
typedef FrustumPlanes = {
  var near  : Array<Float>;
  var far   : Array<Float>;
  var left  : Array<Float>;
  var right : Array<Float>;
  var top   : Array<Float>;
  var bottom: Array<Float>;
}

/** Minimal camera interface used across the renderer. */
interface Camera {
  public function viewMatrix(): Mat4;
  public function projMatrix(): Mat4;

  // If you want to require these as well, keep them here; otherwise,
  // you can omit them and treat them as "optional" at call sites.
  public function view_matrix(): Mat4;
  public function proj_matrix(): Mat4;
  public function frustum_planes(): FrustumPlanes;
}
