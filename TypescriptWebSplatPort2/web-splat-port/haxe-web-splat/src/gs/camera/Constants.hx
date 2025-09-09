package gs.camera;

import gl_matrix.Mat4; // exposes Mat4

class Constants {
  public static final VIEWPORT_Y_FLIP:Mat4 = Mat4.fromValues(
    1,  0, 0, 0,
    0, -1, 0, 0,
    0,  0, 1, 0,
    0,  0, 0, 1
  );
}
