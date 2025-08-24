var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/gl-matrix/esm/common.js
var EPSILON = 1e-6;
var ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
var RANDOM = Math.random;
var ANGLE_ORDER = "zyx";
function round(a) {
  if (a >= 0) return Math.round(a);
  return a % 0.5 === 0 ? Math.floor(a) : Math.round(a);
}
var degree = Math.PI / 180;
var radian = 180 / Math.PI;

// node_modules/gl-matrix/esm/mat3.js
var mat3_exports = {};
__export(mat3_exports, {
  add: () => add,
  adjoint: () => adjoint,
  clone: () => clone,
  copy: () => copy,
  create: () => create,
  determinant: () => determinant,
  equals: () => equals,
  exactEquals: () => exactEquals,
  frob: () => frob,
  fromMat2d: () => fromMat2d,
  fromMat4: () => fromMat4,
  fromQuat: () => fromQuat,
  fromRotation: () => fromRotation,
  fromScaling: () => fromScaling,
  fromTranslation: () => fromTranslation,
  fromValues: () => fromValues,
  identity: () => identity,
  invert: () => invert,
  mul: () => mul,
  multiply: () => multiply,
  multiplyScalar: () => multiplyScalar,
  multiplyScalarAndAdd: () => multiplyScalarAndAdd,
  normalFromMat4: () => normalFromMat4,
  projection: () => projection,
  rotate: () => rotate,
  scale: () => scale,
  set: () => set,
  str: () => str,
  sub: () => sub,
  subtract: () => subtract,
  translate: () => translate,
  transpose: () => transpose
});
function create() {
  var out = new ARRAY_TYPE(9);
  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }
  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
function clone(a) {
  var out = new ARRAY_TYPE(9);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
function copy(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
function fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  var out = new ARRAY_TYPE(9);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
function set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m10;
  out[4] = m11;
  out[5] = m12;
  out[6] = m20;
  out[7] = m21;
  out[8] = m22;
  return out;
}
function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
function transpose(out, a) {
  if (out === a) {
    var a01 = a[1], a02 = a[2], a12 = a[5];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a01;
    out[5] = a[7];
    out[6] = a02;
    out[7] = a12;
  } else {
    out[0] = a[0];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a[1];
    out[4] = a[4];
    out[5] = a[7];
    out[6] = a[2];
    out[7] = a[5];
    out[8] = a[8];
  }
  return out;
}
function invert(out, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2];
  var a10 = a[3], a11 = a[4], a12 = a[5];
  var a20 = a[6], a21 = a[7], a22 = a[8];
  var b01 = a22 * a11 - a12 * a21;
  var b11 = -a22 * a10 + a12 * a20;
  var b21 = a21 * a10 - a11 * a20;
  var det = a00 * b01 + a01 * b11 + a02 * b21;
  if (!det) {
    return null;
  }
  det = 1 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}
function adjoint(out, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2];
  var a10 = a[3], a11 = a[4], a12 = a[5];
  var a20 = a[6], a21 = a[7], a22 = a[8];
  out[0] = a11 * a22 - a12 * a21;
  out[1] = a02 * a21 - a01 * a22;
  out[2] = a01 * a12 - a02 * a11;
  out[3] = a12 * a20 - a10 * a22;
  out[4] = a00 * a22 - a02 * a20;
  out[5] = a02 * a10 - a00 * a12;
  out[6] = a10 * a21 - a11 * a20;
  out[7] = a01 * a20 - a00 * a21;
  out[8] = a00 * a11 - a01 * a10;
  return out;
}
function determinant(a) {
  var a00 = a[0], a01 = a[1], a02 = a[2];
  var a10 = a[3], a11 = a[4], a12 = a[5];
  var a20 = a[6], a21 = a[7], a22 = a[8];
  return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
}
function multiply(out, a, b) {
  var a00 = a[0], a01 = a[1], a02 = a[2];
  var a10 = a[3], a11 = a[4], a12 = a[5];
  var a20 = a[6], a21 = a[7], a22 = a[8];
  var b00 = b[0], b01 = b[1], b02 = b[2];
  var b10 = b[3], b11 = b[4], b12 = b[5];
  var b20 = b[6], b21 = b[7], b22 = b[8];
  out[0] = b00 * a00 + b01 * a10 + b02 * a20;
  out[1] = b00 * a01 + b01 * a11 + b02 * a21;
  out[2] = b00 * a02 + b01 * a12 + b02 * a22;
  out[3] = b10 * a00 + b11 * a10 + b12 * a20;
  out[4] = b10 * a01 + b11 * a11 + b12 * a21;
  out[5] = b10 * a02 + b11 * a12 + b12 * a22;
  out[6] = b20 * a00 + b21 * a10 + b22 * a20;
  out[7] = b20 * a01 + b21 * a11 + b22 * a21;
  out[8] = b20 * a02 + b21 * a12 + b22 * a22;
  return out;
}
function translate(out, a, v) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], x = v[0], y = v[1];
  out[0] = a00;
  out[1] = a01;
  out[2] = a02;
  out[3] = a10;
  out[4] = a11;
  out[5] = a12;
  out[6] = x * a00 + y * a10 + a20;
  out[7] = x * a01 + y * a11 + a21;
  out[8] = x * a02 + y * a12 + a22;
  return out;
}
function rotate(out, a, rad) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], s = Math.sin(rad), c = Math.cos(rad);
  out[0] = c * a00 + s * a10;
  out[1] = c * a01 + s * a11;
  out[2] = c * a02 + s * a12;
  out[3] = c * a10 - s * a00;
  out[4] = c * a11 - s * a01;
  out[5] = c * a12 - s * a02;
  out[6] = a20;
  out[7] = a21;
  out[8] = a22;
  return out;
}
function scale(out, a, v) {
  var x = v[0], y = v[1];
  out[0] = x * a[0];
  out[1] = x * a[1];
  out[2] = x * a[2];
  out[3] = y * a[3];
  out[4] = y * a[4];
  out[5] = y * a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  return out;
}
function fromTranslation(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 1;
  out[5] = 0;
  out[6] = v[0];
  out[7] = v[1];
  out[8] = 1;
  return out;
}
function fromRotation(out, rad) {
  var s = Math.sin(rad), c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = -s;
  out[4] = c;
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = v[1];
  out[5] = 0;
  out[6] = 0;
  out[7] = 0;
  out[8] = 1;
  return out;
}
function fromMat2d(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = 0;
  out[3] = a[2];
  out[4] = a[3];
  out[5] = 0;
  out[6] = a[4];
  out[7] = a[5];
  out[8] = 1;
  return out;
}
function fromQuat(out, q) {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[3] = yx - wz;
  out[6] = zx + wy;
  out[1] = yx + wz;
  out[4] = 1 - xx - zz;
  out[7] = zy - wx;
  out[2] = zx - wy;
  out[5] = zy + wx;
  out[8] = 1 - xx - yy;
  return out;
}
function normalFromMat4(out, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32;
  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
    return null;
  }
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  return out;
}
function projection(out, width, height) {
  out[0] = 2 / width;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = -2 / height;
  out[5] = 0;
  out[6] = -1;
  out[7] = 1;
  out[8] = 1;
  return out;
}
function str(a) {
  return "mat3(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ")";
}
function frob(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + a[6] * a[6] + a[7] * a[7] + a[8] * a[8]);
}
function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  return out;
}
function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  return out;
}
function multiplyScalar(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  return out;
}
function multiplyScalarAndAdd(out, a, b, scale7) {
  out[0] = a[0] + b[0] * scale7;
  out[1] = a[1] + b[1] * scale7;
  out[2] = a[2] + b[2] * scale7;
  out[3] = a[3] + b[3] * scale7;
  out[4] = a[4] + b[4] * scale7;
  out[5] = a[5] + b[5] * scale7;
  out[6] = a[6] + b[6] * scale7;
  out[7] = a[7] + b[7] * scale7;
  out[8] = a[8] + b[8] * scale7;
  return out;
}
function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
}
function equals(a, b) {
  var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8];
  var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8));
}
var mul = multiply;
var sub = subtract;

