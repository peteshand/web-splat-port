package camera;

import gl_matrix.Vec2;  // class Vec2 (static helpers), values are Float32Array
import gl_matrix.Mat4;  // class Mat4 (static helpers), values are Float32Array
import camera.Helpers;  // Helpers.build_proj / Helpers.fov2focal
import camera.Internal;

class PerspectiveProjection {
  public var fovx: Float;
  public var fovy: Float;
  public var znear: Float;
  public var zfar: Float;
  public var fov2view_ratio: Float;

  public function new(fovx: Float, fovy: Float, znear: Float, zfar: Float, fov2view_ratio: Float = 1) {
    this.fovx = fovx;
    this.fovy = fovy;
    this.znear = znear;
    this.zfar = zfar;
    this.fov2view_ratio = fov2view_ratio;
    Internal.clog('PerspectiveProjection.ctor', {
      fovx: fovx, fovy: fovy, znear: znear, zfar: zfar, fov2view_ratio: fov2view_ratio
    });
  }

  public static inline function create(viewport:Vec2, fov:Vec2, znear:Float, zfar:Float):PerspectiveProjection {
    final vp:js.lib.Float32Array = cast viewport; // allow a[0], a[1]
    final fv:js.lib.Float32Array = cast fov;

    final vr = vp[0] / Math.max(1, vp[1]);
    final fr = fv[0] / Math.max(1e-12, fv[1]);

    Internal.clog('2 PerspectiveProjection.new()', {
      viewport: [vp[0], vp[1]],
      fov: [fv[0], fv[1]],
      znear: znear, zfar: zfar, vr: vr, fr: fr
    });

    return new PerspectiveProjection(fv[0], fv[1], znear, zfar, vr / fr);
  }

  /** TS’s static `new(viewport,fov,...)` — Haxe-compatible name. */
  public static function fromViewport(viewport:Vec2, fov:Vec2, znear:Float, zfar:Float):PerspectiveProjection {
    final vp:js.lib.Float32Array = cast viewport;
    final fv:js.lib.Float32Array = cast fov;

    final vr = vp[0] / Math.max(1, vp[1]);
    final fr = fv[0] / Math.max(1e-12, fv[1]);

    Internal.clog('1 PerspectiveProjection.new()', {
      viewport: [vp[0], vp[1]],
      fov: [fv[0], fv[1]],
      znear: znear, zfar: zfar, vr: vr, fr: fr
    });

    return new PerspectiveProjection(fv[0], fv[1], znear, zfar, vr / fr);
  }

  public inline function projection_matrix(): Mat4 return this.projectionMatrix();

  public function projectionMatrix(): Mat4 {
    final m = Helpers.build_proj(this.znear, this.zfar, this.fovx, this.fovy);
    Internal.clog('projectionMatrix()', { fovx: this.fovx, fovy: this.fovy, znear: this.znear, zfar: this.zfar });
    return m;
  }

  public function resize(width: Float, height: Float): Void {
    final prev = { fovx: this.fovx, fovy: this.fovy };
    final ratio = width / Math.max(1.0, height);
  
    if (width > height) {
      this.fovy = (this.fovx / ratio) * this.fov2view_ratio;
    } else {
      this.fovx = this.fovy * ratio * this.fov2view_ratio;
    }
  
    Internal.clog('PerspectiveProjection.resize()', {
      width: width, height: height, ratio: ratio,
      before: prev, after: { fovx: this.fovx, fovy: this.fovy },
      fov2view_ratio: this.fov2view_ratio
    });
  }

  public function focal(viewport:Vec2):Vec2 {
    final vp:js.lib.Float32Array = cast viewport;
    final fx = Helpers.fov2focal(this.fovx, vp[0]);
    final fy = Helpers.fov2focal(this.fovy, vp[1]);
    final out = Vec2.fromValues(fx, fy);
    Internal.clog('PerspectiveProjection.focal()', { viewport: [vp[0], vp[1]], fx: fx, fy: fy });
    return out;
  }

  public function lerp(other: PerspectiveProjection, amount: Float): PerspectiveProjection {
    final a = amount, b = 1 - amount;
    final out = new PerspectiveProjection(
      this.fovx * b + other.fovx * a,
      this.fovy * b + other.fovy * a,
      this.znear * b + other.znear * a,
      this.zfar * b + other.zfar * a,
      this.fov2view_ratio * b + other.fov2view_ratio * a
    );
    Internal.clog('PerspectiveProjection.lerp()', {
      amount: amount,
      from: { fovx: this.fovx, fovy: this.fovy, znear: this.znear, zfar: this.zfar, r: this.fov2view_ratio },
      to:   { fovx: other.fovx, fovy: other.fovy, znear: other.znear, zfar: other.zfar, r: other.fov2view_ratio },
      out:  { fovx: out.fovx,  fovy: out.fovy,  znear: out.znear,  zfar: out.zfar,  r: out.fov2view_ratio }
    });
    return out;
  }
}
