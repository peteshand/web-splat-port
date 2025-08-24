// io/ply.ts
// Fast packed reader: parses PLY header, streams binary payload into f16-packed buffers,
// and computes bbox + plane (center/up) in one pass.

import { quat, vec3 } from 'gl-matrix';
import { buildCov, shDegFromNumCoefs, sigmoid } from '../utils';
import { Aabb } from '../pointcloud';
import { GenericGaussianPointCloud } from './mod';

/* -------------------------------------------------------------------------- */
/*                           DEBUG knobs                                       */
/* -------------------------------------------------------------------------- */
const DEBUG_MAX_SPLATS: number | null = null;
const DEBUG_LOG_PLY_SAMPLE0: boolean = false; // keep off by default (console logging costs!)
let __PLY_SAMPLE_LOGGED__ = false;

/* -------------------------------------------------------------------------- */
/*                               Header parsing                                */
/* -------------------------------------------------------------------------- */

type PlyEncoding = 'ascii' | 'binary_little_endian' | 'binary_big_endian';

interface ParsedHeader {
  encoding: PlyEncoding;
  vertexCount: number;
  comments: string[];
  vertexPropNames: string[];
  headerByteLength: number;
}

function parsePlyHeader(data: ArrayBuffer): ParsedHeader {
  const u8 = new Uint8Array(data);

  // find "end_header"
  const needle = utf8Bytes('end_header');
  let endIdx = -1;
  search: for (let i = 0; i <= u8.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (u8[i + j] !== needle[j]) continue search;
    }
    endIdx = i + needle.length;
    break;
  }
  if (endIdx < 0) throw new Error('PLY: end_header not found');

  // include the newline after "end_header"
  let headerEnd = endIdx;
  while (headerEnd < u8.length && u8[headerEnd] !== 0x0a /* \n */) headerEnd++;
  headerEnd++;

  const headerText = asciiDecode(u8.subarray(0, headerEnd));
  const lines = headerText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  let encoding: PlyEncoding | null = null;
  let vertexCount = 0;
  const comments: string[] = [];
  const vertexPropNames: string[] = [];
  let inVertexElement = false;

  for (const line of lines) {
    if (line.startsWith('comment ')) {
      comments.push(line.substring('comment '.length));
      continue;
    }
    if (line.startsWith('format ')) {
      if (line.includes('binary_little_endian')) encoding = 'binary_little_endian';
      else if (line.includes('binary_big_endian')) encoding = 'binary_big_endian';
      else if (line.includes('ascii')) encoding = 'ascii';
      else throw new Error(`PLY: unknown format in line "${line}"`);
      continue;
    }
    if (line.startsWith('element ')) {
      const parts = line.split(/\s+/);
      const elemName = parts[1];
      inVertexElement = (elemName === 'vertex');
      if (inVertexElement) vertexCount = parseInt(parts[2], 10);
      continue;
    }
    if (line.startsWith('property ') && inVertexElement) {
      const parts = line.split(/\s+/);
      const name = parts[parts.length - 1];
      vertexPropNames.push(name);
      continue;
    }
  }

  if (!encoding) throw new Error('PLY: format line not found');

  return { encoding, vertexCount, comments, vertexPropNames, headerByteLength: headerEnd };
}

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function asciiDecode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

/* -------------------------------------------------------------------------- */
/*                         Non-allocating f32 -> f16                           */
/* -------------------------------------------------------------------------- */

const __f32_buf = new ArrayBuffer(4);
const __f32v = new Float32Array(__f32_buf);
const __u32v = new Uint32Array(__f32_buf);

function f32_to_f16_fast(val: number): number {
  __f32v[0] = val;
  const x = __u32v[0];

  const sign = (x >>> 16) & 0x8000;
  let exp  = (x >>> 23) & 0xff;
  let mant = x & 0x007fffff;

  if (exp === 0xff) return sign | 0x7c00 | (mant ? 1 : 0);
  if (exp === 0) return sign;

  let e = exp - 112;
  if (e <= 0) {
    if (e < -10) return sign;
    mant = (mant | 0x00800000) >>> (1 - e);
    if (mant & 0x00001000) mant += 0x00002000;
    return sign | (mant >>> 13);
  }
  if (e >= 0x1f) return sign | 0x7c00;

  if (mant & 0x00001000) {
    mant += 0x00002000;
    if (mant & 0x00800000) {
      mant = 0;
      e += 1;
      if (e >= 0x1f) return sign | 0x7c00;
    }
  }
  return sign | (e << 10) | ((mant >>> 13) & 0x03ff);
}

