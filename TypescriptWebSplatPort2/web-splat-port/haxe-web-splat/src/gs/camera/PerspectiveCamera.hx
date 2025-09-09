package gs.camera;

import gl_matrix.Mat4;
import gl_matrix.Vec3;
import gl_matrix.Vec4;   // <- Quat is represented as a Vec4 in these externs
import gl_matrix.Quat;  // for the static Quat ops
import gs.pointcloud.Aabb;
import gs.camera.PerspectiveProjection;
import gs.camera.Internal;
import gs.camera.Types;

class PerspectiveCamera implements Types.Camera {
  public var position: Vec3;
  public var rotation: Quat;
  public var projection: PerspectiveProjection;

  public function new(position: Vec3, rotation: Quat, projection: PerspectiveProjection) {
    this.position = Vec3.clone(position);
    this.rotation = Quat.clone(rotation); // returns a Vec4
    this.projection = projection;
    Internal.clog('PerspectiveCamera.ctor', {
      position: js.Syntax.code("Array.from({0})", cast this.position),
      rotation: js.Syntax.code("Array.from({0})", cast this.rotation)
    });
  }

  // renamed from `default`
  public static function createDefault(): PerspectiveCamera {
    Internal.clog('PerspectiveCamera.createDefault()');
    return new PerspectiveCamera(
      Vec3.fromValues(0, 0, -1),
      cast Quat.create(), // cast the Vec4 to Quat
      new PerspectiveProjection(
        (45 * Math.PI) / 180,
        (45 * Math.PI) / 180,
        0.1,
        100,
        1
      )
    );
  }

  // simple 3D hypot helper
  private static inline function hypot3(x:Float, y:Float, z:Float):Float {
    return Math.sqrt(x * x + y * y + z * z);
  }

  public function fit_near_far(aabb: Aabb): Void {
    final c = aabb.center();
    final r = aabb.radius();
    final pos:js.lib.Float32Array = cast this.position; // indexable
    final d = hypot3(
      pos[0] - c.x,
      pos[1] - c.y,
      pos[2] - c.z
    );
    final zfar = d + r;
    final znear = Math.max(d - r, zfar / 1000.0);
    this.projection.zfar = zfar;
    this.projection.znear = znear;
  }

  public function viewMatrix(): Mat4 {
    final world = Mat4.create();
    Mat4.fromRotationTranslation(world, this.rotation, this.position);
    final view = Mat4.create();
    Mat4.invert(view, world);
    return view;
  }
  public inline function view_matrix(): Mat4 return this.viewMatrix();

  public function projMatrix(): Mat4 {
    final m = this.projection.projectionMatrix();
    Internal.clog('PerspectiveCamera.projMatrix()');
    return m;
  }
  public inline function proj_matrix(): Mat4 return this.projMatrix();

  public function positionVec(): Vec3 {
    return Vec3.clone(this.position);
  }

  public function frustum_planes(): Types.FrustumPlanes {
    final p = this.projMatrix();
    final v = this.viewMatrix();
    final pv = Mat4.create();
    Mat4.multiply(pv, p, v);
    final a:js.lib.Float32Array = cast pv; // indexable view

    inline function row(r:Int):Array<Float> {
      return [ a[0 + r], a[4 + r], a[8 + r], a[12 + r] ];
    }

    final r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);

    inline function add(x:Array<Float>, y:Array<Float>):Array<Float> {
      return [ x[0]+y[0], x[1]+y[1], x[2]+y[2], x[3]+y[3] ];
    }
    inline function sub(x:Array<Float>, y:Array<Float>):Array<Float> {
      return [ x[0]-y[0], x[1]-y[1], x[2]-y[2], x[3]-y[3] ];
    }
    inline function normalize(p:Array<Float>):Array<Float> {
      final n = hypot3(p[0], p[1], p[2]);
      return (n > 0) ? [ p[0]/n, p[1]/n, p[2]/n, p[3]/n ] : p;
    }

    final left   = normalize(add(r3, r0));
    final right  = normalize(sub(r3, r0));
    final bottom = normalize(add(r3, r1));
    final top    = normalize(sub(r3, r1));
    final near   = normalize(add(r3, r2));
    final far    = normalize(sub(r3, r2));

    Internal.clog('PerspectiveCamera.frustum_planes() computed');

    return { near: near, far: far, left: left, right: right, top: top, bottom: bottom };
  }

  public function lerp(other: PerspectiveCamera, amount: Float): PerspectiveCamera {
    final outPos = Vec3.create();
    Vec3.lerp(outPos, this.position, other.position, amount);
  
    final outRot = Quat.create();
    Quat.slerp(outRot, this.rotation, other.rotation, amount);
  
    final proj = this.projection.lerp(other.projection, amount);
  
    // cast Quat (Vec4) to Vec4 for constructor consistency
    final out = new PerspectiveCamera(outPos, cast outRot, proj);
  
    Internal.clog('PerspectiveCamera.lerp()', {
      amount: amount,
      fromPos: js.Syntax.code("Array.from({0})", this.position),
      toPos: js.Syntax.code("Array.from({0})", other.position)
    });
    return out;
  }
  
}
