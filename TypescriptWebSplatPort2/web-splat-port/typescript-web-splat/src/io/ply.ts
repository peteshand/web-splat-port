// io/ply.ts
// 1:1 port of src/io/ply.rs (binary big/little endian; ASCII path left as TODO to match Rust)

import { quat, vec3 } from 'gl-matrix';
import { Gaussian } from '../pointcloud';
import { buildCov, shDegFromNumCoefs, sigmoid } from '../utils';
import { GenericGaussianPointCloud, PointCloudReader } from './mod';

/* -------------------------------------------------------------------------- */
/*                           DEBUG: limit loaded splats                        */
/* -------------------------------------------------------------------------- */
const DEBUG_MAX_SPLATS: number | null = null;

/* -------------------------------------------------------------------------- */
/*                      DEBUG: one-shot data dump for splat 0                 */
/* -------------------------------------------------------------------------- */
const DEBUG_LOG_PLY_SAMPLE0: boolean = true;
let __PLY_SAMPLE_LOGGED__ = false;

/* ------------------------- helpers for fixed-length SH ------------------------- */
type SHTriplet = [number, number, number];
type SHBlock16 = [
  SHTriplet, SHTriplet, SHTriplet, SHTriplet,
  SHTriplet, SHTriplet, SHTriplet, SHTriplet,
  SHTriplet, SHTriplet, SHTriplet, SHTriplet,
  SHTriplet, SHTriplet, SHTriplet, SHTriplet
];

/* --------------------------- module-scope scratch --------------------------- */
const qScratch = quat.create();
const scaleScratch = vec3.create();

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
      if (inVertexElement) {
        vertexCount = parseInt(parts[2], 10);
      }
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

  return {
    encoding,
    vertexCount,
    comments,
    vertexPropNames,
    headerByteLength: headerEnd,
  };
}

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function asciiDecode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

/* -------------------------------------------------------------------------- */
/*                                  Reader                                     */
/* -------------------------------------------------------------------------- */

export class PlyReader implements PointCloudReader {
  private header: ParsedHeader;
  private dv: DataView;
  private offset: number;

  private sh_deg: number;
  private num_points: number;
  private mip_splatting: boolean | null;
  private kernel_size: number | null;
  private background_color: [number, number, number] | null;

  // precomputed once (avoids per-splat allocation)
  private numCoefs: number;
  private restScratch: Float32Array;