/* -------------------------------------------------------------------------- */
/*                                Reader                                       */
/* -------------------------------------------------------------------------- */

export class PlyReader {
  private header: ParsedHeader;
  private dv: DataView; // still used to find payload slice; we won't call getFloat32 in the hot loop
  private offset: number;

  private sh_deg: number;
  private num_points: number;
  private mip_splatting: boolean | null;
  private kernel_size: number | null;
  private background_color: [number, number, number] | null;

  constructor(reader: ArrayBuffer) {
    this.header = parsePlyHeader(reader);
    this.dv = new DataView(reader);
    this.offset = this.header.headerByteLength;

    // file_sh_deg from count of f_* properties
    const numShCoefs = this.header.vertexPropNames.filter((n) => n.startsWith('f_')).length;
    const deg = shDegFromNumCoefs(numShCoefs / 3);
    if (deg == null) throw new Error(`number of sh coefficients ${numShCoefs} cannot be mapped to sh degree`);
    this.sh_deg = deg;

    // clamp
    const fileCount = this.header.vertexCount;
    const clamped =
      DEBUG_MAX_SPLATS != null && DEBUG_MAX_SPLATS > 0
        ? Math.min(fileCount, DEBUG_MAX_SPLATS)
        : fileCount;
    if (clamped !== fileCount) {
      console.log(`[ply] DEBUG: clamping splats ${fileCount} -> ${clamped}`);
    }
    this.num_points = clamped;

    // comments
    this.mip_splatting = parseBoolFromComments(this.header.comments, 'mip');
    this.kernel_size = parseNumberFromComments(this.header.comments, 'kernel_size');
    this.background_color = parseRGBFromComments(this.header.comments, 'background_color');
  }

  static new(reader: ArrayBuffer): PlyReader { return new PlyReader(reader); }
  static magic_bytes(): Uint8Array { return new Uint8Array([0x70, 0x6c, 0x79]); } // "ply"
  static file_ending(): string { return 'ply'; }

