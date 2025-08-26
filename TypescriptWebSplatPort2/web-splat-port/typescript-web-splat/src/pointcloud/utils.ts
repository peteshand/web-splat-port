// Zero-copy view over input bytes (ArrayBuffer or ArrayBufferView)
export function asBytes(src: ArrayBuffer | ArrayBufferView): Uint8Array {
  return src instanceof ArrayBuffer
    ? new Uint8Array(src)
    : new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
}

export function isArrayBufferView(x: any): x is ArrayBufferView {
  return x && typeof x === 'object' && x.buffer instanceof ArrayBuffer && typeof (x as any).byteLength === 'number';
}

// (optional) f16 → f32
export function halfToFloat(h: number): number {
  const s = (h & 0x8000) >> 15, e = (h & 0x7C00) >> 10, f = h & 0x03FF;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : ((s ? -1 : 1) * Infinity);
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

import { GaussianQuantization } from './quantization';

export function packGaussianQuantizationToBytes(q: GaussianQuantization): Uint8Array {
  const buf = new ArrayBuffer(64);     // 4 * Quantization, each 16 bytes
  const dv = new DataView(buf);

  function writeQuant(off: number, zero: number, scale: number) {
    dv.setInt32(off + 0, zero | 0, true);
    dv.setFloat32(off + 4, scale, true);
    dv.setUint32(off + 8, 0, true);
    dv.setUint32(off + 12, 0, true);
  }

  writeQuant( 0, q.color_dc.zero_point,       q.color_dc.scale);
  writeQuant(16, q.color_rest.zero_point,     q.color_rest.scale);
  writeQuant(32, q.opacity.zero_point,        q.opacity.scale);
  writeQuant(48, q.scaling_factor.zero_point, q.scaling_factor.scale);
  return new Uint8Array(buf);
}
