package gs.camera;

import gl_matrix.Mat4; // API funcs
import gl_matrix.Mat3;
import gl_matrix.Vec3;
import gs.camera.Internal;

class Helpers {
  /** r: 3x3 rotation (column-major like gl-matrix), t: translation */
  public static function world2view(r:Mat3, t:Vec3):Mat4 {
    final world:Mat4 = Mat4.create();
    final w:js.lib.Float32Array = cast world; // indexable view of mat4
    final R:js.lib.Float32Array = cast r;     // indexable view of Mat3
    final T:js.lib.Float32Array = cast t;     // indexable view of Vec3
  
    // embed rotation (columns)
    w[0] = R[0];  w[1] = R[1];  w[2]  = R[2];
    w[4] = R[3];  w[5] = R[4];  w[6]  = R[5];
    w[8] = R[6];  w[9] = R[7];  w[10] = R[8];
  
    // last column is [0,0,0,1]
    w[12] = 0; w[13] = 0; w[14] = 0; w[15] = 1;
  
    // translation in the bottom row (matches what worked before)
    w[3]  = T[0];
    w[7]  = T[1];
    w[11] = T[2];
  
    final view = Mat4.create();
    Mat4.invert(view, world);
    Mat4.transpose(view, view);
    return view;
  }
  

  /** Perspective matrix matching the Rust version (post-transpose). */
  public static function build_proj(znear:Float, zfar:Float, fov_x:Float, fov_y:Float):Mat4 {
    final tanHalfY = Math.tan(fov_y * 0.5);
    final tanHalfX = Math.tan(fov_x * 0.5);

    final top = tanHalfY * znear;
    final bottom = -top;
    final right = tanHalfX * znear;
    final left = -right;

    final m:Mat4 = Mat4.create();
    final a:js.lib.Float32Array = cast m; // indexable view

    // Matches Rust build_proj() after its final transpose.
    a[0]  = (2 * znear) / (right - left);
    a[5]  = (2 * znear) / (top - bottom);
    a[8]  = (right + left) / (right - left);
    a[9]  = (top + bottom) / (top - bottom);
    a[11] = 1;
    a[10] = zfar / (zfar - znear);
    a[14] = -(zfar * znear) / (zfar - znear);
    a[15] = 0;

    return m;
  }

  public static function focal2fov(focal:Float, pixels:Float):Float {
    final out = 2 * Math.atan(pixels / (2 * focal));
    Internal.clog('focal2fov()', { focal: focal, pixels: pixels, out: out });
    return out;
  }

  public static function fov2focal(fov:Float, pixels:Float):Float {
    final out = pixels / (2 * Math.tan(fov * 0.5));
    Internal.clog('fov2focal()', { fov: fov, pixels: pixels, out: out });
    return out;
  }
}