  read(): GenericGaussianPointCloud {
    if (this.header.encoding === 'ascii') {
      throw new Error('ascii ply format not supported');
    }

    const little = (this.header.encoding === 'binary_little_endian');
    const n = this.num_points >>> 0;
    const sh_deg = this.sh_deg >>> 0;
    const numCoefs = (sh_deg + 1) * (sh_deg + 1);
    const restCount = (numCoefs - 1) * 3;

    // Build a single Float32Array view over payload (copy once if needed)
    const payloadU8 = new Uint8Array(this.dv.buffer, this.offset);
    let f32: Float32Array;

    if (little) {
      if ((payloadU8.byteOffset & 0x3) === 0) {
        // aligned: zero-copy view
        f32 = new Float32Array(this.dv.buffer, this.offset);
      } else {
        // unaligned: copy once to aligned buffer
        const buf = new ArrayBuffer(payloadU8.byteLength);
        new Uint8Array(buf).set(payloadU8);
        f32 = new Float32Array(buf);
      }
    } else {
      // big-endian: copy + byteswap to little
      const buf = new ArrayBuffer(payloadU8.byteLength);
      const dst = new Uint8Array(buf);
      // swap each 32-bit word
      const len = (payloadU8.byteLength / 4) | 0;
      const src = payloadU8;
      for (let i = 0; i < len; i++) {
        const s = i * 4;
        dst[s + 0] = src[s + 3];
        dst[s + 1] = src[s + 2];
        dst[s + 2] = src[s + 1];
        dst[s + 3] = src[s + 0];
      }
      f32 = new Float32Array(buf);
    }

    // Preallocate packed target buffers
    const gaussU16 = new Uint16Array(n * 10);   // 3 (xyz) + 1 (opacity) + 6 (cov)
    const shU16    = new Uint16Array(n * 16 * 3);

    // Running stats for bbox and plane
    let minx =  Infinity, miny =  Infinity, minz =  Infinity;
    let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;

    let sumx = 0, sumy = 0, sumz = 0;
    let sumxx = 0, sumyy = 0, sumzz = 0;
    let sumxy = 0, sumxz = 0, sumyz = 0;

    // per-vertex float layout:
    // pos(3), normal(3), SH.dc(3), SH.rest((numCoefs-1)*3 channel-first), opacity(1),
    // scale exp(3), quat (w,x,y,z)(4)
    const floatsPerVertex = 3 + 3 + 3 + restCount + 1 + 3 + 4;

    let idx = 0; // index into f32
    for (let p = 0; p < n; p++) {
      // position
      const px = f32[idx++], py = f32[idx++], pz = f32[idx++];
      // bbox + plane accumulators
      if (px < minx) minx = px; if (py < miny) miny = py; if (pz < minz) minz = pz;
      if (px > maxx) maxx = px; if (py > maxy) maxy = py; if (pz > maxz) maxz = pz;
      sumx += px; sumy += py; sumz += pz;
      sumxx += px * px; sumyy += py * py; sumzz += pz * pz;
      sumxy += px * py; sumxz += px * pz; sumyz += py * pz;

      // normals (skip)
      idx += 3;

      // SH: DC
      const sb = p * 16 * 3;
      const dc_r = f32[idx++], dc_g = f32[idx++], dc_b = f32[idx++];
      shU16[sb + 0] = f32_to_f16_fast(dc_r);
      shU16[sb + 1] = f32_to_f16_fast(dc_g);
      shU16[sb + 2] = f32_to_f16_fast(dc_b);

      // SH: rest (channel-first in file)
      const restBase = idx;
      idx += restCount;
      for (let i = 0; i < numCoefs - 1; i++) {
        const r = f32[restBase + i];
        const g = f32[restBase + (numCoefs - 1) + i];
        const b = f32[restBase + 2 * (numCoefs - 1) + i];
        const dst = sb + (i + 1) * 3;
        shU16[dst + 0] = f32_to_f16_fast(r);
        shU16[dst + 1] = f32_to_f16_fast(g);
        shU16[dst + 2] = f32_to_f16_fast(b);
      }
      // Zero-pad remaining coefficients up to 16
      for (let i = numCoefs; i < 16; i++) {
        const dst = sb + i * 3;
        shU16[dst + 0] = 0;
        shU16[dst + 1] = 0;
        shU16[dst + 2] = 0;
      }

      // opacity (sigmoid)
      const opacity = sigmoid(f32[idx++]);

      // scale: exp
      const s1 = Math.exp(f32[idx++]);
      const s2 = Math.exp(f32[idx++]);
      const s3 = Math.exp(f32[idx++]);
      const scaleV = vec3.fromValues(s1, s2, s3);

      // quaternion (w,x,y,z) -> [x,y,z,w]
      const r0 = f32[idx++], r1 = f32[idx++], r2 = f32[idx++], r3 = f32[idx++];
      const q = quat.fromValues(r1, r2, r3, r0);
      quat.normalize(q, q);

      // cov
      const cov = buildCov(q, scaleV);

      if (DEBUG_LOG_PLY_SAMPLE0 && !__PLY_SAMPLE_LOGGED__) {
        __PLY_SAMPLE_LOGGED__ = true;
        console.log('[ply::sample0] pos', [px, py, pz]);
        console.log('[ply::sample0] opacity', opacity);
        console.log('[ply::sample0] scale(exp)', [s1, s2, s3]);
        console.log('[ply::sample0] quat(x,y,z,w) normalized', [q[0], q[1], q[2], q[3]]);
        console.log('[ply::sample0] cov[0..5]', cov);
        console.log('[ply::sample0] SH[0]', [dc_r, dc_g, dc_b]);
      }

      // write gaussian packed (3 xyz + opacity + 6 cov) as halfs
      const gb = p * 10;
      gaussU16[gb + 0] = f32_to_f16_fast(px);
      gaussU16[gb + 1] = f32_to_f16_fast(py);
      gaussU16[gb + 2] = f32_to_f16_fast(pz);
      gaussU16[gb + 3] = f32_to_f16_fast(opacity);
      gaussU16[gb + 4] = f32_to_f16_fast(cov[0]);
      gaussU16[gb + 5] = f32_to_f16_fast(cov[1]);
      gaussU16[gb + 6] = f32_to_f16_fast(cov[2]);
      gaussU16[gb + 7] = f32_to_f16_fast(cov[3]);
      gaussU16[gb + 8] = f32_to_f16_fast(cov[4]);
      gaussU16[gb + 9] = f32_to_f16_fast(cov[5]);

      // advance to next vertex just in case (defensive); should already be exact
      // idx += (floatsPerVertex - (3+3+3+restCount+1+3+4));
    }

    // center + up (plane from points) from accumulated moments
    const invN = n > 0 ? 1 / n : 0;
    const cx = sumx * invN, cy = sumy * invN, cz = sumz * invN;

    let xx = sumxx * invN - cx * cx;
    let yy = sumyy * invN - cy * cy;
    let zz = sumzz * invN - cz * cz;
    let xy = sumxy * invN - cx * cy;
    let xz = sumxz * invN - cx * cz;
    let yz = sumyz * invN - cy * cz;

    let wx = 0.0, wy = 0.0, wz = 0.0;
    {
      const det_x = yy * zz - yz * yz;
      const ax = det_x, ay = xz * yz - xy * zz, az = xy * yz - xz * yy;
      let w = det_x * det_x; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
      wx += ax * w; wy += ay * w; wz += az * w;
    }
    {
      const det_y = xx * zz - xz * xz;
      const ax = xz * yz - xy * zz, ay = det_y, az = xy * xz - yz * xx;
      let w = det_y * det_y; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
      wx += ax * w; wy += ay * w; wz += az * w;
    }
    {
      const det_z = xx * yy - xy * xy;
      const ax = xy * yz - xz * yy, ay = xy * xz - yz * xx, az = det_z;
      let w = det_z * det_z; if (wx * ax + wy * ay + wz * az < 0.0) w = -w;
      wx += ax * w; wy += ay * w; wz += az * w;
    }

    const wlen = Math.hypot(wx, wy, wz);
    let up: [number, number, number] | null = null;
    if (wlen > 0 && Number.isFinite(wlen)) {
      let nx = wx / wlen, ny = wy / wlen, nz = wz / wlen;
      if (ny < 0.0) { nx = -nx; ny = -ny; nz = -nz; }
      up = [nx, ny, nz];
    }

    const bbox = new Aabb({ x: minx, y: miny, z: minz }, { x: maxx, y: maxy, z: maxz });
    if (bbox.radius() < 10.0) up = null;

    const gaussBytes = new Uint8Array(gaussU16.buffer);
    const shBytes    = new Uint8Array(shU16.buffer);

    return GenericGaussianPointCloud.new_packed(
      gaussBytes,
      shBytes,
      sh_deg,
      n,
      this.kernel_size,
      this.mip_splatting,
      this.background_color,
      null,
      null,
      up ? { x: up[0], y: up[1], z: up[2] } : null,
      { x: cx, y: cy, z: cz },
      bbox
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                              Comment parsers                                */
/* -------------------------------------------------------------------------- */

function parseBoolFromComments(comments: string[], key: string): boolean | null {
  for (const c of comments) {
    if (c.includes(key)) {
      const idx = c.indexOf('=');
      if (idx >= 0) {
        const raw = c.substring(idx + 1).trim();
        if (raw === 'true') return true;
        if (raw === 'false') return false;
      }
    }
  }
  return null;
}

function parseNumberFromComments(comments: string[], key: string): number | null {
  for (const c of comments) {
    if (c.includes(key)) {
      const idx = c.indexOf('=');
      if (idx >= 0) {
        const raw = c.substring(idx + 1).trim();
        const num = Number(raw);
        if (!Number.isNaN(num)) return num;
      }
    }
  }
  return null;
}

function parseRGBFromComments(comments: string[], key: string): [number, number, number] | null {
  for (const c of comments) {
    if (c.includes(key)) {
      const idx = c.indexOf('=');
      if (idx >= 0) {
        const raw = c.substring(idx + 1).trim();
        const parts = raw.split(',').map((s) => Number(s.trim()));
        if (parts.length === 3 && parts.every((v) => Number.isFinite(v))) {
          return [parts[0], parts[1], parts[2]];
        }
      }
    }
  }
  return null;
}
