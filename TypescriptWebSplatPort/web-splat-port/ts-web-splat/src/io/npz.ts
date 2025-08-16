// NPZ reader for 3D Gaussian Splat datasets.
// Supports ZIP entries compressed with Deflate (method 8) or Stored (method 0),
// and NPY arrays of dtype float32 little-endian in C-order.
import { GenericGaussianPointCloud, PointCloudReader } from "./index.js";

export class NpzReader implements PointCloudReader {
  constructor(private file: ArrayBuffer) {}
  static magic_bytes(): Uint8Array { return new Uint8Array([0x50,0x4b,0x03,0x04]); }
  static file_ending(): string { return ".npz"; }

  async read(): Promise<GenericGaussianPointCloud> {
    const entries = await parseZip(this.file);

    // Find arrays by common keys used in 3DGS exports
    const positions = await getFloat32Array(entries, ["xyz", "positions", "means", "mean"], 2);
    const opacity = await getFloat32Array(entries, ["opacity", "opacities", "alpha"], 1);
    const scales = await getFloat32Array(entries, ["scale", "scales"], 2);
    const rotation = await getFloat32Array(entries, ["rotation", "rotations", "quats", "quat"], 2);
    const f_dc = await getFloat32Array(entries, ["f_dc", "dc", "sh_dc"], 2);
    const f_rest = await getFloat32Array(entries, ["f_rest", "rest", "sh_rest"], 2);

    if (!positions || !opacity || !scales || !rotation || !f_dc || !f_rest) {
      throw new Error("NPZ missing required arrays (positions, opacity, scales, rotation, f_dc, f_rest)");
    }

    const n = positions.shape[0] >>> 0;
    // Validate shapes
    assertShape(positions.shape, [n, 3], "positions/xyz");
    assertShape(opacity.shape, [n], "opacity");
    assertShape(scales.shape, [n, 3], "scales");
    assertShape(rotation.shape, [n, 4], "rotation(quats)");
    assertShape(f_dc.shape, [n, 3], "f_dc");
    if (f_rest.shape[0] !== n || f_rest.shape[1] % 3 !== 0) {
      throw new Error(`Invalid f_rest shape: [${f_rest.shape.join(",")}], expected [${n}, 3*k]`);
    }
    const coeff_triplets = 1 + (f_rest.shape[1] / 3); // total coefficients per color (incl DC)
    const sh_deg = tripletsToDegree(coeff_triplets);
    if (sh_deg !== 3) {
      // We can still proceed, but shaders currently wired for deg=3 packing (16 coeffs)
      console.warn(`NPZ sh_deg=${sh_deg} detected; packing will truncate/extend to deg=3`);
    }

    // Output buffers
    const gaussians = new ArrayBuffer(n * 20); // 5 u32 per point
    const g32 = new Uint32Array(gaussians);
    const sh_buf = new ArrayBuffer(n * 96); // 24 u32 per point (deg=3)
    const sh32 = new Uint32Array(sh_buf);

    const pos = positions.data;
    const opa = opacity.data;
    const scl = scales.data;
    const rot = rotation.data;
    const dc = f_dc.data;
    const rest = f_rest.data;

    const tmpCov = new Float32Array(6);
    const halfSeq = new Uint16Array(48);

    for (let i = 0; i < n; i++) {
      const px = pos[i*3+0], py = pos[i*3+1], pz = pos[i*3+2];
      const op = opa[i];
      const sx = scl[i*3+0], sy = scl[i*3+1], sz = scl[i*3+2];
      let qx = rot[i*4+0], qy = rot[i*4+1], qz = rot[i*4+2], qw = rot[i*4+3];
      const qn = Math.hypot(qx,qy,qz,qw) || 1;
      qx/=qn; qy/=qn; qz/=qn; qw/=qn;
      quatToCov6(qx,qy,qz,qw, sx,sy,sz, tmpCov);

      // Pack gaussians
      const gBase = i * 5;
      g32[gBase + 0] = pack2x16f(px, py);
      g32[gBase + 1] = pack2x16f(pz, op);
      g32[gBase + 2] = pack2x16f(tmpCov[0], tmpCov[1]);
      g32[gBase + 3] = pack2x16f(tmpCov[2], tmpCov[3]);
      g32[gBase + 4] = pack2x16f(tmpCov[4], tmpCov[5]);

      // Build SH half sequence for deg=3 (16 triplets)
      let h = 0;
      halfSeq[h++] = f32tof16(dc[i*3+0]);
      halfSeq[h++] = f32tof16(dc[i*3+1]);
      halfSeq[h++] = f32tof16(dc[i*3+2]);
      // take first 15 coeff triplets from f_rest (or pad with zeros)
      for (let c = 0; c < 15; c++) {
        const base = i*f_rest.shape[1] + c*3;
        const r = rest[base+0] ?? 0;
        const g = rest[base+1] ?? 0;
        const b = rest[base+2] ?? 0;
        halfSeq[h++] = f32tof16(r);
        halfSeq[h++] = f32tof16(g);
        halfSeq[h++] = f32tof16(b);
      }
      // Pack to 24 u32
      const shBase = i * 24;
      for (let k = 0; k < 24; k++) {
        const a = halfSeq[k*2 + 0];
        const b = halfSeq[k*2 + 1];
        sh32[shBase + k] = (b << 16) | a;
      }
    }

    return { 
      num_points: n, 
      sh_deg: 3, 
      gaussians, 
      sh_coefs: sh_buf,
      compressed: () => false,
      aabb: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
      center: { x: 0, y: 0, z: 0 }
    };
  }
}

