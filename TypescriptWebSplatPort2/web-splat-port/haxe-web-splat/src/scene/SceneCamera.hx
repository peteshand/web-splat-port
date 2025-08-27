package scene;

import gl_matrix.Mat3; // Mat3 extern (Float32Array)
import gl_matrix.Vec2; // Vec2 extern (Float32Array)
import gl_matrix.Vec3; // Vec3 extern (Float32Array)
import gl_matrix.Quat; // Quat extern (Float32Array)
import camera.PerspectiveCamera;
import camera.PerspectiveProjection;
import camera.Helpers;
import camera.Internal;

typedef Mat3x3 = Array<Array<Float>>;  // [[r00,r01,r02],[r10,r11,r12],[r20,r21,r22]]

class SceneCamera {
  public var id:Int;
  public var imgName:String;
  public var width:Int;
  public var height:Int;
  /** [x,y,z] */
  public var position:Array<Float>;
  /** 3x3 row-major rotation */
  public var rotation:Mat3x3;
  public var fx:Float;
  public var fy:Float;
  public var split:Split;

  public function new(
    id:Int,
    imgName:String,
    width:Int,
    height:Int,
    position:Array<Float>,
    rotation:Mat3x3,
    fx:Float,
    fy:Float,
    split:Split
  ) {
    this.id = id;
    this.imgName = imgName;
    this.width = width;
    this.height = height;
    this.position = position;
    this.rotation = rotation;
    this.fx = fx;
    this.fy = fy;
    this.split = split;
  }

  /** Build a SceneCamera from a runtime PerspectiveCamera + viewport. */
  public static function fromPerspective(
    cam:PerspectiveCamera,
    name:String,
    id:Int,
    viewport:Vec2,
    split:Split
  ):SceneCamera {
    final fx = Helpers.fov2focal(cam.projection.fovx, viewport[0]);
    final fy = Helpers.fov2focal(cam.projection.fovy, viewport[1]);

    final r = Mat3.create();
    Mat3.fromQuat(r, cam.rotation);

    final rotationArray:Mat3x3 = [
      [r[0], r[1], r[2]],
      [r[3], r[4], r[5]],
      [r[6], r[7], r[8]],
    ];

    return new SceneCamera(
      id,
      name,
      Std.int(viewport[0]),
      Std.int(viewport[1]),
      [cam.position[0], cam.position[1], cam.position[2]],
      rotationArray,
      fx,
      fy,
      split
    );
  }

  /** Convert back into a runtime PerspectiveCamera (znear/zfar are generic). */
  public function toPerspectiveCamera():PerspectiveCamera {
    final fovx = Helpers.focal2fov(this.fx, this.width);
    final fovy = Helpers.focal2fov(this.fy, this.height);
  
    final r = Mat3.fromValues(
      this.rotation[0][0], this.rotation[0][1], this.rotation[0][2],
      this.rotation[1][0], this.rotation[1][1], this.rotation[1][2],
      this.rotation[2][0], this.rotation[2][1], this.rotation[2][2]
    );
  
    // Fix handedness if needed
    if (Mat3.determinant(r) < 0) {
      r[1] = -r[1];  r[4] = -r[4];  r[7] = -r[7];
    }
  
    final q:Quat = Quat.create();
    // Prefer gl-matrix's helper if present; otherwise fallback math
    try {
      Quat.fromMat3(q, r);
    } catch (_:Dynamic) {
      final rf:js.lib.Float32Array = cast r;
      final qf:js.lib.Float32Array = cast q;
  
      final m00 = rf[0], m01 = rf[1], m02 = rf[2];
      final m10 = rf[3], m11 = rf[4], m12 = rf[5];
      final m20 = rf[6], m21 = rf[7], m22 = rf[8];
      final t = m00 + m11 + m22;
  
      if (t > 0) {
        final s = Math.sqrt(t + 1.0) * 2;
        qf[3] = 0.25 * s;
        qf[0] = (m21 - m12) / s;
        qf[1] = (m02 - m20) / s;
        qf[2] = (m10 - m01) / s;
      } else if (m00 > m11 && m00 > m22) {
        final s = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
        qf[3] = (m21 - m12) / s;
        qf[0] = 0.25 * s;
        qf[1] = (m01 + m10) / s;
        qf[2] = (m02 + m20) / s;
      } else if (m11 > m22) {
        final s = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
        qf[3] = (m02 - m20) / s;
        qf[0] = (m01 + m10) / s;
        qf[1] = 0.25 * s;
        qf[2] = (m12 + m21) / s;
      } else {
        final s = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
        qf[3] = (m10 - m01) / s;
        qf[0] = (m02 + m20) / s;
        qf[1] = (m12 + m21) / s;
        qf[2] = 0.25 * s;
      }
    }
    Quat.normalize(q, q);
  
    final pos = Vec3.fromValues(this.position[0], this.position[1], this.position[2]);
    final proj = PerspectiveProjection.create(
      Vec2.fromValues(this.width, this.height),
      Vec2.fromValues(fovx, fovy),
      0.01,
      100.0
    );
    return new PerspectiveCamera(pos, q, proj);
  }  

  public function hash():String {
    return haxe.Json.stringify({
      id: id,
      imgName: imgName,
      width: width,
      height: height,
      position: position,
      rotation: rotation,
      fx: fx,
      fy: fy,
      split: split
    });
  }

  public function clone():SceneCamera {
    return new SceneCamera(
      this.id,
      this.imgName,
      this.width,
      this.height,
      [ for (v in this.position) v ],
      [
        [ for (v in this.rotation[0]) v ],
        [ for (v in this.rotation[1]) v ],
        [ for (v in this.rotation[2]) v ],
      ],
      this.fx,
      this.fy,
      this.split
    );
  }
}
