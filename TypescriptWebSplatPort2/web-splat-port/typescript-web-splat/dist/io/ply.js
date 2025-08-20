// io/ply.ts
// 1:1 port of src/io/ply.rs (binary big/little endian; ASCII path left as TODO to match Rust)
import { quat, vec3 } from 'gl-matrix';
import { buildCov, shDegFromNumCoefs, sigmoid } from '../utils.js';
import { GenericGaussianPointCloud } from './mod.js';
function parsePlyHeader(data) {
    const u8 = new Uint8Array(data);
    // find "end_header"
    const needle = utf8Bytes('end_header');
    let endIdx = -1;
    search: for (let i = 0; i <= u8.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
            if (u8[i + j] !== needle[j])
                continue search;
        }
        endIdx = i + needle.length;
        break;
    }
    if (endIdx < 0)
        throw new Error('PLY: end_header not found');
    // include the newline after "end_header"
    let headerEnd = endIdx;
    while (headerEnd < u8.length && u8[headerEnd] !== 0x0a /* \n */)
        headerEnd++;
    headerEnd++;
    const headerText = asciiDecode(u8.subarray(0, headerEnd));
    const lines = headerText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    let encoding = null;
    let vertexCount = 0;
    const comments = [];
    const vertexPropNames = [];
    let inVertexElement = false;
    for (const line of lines) {
        if (line.startsWith('comment ')) {
            comments.push(line.substring('comment '.length));
            continue;
        }
        if (line.startsWith('format ')) {
            if (line.includes('binary_little_endian'))
                encoding = 'binary_little_endian';
            else if (line.includes('binary_big_endian'))
                encoding = 'binary_big_endian';
            else if (line.includes('ascii'))
                encoding = 'ascii';
            else
                throw new Error(`PLY: unknown format in line "${line}"`);
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
    if (!encoding)
        throw new Error('PLY: format line not found');
    return {
        encoding,
        vertexCount,
        comments,
        vertexPropNames,
        headerByteLength: headerEnd,
    };
}
function utf8Bytes(s) {
    return new TextEncoder().encode(s);
}
function asciiDecode(bytes) {
    // header is ASCII; utf-8 is fine for ASCII range
    return new TextDecoder('utf-8').decode(bytes);
}
/* -------------------------------------------------------------------------- */
/*                                  Reader                                     */
/* -------------------------------------------------------------------------- */
export class PlyReader {
    header;
    dv;
    offset;
    sh_deg;
    num_points;
    mip_splatting;
    kernel_size;
    background_color;
    constructor(reader) {
        this.header = parsePlyHeader(reader);
        this.dv = new DataView(reader);
        this.offset = this.header.headerByteLength;
        // file_sh_deg from count of f_* properties
        const numShCoefs = this.header.vertexPropNames.filter((n) => n.startsWith('f_')).length;
        const deg = shDegFromNumCoefs(numShCoefs / 3);
        if (deg == null) {
            throw new Error(`number of sh coefficients ${numShCoefs} cannot be mapped to sh degree`);
        }
        this.sh_deg = deg;
        this.num_points = this.header.vertexCount;
        // comments
        this.mip_splatting = parseBoolFromComments(this.header.comments, 'mip');
        this.kernel_size = parseNumberFromComments(this.header.comments, 'kernel_size');
        this.background_color = parseRGBFromComments(this.header.comments, 'background_color');
    }
    static new(reader) {
        return new PlyReader(reader);
    }
    static magic_bytes() {
        return new Uint8Array([0x70, 0x6c, 0x79]); // "ply"
    }
    static file_ending() {
        return 'ply';
    }
    read() {
        const gaussians = [];
        const sh_coefs = [];
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
        return GenericGaussianPointCloud.new(gaussians, sh_coefs, this.sh_deg, this.num_points, this.kernel_size, this.mip_splatting, this.background_color, null, null);
    }
    read_line(littleEndian) {
        // pos: 3*f32
        const px = this.readF32(littleEndian);
        const py = this.readF32(littleEndian);
        const pz = this.readF32(littleEndian);
        // skip normals: 3*f32
        this.readF32(littleEndian);
        this.readF32(littleEndian);
        this.readF32(littleEndian);
        // SH coefficients (init 16 triplets)
        const sh = Array.from({ length: 16 }, () => [0, 0, 0]);
        // read DC term
        sh[0][0] = this.readF32(littleEndian);
        sh[0][1] = this.readF32(littleEndian);
        sh[0][2] = this.readF32(littleEndian);
        const numCoefs = (this.sh_deg + 1) * (this.sh_deg + 1);
        const restCount = (numCoefs - 1) * 3;
        const rest = new Float32Array(restCount);
        for (let i = 0; i < restCount; i++)
            rest[i] = this.readF32(littleEndian);
        // channel-first layout -> per-coef triplets
        for (let i = 0; i < numCoefs - 1; i++) {
            for (let j = 0; j < 3; j++) {
                sh[i + 1][j] = rest[j * (numCoefs - 1) + i];
            }
        }
        // opacity: sigmoid(f32)
        const opacity = sigmoid(this.readF32(littleEndian));
        // scale: exp(f32)
        const s1 = Math.exp(this.readF32(littleEndian));
        const s2 = Math.exp(this.readF32(littleEndian));
        const s3 = Math.exp(this.readF32(littleEndian));
        const scaleV = vec3.fromValues(s1, s2, s3);
        // rotation quaternion: (w,x,y,z) -> gl-matrix order [x,y,z,w]
        const r0 = this.readF32(littleEndian);
        const r1 = this.readF32(littleEndian);
        const r2 = this.readF32(littleEndian);
        const r3 = this.readF32(littleEndian);
        const q = quat.fromValues(r1, r2, r3, r0);
        quat.normalize(q, q);
        // covariance upper-triangular
        const cov = buildCov(q, scaleV);
        const g = {
            xyz: { x: px, y: py, z: pz },
            opacity,
            cov: [cov[0], cov[1], cov[2], cov[3], cov[4], cov[5]],
        };
        return { g, s: sh };
    }
    readF32(littleEndian) {
        const v = this.dv.getFloat32(this.offset, littleEndian);
        this.offset += 4;
        return v;
    }
    static magic_bytes_ts() {
        return PlyReader.magic_bytes();
    }
}
/* -------------------------------------------------------------------------- */
/*                              Comment parsers                                */
/* -------------------------------------------------------------------------- */
function parseBoolFromComments(comments, key) {
    for (const c of comments) {
        if (c.includes(key)) {
            const idx = c.indexOf('=');
            if (idx >= 0) {
                const raw = c.substring(idx + 1).trim();
                if (raw === 'true')
                    return true;
                if (raw === 'false')
                    return false;
            }
        }
    }
    return null;
}
function parseNumberFromComments(comments, key) {
    for (const c of comments) {
        if (c.includes(key)) {
            const idx = c.indexOf('=');
            if (idx >= 0) {
                const raw = c.substring(idx + 1).trim();
                const num = Number(raw);
                if (!Number.isNaN(num))
                    return num;
            }
        }
    }
    return null;
}
function parseRGBFromComments(comments, key) {
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
//# sourceMappingURL=ply.js.map