// ===== Helpers: ZIP/NPY parsing =====
type ZipEntry = { name: string; method: number; uncompressedSize: number; compressedSize: number; data: ArrayBuffer };

async function parseZip(buf: ArrayBuffer): Promise<Map<string, ZipEntry>> {
  const dv = new DataView(buf);
  let off = 0;
  const entries = new Map<string, ZipEntry>();
  while (off + 30 <= dv.byteLength) {
    const sig = dv.getUint32(off, true);
    if (sig !== 0x04034b50) break; // local file header
    const version = dv.getUint16(off+4, true);
    const flag = dv.getUint16(off+6, true);
    const method = dv.getUint16(off+8, true);
    // const time = dv.getUint16(off+10,true); const date = dv.getUint16(off+12,true);
    const crc32 = dv.getUint32(off+14, true);
    const compSize = dv.getUint32(off+18, true);
    const uncompSize = dv.getUint32(off+22, true);
    const nameLen = dv.getUint16(off+26, true);
    const extraLen = dv.getUint16(off+28, true);
    const nameBytes = new Uint8Array(buf, off+30, nameLen);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = off + 30 + nameLen + extraLen;
    const hasDataDesc = (flag & 0x0008) !== 0;
    let csize = compSize, usize = uncompSize;
    let dataEnd: number;
    if (hasDataDesc) {
      // When bit 3 is set, sizes appear after the data in a data descriptor.
      // We need to scan: not ideal, but many NPZ set sizes in central dir only.
      // We'll parse central directory at the end if needed.
      const cd = parseCentralDirectory(buf);
      const cdent = cd.get(name);
      if (!cdent) throw new Error(`ZIP data descriptor not supported for ${name}`);
      csize = cdent.compressedSize;
      usize = cdent.uncompressedSize;
      dataEnd = dataStart + csize;
    } else {
      dataEnd = dataStart + csize;
    }
    const compData = buf.slice(dataStart, dataEnd);
    const data = await unzipMaybe(compData, method, usize);
    entries.set(name, { name, method, uncompressedSize: usize, compressedSize: csize, data });
    off = dataEnd;
  }
  if (entries.size === 0) throw new Error("No ZIP entries found (invalid NPZ)");
  return entries;
}

function parseCentralDirectory(buf: ArrayBuffer): Map<string, { compressedSize: number; uncompressedSize: number }> {
  const dv = new DataView(buf);
  // Find End of Central Directory (EOCD) by scanning from end
  let i = dv.byteLength - 22; // minimum EOCD size
  for (; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) break;
  }
  const result = new Map<string, { compressedSize: number; uncompressedSize: number }>();
  if (i < 0) return result;
  const cdSize = dv.getUint32(i + 12, true);
  const cdOffset = dv.getUint32(i + 16, true);
  let off = cdOffset;
  const end = cdOffset + cdSize;
  while (off + 46 <= end) {
    const sig = dv.getUint32(off, true);
    if (sig !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const compSize = dv.getUint32(off + 20, true);
    const uncompSize = dv.getUint32(off + 24, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const nameBytes = new Uint8Array(buf, off + 46, nameLen);
    const name = new TextDecoder().decode(nameBytes);
    result.set(name, { compressedSize: compSize, uncompressedSize: uncompSize });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return result;
}

async function unzipMaybe(compData: ArrayBuffer, method: number, expectedSize: number): Promise<ArrayBuffer> {
  if (method === 0) {
    return compData;
  } else if (method === 8) {
    if (typeof (globalThis as any).DecompressionStream !== "function") {
      throw new Error("Deflate decompression not supported in this browser");
    }
    // Local file header uses deflate (zlib) without wrapper? ZIP uses raw deflate stream.
    const ds = new (DecompressionStream as any)("deflate-raw");
    const input = new Response(compData).body as ReadableStream<Uint8Array>;
    const stream = input.pipeThrough(ds);
    const res = await new Response(stream).arrayBuffer();
    if (expectedSize && res.byteLength !== expectedSize) {
      // Some platforms set expectedSize to 0 in local header; ignore mismatch if 0
      // console.warn("Decompressed size mismatch", res.byteLength, expectedSize);
    }
    return res;
  } else {
    throw new Error(`Unsupported ZIP method ${method}`);
  }
}

type NpyArray = { data: Float32Array; shape: number[] };
async function getFloat32Array(entries: Map<string, ZipEntry>, keys: string[], minDims: 1 | 2): Promise<NpyArray | null> {
  for (const [name, ent] of entries) {
    const lower = name.toLowerCase();
    if (!lower.endsWith(".npy")) continue;
    for (const k of keys) {
      if (lower.includes(k)) {
        const arr = parseNPYFloat32(ent.data);
        if ((minDims === 1 && arr.shape.length >= 1) || (minDims === 2 && arr.shape.length >= 2)) {
          return arr;
        }
      }
    }
  }
  return null;
}

function parseNPYFloat32(buf: ArrayBuffer): NpyArray {
  const dv = new DataView(buf);
  // magic: \x93NUMPY
  if (!(dv.getUint8(0) === 0x93 && String.fromCharCode(...new Uint8Array(buf, 1, 5)) === "NUMPY")) {
    throw new Error("Invalid NPY magic");
  }
  const major = dv.getUint8(6);
  const minor = dv.getUint8(7);
  const headerLen = major >= 2 ? dv.getUint32(8, true) : dv.getUint16(8, true);
  const headerStart = major >= 2 ? 12 : 10;
  const headerText = new TextDecoder().decode(new Uint8Array(buf, headerStart, headerLen));
  // Very simple header parse: look for descr, fortran_order, shape
  const descrMatch = headerText.match(/'descr':\s*'([^']+)'/);
  const fortranMatch = headerText.match(/'fortran_order':\s*(False|True)/);
  const shapeMatch = headerText.match(/'shape':\s*\(([^\)]*)\)/);
  if (!descrMatch || !fortranMatch || !shapeMatch) throw new Error("Invalid NPY header");
  const descr = descrMatch[1];
  const fortran = fortranMatch[1] === "True";
  if (fortran) throw new Error("NPY Fortran order not supported");
  if (!(descr === "<f4" || descr === "|f4")) throw new Error(`Unsupported dtype ${descr}, expected <f4`);
  const shape = shapeMatch[1].split(",").map(s => s.trim()).filter(Boolean).map(s => parseInt(s, 10));
  const dataStart = headerStart + headerLen;
  const count = shape.reduce((a,b)=>a*b, 1);
  const data = new Float32Array(buf, dataStart, count);
  return { data, shape };
}