// node_modules/gl-matrix/esm/mat4.js
var mat4_exports = {};
__export(mat4_exports, {
  add: () => add2,
  adjoint: () => adjoint2,
  clone: () => clone2,
  copy: () => copy2,
  create: () => create2,
  decompose: () => decompose,
  determinant: () => determinant2,
  equals: () => equals2,
  exactEquals: () => exactEquals2,
  frob: () => frob2,
  fromQuat: () => fromQuat3,
  fromQuat2: () => fromQuat2,
  fromRotation: () => fromRotation2,
  fromRotationTranslation: () => fromRotationTranslation,
  fromRotationTranslationScale: () => fromRotationTranslationScale,
  fromRotationTranslationScaleOrigin: () => fromRotationTranslationScaleOrigin,
  fromScaling: () => fromScaling2,
  fromTranslation: () => fromTranslation2,
  fromValues: () => fromValues2,
  fromXRotation: () => fromXRotation,
  fromYRotation: () => fromYRotation,
  fromZRotation: () => fromZRotation,
  frustum: () => frustum,
  getRotation: () => getRotation,
  getScaling: () => getScaling,
  getTranslation: () => getTranslation,
  identity: () => identity2,
  invert: () => invert2,
  lookAt: () => lookAt,
  mul: () => mul2,
  multiply: () => multiply2,
  multiplyScalar: () => multiplyScalar2,
  multiplyScalarAndAdd: () => multiplyScalarAndAdd2,
  ortho: () => ortho,
  orthoNO: () => orthoNO,
  orthoZO: () => orthoZO,
  perspective: () => perspective,
  perspectiveFromFieldOfView: () => perspectiveFromFieldOfView,
  perspectiveNO: () => perspectiveNO,
  perspectiveZO: () => perspectiveZO,
  rotate: () => rotate2,
  rotateX: () => rotateX,
  rotateY: () => rotateY,
  rotateZ: () => rotateZ,
  scale: () => scale2,
  set: () => set2,
  str: () => str2,
  sub: () => sub2,
  subtract: () => subtract2,
  targetTo: () => targetTo,
  translate: () => translate2,
  transpose: () => transpose2
});
function create2() {
  var out = new ARRAY_TYPE(16);
  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
function clone2(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
function copy2(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
function fromValues2(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  var out = new ARRAY_TYPE(16);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
function set2(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = m03;
  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = m13;
  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = m23;
  out[12] = m30;
  out[13] = m31;
  out[14] = m32;
  out[15] = m33;
  return out;
}
function identity2(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function transpose2(out, a) {
  if (out === a) {
    var a01 = a[1], a02 = a[2], a03 = a[3];
    var a12 = a[6], a13 = a[7];
    var a23 = a[11];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;
  } else {
    out[0] = a[0];
    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a[1];
    out[5] = a[5];
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a[2];
    out[9] = a[6];
    out[10] = a[10];
    out[11] = a[14];
    out[12] = a[3];
    out[13] = a[7];
    out[14] = a[11];
    out[15] = a[15];
  }
  return out;
}
function invert2(out, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32;
  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) {
    return null;
  }
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
function adjoint2(out, a) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32;
  out[0] = a11 * b11 - a12 * b10 + a13 * b09;
  out[1] = a02 * b10 - a01 * b11 - a03 * b09;
  out[2] = a31 * b05 - a32 * b04 + a33 * b03;
  out[3] = a22 * b04 - a21 * b05 - a23 * b03;
  out[4] = a12 * b08 - a10 * b11 - a13 * b07;
  out[5] = a00 * b11 - a02 * b08 + a03 * b07;
  out[6] = a32 * b02 - a30 * b05 - a33 * b01;
  out[7] = a20 * b05 - a22 * b02 + a23 * b01;
  out[8] = a10 * b10 - a11 * b08 + a13 * b06;
  out[9] = a01 * b08 - a00 * b10 - a03 * b06;
  out[10] = a30 * b04 - a31 * b02 + a33 * b00;
  out[11] = a21 * b02 - a20 * b04 - a23 * b00;
  out[12] = a11 * b07 - a10 * b09 - a12 * b06;
  out[13] = a00 * b09 - a01 * b07 + a02 * b06;
  out[14] = a31 * b01 - a30 * b03 - a32 * b00;
  out[15] = a20 * b03 - a21 * b01 + a22 * b00;
  return out;
}
function determinant2(a) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b0 = a00 * a11 - a01 * a10;
  var b1 = a00 * a12 - a02 * a10;
  var b2 = a01 * a12 - a02 * a11;
  var b3 = a20 * a31 - a21 * a30;
  var b4 = a20 * a32 - a22 * a30;
  var b5 = a21 * a32 - a22 * a31;
  var b6 = a00 * b5 - a01 * b4 + a02 * b3;
  var b7 = a10 * b5 - a11 * b4 + a12 * b3;
  var b8 = a20 * b2 - a21 * b1 + a22 * b0;
  var b9 = a30 * b2 - a31 * b1 + a32 * b0;
  return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
}
function multiply2(out, a, b) {
  var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
function translate2(out, a, v) {
  var x = v[0], y = v[1], z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }
  return out;
}
function scale2(out, a, v) {
  var x = v[0], y = v[1], z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
function rotate2(out, a, rad, axis) {
  var x = axis[0], y = axis[1], z = axis[2];
  var len5 = Math.sqrt(x * x + y * y + z * z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;
  if (len5 < EPSILON) {
    return null;
  }
  len5 = 1 / len5;
  x *= len5;
  y *= len5;
  z *= len5;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11];
  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c;
  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;
  if (a !== out) {
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  return out;
}
function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];
  if (a !== out) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];
  if (a !== out) {
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  if (a !== out) {
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }
  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
function fromTranslation2(out, v) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
function fromScaling2(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function fromRotation2(out, rad, axis) {
  var x = axis[0], y = axis[1], z = axis[2];
  var len5 = Math.sqrt(x * x + y * y + z * z);
  var s, c, t;
  if (len5 < EPSILON) {
    return null;
  }
  len5 = 1 / len5;
  x *= len5;
  y *= len5;
  z *= len5;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  out[0] = x * x * t + c;
  out[1] = y * x * t + z * s;
  out[2] = z * x * t - y * s;
  out[3] = 0;
  out[4] = x * y * t - z * s;
  out[5] = y * y * t + c;
  out[6] = z * y * t + x * s;
  out[7] = 0;
  out[8] = x * z * t + y * s;
  out[9] = y * z * t - x * s;
  out[10] = z * z * t + c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function fromXRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = c;
  out[6] = s;
  out[7] = 0;
  out[8] = 0;
  out[9] = -s;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function fromYRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = c;
  out[1] = 0;
  out[2] = -s;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = s;
  out[9] = 0;
  out[10] = c;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function fromZRotation(out, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  out[0] = c;
  out[1] = s;
  out[2] = 0;
  out[3] = 0;
  out[4] = -s;
  out[5] = c;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function fromRotationTranslation(out, q, v) {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
function fromQuat2(out, a) {
  var translation = new ARRAY_TYPE(3);
  var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7];
  var magnitude = bx * bx + by * by + bz * bz + bw * bw;
  if (magnitude > 0) {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  } else {
    translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  }
  fromRotationTranslation(out, a, translation);
  return out;
}
function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
function getScaling(out, mat) {
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
  out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
  out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
  return out;
}
function getRotation(out, mat) {
  var scaling = new ARRAY_TYPE(3);
  getScaling(scaling, mat);
  var is1 = 1 / scaling[0];
  var is2 = 1 / scaling[1];
  var is3 = 1 / scaling[2];
  var sm11 = mat[0] * is1;
  var sm12 = mat[1] * is2;
  var sm13 = mat[2] * is3;
  var sm21 = mat[4] * is1;
  var sm22 = mat[5] * is2;
  var sm23 = mat[6] * is3;
  var sm31 = mat[8] * is1;
  var sm32 = mat[9] * is2;
  var sm33 = mat[10] * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;
  if (trace > 0) {
    S = Math.sqrt(trace + 1) * 2;
    out[3] = 0.25 * S;
    out[0] = (sm23 - sm32) / S;
    out[1] = (sm31 - sm13) / S;
    out[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
    out[3] = (sm23 - sm32) / S;
    out[0] = 0.25 * S;
    out[1] = (sm12 + sm21) / S;
    out[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
    out[3] = (sm31 - sm13) / S;
    out[0] = (sm12 + sm21) / S;
    out[1] = 0.25 * S;
    out[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
    out[3] = (sm12 - sm21) / S;
    out[0] = (sm31 + sm13) / S;
    out[1] = (sm23 + sm32) / S;
    out[2] = 0.25 * S;
  }
  return out;
}
function decompose(out_r, out_t, out_s, mat) {
  out_t[0] = mat[12];
  out_t[1] = mat[13];
  out_t[2] = mat[14];
  var m11 = mat[0];
  var m12 = mat[1];
  var m13 = mat[2];
  var m21 = mat[4];
  var m22 = mat[5];
  var m23 = mat[6];
  var m31 = mat[8];
  var m32 = mat[9];
  var m33 = mat[10];
  out_s[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
  out_s[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
  out_s[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
  var is1 = 1 / out_s[0];
  var is2 = 1 / out_s[1];
  var is3 = 1 / out_s[2];
  var sm11 = m11 * is1;
  var sm12 = m12 * is2;
  var sm13 = m13 * is3;
  var sm21 = m21 * is1;
  var sm22 = m22 * is2;
  var sm23 = m23 * is3;
  var sm31 = m31 * is1;
  var sm32 = m32 * is2;
  var sm33 = m33 * is3;
  var trace = sm11 + sm22 + sm33;
  var S = 0;
  if (trace > 0) {
    S = Math.sqrt(trace + 1) * 2;
    out_r[3] = 0.25 * S;
    out_r[0] = (sm23 - sm32) / S;
    out_r[1] = (sm31 - sm13) / S;
    out_r[2] = (sm12 - sm21) / S;
  } else if (sm11 > sm22 && sm11 > sm33) {
    S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
    out_r[3] = (sm23 - sm32) / S;
    out_r[0] = 0.25 * S;
    out_r[1] = (sm12 + sm21) / S;
    out_r[2] = (sm31 + sm13) / S;
  } else if (sm22 > sm33) {
    S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
    out_r[3] = (sm31 - sm13) / S;
    out_r[0] = (sm12 + sm21) / S;
    out_r[1] = 0.25 * S;
    out_r[2] = (sm23 + sm32) / S;
  } else {
    S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
    out_r[3] = (sm12 - sm21) / S;
    out_r[0] = (sm31 + sm13) / S;
    out_r[1] = (sm23 + sm32) / S;
    out_r[2] = 0.25 * S;
  }
  return out_r;
}
function fromRotationTranslationScale(out, q, v, s) {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}
function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  var ox = o[0];
  var oy = o[1];
  var oz = o[2];
  var out0 = (1 - (yy + zz)) * sx;
  var out1 = (xy + wz) * sx;
  var out2 = (xz - wy) * sx;
  var out4 = (xy - wz) * sy;
  var out5 = (1 - (xx + zz)) * sy;
  var out6 = (yz + wx) * sy;
  var out8 = (xz + wy) * sz;
  var out9 = (yz - wx) * sz;
  var out10 = (1 - (xx + yy)) * sz;
  out[0] = out0;
  out[1] = out1;
  out[2] = out2;
  out[3] = 0;
  out[4] = out4;
  out[5] = out5;
  out[6] = out6;
  out[7] = 0;
  out[8] = out8;
  out[9] = out9;
  out[10] = out10;
  out[11] = 0;
  out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  out[15] = 1;
  return out;
}
function fromQuat3(out, q) {
  var x = q[0], y = q[1], z = q[2], w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var yx = y * x2;
  var yy = y * y2;
  var zx = z * x2;
  var zy = z * y2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  out[0] = 1 - yy - zz;
  out[1] = yx + wz;
  out[2] = zx - wy;
  out[3] = 0;
  out[4] = yx - wz;
  out[5] = 1 - xx - zz;
  out[6] = zy + wx;
  out[7] = 0;
  out[8] = zx + wy;
  out[9] = zy - wx;
  out[10] = 1 - xx - yy;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
function frustum(out, left, right, bottom, top, near2, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near2 - far);
  out[0] = near2 * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near2 * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near2) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near2 * 2 * nf;
  out[15] = 0;
  return out;
}
function perspectiveNO(out, fovy, aspect, near2, far) {
  var f = 1 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;
  if (far != null && far !== Infinity) {
    var nf = 1 / (near2 - far);
    out[10] = (far + near2) * nf;
    out[14] = 2 * far * near2 * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near2;
  }
  return out;
}
var perspective = perspectiveNO;
function perspectiveZO(out, fovy, aspect, near2, far) {
  var f = 1 / Math.tan(fovy / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;
  if (far != null && far !== Infinity) {
    var nf = 1 / (near2 - far);
    out[10] = far * nf;
    out[14] = far * near2 * nf;
  } else {
    out[10] = -1;
    out[14] = -near2;
  }
  return out;
}
function perspectiveFromFieldOfView(out, fov, near2, far) {
  var upTan = Math.tan(fov.upDegrees * Math.PI / 180);
  var downTan = Math.tan(fov.downDegrees * Math.PI / 180);
  var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180);
  var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180);
  var xScale = 2 / (leftTan + rightTan);
  var yScale = 2 / (upTan + downTan);
  out[0] = xScale;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = yScale;
  out[6] = 0;
  out[7] = 0;
  out[8] = -((leftTan - rightTan) * xScale * 0.5);
  out[9] = (upTan - downTan) * yScale * 0.5;
  out[10] = far / (near2 - far);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near2 / (near2 - far);
  out[15] = 0;
  return out;
}
function orthoNO(out, left, right, bottom, top, near2, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near2 - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near2) * nf;
  out[15] = 1;
  return out;
}
var ortho = orthoNO;
function orthoZO(out, left, right, bottom, top, near2, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near2 - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = near2 * nf;
  out[15] = 1;
  return out;
}
function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len5;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];
  if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
    return identity2(out);
  }
  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len5 = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
  z0 *= len5;
  z1 *= len5;
  z2 *= len5;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len5 = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
  if (!len5) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len5 = 1 / len5;
    x0 *= len5;
    x1 *= len5;
    x2 *= len5;
  }
  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len5 = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
  if (!len5) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len5 = 1 / len5;
    y0 *= len5;
    y1 *= len5;
    y2 *= len5;
  }
  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}
function targetTo(out, eye, target, up) {
  var eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2];
  var z0 = eyex - target[0], z1 = eyey - target[1], z2 = eyez - target[2];
  var len5 = z0 * z0 + z1 * z1 + z2 * z2;
  if (len5 > 0) {
    len5 = 1 / Math.sqrt(len5);
    z0 *= len5;
    z1 *= len5;
    z2 *= len5;
  }
  var x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
  len5 = x0 * x0 + x1 * x1 + x2 * x2;
  if (len5 > 0) {
    len5 = 1 / Math.sqrt(len5);
    x0 *= len5;
    x1 *= len5;
    x2 *= len5;
  }
  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}
function str2(a) {
  return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
}
function frob2(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + a[6] * a[6] + a[7] * a[7] + a[8] * a[8] + a[9] * a[9] + a[10] * a[10] + a[11] * a[11] + a[12] * a[12] + a[13] * a[13] + a[14] * a[14] + a[15] * a[15]);
}
function add2(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  out[4] = a[4] + b[4];
  out[5] = a[5] + b[5];
  out[6] = a[6] + b[6];
  out[7] = a[7] + b[7];
  out[8] = a[8] + b[8];
  out[9] = a[9] + b[9];
  out[10] = a[10] + b[10];
  out[11] = a[11] + b[11];
  out[12] = a[12] + b[12];
  out[13] = a[13] + b[13];
  out[14] = a[14] + b[14];
  out[15] = a[15] + b[15];
  return out;
}
function subtract2(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  out[4] = a[4] - b[4];
  out[5] = a[5] - b[5];
  out[6] = a[6] - b[6];
  out[7] = a[7] - b[7];
  out[8] = a[8] - b[8];
  out[9] = a[9] - b[9];
  out[10] = a[10] - b[10];
  out[11] = a[11] - b[11];
  out[12] = a[12] - b[12];
  out[13] = a[13] - b[13];
  out[14] = a[14] - b[14];
  out[15] = a[15] - b[15];
  return out;
}
function multiplyScalar2(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  out[4] = a[4] * b;
  out[5] = a[5] * b;
  out[6] = a[6] * b;
  out[7] = a[7] * b;
  out[8] = a[8] * b;
  out[9] = a[9] * b;
  out[10] = a[10] * b;
  out[11] = a[11] * b;
  out[12] = a[12] * b;
  out[13] = a[13] * b;
  out[14] = a[14] * b;
  out[15] = a[15] * b;
  return out;
}
function multiplyScalarAndAdd2(out, a, b, scale7) {
  out[0] = a[0] + b[0] * scale7;
  out[1] = a[1] + b[1] * scale7;
  out[2] = a[2] + b[2] * scale7;
  out[3] = a[3] + b[3] * scale7;
  out[4] = a[4] + b[4] * scale7;
  out[5] = a[5] + b[5] * scale7;
  out[6] = a[6] + b[6] * scale7;
  out[7] = a[7] + b[7] * scale7;
  out[8] = a[8] + b[8] * scale7;
  out[9] = a[9] + b[9] * scale7;
  out[10] = a[10] + b[10] * scale7;
  out[11] = a[11] + b[11] * scale7;
  out[12] = a[12] + b[12] * scale7;
  out[13] = a[13] + b[13] * scale7;
  out[14] = a[14] + b[14] * scale7;
  out[15] = a[15] + b[15] * scale7;
  return out;
}
function exactEquals2(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
}
function equals2(a, b) {
  var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
  var a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
  var a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
  var a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
  var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  var b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
  var b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
  var b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= EPSILON * Math.max(1, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= EPSILON * Math.max(1, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= EPSILON * Math.max(1, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= EPSILON * Math.max(1, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= EPSILON * Math.max(1, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= EPSILON * Math.max(1, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= EPSILON * Math.max(1, Math.abs(a15), Math.abs(b15));
}
var mul2 = multiply2;
var sub2 = subtract2;

// node_modules/gl-matrix/esm/quat.js
var quat_exports = {};
__export(quat_exports, {
  add: () => add5,
  calculateW: () => calculateW,
  clone: () => clone5,
  conjugate: () => conjugate,
  copy: () => copy5,
  create: () => create5,
  dot: () => dot3,
  equals: () => equals5,
  exactEquals: () => exactEquals5,
  exp: () => exp,
  fromEuler: () => fromEuler,
  fromMat3: () => fromMat3,
  fromValues: () => fromValues5,
  getAngle: () => getAngle,
  getAxisAngle: () => getAxisAngle,
  identity: () => identity3,
  invert: () => invert3,
  len: () => len3,
  length: () => length3,
  lerp: () => lerp3,
  ln: () => ln,
  mul: () => mul5,
  multiply: () => multiply5,
  normalize: () => normalize3,
  pow: () => pow,
  random: () => random3,
  rotateX: () => rotateX3,
  rotateY: () => rotateY3,
  rotateZ: () => rotateZ3,
  rotationTo: () => rotationTo,
  scale: () => scale5,
  set: () => set5,
  setAxes: () => setAxes,
  setAxisAngle: () => setAxisAngle,
  slerp: () => slerp2,
  sqlerp: () => sqlerp,
  sqrLen: () => sqrLen3,
  squaredLength: () => squaredLength3,
  str: () => str5
});

// node_modules/gl-matrix/esm/vec3.js
var vec3_exports = {};
__export(vec3_exports, {
  add: () => add3,
  angle: () => angle,
  bezier: () => bezier,
  ceil: () => ceil,
  clone: () => clone3,
  copy: () => copy3,
  create: () => create3,
  cross: () => cross,
  dist: () => dist,
  distance: () => distance,
  div: () => div,
  divide: () => divide,
  dot: () => dot,
  equals: () => equals3,
  exactEquals: () => exactEquals3,
  floor: () => floor,
  forEach: () => forEach,
  fromValues: () => fromValues3,
  hermite: () => hermite,
  inverse: () => inverse,
  len: () => len,
  length: () => length,
  lerp: () => lerp,
  max: () => max,
  min: () => min,
  mul: () => mul3,
  multiply: () => multiply3,
  negate: () => negate,
  normalize: () => normalize,
  random: () => random,
  rotateX: () => rotateX2,
  rotateY: () => rotateY2,
  rotateZ: () => rotateZ2,
  round: () => round2,
  scale: () => scale3,
  scaleAndAdd: () => scaleAndAdd,
  set: () => set3,
  slerp: () => slerp,
  sqrDist: () => sqrDist,
  sqrLen: () => sqrLen,
  squaredDistance: () => squaredDistance,
  squaredLength: () => squaredLength,
  str: () => str3,
  sub: () => sub3,
  subtract: () => subtract3,
  transformMat3: () => transformMat3,
  transformMat4: () => transformMat4,
  transformQuat: () => transformQuat,
  zero: () => zero
});
function create3() {
  var out = new ARRAY_TYPE(3);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  return out;
}
function clone3(a) {
  var out = new ARRAY_TYPE(3);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.sqrt(x * x + y * y + z * z);
}
function fromValues3(x, y, z) {
  var out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
function copy3(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}
function set3(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
function add3(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
function subtract3(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
function multiply3(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
function divide(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  return out;
}
function ceil(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  return out;
}
function floor(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  return out;
}
function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
function round2(out, a) {
  out[0] = round(a[0]);
  out[1] = round(a[1]);
  out[2] = round(a[2]);
  return out;
}
function scale3(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
function scaleAndAdd(out, a, b, scale7) {
  out[0] = a[0] + b[0] * scale7;
  out[1] = a[1] + b[1] * scale7;
  out[2] = a[2] + b[2] * scale7;
  return out;
}
function distance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return Math.sqrt(x * x + y * y + z * z);
}
function squaredDistance(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  return x * x + y * y + z * z;
}
function squaredLength(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return x * x + y * y + z * z;
}
function negate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  return out;
}
function inverse(out, a) {
  out[0] = 1 / a[0];
  out[1] = 1 / a[1];
  out[2] = 1 / a[2];
  return out;
}
function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len5 = x * x + y * y + z * z;
  if (len5 > 0) {
    len5 = 1 / Math.sqrt(len5);
  }
  out[0] = a[0] * len5;
  out[1] = a[1] * len5;
  out[2] = a[2] * len5;
  return out;
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(out, a, b) {
  var ax = a[0], ay = a[1], az = a[2];
  var bx = b[0], by = b[1], bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
function lerp(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  return out;
}
function slerp(out, a, b, t) {
  var angle3 = Math.acos(Math.min(Math.max(dot(a, b), -1), 1));
  var sinTotal = Math.sin(angle3);
  var ratioA = Math.sin((1 - t) * angle3) / sinTotal;
  var ratioB = Math.sin(t * angle3) / sinTotal;
  out[0] = ratioA * a[0] + ratioB * b[0];
  out[1] = ratioA * a[1] + ratioB * b[1];
  out[2] = ratioA * a[2] + ratioB * b[2];
  return out;
}
function hermite(out, a, b, c, d, t) {
  var factorTimes2 = t * t;
  var factor1 = factorTimes2 * (2 * t - 3) + 1;
  var factor2 = factorTimes2 * (t - 2) + t;
  var factor3 = factorTimes2 * (t - 1);
  var factor4 = factorTimes2 * (3 - 2 * t);
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
function bezier(out, a, b, c, d, t) {
  var inverseFactor = 1 - t;
  var inverseFactorTimesTwo = inverseFactor * inverseFactor;
  var factorTimes2 = t * t;
  var factor1 = inverseFactorTimesTwo * inverseFactor;
  var factor2 = 3 * t * inverseFactorTimesTwo;
  var factor3 = 3 * factorTimes2 * inverseFactor;
  var factor4 = factorTimes2 * t;
  out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  return out;
}
function random(out, scale7) {
  scale7 = scale7 === void 0 ? 1 : scale7;
  var r = RANDOM() * 2 * Math.PI;
  var z = RANDOM() * 2 - 1;
  var zScale = Math.sqrt(1 - z * z) * scale7;
  out[0] = Math.cos(r) * zScale;
  out[1] = Math.sin(r) * zScale;
  out[2] = z * scale7;
  return out;
}
function transformMat4(out, a, m) {
  var x = a[0], y = a[1], z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
function transformMat3(out, a, m) {
  var x = a[0], y = a[1], z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
function transformQuat(out, a, q) {
  var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  var vx = a[0], vy = a[1], vz = a[2];
  var tx = qy * vz - qz * vy;
  var ty = qz * vx - qx * vz;
  var tz = qx * vy - qy * vx;
  tx = tx + tx;
  ty = ty + ty;
  tz = tz + tz;
  out[0] = vx + qw * tx + qy * tz - qz * ty;
  out[1] = vy + qw * ty + qz * tx - qx * tz;
  out[2] = vz + qw * tz + qx * ty - qy * tx;
  return out;
}
function rotateX2(out, a, b, rad) {
  var p = [], r = [];
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];
  r[0] = p[0];
  r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
  r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
function rotateY2(out, a, b, rad) {
  var p = [], r = [];
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];
  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
function rotateZ2(out, a, b, rad) {
  var p = [], r = [];
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];
  r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
  r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
  r[2] = p[2];
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];
  return out;
}
function angle(a, b) {
  var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2], mag = Math.sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz)), cosine = mag && dot(a, b) / mag;
  return Math.acos(Math.min(Math.max(cosine, -1), 1));
}
function zero(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  return out;
}
function str3(a) {
  return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
}
function exactEquals3(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
function equals3(a, b) {
  var a0 = a[0], a1 = a[1], a2 = a[2];
  var b0 = b[0], b1 = b[1], b2 = b[2];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2));
}
var sub3 = subtract3;
var mul3 = multiply3;
var div = divide;
var dist = distance;
var sqrDist = squaredDistance;
var len = length;
var sqrLen = squaredLength;
var forEach = (function() {
  var vec = create3();
  return function(a, stride, offset, count, fn, arg) {
    var i, l;
    if (!stride) {
      stride = 3;
    }
    if (!offset) {
      offset = 0;
    }
    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }
    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }
    return a;
  };
})();

// node_modules/gl-matrix/esm/vec4.js
var vec4_exports = {};
__export(vec4_exports, {
  add: () => add4,
  ceil: () => ceil2,
  clone: () => clone4,
  copy: () => copy4,
  create: () => create4,
  cross: () => cross2,
  dist: () => dist2,
  distance: () => distance2,
  div: () => div2,
  divide: () => divide2,
  dot: () => dot2,
  equals: () => equals4,
  exactEquals: () => exactEquals4,
  floor: () => floor2,
  forEach: () => forEach2,
  fromValues: () => fromValues4,
  inverse: () => inverse2,
  len: () => len2,
  length: () => length2,
  lerp: () => lerp2,
  max: () => max2,
  min: () => min2,
  mul: () => mul4,
  multiply: () => multiply4,
  negate: () => negate2,
  normalize: () => normalize2,
  random: () => random2,
  round: () => round3,
  scale: () => scale4,
  scaleAndAdd: () => scaleAndAdd2,
  set: () => set4,
  sqrDist: () => sqrDist2,
  sqrLen: () => sqrLen2,
  squaredDistance: () => squaredDistance2,
  squaredLength: () => squaredLength2,
  str: () => str4,
  sub: () => sub4,
  subtract: () => subtract4,
  transformMat4: () => transformMat42,
  transformQuat: () => transformQuat2,
  zero: () => zero2
});
function create4() {
  var out = new ARRAY_TYPE(4);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }
  return out;
}
function clone4(a) {
  var out = new ARRAY_TYPE(4);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
function fromValues4(x, y, z, w) {
  var out = new ARRAY_TYPE(4);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
function copy4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}
function set4(out, x, y, z, w) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}
function add4(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
function subtract4(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
function multiply4(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
function divide2(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}
function ceil2(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  out[2] = Math.ceil(a[2]);
  out[3] = Math.ceil(a[3]);
  return out;
}
function floor2(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  out[2] = Math.floor(a[2]);
  out[3] = Math.floor(a[3]);
  return out;
}
function min2(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}
function max2(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}
function round3(out, a) {
  out[0] = round(a[0]);
  out[1] = round(a[1]);
  out[2] = round(a[2]);
  out[3] = round(a[3]);
  return out;
}
function scale4(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
function scaleAndAdd2(out, a, b, scale7) {
  out[0] = a[0] + b[0] * scale7;
  out[1] = a[1] + b[1] * scale7;
  out[2] = a[2] + b[2] * scale7;
  out[3] = a[3] + b[3] * scale7;
  return out;
}
function distance2(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return Math.sqrt(x * x + y * y + z * z + w * w);
}
function squaredDistance2(a, b) {
  var x = b[0] - a[0];
  var y = b[1] - a[1];
  var z = b[2] - a[2];
  var w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}
function length2(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.sqrt(x * x + y * y + z * z + w * w);
}
function squaredLength2(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return x * x + y * y + z * z + w * w;
}
function negate2(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}
function inverse2(out, a) {
  out[0] = 1 / a[0];
  out[1] = 1 / a[1];
  out[2] = 1 / a[2];
  out[3] = 1 / a[3];
  return out;
}
function normalize2(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len5 = x * x + y * y + z * z + w * w;
  if (len5 > 0) {
    len5 = 1 / Math.sqrt(len5);
  }
  out[0] = x * len5;
  out[1] = y * len5;
  out[2] = z * len5;
  out[3] = w * len5;
  return out;
}
function dot2(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}
function cross2(out, u, v, w) {
  var A = v[0] * w[1] - v[1] * w[0], B = v[0] * w[2] - v[2] * w[0], C = v[0] * w[3] - v[3] * w[0], D = v[1] * w[2] - v[2] * w[1], E = v[1] * w[3] - v[3] * w[1], F = v[2] * w[3] - v[3] * w[2];
  var G = u[0];
  var H = u[1];
  var I = u[2];
  var J = u[3];
  out[0] = H * F - I * E + J * D;
  out[1] = -(G * F) + I * C - J * B;
  out[2] = G * E - H * C + J * A;
  out[3] = -(G * D) + H * B - I * A;
  return out;
}
function lerp2(out, a, b, t) {
  var ax = a[0];
  var ay = a[1];
  var az = a[2];
  var aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}
function random2(out, scale7) {
  scale7 = scale7 === void 0 ? 1 : scale7;
  var v1, v2, v32, v4;
  var s1, s2;
  var rand;
  rand = RANDOM();
  v1 = rand * 2 - 1;
  v2 = (4 * RANDOM() - 2) * Math.sqrt(rand * -rand + rand);
  s1 = v1 * v1 + v2 * v2;
  rand = RANDOM();
  v32 = rand * 2 - 1;
  v4 = (4 * RANDOM() - 2) * Math.sqrt(rand * -rand + rand);
  s2 = v32 * v32 + v4 * v4;
  var d = Math.sqrt((1 - s1) / s2);
  out[0] = scale7 * v1;
  out[1] = scale7 * v2;
  out[2] = scale7 * v32 * d;
  out[3] = scale7 * v4 * d;
  return out;
}
function transformMat42(out, a, m) {
  var x = a[0], y = a[1], z = a[2], w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}
function transformQuat2(out, a, q) {
  var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  var vx = a[0], vy = a[1], vz = a[2];
  var tx = qy * vz - qz * vy;
  var ty = qz * vx - qx * vz;
  var tz = qx * vy - qy * vx;
  tx = tx + tx;
  ty = ty + ty;
  tz = tz + tz;
  out[0] = vx + qw * tx + qy * tz - qz * ty;
  out[1] = vy + qw * ty + qz * tx - qx * tz;
  out[2] = vz + qw * tz + qx * ty - qy * tx;
  out[3] = a[3];
  return out;
}
function zero2(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  return out;
}
function str4(a) {
  return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
function exactEquals4(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}
function equals4(a, b) {
  var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
  var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
}
var sub4 = subtract4;
var mul4 = multiply4;
var div2 = divide2;
var dist2 = distance2;
var sqrDist2 = squaredDistance2;
var len2 = length2;
var sqrLen2 = squaredLength2;
var forEach2 = (function() {
  var vec = create4();
  return function(a, stride, offset, count, fn, arg) {
    var i, l;
    if (!stride) {
      stride = 4;
    }
    if (!offset) {
      offset = 0;
    }
    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }
    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }
    return a;
  };
})();

// node_modules/gl-matrix/esm/quat.js
function create5() {
  var out = new ARRAY_TYPE(4);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  out[3] = 1;
  return out;
}
function identity3(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}
function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
function getAxisAngle(out_axis, q) {
  var rad = Math.acos(q[3]) * 2;
  var s = Math.sin(rad / 2);
  if (s > EPSILON) {
    out_axis[0] = q[0] / s;
    out_axis[1] = q[1] / s;
    out_axis[2] = q[2] / s;
  } else {
    out_axis[0] = 1;
    out_axis[1] = 0;
    out_axis[2] = 0;
  }
  return rad;
}
function getAngle(a, b) {
  var dotproduct = dot3(a, b);
  return Math.acos(2 * dotproduct * dotproduct - 1);
}
function multiply5(out, a, b) {
  var ax = a[0], ay = a[1], az = a[2], aw = a[3];
  var bx = b[0], by = b[1], bz = b[2], bw = b[3];
  out[0] = ax * bw + aw * bx + ay * bz - az * by;
  out[1] = ay * bw + aw * by + az * bx - ax * bz;
  out[2] = az * bw + aw * bz + ax * by - ay * bx;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
  return out;
}
function rotateX3(out, a, rad) {
  rad *= 0.5;
  var ax = a[0], ay = a[1], az = a[2], aw = a[3];
  var bx = Math.sin(rad), bw = Math.cos(rad);
  out[0] = ax * bw + aw * bx;
  out[1] = ay * bw + az * bx;
  out[2] = az * bw - ay * bx;
  out[3] = aw * bw - ax * bx;
  return out;
}
function rotateY3(out, a, rad) {
  rad *= 0.5;
  var ax = a[0], ay = a[1], az = a[2], aw = a[3];
  var by = Math.sin(rad), bw = Math.cos(rad);
  out[0] = ax * bw - az * by;
  out[1] = ay * bw + aw * by;
  out[2] = az * bw + ax * by;
  out[3] = aw * bw - ay * by;
  return out;
}
function rotateZ3(out, a, rad) {
  rad *= 0.5;
  var ax = a[0], ay = a[1], az = a[2], aw = a[3];
  var bz = Math.sin(rad), bw = Math.cos(rad);
  out[0] = ax * bw + ay * bz;
  out[1] = ay * bw - ax * bz;
  out[2] = az * bw + aw * bz;
  out[3] = aw * bw - az * bz;
  return out;
}
function calculateW(out, a) {
  var x = a[0], y = a[1], z = a[2];
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = Math.sqrt(Math.abs(1 - x * x - y * y - z * z));
  return out;
}
function exp(out, a) {
  var x = a[0], y = a[1], z = a[2], w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var et = Math.exp(w);
  var s = r > 0 ? et * Math.sin(r) / r : 0;
  out[0] = x * s;
  out[1] = y * s;
  out[2] = z * s;
  out[3] = et * Math.cos(r);
  return out;
}
function ln(out, a) {
  var x = a[0], y = a[1], z = a[2], w = a[3];
  var r = Math.sqrt(x * x + y * y + z * z);
  var t = r > 0 ? Math.atan2(r, w) / r : 0;
  out[0] = x * t;
  out[1] = y * t;
  out[2] = z * t;
  out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
  return out;
}
function pow(out, a, b) {
  ln(out, a);
  scale5(out, out, b);
  exp(out, out);
  return out;
}
function slerp2(out, a, b, t) {
  var ax = a[0], ay = a[1], az = a[2], aw = a[3];
  var bx = b[0], by = b[1], bz = b[2], bw = b[3];
  var omega, cosom, sinom, scale0, scale1;
  cosom = ax * bx + ay * by + az * bz + aw * bw;
  if (cosom < 0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (1 - cosom > EPSILON) {
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    scale0 = 1 - t;
    scale1 = t;
  }
  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
function random3(out) {
  var u1 = RANDOM();
  var u2 = RANDOM();
  var u3 = RANDOM();
  var sqrt1MinusU1 = Math.sqrt(1 - u1);
  var sqrtU1 = Math.sqrt(u1);
  out[0] = sqrt1MinusU1 * Math.sin(2 * Math.PI * u2);
  out[1] = sqrt1MinusU1 * Math.cos(2 * Math.PI * u2);
  out[2] = sqrtU1 * Math.sin(2 * Math.PI * u3);
  out[3] = sqrtU1 * Math.cos(2 * Math.PI * u3);
  return out;
}
function invert3(out, a) {
  var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
  var dot5 = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
  var invDot = dot5 ? 1 / dot5 : 0;
  out[0] = -a0 * invDot;
  out[1] = -a1 * invDot;
  out[2] = -a2 * invDot;
  out[3] = a3 * invDot;
  return out;
}
function conjugate(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = a[3];
  return out;
}
function fromMat3(out, m) {
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;
  if (fTrace > 0) {
    fRoot = Math.sqrt(fTrace + 1);
    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }
  return out;
}
function fromEuler(out, x, y, z) {
  var order = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : ANGLE_ORDER;
  var halfToRad = Math.PI / 360;
  x *= halfToRad;
  z *= halfToRad;
  y *= halfToRad;
  var sx = Math.sin(x);
  var cx = Math.cos(x);
  var sy = Math.sin(y);
  var cy = Math.cos(y);
  var sz = Math.sin(z);
  var cz = Math.cos(z);
  switch (order) {
    case "xyz":
      out[0] = sx * cy * cz + cx * sy * sz;
      out[1] = cx * sy * cz - sx * cy * sz;
      out[2] = cx * cy * sz + sx * sy * cz;
      out[3] = cx * cy * cz - sx * sy * sz;
      break;
    case "xzy":
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz - sx * cy * sz;
      out[2] = cx * cy * sz + sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
      break;
    case "yxz":
      out[0] = sx * cy * cz + cx * sy * sz;
      out[1] = cx * sy * cz - sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
      break;
    case "yzx":
      out[0] = sx * cy * cz + cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz - sx * sy * sz;
      break;
    case "zxy":
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz + sx * sy * cz;
      out[3] = cx * cy * cz - sx * sy * sz;
      break;
    case "zyx":
      out[0] = sx * cy * cz - cx * sy * sz;
      out[1] = cx * sy * cz + sx * cy * sz;
      out[2] = cx * cy * sz - sx * sy * cz;
      out[3] = cx * cy * cz + sx * sy * sz;
      break;
    default:
      throw new Error("Unknown angle order " + order);
  }
  return out;
}
function str5(a) {
  return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
}
var clone5 = clone4;
var fromValues5 = fromValues4;
var copy5 = copy4;
var set5 = set4;
var add5 = add4;
var mul5 = multiply5;
var scale5 = scale4;
var dot3 = dot2;
var lerp3 = lerp2;
var length3 = length2;
var len3 = length3;
var squaredLength3 = squaredLength2;
var sqrLen3 = squaredLength3;
var normalize3 = normalize2;
var exactEquals5 = exactEquals4;
function equals5(a, b) {
  return Math.abs(dot2(a, b)) >= 1 - EPSILON;
}
var rotationTo = (function() {
  var tmpvec3 = create3();
  var xUnitVec3 = fromValues3(1, 0, 0);
  var yUnitVec3 = fromValues3(0, 1, 0);
  return function(out, a, b) {
    var dot5 = dot(a, b);
    if (dot5 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 1e-6) cross(tmpvec3, yUnitVec3, a);
      normalize(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot5 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot5;
      return normalize3(out, out);
    }
  };
})();
var sqlerp = (function() {
  var temp1 = create5();
  var temp2 = create5();
  return function(out, a, b, c, d, t) {
    slerp2(temp1, a, d, t);
    slerp2(temp2, b, c, t);
    slerp2(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
})();
var setAxes = (function() {
  var matr = create();
  return function(out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize3(out, fromMat3(out, matr));
  };
})();

// node_modules/gl-matrix/esm/vec2.js
var vec2_exports = {};
__export(vec2_exports, {
  add: () => add6,
  angle: () => angle2,
  ceil: () => ceil3,
  clone: () => clone6,
  copy: () => copy6,
  create: () => create6,
  cross: () => cross3,
  dist: () => dist3,
  distance: () => distance3,
  div: () => div3,
  divide: () => divide3,
  dot: () => dot4,
  equals: () => equals6,
  exactEquals: () => exactEquals6,
  floor: () => floor3,
  forEach: () => forEach3,
  fromValues: () => fromValues6,
  inverse: () => inverse3,
  len: () => len4,
  length: () => length4,
  lerp: () => lerp4,
  max: () => max3,
  min: () => min3,
  mul: () => mul6,
  multiply: () => multiply6,
  negate: () => negate3,
  normalize: () => normalize4,
  random: () => random4,
  rotate: () => rotate3,
  round: () => round4,
  scale: () => scale6,
  scaleAndAdd: () => scaleAndAdd3,
  set: () => set6,
  signedAngle: () => signedAngle,
  sqrDist: () => sqrDist3,
  sqrLen: () => sqrLen4,
  squaredDistance: () => squaredDistance3,
  squaredLength: () => squaredLength4,
  str: () => str6,
  sub: () => sub5,
  subtract: () => subtract5,
  transformMat2: () => transformMat2,
  transformMat2d: () => transformMat2d,
  transformMat3: () => transformMat32,
  transformMat4: () => transformMat43,
  zero: () => zero3
});
function create6() {
  var out = new ARRAY_TYPE(2);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }
  return out;
}
function clone6(a) {
  var out = new ARRAY_TYPE(2);
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
function fromValues6(x, y) {
  var out = new ARRAY_TYPE(2);
  out[0] = x;
  out[1] = y;
  return out;
}
function copy6(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}
function set6(out, x, y) {
  out[0] = x;
  out[1] = y;
  return out;
}
function add6(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}
function subtract5(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}
function multiply6(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}
function divide3(out, a, b) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}
function ceil3(out, a) {
  out[0] = Math.ceil(a[0]);
  out[1] = Math.ceil(a[1]);
  return out;
}
function floor3(out, a) {
  out[0] = Math.floor(a[0]);
  out[1] = Math.floor(a[1]);
  return out;
}
function min3(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}
function max3(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}
function round4(out, a) {
  out[0] = round(a[0]);
  out[1] = round(a[1]);
  return out;
}
function scale6(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}
function scaleAndAdd3(out, a, b, scale7) {
  out[0] = a[0] + b[0] * scale7;
  out[1] = a[1] + b[1] * scale7;
  return out;
}
function distance3(a, b) {
  var x = b[0] - a[0], y = b[1] - a[1];
  return Math.sqrt(x * x + y * y);
}
function squaredDistance3(a, b) {
  var x = b[0] - a[0], y = b[1] - a[1];
  return x * x + y * y;
}
function length4(a) {
  var x = a[0], y = a[1];
  return Math.sqrt(x * x + y * y);
}
function squaredLength4(a) {
  var x = a[0], y = a[1];
  return x * x + y * y;
}
function negate3(out, a) {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}
function inverse3(out, a) {
  out[0] = 1 / a[0];
  out[1] = 1 / a[1];
  return out;
}
function normalize4(out, a) {
  var x = a[0], y = a[1];
  var len5 = x * x + y * y;
  if (len5 > 0) {
    len5 = 1 / Math.sqrt(len5);
  }
  out[0] = a[0] * len5;
  out[1] = a[1] * len5;
  return out;
}
function dot4(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}
function cross3(out, a, b) {
  var z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}
function lerp4(out, a, b, t) {
  var ax = a[0], ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}
function random4(out, scale7) {
  scale7 = scale7 === void 0 ? 1 : scale7;
  var r = RANDOM() * 2 * Math.PI;
  out[0] = Math.cos(r) * scale7;
  out[1] = Math.sin(r) * scale7;
  return out;
}
function transformMat2(out, a, m) {
  var x = a[0], y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}
function transformMat2d(out, a, m) {
  var x = a[0], y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}
function transformMat32(out, a, m) {
  var x = a[0], y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}
function transformMat43(out, a, m) {
  var x = a[0];
  var y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}
function rotate3(out, a, b, rad) {
  var p0 = a[0] - b[0], p1 = a[1] - b[1], sinC = Math.sin(rad), cosC = Math.cos(rad);
  out[0] = p0 * cosC - p1 * sinC + b[0];
  out[1] = p0 * sinC + p1 * cosC + b[1];
  return out;
}
function angle2(a, b) {
  var ax = a[0], ay = a[1], bx = b[0], by = b[1];
  return Math.abs(Math.atan2(ay * bx - ax * by, ax * bx + ay * by));
}
function signedAngle(a, b) {
  var ax = a[0], ay = a[1], bx = b[0], by = b[1];
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}
function zero3(out) {
  out[0] = 0;
  out[1] = 0;
  return out;
}
function str6(a) {
  return "vec2(" + a[0] + ", " + a[1] + ")";
}
function exactEquals6(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}
function equals6(a, b) {
  var a0 = a[0], a1 = a[1];
  var b0 = b[0], b1 = b[1];
  return Math.abs(a0 - b0) <= EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1));
}
var len4 = length4;
var sub5 = subtract5;
var mul6 = multiply6;
var div3 = divide3;
var dist3 = distance3;
var sqrDist3 = squaredDistance3;
var sqrLen4 = squaredLength4;
var forEach3 = (function() {
  var vec = create6();
  return function(a, stride, offset, count, fn, arg) {
    var i, l;
    if (!stride) {
      stride = 2;
    }
    if (!offset) {
      offset = 0;
    }
    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }
    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }
    return a;
  };
})();

// src/camera.ts
function loggingEnabled() {
  return globalThis.__LOGGING_ENABLED__ ?? true;
}
function clog(...args) {
  if (!loggingEnabled()) return;
  console.log("[camera]", ...args);
}
var VIEWPORT_Y_FLIP = mat4_exports.fromValues(
  1,
  0,
  0,
  0,
  0,
  -1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1
);
function build_proj(znear, zfar, fov_x, fov_y) {
  const tanHalfY = Math.tan(fov_y * 0.5);
  const tanHalfX = Math.tan(fov_x * 0.5);
  const top = tanHalfY * znear, bottom = -top;
  const right = tanHalfX * znear, left = -right;
  const m = mat4_exports.create();
  m[0] = 2 * znear / (right - left);
  m[5] = 2 * znear / (top - bottom);
  m[8] = (right + left) / (right - left);
  m[9] = (top + bottom) / (top - bottom);
  m[11] = 1;
  m[10] = zfar / (zfar - znear);
  m[14] = -(zfar * znear) / (zfar - znear);
  m[15] = 0;
  return m;
}
function focal2fov(focal, pixels) {
  const out = 2 * Math.atan(pixels / (2 * focal));
  clog("focal2fov()", { focal, pixels, out });
  return out;
}
function fov2focal(fov, pixels) {
  const out = pixels / (2 * Math.tan(fov * 0.5));
  clog("fov2focal()", { fov, pixels, out });
  return out;
}
var PerspectiveProjection = class _PerspectiveProjection {
  fovx;
  fovy;
  znear;
  zfar;
  fov2view_ratio;
  constructor(fovx, fovy, znear, zfar, fov2view_ratio = 1) {
    this.fovx = fovx;
    this.fovy = fovy;
    this.znear = znear;
    this.zfar = zfar;
    this.fov2view_ratio = fov2view_ratio;
    clog("PerspectiveProjection.ctor", { fovx, fovy, znear, zfar, fov2view_ratio });
  }
  static new(viewport, fov, znear, zfar) {
    const vr = viewport[0] / viewport[1];
    const fr = fov[0] / fov[1];
    clog("PerspectiveProjection.new()", { viewport: Array.from(viewport), fov: Array.from(fov), znear, zfar, vr, fr });
    return new _PerspectiveProjection(fov[0], fov[1], znear, zfar, vr / fr);
  }
  projection_matrix() {
    return this.projectionMatrix();
  }
  projectionMatrix() {
    const m = build_proj(this.znear, this.zfar, this.fovx, this.fovy);
    clog("projectionMatrix()", { fovx: this.fovx, fovy: this.fovy, znear: this.znear, zfar: this.zfar });
    return m;
  }
  resize(width, height) {
    const prev = { fovx: this.fovx, fovy: this.fovy };
    const ratio = width / height;
    if (width > height) {
      this.fovy = this.fovx / ratio * this.fov2view_ratio;
    } else {
      this.fovx = this.fovy * ratio * this.fov2view_ratio;
    }
    clog("PerspectiveProjection.resize()", { width, height, ratio, before: prev, after: { fovx: this.fovx, fovy: this.fovy }, fov2view_ratio: this.fov2view_ratio });
  }
  focal(viewport) {
    const fx = fov2focal(this.fovx, viewport[0]);
    const fy = fov2focal(this.fovy, viewport[1]);
    const out = vec2_exports.fromValues(fx, fy);
    clog("PerspectiveProjection.focal()", { viewport: Array.from(viewport), fx, fy });
    return out;
  }
  lerp(other, amount) {
    const a = amount, b = 1 - amount;
    const out = new _PerspectiveProjection(
      this.fovx * b + other.fovx * a,
      this.fovy * b + other.fovy * a,
      this.znear * b + other.znear * a,
      this.zfar * b + other.zfar * a,
      this.fov2view_ratio * b + other.fov2view_ratio * a
    );
    clog("PerspectiveProjection.lerp()", { amount, from: { fovx: this.fovx, fovy: this.fovy, znear: this.znear, zfar: this.zfar, r: this.fov2view_ratio }, to: { fovx: other.fovx, fovy: other.fovy, znear: other.znear, zfar: other.zfar, r: other.fov2view_ratio }, out: { fovx: out.fovx, fovy: out.fovy, znear: out.znear, zfar: out.zfar, r: out.fov2view_ratio } });
    return out;
  }
};
var PerspectiveCamera = class _PerspectiveCamera {
  position;
  rotation;
  projection;
  constructor(position, rotation, projection2) {
    this.position = vec3_exports.clone(position);
    this.rotation = quat_exports.clone(rotation);
    this.projection = projection2;
    clog("PerspectiveCamera.ctor", { position: Array.from(this.position), rotation: Array.from(this.rotation) });
  }
  static default() {
    clog("PerspectiveCamera.default()");
    return new _PerspectiveCamera(
      vec3_exports.fromValues(0, 0, -1),
      quat_exports.create(),
      new PerspectiveProjection(
        45 * Math.PI / 180,
        45 * Math.PI / 180,
        0.1,
        100,
        1
      )
    );
  }
  fit_near_far(aabb) {
    const c = aabb.center();
    const r = aabb.radius();
    const d = Math.hypot(
      this.position[0] - c.x,
      this.position[1] - c.y,
      this.position[2] - c.z
    );
    const zfar = d + r;
    const znear = Math.max(d - r, zfar / 1e3);
    this.projection.zfar = zfar;
    this.projection.znear = znear;
  }
  // Match Rust: world2view(R, t) => inverse().transpose()
  viewMatrix() {
    const world = mat4_exports.create();
    mat4_exports.fromRotationTranslation(world, this.rotation, this.position);
    const view = mat4_exports.create();
    mat4_exports.invert(view, world);
    return view;
  }
  view_matrix() {
    return this.viewMatrix();
  }
  projMatrix() {
    const m = this.projection.projectionMatrix();
    clog("PerspectiveCamera.projMatrix()");
    return m;
  }
  proj_matrix() {
    return this.projMatrix();
  }
  positionVec() {
    return vec3_exports.clone(this.position);
  }
  frustum_planes() {
    const p = this.projMatrix();
    const v = this.viewMatrix();
    const pv = mat4_exports.create();
    mat4_exports.multiply(pv, p, v);
    const row = (r) => [
      pv[0 + r],
      pv[4 + r],
      pv[8 + r],
      pv[12 + r]
    ];
    const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);
    const add7 = (a, b) => [
      a[0] + b[0],
      a[1] + b[1],
      a[2] + b[2],
      a[3] + b[3]
    ];
    const sub6 = (a, b) => [
      a[0] - b[0],
      a[1] - b[1],
      a[2] - b[2],
      a[3] - b[3]
    ];
    const normalize5 = (p2) => {
      const n = Math.hypot(p2[0], p2[1], p2[2]);
      return n > 0 ? [p2[0] / n, p2[1] / n, p2[2] / n, p2[3] / n] : p2;
    };
    const left = normalize5(add7(r3, r0));
    const right = normalize5(sub6(r3, r0));
    const bottom = normalize5(add7(r3, r1));
    const top = normalize5(sub6(r3, r1));
    const near2 = normalize5(add7(r3, r2));
    const far = normalize5(sub6(r3, r2));
    clog("PerspectiveCamera.frustum_planes() computed");
    return { near: near2, far, left, right, top, bottom };
  }
  lerp(other, amount) {
    const outPos = vec3_exports.create();
    vec3_exports.lerp(outPos, this.position, other.position, amount);
    const outRot = quat_exports.create();
    quat_exports.slerp(outRot, this.rotation, other.rotation, amount);
    const proj = this.projection.lerp(other.projection, amount);
    const out = new _PerspectiveCamera(outPos, outRot, proj);
    clog("PerspectiveCamera.lerp()", { amount, fromPos: Array.from(this.position), toPos: Array.from(other.position) });
    return out;
  }
};

// src/uniform.ts
function loggingEnabled2() {
  const g = globalThis;
  if (typeof g.__LOGGING_ENABLED__ === "undefined") {
    g.__LOGGING_ENABLED__ = true;
  }
  return !!g.__LOGGING_ENABLED__;
}
function logi(tag, msg, extra) {
  if (!loggingEnabled2()) return;
  if (extra !== void 0) {
    console.log(`${tag} ${msg}`, extra);
  } else {
    console.log(`${tag} ${msg}`);
  }
}
function hashBytesU64View(v) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const u8 = v instanceof Uint8Array ? v : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  for (let i = 0; i < u8.length; i++) {
    h ^= BigInt(u8[i]);
    h = h * prime & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}
var UniformBuffer = class _UniformBuffer {
  _buffer;
  _data;
  _label;
  _bind_group;
  static newDefault(device, label, byteLength = 256) {
    const buffer = device.createBuffer({
      label,
      size: byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint8Array(buffer.getMappedRange()).fill(0);
    buffer.unmap();
    const bgLabel = label ? `${label} bind group` : void 0;
    const bind_group = device.createBindGroup({
      label: bgLabel,
      layout: _UniformBuffer.bindGroupLayout(device),
      entries: [{ binding: 0, resource: { buffer } }]
    });
    logi("[uniform::new_default]", `label=${String(label)} size=${byteLength} bytes`);
    return new _UniformBuffer(buffer, void 0, label, bind_group);
  }
  static new(device, data, label) {
    const buffer = device.createBuffer({
      label,
      size: data.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint8Array(buffer.getMappedRange()).set(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    );
    buffer.unmap();
    const bgLabel = label ? `${label} bind group` : void 0;
    const bind_group = device.createBindGroup({
      label: bgLabel,
      layout: _UniformBuffer.bindGroupLayout(device),
      entries: [{ binding: 0, resource: { buffer } }]
    });
    logi("[uniform::new]", `label=${String(label)} size=${data.byteLength} bytes`);
    return new _UniformBuffer(buffer, data, label, bind_group);
  }
  constructor(buffer, data, label, bind_group) {
    this._buffer = buffer;
    this._data = data;
    this._label = label;
    this._bind_group = bind_group;
  }
  buffer() {
    return this._buffer;
  }
  data() {
    return this._data;
  }
  static bind_group_layout(device) {
    return this.bindGroupLayout(device);
  }
  static binding_type() {
    return this.bindingType();
  }
  sync(queue) {
    const v = this._data;
    if (!v || !(v.buffer instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && v.buffer instanceof SharedArrayBuffer)) {
      throw new Error("UniformBuffer.sync(): data is not an ArrayBufferView. Provide bytes or use setData(bytes) first.");
    }
    const bytesView = v instanceof Uint8Array ? v : new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    const hash = hashBytesU64View(bytesView);
    logi("[uniform::sync]", `label=${String(this._label)} size=${bytesView.byteLength} hash=${hash}`);
    queue.writeBuffer(this._buffer, 0, v.buffer, v.byteOffset, v.byteLength);
  }
  clone(device, queue) {
    const buffer = device.createBuffer({
      label: this._label,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      size: this._buffer.size,
      mappedAtCreation: false
    });
    const encoder = device.createCommandEncoder({ label: "copy uniform buffer encode" });
    encoder.copyBufferToBuffer(this._buffer, 0, buffer, 0, this._buffer.size);
    queue.submit([encoder.finish()]);
    const bind_group = device.createBindGroup({
      label: "uniform bind group",
      layout: _UniformBuffer.bindGroupLayout(device),
      entries: [{ binding: 0, resource: { buffer } }]
    });
    return new _UniformBuffer(buffer, this._data, this._label, bind_group);
  }
  bind_group() {
    return this._bind_group;
  }
  bufferRef() {
    return this._buffer;
  }
  dataRef() {
    return this._data;
  }
  getBindGroup() {
    return this._bind_group;
  }
  setData(bytes) {
    this._data = bytes;
  }
  static bindGroupLayout(device) {
    return device.createBindGroupLayout({
      label: "uniform bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
          buffer: _UniformBuffer.bindingType()
        }
      ]
    });
  }
  static bindingType() {
    return {
      type: "uniform",
      hasDynamicOffset: false
    };
  }
};

// src/pointcloud.ts
function pclog(...args) {
  console.log("[pointcloud]", ...args);
}
function asBytes(src) {
  return src instanceof ArrayBuffer ? new Uint8Array(src) : new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
}
function halfToFloat(h) {
  const s = (h & 32768) >> 15, e = (h & 31744) >> 10, f = h & 1023;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : (s ? -1 : 1) * Infinity;
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}
var Aabb = class _Aabb {
  min;
  max;
  constructor(min4, max4) {
    this.min = { ...min4 };
    this.max = { ...max4 };
  }
  static unit() {
    return new _Aabb({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 });
  }
  static zeroed() {
    return new _Aabb({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  }
  center() {
    return {
      x: (this.min.x + this.max.x) * 0.5,
      y: (this.min.y + this.max.y) * 0.5,
      z: (this.min.z + this.max.z) * 0.5
    };
  }
  radius() {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
  }
  size() {
    return {
      x: this.max.x - this.min.x,
      y: this.max.y - this.min.y,
      z: this.max.z - this.min.z
    };
  }
  grow(pos) {
    this.min.x = Math.min(this.min.x, pos.x);
    this.min.y = Math.min(this.min.y, pos.y);
    this.min.z = Math.min(this.min.z, pos.z);
    this.max.x = Math.max(this.max.x, pos.x);
    this.max.y = Math.max(this.max.y, pos.y);
    this.max.z = Math.max(this.max.z, pos.z);
  }
  grow_union(other) {
    this.min.x = Math.min(this.min.x, other.min.x);
    this.min.y = Math.min(this.min.y, other.min.y);
    this.min.z = Math.min(this.min.z, other.min.z);
    this.max.x = Math.max(this.max.x, other.max.x);
    this.max.y = Math.max(this.max.y, other.max.y);
    this.max.z = Math.max(this.max.z, other.max.z);
  }
};
var BYTES_PER_SPLAT = 20;
var LAYOUTS = /* @__PURE__ */ new WeakMap();
function getLayouts(device) {
  let l = LAYOUTS.get(device);
  if (l) return l;
  const plain = device.createBindGroupLayout({
    label: "point cloud float bind group layout",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
    ]
  });
  const compressed = device.createBindGroupLayout({
    label: "point cloud bind group layout (compressed)",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }
    ]
  });
  const render = device.createBindGroupLayout({
    label: "point cloud rendering bind group layout",
    entries: [
      { binding: 2, visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }
    ]
  });
  l = { plain, compressed, render };
  LAYOUTS.set(device, l);
  pclog("getLayouts(): created new layouts");
  return l;
}
var PointCloud = class _PointCloud {
  splat_2d_buffer;
  // internal fields (underscore to avoid clashes with Rust-style getter names)
  _bind_group;
  _render_bind_group;
  num_points_;
  sh_deg_;
  bbox_;
  compressed_;
  center_;
  up_;
  mip_splatting_;
  kernel_size_;
  background_color_;
  vertex_buffer;
  // 3D gaussians
  sh_buffer;
  // SH coefs
  covars_buffer;
  // compressed only
  quantization_uniform;
  // captured for optional debug
  _gaussianSrc;
  _shSrc;
  static new(device, pc) {
    return new _PointCloud(device, pc);
  }
  constructor(device, pc) {
    const gaussBytes = asBytes(pc.gaussian_buffer());
    const shBytes = asBytes(pc.sh_coefs_buffer());
    this._gaussianSrc = gaussBytes;
    this._shSrc = shBytes;
    this.splat_2d_buffer = device.createBuffer({
      label: "2d gaussians buffer",
      size: (pc.num_points >>> 0) * BYTES_PER_SPLAT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE
    });
    pclog("ctor: created splat_2d_buffer", {
      bytes: (pc.num_points >>> 0) * BYTES_PER_SPLAT,
      num_points: pc.num_points
    });
    const { render, plain, compressed } = getLayouts(device);
    this._render_bind_group = device.createBindGroup({
      label: "point cloud rendering bind group",
      layout: render,
      entries: [{ binding: 2, resource: { buffer: this.splat_2d_buffer } }]
    });
    pclog("ctor: created render bind group");
    this.vertex_buffer = device.createBuffer({
      label: "3d gaussians buffer",
      size: gaussBytes.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.vertex_buffer, 0, gaussBytes);
    pclog("ctor: uploaded vertex_buffer", { bytes: gaussBytes.byteLength });
    this.sh_buffer = device.createBuffer({
      label: "sh coefs buffer",
      size: shBytes.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(this.sh_buffer, 0, shBytes);
    pclog("ctor: uploaded sh_buffer", { bytes: shBytes.byteLength });
    const entries = [
      { binding: 0, resource: { buffer: this.vertex_buffer } },
      // read-only
      { binding: 1, resource: { buffer: this.sh_buffer } },
      // read-only
      { binding: 2, resource: { buffer: this.splat_2d_buffer } }
      // read-write
    ];
    if (pc.compressed()) {
      if (!pc.covars) throw new Error("compressed() true but covars missing");
      const covBytes = asBytes(pc.covars);
      this.covars_buffer = device.createBuffer({
        label: "Covariances buffer",
        size: covBytes.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      device.queue.writeBuffer(this.covars_buffer, 0, covBytes);
      entries.push({ binding: 3, resource: { buffer: this.covars_buffer } });
      if (!pc.quantization) throw new Error("compressed() true but quantization missing");
      this.quantization_uniform = UniformBuffer.new(device, pc.quantization, "quantization uniform buffer");
      entries.push({ binding: 4, resource: { buffer: this.quantization_uniform.bufferRef() } });
      this._bind_group = device.createBindGroup({
        label: "point cloud bind group (compressed)",
        layout: compressed,
        entries
      });
      pclog("ctor: created preprocess bind group (compressed)");
    } else {
      this._bind_group = device.createBindGroup({
        label: "point cloud bind group",
        layout: plain,
        entries
      });
      pclog("ctor: created preprocess bind group (plain)");
    }
    this.num_points_ = pc.num_points >>> 0;
    this.sh_deg_ = pc.sh_deg >>> 0;
    this.compressed_ = pc.compressed();
    this.bbox_ = new Aabb(pc.aabb.min, pc.aabb.max);
    this.center_ = { ...pc.center };
    this.up_ = pc.up ? { ...pc.up } : void 0;
    this.mip_splatting_ = pc.mip_splatting;
    this.kernel_size_ = pc.kernel_size;
    this.background_color_ = pc.background_color ? { r: pc.background_color[0], g: pc.background_color[1], b: pc.background_color[2], a: 1 } : void 0;
    pclog("ctor: initialized fields", {
      num_points: this.num_points_,
      sh_deg: this.sh_deg_,
      compressed: this.compressed_,
      bbox: this.bbox_,
      center: this.center_,
      mip_splatting: this.mip_splatting_,
      kernel_size: this.kernel_size_,
      background_color: this.background_color_
    });
  }
  // --- DEBUG: log first Gaussian & SH buffer sanity info
  debugLogFirstGaussian() {
    if (!this._gaussianSrc) {
      console.warn("[pc] no gaussian src captured");
      return;
    }
    if (this.compressed_) {
      console.log("[pc] compressed point cloud; first-gaussian debug for raw halfs is skipped");
      console.log("[pc] aabb:", this.bbox_, "num_points:", this.num_points_);
      return;
    }
    const dv = new DataView(this._gaussianSrc.buffer, this._gaussianSrc.byteOffset, this._gaussianSrc.byteLength);
    const halves = [];
    for (let i = 0; i < Math.min(10, this._gaussianSrc.byteLength / 2 | 0); i++) {
      halves.push(dv.getUint16(i * 2, true));
    }
    const floats = halves.map(halfToFloat);
    const xyz = floats.slice(0, 3);
    const opacity = floats[3];
    const cov = floats.slice(4, 10);
    console.log("[pc] first gaussian (halfs):", halves);
    console.log("[pc] first gaussian (floats):", { xyz, opacity, cov });
    console.log("[pc] aabb:", this.bbox_);
    console.log("[pc] num_points:", this.num_points_);
    console.log("[pc] sh bytes:", this._shSrc?.byteLength);
  }
  // ---- getters matching Rust API ----
  compressed() {
    return this.compressed_;
  }
  num_points() {
    return this.num_points_;
  }
  // exact Rust name
  numPoints() {
    return this.num_points_;
  }
  sh_deg() {
    return this.sh_deg_;
  }
  // exact Rust name
  shDeg() {
    return this.sh_deg_;
  }
  // TS convenience
  bbox() {
    return this.bbox_;
  }
  // Rust names (methods)
  bind_group() {
    return this._bind_group;
  }
  render_bind_group() {
    return this._render_bind_group;
  }
  // TS-friendly aliases used by renderer.ts:
  getBindGroup() {
    return this._bind_group;
  }
  getRenderBindGroup() {
    return this._render_bind_group;
  }
  mip_splatting() {
    return this.mip_splatting_;
  }
  // exact Rust
  mipSplatting() {
    return this.mip_splatting_;
  }
  // TS convenience
  dilation_kernel_size() {
    return this.kernel_size_;
  }
  // exact Rust
  dilationKernelSize() {
    return this.kernel_size_;
  }
  // TS convenience
  center() {
    return this.center_;
  }
  up() {
    return this.up_;
  }
  // ---- static bind group layouts (exact bindings/visibility as Rust) ----
  static bind_group_layout_compressed(device) {
    return getLayouts(device).compressed;
  }
  static bind_group_layout(device) {
    return getLayouts(device).plain;
  }
  static bind_group_layout_render(device) {
    return getLayouts(device).render;
  }
};

// src/gpu_rs.ts
var HISTOGRAM_WG_SIZE = 256;
var RS_RADIX_LOG2 = 8;
var RS_RADIX_SIZE = 1 << RS_RADIX_LOG2;
var RS_KEYVAL_SIZE = 32 / RS_RADIX_LOG2;
var RS_HISTOGRAM_BLOCK_ROWS = 15;
var RS_SCATTER_BLOCK_ROWS = RS_HISTOGRAM_BLOCK_ROWS;
var PREFIX_WG_SIZE = 1 << 7;
var SCATTER_WG_SIZE = 1 << 8;
function writeGeneralInfo(info) {
  const buf = new ArrayBuffer(20);
  const dv = new DataView(buf);
  dv.setUint32(0, info.keys_size >>> 0, true);
  dv.setUint32(4, info.padded_size >>> 0, true);
  dv.setUint32(8, info.passes >>> 0, true);
  dv.setUint32(12, info.even_pass >>> 0, true);
  dv.setUint32(16, info.odd_pass >>> 0, true);
  return new Uint8Array(buf);
}
function writeIndirectDispatch(id) {
  const buf = new ArrayBuffer(12);
  const dv = new DataView(buf);
  dv.setUint32(0, id.dispatch_x >>> 0, true);
  dv.setUint32(4, id.dispatch_y >>> 0, true);
  dv.setUint32(8, id.dispatch_z >>> 0, true);
  return new Uint8Array(buf);
}
var GPURSSorter = class _GPURSSorter {
  bind_group_layout;
  // full radix layout (6 bindings)
  render_bind_group_layout;
  // render layout (bindings 0,4)
  preprocess_bind_group_layout;
  // preprocess layout (bindings 0..3)
  zero_p;
  histogram_p;
  prefix_p;
  scatter_even_p;
  scatter_odd_p;
  subgroup_size;
  // ---- Creation entrypoint (mirrors async new(device, queue)) ----
  static async create(device, queue) {
    console.debug("Searching for the maximum subgroup size (browser WebGPU cannot query it).");
    const sizes = [1, 8, 16, 32];
    let curIdx = 2;
    let State;
    ((State2) => {
      State2[State2["Init"] = 0] = "Init";
      State2[State2["Increasing"] = 1] = "Increasing";
      State2[State2["Decreasing"] = 2] = "Decreasing";
    })(State || (State = {}));
    let state = 0 /* Init */;
    let biggestThatWorked = 0;
    let curSorter = null;
    while (true) {
      if (curIdx >= sizes.length || curIdx < 0) break;
      console.debug(`Checking sorting with subgroup size ${sizes[curIdx]}`);
      const candidate = await _GPURSSorter.newWithSgSize(device, sizes[curIdx]);
      const ok = await candidate.test_sort(device, queue);
      console.debug(`${sizes[curIdx]} worked: ${ok}`);
      if (ok) curSorter = candidate;
      switch (state) {
        case 0 /* Init */:
          if (ok) {
            biggestThatWorked = sizes[curIdx];
            state = 1 /* Increasing */;
            curIdx += 1;
          } else {
            state = 2 /* Decreasing */;
            curIdx -= 1;
          }
          break;
        case 1 /* Increasing */:
          if (ok) {
            if (sizes[curIdx] > biggestThatWorked) biggestThatWorked = sizes[curIdx];
            curIdx += 1;
          } else {
            break;
          }
          continue;
        // to break outer loop if needed
        case 2 /* Decreasing */:
          if (ok) {
            if (sizes[curIdx] > biggestThatWorked) biggestThatWorked = sizes[curIdx];
            break;
          } else {
            curIdx -= 1;
          }
          continue;
      }
      if (state === 1 /* Increasing */ && curIdx >= sizes.length) break;
      if (state === 2 /* Decreasing */ && curIdx < 0) break;
    }
    if (!curSorter || biggestThatWorked === 0) {
      throw new Error("GPURSSorter.create(): No workgroup size worked. Unable to use sorter.");
    }
    console.info(`Created a sorter with subgroup size ${curSorter.subgroup_size}`);
    return curSorter;
  }
  // ---- Instance factory with a fixed subgroup size (mirrors new_with_sg_size) ----
  static async newWithSgSize(device, sgSize) {
    const histogram_sg_size = sgSize >>> 0;
    const rs_sweep_0_size = RS_RADIX_SIZE / histogram_sg_size;
    const rs_sweep_1_size = Math.floor(rs_sweep_0_size / histogram_sg_size);
    const rs_sweep_2_size = Math.floor(rs_sweep_1_size / histogram_sg_size);
    const rs_sweep_size = rs_sweep_0_size + rs_sweep_1_size + rs_sweep_2_size;
    const rs_mem_phase_2 = RS_RADIX_SIZE + RS_SCATTER_BLOCK_ROWS * SCATTER_WG_SIZE;
    const rs_mem_dwords = rs_mem_phase_2;
    const rs_mem_sweep_0_offset = 0;
    const rs_mem_sweep_1_offset = rs_mem_sweep_0_offset + rs_sweep_0_size;
    const rs_mem_sweep_2_offset = rs_mem_sweep_1_offset + rs_sweep_1_size;
    const instance = new _GPURSSorter();
    instance.bind_group_layout = _GPURSSorter.bindGroupLayouts(device);
    instance.render_bind_group_layout = _GPURSSorter.bindGroupLayoutRendering(device);
    instance.preprocess_bind_group_layout = _GPURSSorter.bindGroupLayoutPreprocess(device);
    const pipeline_layout = device.createPipelineLayout({
      label: "radix sort pipeline layout",
      bindGroupLayouts: [instance.bind_group_layout]
    });
    const raw = await (await fetch("./shaders/radix_sort.wgsl")).text();
    const header = `const histogram_sg_size: u32 = ${histogram_sg_size}u;
const histogram_wg_size: u32 = ${HISTOGRAM_WG_SIZE}u;
const rs_radix_log2: u32 = ${RS_RADIX_LOG2}u;
const rs_radix_size: u32 = ${RS_RADIX_SIZE}u;
const rs_keyval_size: u32 = ${RS_KEYVAL_SIZE}u;
const rs_histogram_block_rows: u32 = ${RS_HISTOGRAM_BLOCK_ROWS}u;
const rs_scatter_block_rows: u32 = ${RS_SCATTER_BLOCK_ROWS}u;
const rs_mem_dwords: u32 = ${rs_mem_dwords}u;
const rs_mem_sweep_0_offset: u32 = ${rs_mem_sweep_0_offset}u;
const rs_mem_sweep_1_offset: u32 = ${rs_mem_sweep_1_offset}u;
const rs_mem_sweep_2_offset: u32 = ${rs_mem_sweep_2_offset}u;
`;
    const shader_code = (header + raw).replaceAll("{histogram_wg_size}", String(HISTOGRAM_WG_SIZE)).replaceAll("{prefix_wg_size}", String(PREFIX_WG_SIZE)).replaceAll("{scatter_wg_size}", String(SCATTER_WG_SIZE));
    const shader = device.createShaderModule({ label: "Radix sort shader", code: shader_code });
    instance.zero_p = device.createComputePipeline({
      label: "Zero the histograms",
      layout: pipeline_layout,
      compute: { module: shader, entryPoint: "zero_histograms" }
    });
    instance.histogram_p = device.createComputePipeline({
      label: "calculate_histogram",
      layout: pipeline_layout,
      compute: { module: shader, entryPoint: "calculate_histogram" }
    });
    instance.prefix_p = device.createComputePipeline({
      label: "prefix_histogram",
      layout: pipeline_layout,
      compute: { module: shader, entryPoint: "prefix_histogram" }
    });
    instance.scatter_even_p = device.createComputePipeline({
      label: "scatter_even",
      layout: pipeline_layout,
      compute: { module: shader, entryPoint: "scatter_even" }
    });
    instance.scatter_odd_p = device.createComputePipeline({
      label: "scatter_odd",
      layout: pipeline_layout,
      compute: { module: shader, entryPoint: "scatter_odd" }
    });
    instance.subgroup_size = histogram_sg_size;
    return instance;
  }
  // ---- Public layout helpers (associated functions in Rust) ----
  static bindGroupLayouts(device) {
    return device.createBindGroupLayout({
      label: "Radix bind group layout",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // general infos
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // internal mem
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // keyval_a
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // keyval_b
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // payload_a
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        // payload_b
      ]
    });
  }
  static bindGroupLayoutPreprocess(device) {
    return device.createBindGroupLayout({
      label: "Radix bind group layout for preprocess pipeline",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // general infos
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // keyval_a
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        // payload_a
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
        // dispatch
      ]
    });
  }
  static bindGroupLayoutRendering(device) {
    return device.createBindGroupLayout({
      label: "Radix bind group layout (render)",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        // general infos
        { binding: 4, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }
        // payload_a (indices)
      ]
    });
  }
  // ---- Public API: allocate per-pointcloud resources (create_sort_stuff) ----
  createSortStuff(device, numPoints) {
    const [keyval_a, keyval_b, payload_a, payload_b] = _GPURSSorter.createKeyvalBuffers(device, numPoints, 4);
    const sorter_int = this.createInternalMemBuffer(device, numPoints);
    const [sorter_uni, sorter_dis, sorter_bg] = this.createBindGroup(
      device,
      numPoints,
      sorter_int,
      keyval_a,
      keyval_b,
      payload_a,
      payload_b
    );
    const sorter_render_bg = this.createBindGroupRender(device, sorter_uni, payload_a);
    const sorter_bg_pre = this.createBindGroupPreprocess(device, sorter_uni, sorter_dis, keyval_a, payload_a);
    return {
      numPoints,
      sorterUni: sorter_uni,
      sorterDis: sorter_dis,
      sorterBg: sorter_bg,
      sorterRenderBg: sorter_render_bg,
      sorterBgPre: sorter_bg_pre
    };
  }
  // ---- Internal helpers from Rust ----
  static getScatterHistogramSizes(keysize) {
    const scatter_block_kvs = HISTOGRAM_WG_SIZE * RS_SCATTER_BLOCK_ROWS;
    const scatter_blocks_ru = Math.floor((keysize + scatter_block_kvs - 1) / scatter_block_kvs);
    const count_ru_scatter = scatter_blocks_ru * scatter_block_kvs;
    const histo_block_kvs = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
    const histo_blocks_ru = Math.floor((count_ru_scatter + histo_block_kvs - 1) / histo_block_kvs);
    const count_ru_histo = histo_blocks_ru * histo_block_kvs;
    return [
      scatter_block_kvs,
      scatter_blocks_ru,
      count_ru_scatter,
      histo_block_kvs,
      histo_blocks_ru,
      count_ru_histo
    ];
  }
  static createKeyvalBuffers(device, keysize, bytesPerPayloadElem) {
    const keysPerWG = HISTOGRAM_WG_SIZE * RS_HISTOGRAM_BLOCK_ROWS;
    const countRuHisto = (Math.floor((keysize + keysPerWG) / keysPerWG) + 1) * keysPerWG;
    const keyBytes = countRuHisto * 4;
    const buffer_a = device.createBuffer({
      label: "Radix data buffer a",
      size: keyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    const buffer_b = device.createBuffer({
      label: "Radix data buffer b",
      size: keyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    if (bytesPerPayloadElem !== 4) throw new Error("Only 4-byte payload elements supported");
    const payloadSize = Math.max(keysize * bytesPerPayloadElem, 1);
    const payload_a = device.createBuffer({
      label: "Radix payload buffer a",
      size: payloadSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    const payload_b = device.createBuffer({
      label: "Radix payload buffer b",
      size: payloadSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    return [buffer_a, buffer_b, payload_a, payload_b];
  }
  createInternalMemBuffer(device, keysize) {
    const [, scatter_blocks_ru] = _GPURSSorter.getScatterHistogramSizes(keysize);
    const histo_size = RS_RADIX_SIZE * 4;
    const internal_size = (RS_KEYVAL_SIZE + scatter_blocks_ru - 1 + 1) * histo_size;
    return device.createBuffer({
      label: "Internal radix sort buffer",
      size: internal_size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
  }
  createBindGroup(device, keysize, internal_mem_buffer, keyval_a, keyval_b, payload_a, payload_b) {
    const [, scatter_blocks_ru, , , , count_ru_histo] = _GPURSSorter.getScatterHistogramSizes(keysize);
    const dispatch_infos = {
      dispatch_x: scatter_blocks_ru >>> 0,
      dispatch_y: 1,
      dispatch_z: 1
    };
    const uniform_infos = {
      keys_size: keysize >>> 0,
      padded_size: count_ru_histo >>> 0,
      passes: 4,
      even_pass: 0,
      odd_pass: 0
    };
    const uniform_buffer = device.createBuffer({
      label: "Radix uniform buffer",
      size: 20,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    {
      const bytes = writeGeneralInfo(uniform_infos);
      device.queue.writeBuffer(
        uniform_buffer,
        0,
        bytes.buffer,
        // <-- pass ArrayBuffer
        bytes.byteOffset,
        bytes.byteLength
      );
    }
    const dispatch_buffer = device.createBuffer({
      label: "Dispatch indirect buffer",
      size: 12,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT
    });
    {
      const bytes = writeIndirectDispatch(dispatch_infos);
      device.queue.writeBuffer(
        dispatch_buffer,
        // your buffer at 381
        0,
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength
      );
    }
    const bind_group = device.createBindGroup({
      label: "Radix bind group",
      layout: this.bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: uniform_buffer } },
        { binding: 1, resource: { buffer: internal_mem_buffer } },
        { binding: 2, resource: { buffer: keyval_a } },
        { binding: 3, resource: { buffer: keyval_b } },
        { binding: 4, resource: { buffer: payload_a } },
        { binding: 5, resource: { buffer: payload_b } }
      ]
    });
    return [uniform_buffer, dispatch_buffer, bind_group];
  }
  createBindGroupRender(device, general_infos, payload_a) {
    return device.createBindGroup({
      label: "Render bind group",
      layout: this.render_bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: general_infos } },
        { binding: 4, resource: { buffer: payload_a } }
      ]
    });
  }
  createBindGroupPreprocess(device, uniform_buffer, dispatch_buffer, keyval_a, payload_a) {
    return device.createBindGroup({
      label: "Preprocess bind group",
      layout: this.preprocess_bind_group_layout,
      entries: [
        { binding: 0, resource: { buffer: uniform_buffer } },
        { binding: 1, resource: { buffer: keyval_a } },
        { binding: 2, resource: { buffer: payload_a } },
        { binding: 3, resource: { buffer: dispatch_buffer } }
      ]
    });
  }
  // ---- “Static” helper in Rust — keep as static here too ----
  static recordResetIndirectBuffer(indirect_buffer, uniform_buffer, queue) {
    const zero4 = new Uint8Array([0, 0, 0, 0]);
    queue.writeBuffer(indirect_buffer, 0, zero4);
    queue.writeBuffer(uniform_buffer, 0, zero4);
  }
  // ---- Recorders (compute passes) ----
  record_calculate_histogram(bind_group, keysize, encoder) {
    const [, , , , hist_blocks_ru] = _GPURSSorter.getScatterHistogramSizes(keysize);
    {
      const pass = encoder.beginComputePass({ label: "zeroing the histogram" });
      pass.setPipeline(this.zero_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroups(hist_blocks_ru, 1, 1);
      pass.end();
    }
    {
      const pass = encoder.beginComputePass({ label: "calculate histogram" });
      pass.setPipeline(this.histogram_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroups(hist_blocks_ru, 1, 1);
      pass.end();
    }
  }
  record_calculate_histogram_indirect(bind_group, dispatch_buffer, encoder) {
    {
      const pass = encoder.beginComputePass({ label: "zeroing the histogram" });
      pass.setPipeline(this.zero_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
      pass.end();
    }
    {
      const pass = encoder.beginComputePass({ label: "calculate histogram" });
      pass.setPipeline(this.histogram_p);
      pass.setBindGroup(0, bind_group);
      pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
      pass.end();
    }
  }
  // There is no indirect prefix step — number of prefixes depends on passes (4).
  record_prefix_histogram(bind_group, passes, encoder) {
    const pass = encoder.beginComputePass({ label: "prefix histogram" });
    pass.setPipeline(this.prefix_p);
    pass.setBindGroup(0, bind_group);
    pass.dispatchWorkgroups(passes, 1, 1);
    pass.end();
  }
  record_scatter_keys(bind_group, passes, keysize, encoder) {
    if (passes !== 4) throw new Error("passes must be 4");
    const [, scatter_blocks_ru] = _GPURSSorter.getScatterHistogramSizes(keysize);
    const pass = encoder.beginComputePass({ label: "Scatter keyvals" });
    pass.setBindGroup(0, bind_group);
    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);
    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);
    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);
    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroups(scatter_blocks_ru, 1, 1);
    pass.end();
  }
  record_scatter_keys_indirect(bind_group, passes, dispatch_buffer, encoder) {
    if (passes !== 4) throw new Error("passes must be 4");
    const pass = encoder.beginComputePass({ label: "Scatter keyvals" });
    pass.setBindGroup(0, bind_group);
    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
    pass.setPipeline(this.scatter_even_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
    pass.setPipeline(this.scatter_odd_p);
    pass.dispatchWorkgroupsIndirect(dispatch_buffer, 0);
    pass.end();
  }
  record_sort(bind_group, keysize, encoder) {
    this.record_calculate_histogram(bind_group, keysize, encoder);
    this.record_prefix_histogram(bind_group, 4, encoder);
    this.record_scatter_keys(bind_group, 4, keysize, encoder);
  }
  recordSortIndirect(bind_group, dispatch_buffer, encoder) {
    this.record_calculate_histogram_indirect(bind_group, dispatch_buffer, encoder);
    this.record_prefix_histogram(bind_group, 4, encoder);
    this.record_scatter_keys_indirect(bind_group, 4, dispatch_buffer, encoder);
  }
  // ---- Small self-check used during subgroup-size probing (mirrors test_sort) ----
  async test_sort(device, queue) {
    const n = 8192;
    const scrambled = new Float32Array(n);
    for (let i = 0; i < n; i++) scrambled[i] = n - 1 - i;
    const internal_mem_buffer = this.createInternalMemBuffer(device, n);
    const [keyval_a, keyval_b, payload_a, payload_b] = _GPURSSorter.createKeyvalBuffers(device, n, 4);
    const [uniform_buffer, dispatch_buffer, bind_group] = this.createBindGroup(
      device,
      n,
      internal_mem_buffer,
      keyval_a,
      keyval_b,
      payload_a,
      payload_b
    );
    queue.writeBuffer(keyval_a, 0, scrambled.buffer);
    const encoder = device.createCommandEncoder({ label: "GPURSSorter test_sort" });
    this.record_sort(bind_group, n, encoder);
    queue.submit([encoder.finish()]);
    await queue.onSubmittedWorkDone();
    const sorted = await downloadBufferF32(device, queue, keyval_a, n);
    for (let i = 0; i < n; i++) {
      if (sorted[i] !== i) return false;
    }
    uniform_buffer.destroy();
    dispatch_buffer.destroy();
    internal_mem_buffer.destroy();
    keyval_a.destroy();
    keyval_b.destroy();
    payload_a.destroy();
    payload_b.destroy();
    return true;
  }
};
async function downloadBufferF32(device, queue, src, count) {
  const byteLength = count * 4;
  const dst = device.createBuffer({
    label: "Download buffer",
    size: byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
  const encoder = device.createCommandEncoder({ label: "Copy encoder" });
  encoder.copyBufferToBuffer(src, 0, dst, 0, byteLength);
  queue.submit([encoder.finish()]);
  await queue.onSubmittedWorkDone();
  await dst.mapAsync(GPUMapMode.READ);
  const copy7 = dst.getMappedRange().slice(0);
  dst.unmap();
  dst.destroy();
  return new Float32Array(copy7);
}

// src/renderer.ts
var __g = globalThis;
if (typeof __g.__LOGGING_ENABLED__ === "undefined") {
  __g.__LOGGING_ENABLED__ = true;
}
function loggingEnabled3() {
  return !!globalThis.__LOGGING_ENABLED__;
}
function logi2(tag, msg, extra) {
  if (!loggingEnabled3()) return;
  if (extra !== void 0) {
    console.log(`${tag} ${msg}`, extra);
  } else {
    console.log(`${tag} ${msg}`);
  }
}
function fmtF32Slice(a) {
  const out = [];
  const n = a.length;
  for (let i = 0; i < n; i++) out.push(a[i].toFixed(7));
  return `[${out.join(",")}]`;
}
function hashBytesU64(bytes) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < u8.length; i++) {
    h ^= BigInt(u8[i]);
    h = h * prime & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}
function mat4ColMajorToArray(m) {
  return new Float32Array(m);
}
var DEBUG_READBACK_EVERY_N_FRAMES = 1;
function u8ToU32LE(u8) {
  const n = Math.floor(u8.byteLength / 4);
  return new Uint32Array(u8.buffer, u8.byteOffset, n);
}
function dumpU32(label, u8) {
  if (!loggingEnabled3()) return;
  const u32 = u8ToU32LE(u8);
  console.log(label, Array.from(u32));
}
async function readbackBuffer(device, src, size) {
  const rb = device.createBuffer({
    size: size + 255 & ~255,
    // 256 alignment
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const enc = device.createCommandEncoder({ label: "rb-encoder" });
  enc.copyBufferToBuffer(src, 0, rb, 0, size);
  device.queue.submit([enc.finish()]);
  await rb.mapAsync(GPUMapMode.READ);
  const slice = rb.getMappedRange().slice(0, size);
  rb.unmap();
  return slice;
}
var CameraUniform = class {
  viewMatrix;
  viewInvMatrix;
  projMatrix;
  projInvMatrix;
  viewport;
  focal;
  constructor() {
    this.viewMatrix = mat4_exports.create();
    this.viewInvMatrix = mat4_exports.create();
    this.projMatrix = mat4_exports.create();
    this.projInvMatrix = mat4_exports.create();
    this.viewport = vec2_exports.fromValues(1, 1);
    this.focal = vec2_exports.fromValues(1, 1);
  }
  setViewMat(viewMatrix) {
    mat4_exports.copy(this.viewMatrix, viewMatrix);
    mat4_exports.invert(this.viewInvMatrix, viewMatrix);
  }
  setProjMat(projMatrix) {
    const flipped = mat4_exports.create();
    mat4_exports.multiply(flipped, VIEWPORT_Y_FLIP, projMatrix);
    mat4_exports.copy(this.projMatrix, flipped);
    mat4_exports.invert(this.projInvMatrix, projMatrix);
  }
  setCamera(camera) {
    this.setProjMat(camera.projMatrix());
    this.setViewMat(camera.viewMatrix());
  }
  setViewport(viewport) {
    vec2_exports.copy(this.viewport, viewport);
  }
  setFocal(focal) {
    vec2_exports.copy(this.focal, focal);
  }
};
var DEFAULT_KERNEL_SIZE = 0.3;
var SplattingArgsUniform = class _SplattingArgsUniform {
  clippingBoxMin;
  clippingBoxMax;
  gaussianScaling;
  maxShDeg;
  showEnvMap;
  mipSplatting;
  kernelSize;
  walltime;
  sceneExtend;
  _pad;
  sceneCenter;
  constructor() {
    this.gaussianScaling = 1;
    this.maxShDeg = 3;
    this.showEnvMap = 1;
    this.mipSplatting = 0;
    this.kernelSize = DEFAULT_KERNEL_SIZE;
    this.walltime = 0;
    this.sceneExtend = 1;
    this._pad = 0;
    this.clippingBoxMin = vec4_exports.fromValues(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      0
    );
    this.clippingBoxMax = vec4_exports.fromValues(
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      0
    );
    this.sceneCenter = vec4_exports.fromValues(0, 0, 0, 0);
  }
  static fromArgsAndPc(args, pc) {
    const u = new _SplattingArgsUniform();
    u.gaussianScaling = args.gaussianScaling;
    u.maxShDeg = args.maxShDeg;
    u.showEnvMap = args.showEnvMap ? 1 : 0;
    const pcMip = pc.mipSplatting() ?? false;
    u.mipSplatting = args.mipSplatting ?? pcMip ? 1 : 0;
    const pcKernel = pc.dilationKernelSize() ?? DEFAULT_KERNEL_SIZE;
    u.kernelSize = args.kernelSize ?? pcKernel;
    const bbox = pc.bbox();
    const clip = args.clippingBox ?? bbox;
    vec4_exports.set(u.clippingBoxMin, clip.min.x, clip.min.y, clip.min.z, 0);
    vec4_exports.set(u.clippingBoxMax, clip.max.x, clip.max.y, clip.max.z, 0);
    u.walltime = args.walltime;
    const c = pc.center();
    vec4_exports.set(u.sceneCenter, c.x, c.y, c.z, 0);
    const minExtend = bbox.radius();
    u.sceneExtend = Math.max(args.sceneExtend ?? minExtend, minExtend);
    return u;
  }
};
var PreprocessPipeline = class _PreprocessPipeline {
  pipeline;
  cameraLayout;
  pcLayout;
  sortPreLayout;
  settingsLayout;
  constructor(cameraLayout, pcLayout, sortPreLayout, settingsLayout) {
    this.cameraLayout = cameraLayout;
    this.pcLayout = pcLayout;
    this.sortPreLayout = sortPreLayout;
    this.settingsLayout = settingsLayout;
  }
  static async create(device, shDeg, compressed, sortPreLayout) {
    const cameraLayout = UniformBuffer.bind_group_layout(device);
    const pcLayout = compressed ? PointCloud.bind_group_layout_compressed(device) : PointCloud.bind_group_layout(device);
    const settingsLayout = UniformBuffer.bind_group_layout(device);
    const self = new _PreprocessPipeline(
      cameraLayout,
      pcLayout,
      sortPreLayout,
      settingsLayout
    );
    const wgslPath = compressed ? "./shaders/preprocess_compressed.wgsl" : "./shaders/preprocess.wgsl";
    const src = await (await fetch(wgslPath)).text();
    const code = `const MAX_SH_DEG : u32 = ${shDeg}u;
${src}`;
    const module = device.createShaderModule({
      label: "preprocess shader",
      code
    });
    const pipelineLayout = device.createPipelineLayout({
      label: "preprocess pipeline layout",
      bindGroupLayouts: [
        self.cameraLayout,
        self.pcLayout,
        self.sortPreLayout,
        self.settingsLayout
      ]
    });
    self.pipeline = device.createComputePipeline({
      label: "preprocess pipeline",
      layout: pipelineLayout,
      compute: { module, entryPoint: "preprocess" }
    });
    logi2("[preprocess::new]", `sh_deg=${shDeg}, compressed=${compressed}`);
    return self;
  }
  run(encoder, pc, cameraBG, sortPreBG, settingsBG) {
    const wgsX = Math.ceil(pc.numPoints() / 256);
    logi2("[preprocess::run]", `dispatch_x=${wgsX}, num_points=${pc.numPoints()}`);
    const pass = encoder.beginComputePass({ label: "preprocess compute pass" });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, cameraBG);
    pass.setBindGroup(1, pc.getBindGroup());
    pass.setBindGroup(2, sortPreBG);
    pass.setBindGroup(3, settingsBG);
    pass.dispatchWorkgroups(wgsX, 1, 1);
    pass.end();
  }
};
var Display = class _Display {
  pipeline;
  bindGroup;
  format;
  view;
  envBg;
  hasEnvMap;
  constructor(pipeline, format, view, bindGroup, envBg) {
    this.pipeline = pipeline;
    this.format = format;
    this.view = view;
    this.bindGroup = bindGroup;
    this.envBg = envBg;
    this.hasEnvMap = false;
  }
  static envMapBindGroupLayout(device) {
    return device.createBindGroupLayout({
      label: "env map bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" }
        }
      ]
    });
  }
  static bindGroupLayout(device) {
    return device.createBindGroupLayout({
      label: "display bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d" }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" }
        }
      ]
    });
  }
  static createEnvMapBg(device, envTexture) {
    const placeholderTexture = device.createTexture({
      label: "placeholder",
      size: { width: 1, height: 1 },
      format: "rgba16float",
      usage: GPUTextureUsage.TEXTURE_BINDING
    }).createView();
    const textureView = envTexture ?? placeholderTexture;
    const sampler = device.createSampler({
      label: "env map sampler",
      magFilter: "linear",
      minFilter: "linear"
    });
    return device.createBindGroup({
      label: "env map bind group",
      layout: _Display.envMapBindGroupLayout(device),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
  }
  static createRenderTarget(device, format, width, height) {
    const texture = device.createTexture({
      label: "display render image",
      size: { width, height },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });
    const textureView = texture.createView();
    const sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
    const bindGroup = device.createBindGroup({
      label: "render target bind group",
      layout: _Display.bindGroupLayout(device),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: sampler }
      ]
    });
    return [textureView, bindGroup];
  }
  static async create(device, sourceFormat, targetFormat, width, height) {
    const pipelineLayout = device.createPipelineLayout({
      label: "display pipeline layout",
      bindGroupLayouts: [
        _Display.bindGroupLayout(device),
        _Display.envMapBindGroupLayout(device),
        UniformBuffer.bind_group_layout(device),
        UniformBuffer.bind_group_layout(device)
      ]
    });
    const displaySrc = await (await fetch("./shaders/display.wgsl")).text();
    const module = device.createShaderModule({
      label: "display shader",
      code: displaySrc
    });
    const pipeline = device.createRenderPipeline({
      label: "display pipeline",
      layout: pipelineLayout,
      vertex: { module, entryPoint: "vs_main" },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [
          {
            format: targetFormat,
            blend: {
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              }
            },
            writeMask: GPUColorWrite.ALL
          }
        ]
      },
      primitive: { topology: "triangle-strip" }
    });
    const envBg = _Display.createEnvMapBg(device, null);
    const [view, bindGroup] = _Display.createRenderTarget(
      device,
      sourceFormat,
      width,
      height
    );
    logi2("[display::new]", `render_target ${width}x${height} format=${sourceFormat}`);
    return new _Display(pipeline, sourceFormat, view, bindGroup, envBg);
  }
  texture() {
    return this.view;
  }
  setEnvMap(device, envTexture) {
    this.envBg = _Display.createEnvMapBg(device, envTexture);
    this.hasEnvMap = envTexture !== null;
    logi2("[display]", `set_env_map present=${this.hasEnvMap}`);
  }
  hasEnvMapSet() {
    return this.hasEnvMap;
  }
  resize(device, width, height) {
    const [view, bindGroup] = _Display.createRenderTarget(
      device,
      this.format,
      width,
      height
    );
    this.bindGroup = bindGroup;
    this.view = view;
    logi2("[display]", `resize to ${width}x${height}`);
  }
  render(encoder, target, backgroundColor, camera, renderSettings) {
    const pass = encoder.beginRenderPass({
      label: "render pass",
      colorAttachments: [
        {
          view: target,
          clearValue: backgroundColor,
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    pass.setBindGroup(0, this.bindGroup);
    pass.setBindGroup(1, this.envBg);
    pass.setBindGroup(2, camera);
    pass.setBindGroup(3, renderSettings);
    pass.setPipeline(this.pipeline);
    pass.draw(4, 1);
    pass.end();
  }
};
var GaussianRenderer = class _GaussianRenderer {
  pipeline;
  cameraUB;
  settingsUB;
  preprocess;
  drawIndirectBuffer;
  drawIndirect;
  _colorFormat;
  sorter;
  sorterStuff = null;
  renderSorterLayout;
  sortPreLayout;
  // reuse buffers for serialization
  _cu = new CameraUniform();
  _camBuf = new ArrayBuffer(68 * 4);
  // 68 f32
  _camF32 = new Float32Array(this._camBuf);
  _setBuf = new ArrayBuffer(80);
  _setDV = new DataView(this._setBuf);
  _indirectInitBuf = new ArrayBuffer(16);
  _indirectInitDV = new DataView(this._indirectInitBuf);
  // frame counter for debug throttling
  _frameIndex = 0;
  // last-hash tracking (so we only dump bytes when payload actually changes)
  _lastCamHash = null;
  _lastSetHash = null;
  constructor(pipeline, cameraUB, settingsUB, preprocess, drawIndirectBuffer, drawIndirect, colorFormat, sorter, renderSorterLayout, sortPreLayout) {
    this.pipeline = pipeline;
    this.cameraUB = cameraUB;
    this.settingsUB = settingsUB;
    this.preprocess = preprocess;
    this.drawIndirectBuffer = drawIndirectBuffer;
    this.drawIndirect = drawIndirect;
    this._colorFormat = colorFormat;
    this.sorter = sorter;
    this.renderSorterLayout = renderSorterLayout;
    this.sortPreLayout = sortPreLayout;
    this._indirectInitDV.setUint32(0, 4, true);
    this._indirectInitDV.setUint32(4, 0, true);
    this._indirectInitDV.setUint32(8, 0, true);
    this._indirectInitDV.setUint32(12, 0, true);
  }
  camera() {
    return this.cameraUB;
  }
  render_settings() {
    return this.settingsUB;
  }
  static async create(device, queue, colorFormat, shDeg, compressed) {
    logi2(
      "[renderer::new]",
      `color_format=${colorFormat}, sh_deg=${shDeg}, compressed=${compressed}`
    );
    const sorter = await GPURSSorter.create(device, queue);
    const pcRenderLayout = PointCloud.bind_group_layout_render(device);
    const renderSorterLayout = GPURSSorter.bindGroupLayoutRendering(device);
    const renderPipelineLayout = device.createPipelineLayout({
      label: "render pipeline layout",
      bindGroupLayouts: [pcRenderLayout, renderSorterLayout]
    });
    const gaussianSrc = await (await fetch("./shaders/gaussian.wgsl")).text();
    const gaussianModule = device.createShaderModule({
      label: "gaussian shader",
      code: gaussianSrc
    });
    const pipeline = device.createRenderPipeline({
      label: "render pipeline",
      layout: renderPipelineLayout,
      vertex: { module: gaussianModule, entryPoint: "vs_main" },
      fragment: {
        module: gaussianModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: colorFormat,
            blend: {
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              }
            },
            writeMask: GPUColorWrite.ALL
          }
        ]
      },
      primitive: { topology: "triangle-strip", frontFace: "ccw" }
    });
    const drawIndirectBuffer = device.createBuffer({
      label: "indirect draw buffer",
      size: 16,
      usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    const drawIndirectLayout = _GaussianRenderer.bindGroupLayout(device);
    const drawIndirect = device.createBindGroup({
      label: "draw indirect buffer",
      layout: drawIndirectLayout,
      entries: [{ binding: 0, resource: { buffer: drawIndirectBuffer } }]
    });
    const sortPreLayout = GPURSSorter.bindGroupLayoutPreprocess(device);
    const preprocess = await PreprocessPipeline.create(
      device,
      shDeg,
      compressed,
      sortPreLayout
    );
    const cameraUB = UniformBuffer.newDefault(
      device,
      "camera uniform buffer",
      68 * 4
    );
    const settingsUB = UniformBuffer.newDefault(
      device,
      "render settings uniform buffer",
      80
    );
    logi2(
      "[renderer::new]",
      `buffers ready; draw_indirect.size=${drawIndirectBuffer.size} bytes`
    );
    return new _GaussianRenderer(
      pipeline,
      cameraUB,
      settingsUB,
      preprocess,
      drawIndirectBuffer,
      drawIndirect,
      colorFormat,
      sorter,
      renderSorterLayout,
      sortPreLayout
    );
  }
  getColorFormat() {
    return this._colorFormat;
  }
  static bindGroupLayout(device) {
    return device.createBindGroupLayout({
      label: "draw indirect",
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
      ]
    });
  }
  /* ---------- serialization (match Rust struct layout) ---------- */
  serializeCameraUniform(camera) {
    const f32 = this._camF32;
    f32.set(mat4ColMajorToArray(camera.viewMatrix), 0);
    f32.set(mat4ColMajorToArray(camera.viewInvMatrix), 16);
    f32.set(mat4ColMajorToArray(camera.projMatrix), 32);
    f32.set(mat4ColMajorToArray(camera.projInvMatrix), 48);
    f32[64] = camera.viewport[0];
    f32[65] = camera.viewport[1];
    f32[66] = camera.focal[0];
    f32[67] = camera.focal[1];
    return new Uint8Array(this._camBuf);
  }
  serializeSettingsUniform(u) {
    const dv = this._setDV;
    let off = 0;
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.clippingBoxMin[i], true);
    off += 16;
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.clippingBoxMax[i], true);
    off += 16;
    dv.setFloat32(off, u.gaussianScaling, true);
    off += 4;
    dv.setUint32(off, u.maxShDeg >>> 0, true);
    off += 4;
    dv.setUint32(off, u.showEnvMap >>> 0, true);
    off += 4;
    dv.setUint32(off, u.mipSplatting >>> 0, true);
    off += 4;
    dv.setFloat32(off, u.kernelSize, true);
    off += 4;
    dv.setFloat32(off, u.walltime, true);
    off += 4;
    dv.setFloat32(off, u.sceneExtend, true);
    off += 4;
    dv.setUint32(off, 0, true);
    off += 4;
    for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, u.sceneCenter[i] ?? 0, true);
    return new Uint8Array(this._setBuf);
  }
  writeInitialDrawIndirect(queue) {
    queue.writeBuffer(this.drawIndirectBuffer, 0, this._indirectInitBuf);
    logi2(
      "[preprocess]",
      "wrote DrawIndirectArgs { vertex_count=4, instance_count=0, first_vertex=0, first_instance=0 }"
    );
  }
  /* ---------- core steps ---------- */
  preprocessStep(queue, pc, renderSettings) {
    const cu = this._cu;
    cu.setCamera(renderSettings.camera);
    cu.setViewport(renderSettings.viewport);
    cu.setFocal(renderSettings.camera.projection.focal(renderSettings.viewport));
    const V = mat4ColMajorToArray(cu.viewMatrix);
    const P = mat4ColMajorToArray(cu.projMatrix);
    const VP = new Float32Array(16);
    {
      const tmp = mat4_exports.create();
      mat4_exports.multiply(tmp, cu.projMatrix, cu.viewMatrix);
      VP.set(tmp);
    }
    logi2(
      "[preprocess]",
      `viewport=${cu.viewport[0]}x${cu.viewport[1]}, focal=(${cu.focal[0]},${cu.focal[1]})`
    );
    logi2("[preprocess]", `view=${fmtF32Slice(V)}`);
    logi2("[preprocess]", `proj=${fmtF32Slice(P)}`);
    logi2("[preprocess]", `viewProj=${fmtF32Slice(VP)}`);
    const cameraBytes = this.serializeCameraUniform(cu);
    const camHash = hashBytesU64(cameraBytes);
    logi2(
      "[preprocess]",
      `CameraUniform.size=${cameraBytes.byteLength} hash=${camHash}`
    );
    if (this._lastCamHash !== camHash) {
      dumpU32("[preprocess] CameraUniform.bytes(u32le)=", cameraBytes);
      this._lastCamHash = camHash;
    }
    const su = SplattingArgsUniform.fromArgsAndPc(renderSettings, pc);
    const settingsBytes = this.serializeSettingsUniform(su);
    const setHash = hashBytesU64(settingsBytes);
    logi2(
      "[preprocess]",
      `SplattingArgsUniform.size=${settingsBytes.byteLength} hash=${setHash}`
    );
    if (this._lastSetHash !== setHash) {
      dumpU32("[preprocess] SplattingArgsUniform.bytes(u32le)=", settingsBytes);
      this._lastSetHash = setHash;
    }
    this.cameraUB.setData(new Uint8Array(cameraBytes));
    this.cameraUB.sync(queue);
    this.settingsUB.setData(new Uint8Array(settingsBytes));
    this.settingsUB.sync(queue);
    this.writeInitialDrawIndirect(queue);
    globalThis.__LOGGING_ENABLED__ = false;
    return [this.cameraUB.bind_group(), this.settingsUB.bind_group()];
  }
  prepare(encoder, device, queue, pc, renderSettings, stopwatch) {
    if (!this.sorterStuff || this.sorterStuff.numPoints !== pc.numPoints()) {
      this.sorterStuff = this.sorter.createSortStuff(device, pc.numPoints());
      const ss = this.sorterStuff;
      logi2(
        "[prepare]",
        `sorter buffers (num_points=${ss.numPoints}): uni.size=${ss.sorterUni.size} dis.size=${ss.sorterDis.size}`
      );
    }
    GPURSSorter.recordResetIndirectBuffer(
      this.sorterStuff.sorterDis,
      this.sorterStuff.sorterUni,
      queue
    );
    logi2("[prepare]", "reset indirect & uniform sorter buffers");
    if (stopwatch) stopwatch.start(encoder, "preprocess");
    const [cameraBG, settingsBG] = this.preprocessStep(queue, pc, renderSettings);
    this.preprocess.run(
      encoder,
      pc,
      cameraBG,
      this.sorterStuff.sorterBgPre,
      settingsBG
    );
    if (stopwatch) stopwatch.stop(encoder, "preprocess");
    if (stopwatch) stopwatch.start(encoder, "sorting");
    this.sorter.recordSortIndirect(
      this.sorterStuff.sorterBg,
      this.sorterStuff.sorterDis,
      encoder
    );
    if (stopwatch) stopwatch.stop(encoder, "sorting");
    encoder.copyBufferToBuffer(this.sorterStuff.sorterUni, 0, this.drawIndirectBuffer, 4, 4);
    logi2("[prepare]", "copied visible instance_count into draw_indirect_buffer[+4]");
    this._frameIndex++;
    if (DEBUG_READBACK_EVERY_N_FRAMES > 0 && this._frameIndex % DEBUG_READBACK_EVERY_N_FRAMES === 0) {
      (async () => {
        try {
          const idab = await readbackBuffer(device, this.drawIndirectBuffer, 16);
          const id = new Uint32Array(idab);
          const visab = await readbackBuffer(device, this.sorterStuff.sorterUni, 4);
          const vis = new Uint32Array(visab)[0] >>> 0;
          if (loggingEnabled3()) {
            console.log("[indirect]", {
              vertexCount: id[0] >>> 0,
              instanceCount: id[1] >>> 0,
              firstVertex: id[2] >>> 0,
              firstInstance: id[3] >>> 0
            });
            console.log("[visibleCount]", vis);
          }
        } catch (e) {
          if (loggingEnabled3()) console.warn("[debug-readback] failed:", e);
        }
      })();
    }
  }
  render(renderPass, pc) {
    renderPass.setBindGroup(0, pc.getRenderBindGroup());
    renderPass.setBindGroup(1, this.sorterStuff.sorterRenderBg);
    renderPass.setPipeline(this.pipeline);
    renderPass.drawIndirect(this.drawIndirectBuffer, 0);
  }
};

// src/controller.ts
var DEBUG_INPUT = false;
var dlog = (...args) => {
  if (DEBUG_INPUT) console.debug("[controller]", ...args);
};
var CameraController = class {
  center;
  up;
  amount;
  shift;
  rotation;
  scroll;
  speed;
  sensitivity;
  left_mouse_pressed;
  right_mouse_pressed;
  alt_pressed;
  user_inptut;
  // keep original typo for 1:1 API
  constructor(speed, sensitivity) {
    this.center = vec3_exports.fromValues(0, 0, 0);
    this.up = null;
    this.amount = vec3_exports.fromValues(0, 0, 0);
    this.shift = vec2_exports.fromValues(0, 0);
    this.rotation = vec3_exports.fromValues(0, 0, 0);
    this.scroll = 0;
    this.speed = speed;
    this.sensitivity = sensitivity;
    this.left_mouse_pressed = false;
    this.right_mouse_pressed = false;
    this.alt_pressed = false;
    this.user_inptut = false;
  }
  /** Returns true if the key was handled (matches Rust’s bool). */
  process_keyboard(key, pressed) {
    const amount = pressed ? 1 : 0;
    let processed = false;
    switch (key) {
      case "KeyW":
      case "ArrowUp":
        this.amount[2] += amount;
        processed = true;
        break;
      case "KeyS":
      case "ArrowDown":
        this.amount[2] += -amount;
        processed = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.amount[0] += -amount;
        processed = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.amount[0] += amount;
        processed = true;
        break;
      case "KeyQ":
        this.rotation[2] += amount / this.sensitivity;
        processed = true;
        break;
      case "KeyE":
        this.rotation[2] += -amount / this.sensitivity;
        processed = true;
        break;
      case "Space":
        this.amount[1] += amount;
        processed = true;
        break;
      case "ShiftLeft":
        this.amount[1] += -amount;
        processed = true;
        break;
      default:
        processed = false;
    }
    this.user_inptut = processed;
    if (processed) dlog("process_keyboard", key, { pressed, amount: this.amount, rotation: this.rotation });
    return processed;
  }
  /** mouse_dx/mouse_dy in pixels (same semantics as Rust). */
  process_mouse(mouse_dx, mouse_dy) {
    if (this.left_mouse_pressed) {
      this.rotation[0] += mouse_dx;
      this.rotation[1] += mouse_dy;
      this.user_inptut = true;
      dlog("process_mouse rotate", { dx: mouse_dx, dy: mouse_dy, rotation: this.rotation });
    }
    if (this.right_mouse_pressed) {
      this.shift[1] += -mouse_dx;
      this.shift[0] += mouse_dy;
      this.user_inptut = true;
      dlog("process_mouse pan", { dx: mouse_dx, dy: mouse_dy, shift: this.shift });
    }
  }
  process_scroll(dy) {
    this.scroll += -dy;
    this.user_inptut = true;
    dlog("process_scroll", { dy, scroll: this.scroll });
  }
  /** Align controller to the camera’s current line of sight and adjust up. */
  reset_to_camera(camera) {
    const invView = quat_exports.invert(quat_exports.create(), camera.rotation);
    const forward = vec3_exports.transformQuat(vec3_exports.create(), vec3_exports.fromValues(0, 0, 1), invView);
    const right = vec3_exports.transformQuat(vec3_exports.create(), vec3_exports.fromValues(1, 0, 0), invView);
    this.center = closest_point(camera.position, forward, this.center);
    if (this.up) {
      const projLen = vec3_exports.dot(this.up, right) / vec3_exports.dot(right, right);
      const proj = vec3_exports.scale(vec3_exports.create(), right, projLen);
      const newUp = vec3_exports.normalize(vec3_exports.create(), vec3_exports.subtract(vec3_exports.create(), this.up, proj));
      this.up = newUp;
    }
    dlog("reset_to_camera", { center: this.center, up: this.up });
  }
  /**
   * Update camera given dt in seconds (1:1 with Duration semantics).
   * Mutates camera position/rotation.
   */
  update_camera(camera, dt_seconds) {
    const dt = dt_seconds;
    const dir = vec3_exports.subtract(vec3_exports.create(), camera.position, this.center);
    const distance4 = Math.max(1e-12, vec3_exports.length(dir));
    const newDist = Math.exp(Math.log(distance4) + this.scroll * dt * 10 * this.speed);
    const dirNorm = vec3_exports.scale(vec3_exports.create(), vec3_exports.normalize(vec3_exports.create(), dir), newDist);
    const worldUp = this.up ? normalizeSafe(this.up) : vec3_exports.fromValues(0, 1, 0);
    let x_axis = vec3_exports.cross(vec3_exports.create(), worldUp, dirNorm);
    x_axis = normalizeSafe(x_axis);
    if (vec3_exports.length(x_axis) < 1e-6) {
      x_axis = vec3_exports.fromValues(1, 0, 0);
    }
    const y_axis = worldUp;
    const panScale = dt * this.speed * 0.1 * distance4;
    const pan = vec3_exports.create();
    vec3_exports.scaleAndAdd(pan, pan, x_axis, -this.shift[1] * panScale);
    vec3_exports.scaleAndAdd(pan, pan, y_axis, -this.shift[0] * panScale);
    vec3_exports.add(this.center, this.center, pan);
    vec3_exports.add(camera.position, camera.position, pan);
    const yaw = this.rotation[0] * dt * this.sensitivity;
    const pitch = this.rotation[1] * dt * this.sensitivity;
    let right = vec3_exports.clone(x_axis);
    if (vec3_exports.length(right) < 1e-6) right = vec3_exports.fromValues(1, 0, 0);
    const qYaw = quat_exports.setAxisAngle(quat_exports.create(), worldUp, yaw);
    const qPitch = quat_exports.setAxisAngle(quat_exports.create(), right, pitch);
    const rot = quat_exports.multiply(quat_exports.create(), qYaw, qPitch);
    const new_dir = vec3_exports.transformQuat(vec3_exports.create(), dirNorm, rot);
    if (angle_short(worldUp, new_dir) < 0.1) {
      vec3_exports.copy(new_dir, dirNorm);
    }
    vec3_exports.add(camera.position, this.center, new_dir);
    camera.rotation = lookRotation(vec3_exports.scale(vec3_exports.create(), new_dir, -1), worldUp);
    let decay = Math.pow(0.8, dt * 60);
    if (decay < 1e-4) decay = 0;
    vec3_exports.scale(this.rotation, this.rotation, decay);
    if (vec3_exports.length(this.rotation) < 1e-4) vec3_exports.set(this.rotation, 0, 0, 0);
    vec2_exports.scale(this.shift, this.shift, decay);
    if (vec2_exports.length(this.shift) < 1e-4) vec2_exports.set(this.shift, 0, 0);
    this.scroll *= decay;
    if (Math.abs(this.scroll) < 1e-4) this.scroll = 0;
    this.user_inptut = false;
    dlog("update_camera (orbit, no-roll)", { dt, yaw, pitch, center: this.center, camPos: camera.position });
  }
};
function closest_point(orig, dir, point) {
  const d = normalizeSafe(dir);
  const lhs = vec3_exports.subtract(vec3_exports.create(), point, orig);
  const dot_p = vec3_exports.dot(lhs, d);
  const out = vec3_exports.scaleAndAdd(vec3_exports.create(), orig, d, dot_p);
  return out;
}
function angle_short(a, b) {
  const na = normalizeSafe(a);
  const nb = normalizeSafe(b);
  const dot5 = Math.min(1, Math.max(-1, vec3_exports.dot(na, nb)));
  const angle3 = Math.acos(dot5);
  return angle3 > Math.PI / 2 ? Math.PI - angle3 : angle3;
}
function normalizeSafe(v) {
  const len5 = vec3_exports.length(v);
  return len5 > 0 ? vec3_exports.scale(vec3_exports.create(), v, 1 / len5) : vec3_exports.fromValues(0, 0, 0);
}
function lookRotation(forward, up) {
  const f = normalizeSafe(forward);
  const r = normalizeSafe(vec3_exports.cross(vec3_exports.create(), up, f));
  const u = vec3_exports.cross(vec3_exports.create(), f, r);
  const m = mat3_exports.fromValues(
    r[0],
    r[1],
    r[2],
    u[0],
    u[1],
    u[2],
    f[0],
    f[1],
    f[2]
  );
  const q = quat_exports.fromMat3(quat_exports.create(), m);
  return quat_exports.normalize(q, q);
}

// src/utils.ts
var GPUStopwatch = class _GPUStopwatch {
  // --- fields (same names as Rust) ---
  query_set;
  query_buffer;
  query_set_capacity;
  // total query slots (pairs * 2)
  index;
  // pair index (start/stop)
  labels;
  // Web: browsers don’t expose a timestamp period like wgpu; assume ns ticks.
  timestamp_period_ns = 1;
  // Rust: GPUStopwatch::new(device, capacity)
  static new(device, capacity) {
    return new _GPUStopwatch(device, capacity);
  }
  constructor(device, capacity) {
    const pairs = Math.max(1, capacity ?? 8192 >> 1);
    this.query_set_capacity = pairs * 2;
    this.index = 0;
    this.labels = /* @__PURE__ */ new Map();
    let qs = null;
    let qb = null;
    try {
      qs = device.createQuerySet({
        label: "time stamp query set",
        type: "timestamp",
        count: this.query_set_capacity
      });
      qb = device.createBuffer({
        label: "query set buffer",
        size: this.query_set_capacity * 8,
        // u64 per timestamp
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      });
    } catch {
      qs = null;
      qb = null;
    }
    this.query_set = qs;
    this.query_buffer = qb;
  }
  // Rust: start(&mut self, encoder, label) -> Result<(), String>
  start(encoder, label) {
    if (!this.query_set) return;
    if (this.labels.has(label)) {
      throw new Error("cannot start measurement for same label twice");
    }
    if (this.labels.size * 2 >= this.query_set_capacity) {
      throw new Error(`query set capacity (${this.query_set_capacity})reached`);
    }
    this.labels.set(label, this.index);
    encoder.writeTimestamp?.(this.query_set, this.index * 2);
    this.index += 1;
  }
  // Rust: stop(&mut self, encoder, label) -> Result<(), String>
  stop(encoder, label) {
    if (!this.query_set) return;
    const idx = this.labels.get(label);
    if (idx === void 0) {
      throw new Error(`start was not yet called for label ${label}`);
    }
    encoder.writeTimestamp?.(this.query_set, idx * 2 + 1);
  }
  // Rust: end(&mut self, encoder)
  end(encoder) {
    if (!this.query_set || !this.query_buffer) return;
    encoder.resolveQuerySet(this.query_set, 0, this.query_set_capacity, this.query_buffer, 0);
    this.index = 0;
  }
  // Rust: reset(&mut self)
  reset() {
    this.labels.clear();
  }
  // Rust: take_measurements(&mut self, device, queue) -> HashMap<String, Duration>
  // TS: returns Map<label, duration_ms>
  async take_measurements(device, queue) {
    const out = /* @__PURE__ */ new Map();
    if (!this.query_buffer) return out;
    const labels = Array.from(this.labels.entries());
    this.labels.clear();
    const byteSize = this.query_set_capacity * 8;
    const staging = device.createBuffer({
      size: byteSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const enc = device.createCommandEncoder({ label: "GPUStopwatch readback" });
    enc.copyBufferToBuffer(this.query_buffer, 0, staging, 0, byteSize);
    queue.submit([enc.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const data = staging.getMappedRange();
    const timestamps = new BigUint64Array(data);
    for (const [label, index] of labels) {
      const start = timestamps[index * 2];
      const stop = timestamps[index * 2 + 1];
      if (stop > start) {
        const diff_ns = stop - start;
        const ms = Number(diff_ns) / 1e6 / this.timestamp_period_ns;
        out.set(label, ms);
      }
    }
    staging.unmap();
    staging.destroy();
    return out;
  }
};
function sh_deg_from_num_coefs(n) {
  const sqrt = Math.sqrt(n);
  return Number.isInteger(sqrt) ? (sqrt | 0) - 1 : null;
}
function build_cov(rotation, scale7) {
  const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
  const sx = scale7[0], sy = scale7[1], sz = scale7[2];
  const d0 = sx * sx, d1 = sy * sy, d2 = sz * sz;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  const r00 = 1 - 2 * (yy + zz);
  const r01 = 2 * (xy - wz);
  const r02 = 2 * (xz + wy);
  const r10 = 2 * (xy + wz);
  const r11 = 1 - 2 * (xx + zz);
  const r12 = 2 * (yz - wx);
  const r20 = 2 * (xz - wy);
  const r21 = 2 * (yz + wx);
  const r22 = 1 - 2 * (xx + yy);
  const rd00 = r00 * d0, rd01 = r01 * d1, rd02 = r02 * d2;
  const rd10 = r10 * d0, rd11 = r11 * d1, rd12 = r12 * d2;
  const rd20 = r20 * d0, rd21 = r21 * d1, rd22 = r22 * d2;
  const m00 = rd00 * r00 + rd01 * r01 + rd02 * r02;
  const m01 = rd00 * r10 + rd01 * r11 + rd02 * r12;
  const m02 = rd00 * r20 + rd01 * r21 + rd02 * r22;
  const m11 = rd10 * r10 + rd11 * r11 + rd12 * r12;
  const m12 = rd10 * r20 + rd11 * r21 + rd12 * r22;
  const m22 = rd20 * r20 + rd21 * r21 + rd22 * r22;
  return [m00, m01, m02, m11, m12, m22];
}
function sigmoid(x) {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}
var buildCov = build_cov;
var shDegFromNumCoefs = sh_deg_from_num_coefs;

// src/io/ply.ts
var DEBUG_MAX_SPLATS = null;
var DEBUG_LOG_PLY_SAMPLE0 = true;
var __PLY_SAMPLE_LOGGED__ = false;
var qScratch = quat_exports.create();
var scaleScratch = vec3_exports.create();
function parsePlyHeader(data) {
  const u8 = new Uint8Array(data);
  const needle = utf8Bytes("end_header");
  let endIdx = -1;
  search: for (let i = 0; i <= u8.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (u8[i + j] !== needle[j]) continue search;
    }
    endIdx = i + needle.length;
    break;
  }
  if (endIdx < 0) throw new Error("PLY: end_header not found");
  let headerEnd = endIdx;
  while (headerEnd < u8.length && u8[headerEnd] !== 10) headerEnd++;
  headerEnd++;
  const headerText = asciiDecode(u8.subarray(0, headerEnd));
  const lines = headerText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  let encoding = null;
  let vertexCount = 0;
  const comments = [];
  const vertexPropNames = [];
  let inVertexElement = false;
  for (const line of lines) {
    if (line.startsWith("comment ")) {
      comments.push(line.substring("comment ".length));
      continue;
    }
    if (line.startsWith("format ")) {
      if (line.includes("binary_little_endian")) encoding = "binary_little_endian";
      else if (line.includes("binary_big_endian")) encoding = "binary_big_endian";
      else if (line.includes("ascii")) encoding = "ascii";
      else throw new Error(`PLY: unknown format in line "${line}"`);
      continue;
    }
    if (line.startsWith("element ")) {
      const parts = line.split(/\s+/);
      const elemName = parts[1];
      inVertexElement = elemName === "vertex";
      if (inVertexElement) {
        vertexCount = parseInt(parts[2], 10);
      }
      continue;
    }
    if (line.startsWith("property ") && inVertexElement) {
      const parts = line.split(/\s+/);
      const name = parts[parts.length - 1];
      vertexPropNames.push(name);
      continue;
    }
  }
  if (!encoding) throw new Error("PLY: format line not found");
  return {
    encoding,
    vertexCount,
    comments,
    vertexPropNames,
    headerByteLength: headerEnd
  };
}
function utf8Bytes(s) {
  return new TextEncoder().encode(s);
}
function asciiDecode(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}
var PlyReader = class _PlyReader {
  header;
  dv;
  offset;
  sh_deg;
  num_points;
  mip_splatting;
  kernel_size;
  background_color;
  // precomputed once (avoids per-splat allocation)
  numCoefs;
  restScratch;
  constructor(reader) {
    this.header = parsePlyHeader(reader);
    this.dv = new DataView(reader);
    this.offset = this.header.headerByteLength;
    const numShCoefs = this.header.vertexPropNames.filter((n) => n.startsWith("f_")).length;
    const deg = shDegFromNumCoefs(numShCoefs / 3);
    if (deg == null) {
      throw new Error(`number of sh coefficients ${numShCoefs} cannot be mapped to sh degree`);
    }
    this.sh_deg = deg;
    this.numCoefs = (this.sh_deg + 1) * (this.sh_deg + 1);
    this.restScratch = new Float32Array(Math.max(0, (this.numCoefs - 1) * 3));
    const fileCount = this.header.vertexCount;
    const clamped = DEBUG_MAX_SPLATS != null && DEBUG_MAX_SPLATS > 0 ? Math.min(fileCount, DEBUG_MAX_SPLATS) : fileCount;
    if (clamped !== fileCount) {
      console.log(`[ply] DEBUG: clamping splats ${fileCount} -> ${clamped}`);
    }
    this.num_points = clamped;
    this.mip_splatting = parseBoolFromComments(this.header.comments, "mip");
    this.kernel_size = parseNumberFromComments(this.header.comments, "kernel_size");
    this.background_color = parseRGBFromComments(this.header.comments, "background_color");
  }
  static new(reader) {
    return new _PlyReader(reader);
  }
  static magic_bytes() {
    return new Uint8Array([112, 108, 121]);
  }
  static file_ending() {
    return "ply";
  }
  read() {
    const gaussians = [];
    const sh_coefs = [];
    switch (this.header.encoding) {
      case "ascii":
        throw new Error("ascii ply format not supported");
      // matches Rust todo!()
      case "binary_big_endian":
        for (let i = 0; i < this.num_points; i++) {
          const { g, s } = this.read_line(false);
          gaussians.push(g);
          sh_coefs.push(s);
        }
        break;
      case "binary_little_endian":
        for (let i = 0; i < this.num_points; i++) {
          const { g, s } = this.read_line(true);
          gaussians.push(g);
          sh_coefs.push(s);
        }
        break;
    }
    return GenericGaussianPointCloud.new(
      gaussians,
      sh_coefs,
      this.sh_deg,
      this.num_points,
      this.kernel_size,
      this.mip_splatting,
      this.background_color,
      null,
      null
    );
  }
  read_line(littleEndian) {
    const px = this.readF32(littleEndian);
    const py = this.readF32(littleEndian);
    const pz = this.readF32(littleEndian);
    this.readF32(littleEndian);
    this.readF32(littleEndian);
    this.readF32(littleEndian);
    const sh = Array.from({ length: 16 }, () => [0, 0, 0]);
    sh[0][0] = this.readF32(littleEndian);
    sh[0][1] = this.readF32(littleEndian);
    sh[0][2] = this.readF32(littleEndian);
    const restCount = (this.numCoefs - 1) * 3;
    const rest = this.restScratch;
    for (let i = 0; i < restCount; i++) rest[i] = this.readF32(littleEndian);
    const stride = this.numCoefs - 1;
    for (let i = 0; i < this.numCoefs - 1; i++) {
      sh[i + 1][0] = rest[0 * stride + i];
      sh[i + 1][1] = rest[1 * stride + i];
      sh[i + 1][2] = rest[2 * stride + i];
    }
    const opacity = sigmoid(this.readF32(littleEndian));
    const s1 = Math.exp(this.readF32(littleEndian));
    const s2 = Math.exp(this.readF32(littleEndian));
    const s3 = Math.exp(this.readF32(littleEndian));
    scaleScratch[0] = s1;
    scaleScratch[1] = s2;
    scaleScratch[2] = s3;
    const r0 = this.readF32(littleEndian);
    const r1 = this.readF32(littleEndian);
    const r2 = this.readF32(littleEndian);
    const r3 = this.readF32(littleEndian);
    qScratch[0] = r1;
    qScratch[1] = r2;
    qScratch[2] = r3;
    qScratch[3] = r0;
    quat_exports.normalize(qScratch, qScratch);
    const cov = buildCov(qScratch, scaleScratch);
    const g = {
      xyz: { x: px, y: py, z: pz },
      opacity,
      cov: [cov[0], cov[1], cov[2], cov[3], cov[4], cov[5]]
    };
    if (DEBUG_LOG_PLY_SAMPLE0 && !__PLY_SAMPLE_LOGGED__) {
      __PLY_SAMPLE_LOGGED__ = true;
      console.log("[ply::sample0] pos", [px, py, pz]);
      console.log("[ply::sample0] opacity", opacity);
      console.log("[ply::sample0] scale(exp)", [s1, s2, s3]);
      console.log("[ply::sample0] quat(x,y,z,w) normalized", [qScratch[0], qScratch[1], qScratch[2], qScratch[3]]);
      console.log("[ply::sample0] cov[0..5]", [cov[0], cov[1], cov[2], cov[3], cov[4], cov[5]]);
      console.log("[ply::sample0] SH[0]", [sh[0][0], sh[0][1], sh[0][2]]);
      if (this.numCoefs > 1) console.log("[ply::sample0] SH[1]", [sh[1][0], sh[1][1], sh[1][2]]);
      if (this.numCoefs > 2) console.log("[ply::sample0] SH[2]", [sh[2][0], sh[2][1], sh[2][2]]);
    }
    return { g, s: sh };
  }
  readF32(littleEndian) {
    const v = this.dv.getFloat32(this.offset, littleEndian);
    this.offset += 4;
    return v;
  }
  static magic_bytes_ts() {
    return _PlyReader.magic_bytes();
  }
};
function parseBoolFromComments(comments, key) {
  for (const c of comments) {
    if (c.includes(key)) {
      const idx = c.indexOf("=");
      if (idx >= 0) {
        const raw = c.substring(idx + 1).trim();
        if (raw === "true") return true;
        if (raw === "false") return false;
      }
    }
  }
  return null;
}
function parseNumberFromComments(comments, key) {
  for (const c of comments) {
    if (c.includes(key)) {
      const idx = c.indexOf("=");
      if (idx >= 0) {
        const raw = c.substring(idx + 1).trim();
        const num = Number(raw);
        if (!Number.isNaN(num)) return num;
      }
    }
  }
  return null;
}
function parseRGBFromComments(comments, key) {
  for (const c of comments) {
    if (c.includes(key)) {
      const idx = c.indexOf("=");
      if (idx >= 0) {
        const raw = c.substring(idx + 1).trim();
        const parts = raw.split(",").map((s) => Number(s.trim()));
        if (parts.length === 3 && parts.every((v) => Number.isFinite(v))) {
          return [parts[0], parts[1], parts[2]];
        }
      }
    }
  }
  return null;
}

// src/io/mod.ts
var GenericGaussianPointCloud = class _GenericGaussianPointCloud {
  gaussiansBytes;
  shCoefsBytes;
  _compressed;
  covars;
  quantization;
  sh_deg;
  num_points;
  kernel_size;
  mip_splatting;
  background_color;
  up;
  center;
  aabb;
  _gaussiansParsed = null;
  static load(data) {
    const sig = new Uint8Array(data, 0, 4);
    if (startsWith(sig, PlyReader.magic_bytes())) {
      const ply = new PlyReader(data);
      return ply.read();
    }
    throw new Error("Unknown file format");
  }
  // Rust: fn new(gaussians: Vec<Gaussian>, sh_coefs: Vec<[[f16;3];16]>, ...)
  static new(gaussians, sh_coefs, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization) {
    let bbox = Aabb.zeroed();
    for (const g of gaussians) {
      bbox.grow({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z });
    }
    const points = gaussians.map((g) => ({
      x: g.xyz.x,
      y: g.xyz.y,
      z: g.xyz.z
    }));
    const [center, up0] = plane_from_points(points);
    let up = up0;
    if (bbox.radius() < 10) up = null;
    const gaussiansBytes = packGaussiansF16(gaussians);
    const shCoefsBytes = packShCoefsF16(sh_coefs);
    return new _GenericGaussianPointCloud(
      gaussiansBytes,
      shCoefsBytes,
      sh_deg,
      num_points,
      kernel_size,
      mip_splatting,
      background_color,
      covars,
      quantization,
      up,
      center,
      bbox,
      /* compressed */
      false,
      /* parsed */
      gaussians
    );
  }
  // Rust: fn new_compressed(...)
  static new_compressed(gaussians, sh_coefs_packed, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization) {
    let bbox = Aabb.unit();
    for (const v of gaussians) {
      bbox.grow({ x: v.xyz.x, y: v.xyz.y, z: v.xyz.z });
    }
    const points = gaussians.map((g) => ({
      x: g.xyz.x,
      y: g.xyz.y,
      z: g.xyz.z
    }));
    const [center, up0] = plane_from_points(points);
    let up = up0;
    if (bbox.radius() < 10) up = null;
    const gaussiansBytes = packGaussiansCompressed(gaussians);
    return new _GenericGaussianPointCloud(
      gaussiansBytes,
      sh_coefs_packed,
      sh_deg,
      num_points,
      kernel_size,
      mip_splatting,
      background_color,
      covars,
      quantization,
      up,
      center,
      bbox,
      /* compressed */
      true,
      /* parsed */
      null
    );
  }
  constructor(gaussiansBytes, shCoefsBytes, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization, up, center, aabb, compressed, parsed) {
    this.gaussiansBytes = gaussiansBytes;
    this.shCoefsBytes = shCoefsBytes;
    this._compressed = compressed;
    this.covars = covars ?? null;
    this.quantization = quantization ?? null;
    this.sh_deg = sh_deg;
    this.num_points = num_points;
    this.kernel_size = kernel_size ?? null;
    this.mip_splatting = mip_splatting ?? null;
    this.background_color = background_color ?? null;
    this.up = up;
    this.center = center;
    this.aabb = aabb;
    this._gaussiansParsed = parsed;
  }
  gaussians() {
    if (this._compressed) {
      throw new Error("Gaussians are compressed");
    }
    if (this._gaussiansParsed) return this._gaussiansParsed;
    throw new Error("Parsed gaussians not available");
  }
  // (kept aligned with the Rust provided logic signature-wise;
  // the Rust version appears inconsistent; we mirror the surface API)
  gaussians_compressed() {
    if (this._compressed) {
      throw new Error("Gaussians are compressed");
    } else {
      throw new Error("Not compressed");
    }
  }
  sh_coefs_buffer() {
    return this.shCoefsBytes;
  }
  gaussian_buffer() {
    return this.gaussiansBytes;
  }
  compressed() {
    return this._compressed;
  }
};
function startsWith(buf, sig) {
  if (sig.length > buf.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}
var __f16_scratch_f32 = new Float32Array(1);
var __f16_scratch_u32 = new Uint32Array(__f16_scratch_f32.buffer);
function f32_to_f16(val) {
  __f16_scratch_f32[0] = val;
  const x = __f16_scratch_u32[0];
  const sign = x >>> 16 & 32768;
  let exp2 = x >>> 23 & 255;
  let mant = x & 8388607;
  if (exp2 === 255) {
    const isNan = mant !== 0;
    return sign | 31744 | (isNan ? 512 : 0);
  }
  if (exp2 === 0) {
    return sign;
  }
  let e = exp2 - 112;
  if (e <= 0) {
    if (e < -10) return sign;
    mant = (mant | 8388608) >>> 1 - e;
    if (mant & 4096) mant += 8192;
    return sign | mant >>> 13;
  }
  if (e >= 31) {
    return sign | 31744;
  }
  if (mant & 4096) {
    mant += 8192;
    if (mant & 8388608) {
      mant = 0;
      e += 1;
      if (e >= 31) return sign | 31744;
    }
  }
  return sign | e << 10 | mant >>> 13 & 1023;
}
function packGaussiansF16(gaussians) {
  const WORDS_PER = 10;
  const u16 = new Uint16Array(gaussians.length * WORDS_PER);
  let i = 0;
  for (const g of gaussians) {
    u16[i++] = f32_to_f16(g.xyz.x);
    u16[i++] = f32_to_f16(g.xyz.y);
    u16[i++] = f32_to_f16(g.xyz.z);
    u16[i++] = f32_to_f16(g.opacity);
    u16[i++] = f32_to_f16(g.cov[0]);
    u16[i++] = f32_to_f16(g.cov[1]);
    u16[i++] = f32_to_f16(g.cov[2]);
    u16[i++] = f32_to_f16(g.cov[3]);
    u16[i++] = f32_to_f16(g.cov[4]);
    u16[i++] = f32_to_f16(g.cov[5]);
  }
  return new Uint8Array(u16.buffer);
}
function packShCoefsF16(sh) {
  const WORDS_PER_POINT = 16 * 3;
  const u16 = new Uint16Array(sh.length * WORDS_PER_POINT);
  let i = 0;
  for (const block of sh) {
    for (let k = 0; k < 16; k++) {
      const t = block[k];
      u16[i++] = f32_to_f16(t[0]);
      u16[i++] = f32_to_f16(t[1]);
      u16[i++] = f32_to_f16(t[2]);
    }
  }
  return new Uint8Array(u16.buffer);
}
function packGaussiansCompressed(g) {
  const BYTES_PER = 16;
  const buf = new ArrayBuffer(g.length * BYTES_PER);
  const view = new DataView(buf);
  let off = 0;
  for (const v of g) {
    view.setUint16(off + 0, f32_to_f16(v.xyz.x), true);
    view.setUint16(off + 2, f32_to_f16(v.xyz.y), true);
    view.setUint16(off + 4, f32_to_f16(v.xyz.z), true);
    view.setInt8(off + 6, v.opacity);
    view.setInt8(off + 7, v.scale_factor);
    view.setUint32(off + 8, v.geometry_idx, true);
    view.setUint32(off + 12, v.sh_idx, true);
    off += BYTES_PER;
  }
  return new Uint8Array(buf);
}
function plane_from_points(points) {
  const n = points.length;
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumZ += p.z;
  }
  const centroid = { x: sumX / (n || 1), y: sumY / (n || 1), z: sumZ / (n || 1) };
  if (n < 3) return [centroid, null];
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
  for (const p of points) {
    const rx = p.x - centroid.x;
    const ry = p.y - centroid.y;
    const rz = p.z - centroid.z;
    xx += rx * rx;
    xy += rx * ry;
    xz += rx * rz;
    yy += ry * ry;
    yz += ry * rz;
    zz += rz * rz;
  }
  xx /= n;
  xy /= n;
  xz /= n;
  yy /= n;
  yz /= n;
  zz /= n;
  let wx = 0, wy = 0, wz = 0;
  {
    const det_x = yy * zz - yz * yz;
    const ax = det_x, ay = xz * yz - xy * zz, az = xy * yz - xz * yy;
    let w = det_x * det_x;
    if (wx * ax + wy * ay + wz * az < 0) w = -w;
    wx += ax * w;
    wy += ay * w;
    wz += az * w;
  }
  {
    const det_y = xx * zz - xz * xz;
    const ax = xz * yz - xy * zz, ay = det_y, az = xy * xz - yz * xx;
    let w = det_y * det_y;
    if (wx * ax + wy * ay + wz * az < 0) w = -w;
    wx += ax * w;
    wy += ay * w;
    wz += az * w;
  }
  {
    const det_z = xx * yy - xy * xy;
    const ax = xy * yz - xz * yy, ay = xy * xz - yz * xx, az = det_z;
    let w = det_z * det_z;
    if (wx * ax + wy * ay + wz * az < 0) w = -w;
    wx += ax * w;
    wy += ay * w;
    wz += az * w;
  }
  const len5 = Math.hypot(wx, wy, wz);
  if (!(len5 > 0) || !Number.isFinite(len5)) return [centroid, null];
  let nx = wx / len5, ny = wy / len5, nz = wz / len5;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  return [centroid, { x: nx, y: ny, z: nz }];
}

// src/scene.ts
var SceneCamera = class _SceneCamera {
  id;
  imgName;
  width;
  height;
  position;
  rotation;
  fx;
  fy;
  split;
  constructor(id, imgName, width, height, position, rotation, fx, fy, split = "train" /* Train */) {
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
  static fromPerspective(cam, name, id, viewport, split) {
    const fx = fov2focal(cam.projection.fovx, viewport.x);
    const fy = fov2focal(cam.projection.fovy, viewport.y);
    const r = mat3_exports.create();
    mat3_exports.fromQuat(r, cam.rotation);
    const rotationArray = [
      [r[0], r[1], r[2]],
      [r[3], r[4], r[5]],
      [r[6], r[7], r[8]]
    ];
    return new _SceneCamera(
      id,
      name,
      viewport.x,
      viewport.y,
      [cam.position[0], cam.position[1], cam.position[2]],
      rotationArray,
      fx,
      fy,
      split
    );
  }
  toPerspectiveCamera() {
    const fovx = focal2fov(this.fx, this.width);
    const fovy = focal2fov(this.fy, this.height);
    const r = mat3_exports.fromValues(
      this.rotation[0][0],
      this.rotation[0][1],
      this.rotation[0][2],
      this.rotation[1][0],
      this.rotation[1][1],
      this.rotation[1][2],
      this.rotation[2][0],
      this.rotation[2][1],
      this.rotation[2][2]
    );
    if (mat3_exports.determinant(r) < 0) {
      r[1] = -r[1];
      r[4] = -r[4];
      r[7] = -r[7];
    }
    const q = quat_exports.create();
    if (quat_exports.fromMat3) {
      quat_exports.fromMat3(q, r);
    } else {
      const m00 = r[0], m01 = r[1], m02 = r[2];
      const m10 = r[3], m11 = r[4], m12 = r[5];
      const m20 = r[6], m21 = r[7], m22 = r[8];
      const t = m00 + m11 + m22;
      if (t > 0) {
        const s = Math.sqrt(t + 1) * 2;
        q[3] = 0.25 * s;
        q[0] = (m21 - m12) / s;
        q[1] = (m02 - m20) / s;
        q[2] = (m10 - m01) / s;
      } else if (m00 > m11 && m00 > m22) {
        const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
        q[3] = (m21 - m12) / s;
        q[0] = 0.25 * s;
        q[1] = (m01 + m10) / s;
        q[2] = (m02 + m20) / s;
      } else if (m11 > m22) {
        const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
        q[3] = (m02 - m20) / s;
        q[0] = (m01 + m10) / s;
        q[1] = 0.25 * s;
        q[2] = (m12 + m21) / s;
      } else {
        const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
        q[3] = (m10 - m01) / s;
        q[0] = (m02 + m20) / s;
        q[1] = (m12 + m21) / s;
        q[2] = 0.25 * s;
      }
    }
    quat_exports.normalize(q, q);
    const pos = vec3_exports.fromValues(this.position[0], this.position[1], this.position[2]);
    const proj = PerspectiveProjection.new(
      vec2_exports.fromValues(this.width, this.height),
      vec2_exports.fromValues(fovx, fovy),
      0.01,
      100
    );
    return new PerspectiveCamera(pos, q, proj);
  }
  hash() {
    return JSON.stringify({
      imgName: this.imgName,
      width: this.width,
      height: this.height,
      position: this.position,
      rotation: this.rotation,
      fx: this.fx,
      fy: this.fy,
      split: this.split
    });
  }
  clone() {
    return new _SceneCamera(
      this.id,
      this.imgName,
      this.width,
      this.height,
      [...this.position],
      [
        [...this.rotation[0]],
        [...this.rotation[1]],
        [...this.rotation[2]]
      ],
      this.fx,
      this.fy,
      this.split
    );
  }
};
var Scene = class _Scene {
  cameras;
  extend;
  constructor(cameras) {
    this.extend = this.calculateMaxDistance(
      cameras.map((c) => ({ x: c.position[0], y: c.position[1], z: c.position[2] }))
    );
    this.cameras = /* @__PURE__ */ new Map();
    for (const camera of cameras) {
      if (this.cameras.has(camera.id)) {
        console.warn(`Duplicate camera id ${camera.id} in scene (duplicates were removed)`);
      }
      this.cameras.set(camera.id, camera);
    }
  }
  static fromCameras(cameras) {
    return new _Scene(cameras);
  }
  static fromJson(jsonData) {
    const cameras = [];
    for (let i = 0; i < jsonData.length; i++) {
      const d = jsonData[i];
      const split = i % 8 === 0 ? "test" /* Test */ : "train" /* Train */;
      cameras.push(new SceneCamera(
        d.id ?? i,
        d.img_name ?? `image_${i}`,
        d.width,
        d.height,
        d.position,
        d.rotation,
        d.fx,
        d.fy,
        split
      ));
    }
    console.log(`Loaded scene file with ${cameras.length} views`);
    return new _Scene(cameras);
  }
  camera(id) {
    const c = this.cameras.get(id);
    return c ? c.clone() : void 0;
  }
  numCameras() {
    return this.cameras.size;
  }
  getCameras(split) {
    let cams = Array.from(this.cameras.values());
    if (split !== void 0) cams = cams.filter((c) => c.split === split);
    cams = cams.map((c) => c.clone());
    cams.sort((a, b) => a.id - b.id);
    return cams;
  }
  getExtend() {
    return this.extend;
  }
  nearestCamera(pos, split) {
    let minD = Number.POSITIVE_INFINITY;
    let nearest;
    for (const c of this.cameras.values()) {
      if (split !== void 0 && c.split !== split) continue;
      const cp = { x: c.position[0], y: c.position[1], z: c.position[2] };
      const d2 = this.distance2(pos, cp);
      if (d2 < minD) {
        minD = d2;
        nearest = c.id;
      }
    }
    return nearest;
  }
  distance2(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }
  calculateMaxDistance(points) {
    let maxD = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        maxD = Math.max(maxD, Math.sqrt(this.distance2(points[i], points[j])));
      }
    }
    return maxD;
  }
};

// src/lib.ts
var v3 = (p) => vec3_exports.fromValues(p.x, p.y, p.z);
var near = (a, b, eps = 1e-4) => Math.abs(a - b) <= eps;
var nearVec3 = (a, b, eps = 1e-4) => near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps);
var nearQuat = (a, b, eps = 1e-4) => near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps) && near(a[3], b[3], eps);
var EguiWGPU = class {
  constructor(_device, _fmt, _canvas) {
  }
  begin_frame(_w) {
  }
  end_frame(_w) {
    return {};
  }
  prepare(_size, _scale, _dev, _q, _enc, shapes) {
    return shapes;
  }
  render(_pass, _state) {
  }
  cleanup(_state) {
  }
};
var ui = { ui: (_wc) => false };
var RenderConfig = class {
  constructor(no_vsync, skybox = null, hdr = false) {
    this.no_vsync = no_vsync;
    this.skybox = skybox;
    this.hdr = hdr;
  }
};
var WGPUContext = class _WGPUContext {
  device;
  queue;
  adapter;
  static async new_instance() {
    return _WGPUContext.new(void 0, void 0);
  }
  static async new(_instance, _surface) {
    if (!("gpu" in navigator)) throw new Error("WebGPU not available");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter");
    const device = await adapter.requestDevice({
      requiredLimits: { maxComputeWorkgroupStorageSize: 1 << 15 }
      // 32768
    });
    const ctx = new _WGPUContext();
    ctx.adapter = adapter;
    ctx.device = device;
    ctx.queue = device.queue;
    return ctx;
  }
};
var WindowContext = class _WindowContext {
  wgpu_context;
  surface;
  config;
  window;
  scale_factor;
  pc;
  pointcloud_file_path = null;
  renderer;
  animation = null;
  controller;
  scene = null;
  scene_file_path = null;
  current_view = null;
  ui_renderer;
  fps = 0;
  ui_visible = true;
  display;
  splatting_args;
  saved_cameras = [];
  stopwatch = null;
  // --------- PERF: incremental change tracking instead of JSON stringify -------
  _lastCamPos = vec3_exports.create();
  _lastCamRot = quat_exports.create();
  _lastWalltime = 0;
  _changed = true;
  // force first frame
  // ---------------------------------------------------------------------------
  static async new(window2, pc_file, render_config) {
    const state = new _WindowContext();
    const rect = window2.getBoundingClientRect();
    const size = {
      width: Math.max(1, window2.width || Math.floor(rect.width) || 800),
      height: Math.max(1, window2.height || Math.floor(rect.height) || 600)
    };
    state.window = window2;
    state.scale_factor = window2.ownerDocument?.defaultView?.devicePixelRatio ?? 1;
    const surface = window2.getContext("webgpu");
    if (!surface) throw new Error("WebGPU canvas context unavailable");
    const wgpu_context = await WGPUContext.new(void 0, surface);
    const surface_format = navigator.gpu.getPreferredCanvasFormat();
    const render_format = render_config.hdr ? "rgba16float" : "rgba8unorm";
    surface.configure({
      device: wgpu_context.device,
      format: surface_format,
      alphaMode: "opaque",
      viewFormats: [deSRGB(surface_format)]
    });
    state.wgpu_context = wgpu_context;
    state.surface = surface;
    state.config = {
      format: surface_format,
      width: size.width,
      height: size.height,
      present_mode: render_config.no_vsync ? "auto-no-vsync" : "auto-vsync",
      alpha_mode: "opaque",
      view_formats: [deSRGB(surface_format)]
    };
    const pc_raw = await GenericGaussianPointCloud?.load?.(pc_file) ?? pc_file;
    state.pc = await PointCloud.new(wgpu_context.device, pc_raw);
    state.renderer = await GaussianRenderer.create(
      wgpu_context.device,
      wgpu_context.queue,
      render_format,
      state.pc.shDeg(),
      state.pc.compressed()
    );
    const aabb = state.pc.bbox();
    const aspect = size.width / Math.max(1, size.height);
    const c0v = aabb.center();
    const c0 = vec3_exports.fromValues(c0v.x, c0v.y, c0v.z);
    const r = aabb.radius();
    const eyeTuple = vec3_exports.fromValues(c0[0] - r * 0.5, c0[1] - r * 0.5, c0[2] - r * 0.5);
    const rot = quat_exports.create();
    const deg2rad = (d) => d * Math.PI / 180;
    const fovx = deg2rad(45);
    const fovy = deg2rad(45 / Math.max(1e-6, aspect));
    const proj = PerspectiveProjection.new(
      vec2_exports.fromValues(size.width, size.height),
      vec2_exports.fromValues(fovx, fovy),
      0.01,
      1e3
    );
    const view_camera = new PerspectiveCamera(eyeTuple, rot, proj);
    const controller = new CameraController(0.1, 0.05);
    const c = state.pc.center();
    controller.center = vec3_exports.fromValues(c.x, c.y, c.z);
    state.controller = controller;
    state.ui_renderer = new EguiWGPU(wgpu_context.device, surface_format, window2);
    state.display = await Display.create(
      wgpu_context.device,
      render_format,
      deSRGB(surface_format),
      size.width,
      size.height
    );
    state.stopwatch = new GPUStopwatch(wgpu_context.device, 3);
    state.splatting_args = {
      camera: view_camera,
      viewport: vec2_exports.fromValues(size.width, size.height),
      gaussianScaling: 1,
      maxShDeg: state.pc.shDeg(),
      showEnvMap: false,
      mipSplatting: void 0,
      kernelSize: void 0,
      clippingBox: void 0,
      walltime: 0,
      sceneCenter: void 0,
      sceneExtend: void 0,
      backgroundColor: { r: 0, g: 0, b: 0, a: 1 },
      resolution: vec2_exports.fromValues(size.width, size.height)
    };
    vec3_exports.copy(state._lastCamPos, state.splatting_args.camera.position);
    quat_exports.copy(state._lastCamRot, state.splatting_args.camera.rotation);
    state._lastWalltime = state.splatting_args.walltime;
    return state;
  }
  reload() {
    if (!this.pointcloud_file_path) throw new Error("no pointcloud file path present");
    console.info("reloading volume from", this.pointcloud_file_path);
    if (this.scene_file_path) {
      console.info("reloading scene from", this.scene_file_path);
    }
  }
  resize(new_size, scale_factor) {
    if (new_size.width > 0 && new_size.height > 0) {
      this.config.width = new_size.width;
      this.config.height = new_size.height;
      this.surface.configure({
        device: this.wgpu_context.device,
        format: this.config.format,
        alphaMode: this.config.alpha_mode,
        viewFormats: this.config.view_formats
      });
      this.display.resize(this.wgpu_context.device, new_size.width, new_size.height);
      this.splatting_args.camera.projection.resize(new_size.width, new_size.height);
      this.splatting_args.viewport[0] = new_size.width;
      this.splatting_args.viewport[1] = new_size.height;
      this._changed = true;
    }
    if (scale_factor !== void 0 && scale_factor > 0) {
      this.scale_factor = scale_factor;
    }
  }
  ui() {
    this.ui_renderer.begin_frame(this.window);
    const request_redraw = ui.ui(this);
    const shapes = this.ui_renderer.end_frame(this.window);
    return [request_redraw, shapes];
  }
  update(dt_seconds) {
    const dt = dt_seconds;
    if (this.splatting_args.walltime < 5) {
      this.splatting_args.walltime += dt;
    }
    if (this.animation) {
      const [next_camera, playing] = this.animation;
      if (this.controller.user_inptut) {
        this.cancle_animation();
      } else {
        const adv = playing ? dt : 0;
        this.splatting_args.camera = next_camera.update(adv);
        this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
        if (next_camera.done()) {
          this.animation = null;
          this.controller.reset_to_camera(this.splatting_args.camera);
        }
      }
    } else {
      this.controller.update_camera(this.splatting_args.camera, dt);
      if (this.current_view != null && this.scene) {
        const cam = this.scene.camera(this.current_view);
        if (cam) {
          const scene_camera = cam.toPerspective ? cam.toPerspective() : cam;
          const aPos = this.splatting_args.camera.position;
          const bPos = Array.isArray(scene_camera.position) ? scene_camera.position : v3(scene_camera.position);
          const pos_change = !nearVec3(aPos, bPos, 1e-4);
          if (pos_change) this.current_view = null;
        }
      }
    }
    const aabb = this.pc.bbox();
    this.splatting_args.camera.fit_near_far(aabb);
    const pos = this.splatting_args.camera.position;
    const rot = this.splatting_args.camera.rotation;
    if (!nearVec3(this._lastCamPos, pos) || !nearQuat(this._lastCamRot, rot) || this.splatting_args.walltime !== this._lastWalltime) {
      vec3_exports.copy(this._lastCamPos, pos);
      quat_exports.copy(this._lastCamRot, rot);
      this._lastWalltime = this.splatting_args.walltime;
      this._changed = true;
    }
  }
  render(redraw_scene, shapes) {
    this.stopwatch?.reset();
    const texture = this.surface.getCurrentTexture?.();
    if (!texture) return;
    const view_rgb = texture.createView({ format: deSRGB(this.config.format) });
    const view_srgb = texture.createView();
    const encoder = this.wgpu_context.device.createCommandEncoder({
      label: "render command encoder"
    });
    if (redraw_scene) {
      this.renderer.prepare(
        encoder,
        this.wgpu_context.device,
        this.wgpu_context.queue,
        this.pc,
        this.splatting_args,
        this.stopwatch ?? void 0
      );
    }
    let ui_state = null;
    if (shapes) {
      ui_state = this.ui_renderer.prepare(
        { width: this.config.width, height: this.config.height },
        this.scale_factor,
        this.wgpu_context.device,
        this.wgpu_context.queue,
        encoder,
        shapes
      );
    }
    if (this.stopwatch) this.stopwatch.start(encoder, "rasterization");
    if (redraw_scene) {
      const pass = encoder.beginRenderPass({
        label: "render pass",
        colorAttachments: [{
          view: this.display.texture(),
          clearValue: this.splatting_args.backgroundColor,
          loadOp: "clear",
          storeOp: "store"
        }]
      });
      this.renderer.render(pass, this.pc);
      pass.end();
    }
    if (this.stopwatch) this.stopwatch.stop(encoder, "rasterization");
    const cameraBG = this.renderer.camera().bind_group();
    const settingsBG = this.renderer.render_settings().bind_group();
    this.display.render(
      encoder,
      view_rgb,
      this.splatting_args.backgroundColor,
      cameraBG,
      settingsBG
    );
    this.stopwatch?.end(encoder);
    if (ui_state) {
      const pass = encoder.beginRenderPass({
        label: "render pass ui",
        colorAttachments: [{ view: view_srgb, loadOp: "load", storeOp: "store" }]
      });
      this.ui_renderer.render(pass, ui_state);
      pass.end();
    }
    if (ui_state) this.ui_renderer.cleanup(ui_state);
    this.wgpu_context.queue.submit([encoder.finish()]);
    this.splatting_args.resolution[0] = this.config.width;
    this.splatting_args.resolution[1] = this.config.height;
    this._changed = false;
  }
  set_scene(scene) {
    const extend = scene.extend ? scene.extend() : this.pc.bbox().radius();
    this.splatting_args.sceneExtend = extend;
    const n = scene.numCameras();
    let acc = { x: 0, y: 0, z: 0 };
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      const c = scene.camera(i);
      if (c) {
        acc.x += c.position[0];
        acc.y += c.position[1];
        acc.z += c.position[2];
        cnt++;
      }
    }
    const center = cnt > 0 ? { x: acc.x / cnt, y: acc.y / cnt, z: acc.z / cnt } : this.pc.center();
    this.controller.center = vec3_exports.fromValues(center.x, center.y, center.z);
    this.scene = scene;
    if (this.saved_cameras.length === 0) {
      const arr = [];
      for (let i = 0; i < scene.numCameras(); i++) {
        const c = scene.camera(i);
        if (c && (c.split === void 0 || c.split === "test" /* Test */)) arr.push(c);
      }
      this.saved_cameras = arr;
    }
    this._changed = true;
  }
  // NEW: parity helper to jump to a scene camera (no animation for simplicity)
  set_scene_camera(i) {
    if (!this.scene) return;
    this.current_view = i;
    const cam = this.scene.camera(i);
    if (!cam) return;
    const anyCam = cam;
    if (typeof anyCam.toPerspective === "function") {
      const pc2 = anyCam.toPerspective();
      this.update_camera(pc2);
      return;
    }
    const pos = Array.isArray(cam.position) ? vec3_exports.fromValues(cam.position[0], cam.position[1], cam.position[2]) : v3(cam.position);
    const rot = Array.isArray(cam.rotation) ? quat_exports.fromValues(cam.rotation[0], cam.rotation[1], cam.rotation[2], cam.rotation[3]) : cam.rotation;
    const proj = this.splatting_args.camera.projection;
    const pc = new PerspectiveCamera(pos, rot, proj);
    this.update_camera(pc);
  }
  async set_env_map(_path) {
    this.splatting_args.showEnvMap = true;
    this._changed = true;
  }
  cancle_animation() {
    this.animation = null;
    this.controller.reset_to_camera(this.splatting_args.camera);
    this._changed = true;
  }
  stop_animation() {
    if (this.animation) this.animation[1] = false;
    this.controller.reset_to_camera(this.splatting_args.camera);
    this._changed = true;
  }
  update_camera(camera) {
    this.splatting_args.camera = camera;
    this.splatting_args.camera.projection.resize(this.config.width, this.config.height);
    this._changed = true;
  }
  save_view() {
    const sceneArr = [];
    if (this.scene) for (let i = 0; i < this.scene.numCameras(); i++) {
      const c = this.scene.camera(i);
      if (c) sceneArr.push(c);
    }
    const max_scene_id = sceneArr.reduce((m, c) => Math.max(m, c.id ?? 0), 0);
    const max_id = this.saved_cameras.reduce((m, c) => Math.max(m, c.id ?? 0), 0);
    const id = Math.max(max_id, max_scene_id) + 1;
    const cam = SceneCamera.fromPerspective(
      this.splatting_args.camera,
      String(id),
      id,
      { x: this.config.width, y: this.config.height },
      "test" /* Test */
    );
    this.saved_cameras.push(cam);
  }
};
function smoothstep(x) {
  return x * x * (3 - 2 * x);
}
function bind_input(canvas, controller) {
  if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;
  let pressedPointerId = null;
  const DEBUG = true;
  const log = (...args) => {
    if (DEBUG) console.debug("[input]", ...args);
  };
  const mapCode = (code) => {
    switch (code) {
      case "KeyW":
      case "KeyS":
      case "KeyA":
      case "KeyD":
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
      case "KeyQ":
      case "KeyE":
      case "Space":
      case "ShiftLeft":
        return code;
      default:
        return void 0;
    }
  };
  const updateAlt = (e) => {
    controller.alt_pressed = !!e.altKey;
  };
  const onKeyDown = (e) => {
    updateAlt(e);
    const code = mapCode(e.code);
    if (!code) return;
    if (controller.process_keyboard(code, true)) {
      log("keydown", code);
      e.preventDefault();
    }
  };
  const onKeyUp = (e) => {
    updateAlt(e);
    const code = mapCode(e.code);
    if (!code) return;
    if (controller.process_keyboard(code, false)) {
      log("keyup", code);
      e.preventDefault();
    }
  };
  const onPointerDown = (e) => {
    updateAlt(e);
    canvas.focus();
    pressedPointerId = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
    }
    if (e.button === 0) controller.left_mouse_pressed = true;
    if (e.button === 2) controller.right_mouse_pressed = true;
    log("pointerdown", e.button, "alt=", controller.alt_pressed);
    e.preventDefault();
  };
  const onPointerMove = (e) => {
    updateAlt(e);
    const dx = e.movementX ?? 0;
    const dy = e.movementY ?? 0;
    if (controller.left_mouse_pressed || controller.right_mouse_pressed) {
      controller.process_mouse(dx, dy);
      log("pointermove", dx, dy);
      e.preventDefault();
    }
  };
  const onPointerUp = (e) => {
    updateAlt(e);
    if (pressedPointerId === e.pointerId) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
      }
      pressedPointerId = null;
    }
    if (e.button === 0) controller.left_mouse_pressed = false;
    if (e.button === 2) controller.right_mouse_pressed = false;
    log("pointerup", e.button);
    e.preventDefault();
  };
  const onContextMenu = (e) => {
    e.preventDefault();
  };
  const onWheel = (e) => {
    updateAlt(e);
    controller.process_scroll(e.deltaY / 100);
    log("wheel", e.deltaY);
    e.preventDefault();
  };
  const onWindowBlur = () => {
    controller.left_mouse_pressed = false;
    controller.right_mouse_pressed = false;
  };
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });
  window.addEventListener("blur", onWindowBlur);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("keyup", onKeyUp, { capture: true });
    window.removeEventListener("blur", onWindowBlur);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("wheel", onWheel);
  };
}
async function open_window(file, scene, config, pointcloud_file_path, scene_file_path) {
  const canvas = document.getElementById("window-canvas") ?? (() => {
    const c = document.createElement("canvas");
    c.id = "window-canvas";
    c.style.width = "100%";
    c.style.height = "100%";
    document.body.appendChild(c);
    return c;
  })();
  const backingFromCss = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      w: Math.max(1, Math.floor(rect.width * dpr)),
      h: Math.max(1, Math.floor(rect.height * dpr)),
      dpr
    };
  };
  const { w: realW, h: realH, dpr: realDpr } = backingFromCss();
  const initW = 800, initH = 600;
  canvas.width = initW;
  canvas.height = initH;
  const state = await WindowContext.new(canvas, file, config);
  const _unbindInput = bind_input(canvas, state["controller"]);
  const applyRealSize = () => {
    const now = backingFromCss();
    if (canvas.width !== now.w) canvas.width = now.w;
    if (canvas.height !== now.h) canvas.height = now.h;
    state.resize({ width: now.w, height: now.h }, now.dpr);
  };
  applyRealSize();
  const ro = new ResizeObserver(applyRealSize);
  ro.observe(canvas);
  addEventListener("resize", applyRealSize, { passive: true });
  addEventListener("orientationchange", applyRealSize, { passive: true });
  state.pointcloud_file_path = pointcloud_file_path;
  if (scene) {
    try {
      const s = await Scene.fromJson(scene);
      state["set_scene"](s);
      state["set_scene_camera"]?.(0);
      state.scene_file_path = scene_file_path;
    } catch (err) {
      console.error("cannot load scene:", err);
    }
  }
  if (config.skybox) {
    try {
      await state["set_env_map"](config.skybox);
    } catch (e) {
      console.error("failed to set skybox:", e);
    }
  }
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = (now - last) / 1e3;
    last = now;
    state.update(dt);
    const [redraw_ui, shapes] = state.ui();
    const res = state["splatting_args"].resolution;
    const resChange = res[0] !== state["config"].width || res[1] !== state["config"].height;
    const request_redraw = state._changed || resChange;
    if (request_redraw || redraw_ui) {
      state["fps"] = 1 / Math.max(1e-6, dt) * 0.05 + state["fps"] * 0.95;
      state.render(request_redraw, state["ui_visible"] ? shapes : void 0);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
async function run_wasm(pc, scene, pc_file, scene_file) {
  await open_window(
    pc,
    scene,
    new RenderConfig(false, null, false),
    pc_file,
    scene_file
  );
}
function deSRGB(fmt) {
  if (fmt === "bgra8unorm-srgb") return "bgra8unorm";
  if (fmt === "rgba8unorm-srgb") return "rgba8unorm";
  return fmt;
}
export {
  RenderConfig,
  WGPUContext,
  WindowContext,
  open_window,
  run_wasm,
  smoothstep
};
//# sourceMappingURL=web_splat.js.map
