import { mat4 } from 'gl-matrix';

/* -------------------------- global logging gate -------------------------- */
const __g = globalThis as any;
if (typeof __g.__LOGGING_ENABLED__ === 'undefined') {
  __g.__LOGGING_ENABLED__ = true;
}
export function loggingEnabled(): boolean {
  return !!(globalThis as any).__LOGGING_ENABLED__;
}

/* -------------------------- logging + helpers -------------------------- */
export function logi(tag: string, msg: string, extra?: any) {
  if (!loggingEnabled()) return;
  if (extra !== undefined) {
    console.log(`${tag} ${msg}`, extra);
  } else {
    console.log(`${tag} ${msg}`);
  }
}

export function fmtF32Slice(a: ArrayLike<number>): string {
  const out: string[] = [];
  const n = a.length;
  for (let i = 0; i < n; i++) out.push((a[i] as number).toFixed(7));
  return `[${out.join(',')}]`;
}

// FNV-1a 64-bit
export function hashBytesU64(bytes: ArrayBufferView): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const u8 =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < u8.length; i++) {
    h ^= BigInt(u8[i]);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

export function mat4ColMajorToArray(m: mat4): Float32Array {
  // gl-matrix stores column-major in a Float32Array already
  return new Float32Array(m);
}

/* -------------------------- debug readback + dumps -------------------------- */

export const DEBUG_READBACK_EVERY_N_FRAMES = 1; // set to 0 to disable

function u8ToU32LE(u8: Uint8Array): Uint32Array {
  const n = Math.floor(u8.byteLength / 4);
  return new Uint32Array(u8.buffer, u8.byteOffset, n);
}
function u8ToF32(u8: Uint8Array): Float32Array {
  const n = Math.floor(u8.byteLength / 4);
  return new Float32Array(u8.buffer, u8.byteOffset, n);
}
export function dumpU32(label: string, u8: Uint8Array) {
  if (!loggingEnabled()) return;
  const u32 = u8ToU32LE(u8);
  console.log(label, Array.from(u32));
}

export async function readbackBuffer(
  device: GPUDevice,
  src: GPUBuffer,
  size: number
): Promise<ArrayBuffer> {
  const rb = device.createBuffer({
    size: (size + 255) & ~255, // 256 alignment
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const enc = device.createCommandEncoder({ label: 'rb-encoder' });
  enc.copyBufferToBuffer(src, 0, rb, 0, size);
  device.queue.submit([enc.finish()]);
  await rb.mapAsync(GPUMapMode.READ);
  const slice = rb.getMappedRange().slice(0, size);
  rb.unmap();
  return slice;
}