  constructor(reader: ArrayBuffer) {
    this.header = parsePlyHeader(reader);
    this.dv = new DataView(reader);
    this.offset = this.header.headerByteLength;

    const numShCoefs = this.header.vertexPropNames.filter((n) => n.startsWith('f_')).length;
    const deg = shDegFromNumCoefs(numShCoefs / 3);
    if (deg == null) {
      throw new Error(`number of sh coefficients ${numShCoefs} cannot be mapped to sh degree`);
    }
    this.sh_deg = deg;

    // Precompute counts + scratch for SH rest
    this.numCoefs = (this.sh_deg + 1) * (this.sh_deg + 1);
    this.restScratch = new Float32Array(Math.max(0, (this.numCoefs - 1) * 3));

    // Apply debug clamp to number of points
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

  static new(reader: ArrayBuffer): PlyReader {
    return new PlyReader(reader);
  }

  static magic_bytes(): Uint8Array {
    return new Uint8Array([0x70, 0x6c, 0x79]); // "ply"
  }

  static file_ending(): string {
    return 'ply';
  }

  read(): GenericGaussianPointCloud {
    const gaussians: Gaussian[] = [];
    const sh_coefs: SHBlock16[] = [];

    switch (this.header.encoding) {
      case 'ascii':
        throw new Error('ascii ply format not supported'); // matches Rust todo!()
      case 'binary_big_endian':
        for (let i = 0; i < this.num_points; i++) {
          const { g, s } = this.read_line(false);
          gaussians.push(g);
          sh_coefs.push(s);
        }
        break;
      case 'binary_little_endian':
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
      null,
    );
  }

  private read_line(littleEndian: boolean): { g: Gaussian; s: SHBlock16 } {
    // pos: 3*f32
    const px = this.readF32(littleEndian);
    const py = this.readF32(littleEndian);
    const pz = this.readF32(littleEndian);

    // skip normals: 3*f32
    this.readF32(littleEndian);
    this.readF32(littleEndian);
    this.readF32(littleEndian);

    // SH coefficients (init 16 triplets)
    const sh = Array.from({ length: 16 }, () => [0, 0, 0] as SHTriplet) as SHBlock16;

    // read DC term
    sh[0][0] = this.readF32(littleEndian);
    sh[0][1] = this.readF32(littleEndian);
    sh[0][2] = this.readF32(littleEndian);

    // read remaining channel-first SH into reusable scratch
    const restCount = (this.numCoefs - 1) * 3;
    const rest = this.restScratch;
    for (let i = 0; i < restCount; i++) rest[i] = this.readF32(littleEndian);

    // channel-first -> per-coef triplets
    const stride = (this.numCoefs - 1);
    for (let i = 0; i < this.numCoefs - 1; i++) {
      // r,g,b
      sh[i + 1][0] = rest[0 * stride + i];
      sh[i + 1][1] = rest[1 * stride + i];
      sh[i + 1][2] = rest[2 * stride + i];
    }

    // opacity: sigmoid(f32)
    const opacity = sigmoid(this.readF32(littleEndian));

    // scale: exp(f32) -> write into scratch vec
    const s1 = Math.exp(this.readF32(littleEndian));
    const s2 = Math.exp(this.readF32(littleEndian));
    const s3 = Math.exp(this.readF32(littleEndian));
    scaleScratch[0] = s1; scaleScratch[1] = s2; scaleScratch[2] = s3;

    // rotation quaternion: (w,x,y,z) -> gl-matrix order [x,y,z,w] in scratch
    const r0 = this.readF32(littleEndian);
    const r1 = this.readF32(littleEndian);
    const r2 = this.readF32(littleEndian);
    const r3 = this.readF32(littleEndian);
    // q = [x,y,z,w]
    qScratch[0] = r1; qScratch[1] = r2; qScratch[2] = r3; qScratch[3] = r0;
    quat.normalize(qScratch, qScratch);

    // covariance upper-triangular (allocation-free buildCov)
    const cov = buildCov(qScratch, scaleScratch);

    const g: Gaussian = {
      xyz: { x: px, y: py, z: pz },
      opacity,
      cov: [cov[0], cov[1], cov[2], cov[3], cov[4], cov[5]],
    };

    // one-shot sample logging
    if (DEBUG_LOG_PLY_SAMPLE0 && !__PLY_SAMPLE_LOGGED__) {
      __PLY_SAMPLE_LOGGED__ = true;
      console.log('[ply::sample0] pos', [px, py, pz]);
      console.log('[ply::sample0] opacity', opacity);
      console.log('[ply::sample0] scale(exp)', [s1, s2, s3]);
      console.log('[ply::sample0] quat(x,y,z,w) normalized', [qScratch[0], qScratch[1], qScratch[2], qScratch[3]]);
      console.log('[ply::sample0] cov[0..5]', [cov[0], cov[1], cov[2], cov[3], cov[4], cov[5]]);
      console.log('[ply::sample0] SH[0]', [sh[0][0], sh[0][1], sh[0][2]]);
      if (this.numCoefs > 1) console.log('[ply::sample0] SH[1]', [sh[1][0], sh[1][1], sh[1][2]]);
      if (this.numCoefs > 2) console.log('[ply::sample0] SH[2]', [sh[2][0], sh[2][1], sh[2][2]]);
    }

    return { g, s: sh };
  }

  private readF32(littleEndian: boolean): number {
    const v = this.dv.getFloat32(this.offset, littleEndian);
    this.offset += 4;
    return v;
  }

  static magic_bytes_ts(): Uint8Array {
    return PlyReader.magic_bytes();
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