// ===== Math/packing helpers =====
function quatToCov6(qx:number,qy:number,qz:number,qw:number, sx:number,sy:number,sz:number, out: Float32Array): void {
  const xx = qx*qx, yy = qy*qy, zz = qz*qz;
  const xy = qx*qy, xz = qx*qz, yz = qy*qz;
  const wx = qw*qx, wy = qw*qy, wz = qw*qz;
  const r00 = 1 - 2*(yy + zz);
  const r01 =     2*(xy - wz);
  const r02 =     2*(xz + wy);
  const r10 =     2*(xy + wz);
  const r11 = 1 - 2*(xx + zz);
  const r12 =     2*(yz - wx);
  const r20 =     2*(xz - wy);
  const r21 =     2*(yz + wx);
  const r22 = 1 - 2*(xx + yy);
  const s0 = sx*sx, s1 = sy*sy, s2 = sz*sz;
  const c00 = r00*r00*s0 + r01*r01*s1 + r02*r02*s2;
  const c01 = r00*r10*s0 + r01*r11*s1 + r02*r12*s2;
  const c02 = r00*r20*s0 + r01*r21*s1 + r02*r22*s2;
  const c11 = r10*r10*s0 + r11*r11*s1 + r12*r12*s2;
  const c12 = r10*r20*s0 + r11*r21*s1 + r12*r22*s2;
  const c22 = r20*r20*s0 + r21*r21*s1 + r22*r22*s2;
  out[0]=c00; out[1]=c01; out[2]=c02; out[3]=c11; out[4]=c12; out[5]=c22;
}
function pack2x16f(a: number, b: number): number { const ha = f32tof16(a); const hb = f32tof16(b); return (hb << 16) | ha; }
function f32tof16(val: number): number {
  const f32 = new Float32Array(1); const u32 = new Uint32Array(f32.buffer); f32[0] = val; const x = u32[0];
  const sign = (x >>> 16) & 0x8000; let mant = x & 0x7fffff; let exp = (x >>> 23) & 0xff;
  if (exp === 0xff) return sign | (mant ? 0x7e00 : 0x7c00);
  exp = exp - 127 + 15; if (exp >= 0x1f) return sign | 0x7c00; if (exp <= 0) { if (exp < -10) return sign; mant = (mant | 0x800000) >>> (1 - exp); const half = (mant + 0x1000 + ((mant >>> 13) & 1)) >>> 13; return sign | half; }
  const half = ((exp & 0x1f) << 10) | ((mant + 0x1000 + ((mant >>> 13) & 1)) >>> 13); return sign | half;
}

// ===== Validation helpers =====
function assertShape(actual: number[], expected: number[], label: string): void {
  if (actual.length !== expected.length) {
    throw new Error(`${label} rank ${actual.length} != ${expected.length}`);
  }
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== -1 && actual[i] !== expected[i]) {
      throw new Error(`${label} shape [${actual.join(',')}] != [${expected.join(',')}]`);
    }
  }
}

function tripletsToDegree(triplets: number): number {
  // triplets equals number of SH basis per color = (deg+1)^2
  const d = Math.round(Math.sqrt(triplets) - 1);
  return Math.max(0, d);
}
