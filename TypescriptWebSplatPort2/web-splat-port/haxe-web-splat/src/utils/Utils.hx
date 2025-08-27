// utils/Utils.hx
package utils;

class Utils {
  /** Map KeyboardEvent.code like "Digit3" -> 3, otherwise null */
  public static inline function key_to_num(code:String):Null<Int> {
    return switch (code) {
      case "Digit0": 0; case "Digit1": 1; case "Digit2": 2; case "Digit3": 3; case "Digit4": 4;
      case "Digit5": 5; case "Digit6": 6; case "Digit7": 7; case "Digit8": 8; case "Digit9": 9;
      default: null;
    }
  }

  /** Number of SH coefficients for degree `sh_deg` ( (n+1)^2 ). */
  public static inline function sh_num_coefficients(sh_deg:Int):Int {
    return (sh_deg + 1) * (sh_deg + 1);
  }

  /** Inverse of sh_num_coefficients: returns degree if n is a perfect square; else null. */
  public static inline function sh_deg_from_num_coefs(n:Int):Null<Int> {
    final sqrt = Math.sqrt(n);
    return (sqrt == Math.floor(sqrt)) ? Std.int(sqrt) - 1 : null;
  }

  /**
   * Covariance (upper-triangular packed) from quaternion (x,y,z,w) and scales (sx,sy,sz).
   * Returns Float32Array(6): [m00, m01, m02, m11, m12, m22]
   */
  public static function buildCovScalar(
    qx:Float, qy:Float, qz:Float, qw:Float, sx:Float, sy:Float, sz:Float, ?out6:Float32Array
  ):Float32Array {
    final d0 = sx * sx, d1 = sy * sy, d2 = sz * sz;

    final xx = qx * qx, yy = qy * qy, zz = qz * qz;
    final xy = qx * qy, xz = qx * qz, yz = qy * qz;
    final wx = qw * qx, wy = qw * qy, wz = qw * qz;

    final r00 = 1 - 2 * (yy + zz);
    final r01 = 2 * (xy - wz);
    final r02 = 2 * (xz + wy);

    final r10 = 2 * (xy + wz);
    final r11 = 1 - 2 * (xx + zz);
    final r12 = 2 * (yz - wx);

    final r20 = 2 * (xz - wy);
    final r21 = 2 * (yz + wx);
    final r22 = 1 - 2 * (xx + yy);

    final rd00 = r00 * d0, rd01 = r01 * d1, rd02 = r02 * d2;
    final rd10 = r10 * d0, rd11 = r11 * d1, rd12 = r12 * d2;
    final rd20 = r20 * d0, rd21 = r21 * d1, rd22 = r22 * d2;

    final m00 = rd00 * r00 + rd01 * r01 + rd02 * r02;
    final m01 = rd00 * r10 + rd01 * r11 + rd02 * r12;
    final m02 = rd00 * r20 + rd01 * r21 + rd02 * r22;

    final m11 = rd10 * r10 + rd11 * r11 + rd12 * r12;
    final m12 = rd10 * r20 + rd11 * r21 + rd12 * r22;

    final m22 = rd20 * r20 + rd21 * r21 + rd22 * r22;

    final out = out6 != null ? out6 : new Float32Array(6);
    out[0] = m00; out[1] = m01; out[2] = m02;
    out[3] = m11; out[4] = m12; out[5] = m22;
    return out;
  }

  /** Back-compat wrapper; returns plain Array<Float> */
  public static inline function build_cov(rotation:Array<Float>, scale:Array<Float>):Array<Float> {
    final tmp = buildCovScalar(rotation[0], rotation[1], rotation[2], rotation[3], scale[0], scale[1], scale[2]);
    return [tmp[0], tmp[1], tmp[2], tmp[3], tmp[4], tmp[5]];
  }

  /** Numerically stable sigmoid */
  public static inline function sigmoid(x:Float):Float {
    return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
  }

  // Optional camelCase aliases (TS parity)
  public static inline function shNumCoefficients(n:Int):Int return sh_num_coefficients(n);
  public static inline function shDegFromNumCoefs(n:Int):Null<Int> return sh_deg_from_num_coefs(n);
  public static inline function buildCov(rotation:Array<Float>, scale:Array<Float>):Array<Float> return build_cov(rotation, scale);
}
