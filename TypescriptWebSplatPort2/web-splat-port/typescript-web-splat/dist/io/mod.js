// io/mod.ts
// 1:1 port of src/io/mod.rs (with TS-friendly types)
import { Aabb, } from '../pointcloud.js';
import { PlyReader } from './ply.js';
export class GenericGaussianPointCloud {
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
        // if (startsWith(sig, NpzReader.magic_bytes())) {
        //   const npz = new NpzReader(data);
        //   return npz.read();
        // }
        throw new Error('Unknown file format');
    }
    // Rust: fn new(gaussians: Vec<Gaussian>, sh_coefs: Vec<[[f16;3];16]>, ...)
    static new(gaussians, sh_coefs, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization) {
        let bbox = Aabb.zeroed();
        for (const g of gaussians) {
            bbox.grow({ x: g.xyz.x, y: g.xyz.y, z: g.xyz.z });
        }
        const points = gaussians.map((g) => ({
            x: g.xyz.x, y: g.xyz.y, z: g.xyz.z,
        }));
        const [center, up0] = plane_from_points(points);
        let up = up0;
        if (bbox.radius() < 10.0)
            up = null;
        const gaussiansBytes = packGaussiansF16(gaussians);
        const shCoefsBytes = packShCoefsF16(sh_coefs);
        return new GenericGaussianPointCloud(gaussiansBytes, shCoefsBytes, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization, up, center, bbox, 
        /* compressed */ false, 
        /* parsed */ gaussians);
    }
    // Rust: fn new_compressed(...)
    static new_compressed(gaussians, sh_coefs_packed, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization) {
        let bbox = Aabb.unit();
        for (const v of gaussians) {
            bbox.grow({ x: v.xyz.x, y: v.xyz.y, z: v.xyz.z });
        }
        const points = gaussians.map((g) => ({
            x: g.xyz.x, y: g.xyz.y, z: g.xyz.z,
        }));
        const [center, up0] = plane_from_points(points);
        let up = up0;
        if (bbox.radius() < 10.0)
            up = null;
        const gaussiansBytes = packGaussiansCompressed(gaussians);
        return new GenericGaussianPointCloud(gaussiansBytes, sh_coefs_packed, sh_deg, num_points, kernel_size, mip_splatting, background_color, covars, quantization, up, center, bbox, 
        /* compressed */ true, 
        /* parsed */ null);
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
            throw new Error('Gaussians are compressed');
        }
        if (this._gaussiansParsed)
            return this._gaussiansParsed;
        throw new Error('Parsed gaussians not available');
    }
    // (kept aligned with the Rust provided logic signature-wise;
    // the Rust version appears inconsistent; we mirror the surface API)
    gaussians_compressed() {
        if (this._compressed) {
            throw new Error('Gaussians are compressed');
        }
        else {
            // The Rust snippet returns a cast here; we surface an error like it would at runtime.
            throw new Error('Not compressed');
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
}
/* ------------------------------- small helpers ------------------------------ */
function startsWith(buf, sig) {
    if (sig.length > buf.length)
        return false;
    for (let i = 0; i < sig.length; i++)
        if (buf[i] !== sig[i])
            return false;
    return true;
}
// float32 -> float16 (uint16)
function f32_to_f16(val) {
    const f = new Float32Array(1);
    const i = new Int32Array(f.buffer);
    f[0] = val;
    const x = i[0];
    const sign = (x >> 16) & 0x8000;
    let mant = x & 0x007fffff;
    let exp = (x >> 23) & 0xff;
    if (exp === 0xff)
        return sign | (mant ? 0x7e00 : 0x7c00);
    if (exp > 0x70)
        return sign | 0x7c00;
    if (exp < 0x71) {
        const shift = 0x71 - exp;
        if (shift > 24)
            return sign;
        mant = (mant | 0x00800000) >> shift;
        if (mant & 0x00001000)
            mant += 0x00002000;
        return sign | (mant >> 13);
    }
    exp = exp - 0x70;
    mant = mant + 0x00001000;
    if (mant & 0x00800000) {
        mant = 0;
        exp += 1;
    }
    if (exp >= 0x1f)
        return sign | 0x7c00;
    return sign | (exp << 10) | (mant >> 13);
}
function writeF16(view, byteOffset, v) {
    view.setUint16(byteOffset, f32_to_f16(v), true);
}
// Gaussian: 20 bytes each (3*f16 + f16 + 6*f16)
function packGaussiansF16(gaussians) {
    const BYTES_PER = 20;
    const buf = new ArrayBuffer(gaussians.length * BYTES_PER);
    const view = new DataView(buf);
    let off = 0;
    for (const g of gaussians) {
        writeF16(view, off + 0, g.xyz.x);
        writeF16(view, off + 2, g.xyz.y);
        writeF16(view, off + 4, g.xyz.z);
        writeF16(view, off + 6, g.opacity);
        writeF16(view, off + 8, g.cov[0]);
        writeF16(view, off + 10, g.cov[1]);
        writeF16(view, off + 12, g.cov[2]);
        writeF16(view, off + 14, g.cov[3]);
        writeF16(view, off + 16, g.cov[4]);
        writeF16(view, off + 18, g.cov[5]);
        off += BYTES_PER;
    }
    return new Uint8Array(buf);
}
// sh_coefs: Vec<[[f16;3];16]> per point => 96 bytes per point
function packShCoefsF16(sh) {
    const BYTES_PER_POINT = 16 * 3 * 2; // 96
    const buf = new ArrayBuffer(sh.length * BYTES_PER_POINT);
    const view = new DataView(buf);
    let off = 0;
    for (const block of sh) {
        for (let i = 0; i < 16; i++) {
            const [r, g, b] = block[i];
            writeF16(view, off + 0, r);
            writeF16(view, off + 2, g);
            writeF16(view, off + 4, b);
            off += 6;
        }
    }
    return new Uint8Array(buf);
}
// GaussianCompressed: 16 bytes each
function packGaussiansCompressed(g) {
    const BYTES_PER = 16;
    const buf = new ArrayBuffer(g.length * BYTES_PER);
    const view = new DataView(buf);
    let off = 0;
    for (const v of g) {
        writeF16(view, off + 0, v.xyz.x);
        writeF16(view, off + 2, v.xyz.y);
        writeF16(view, off + 4, v.xyz.z);
        view.setInt8(off + 6, v.opacity);
        view.setInt8(off + 7, v.scale_factor);
        view.setUint32(off + 8, v.geometry_idx, true);
        view.setUint32(off + 12, v.sh_idx, true);
        off += BYTES_PER;
    }
    return new Uint8Array(buf);
}
/* plane_from_points (unchanged) */
function plane_from_points(points) {
    const n = points.length;
    let sumX = 0.0, sumY = 0.0, sumZ = 0.0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        sumZ += p.z;
    }
    const centroid = { x: sumX / (n || 1), y: sumY / (n || 1), z: sumZ / (n || 1) };
    if (n < 3)
        return [centroid, null];
    let xx = 0.0, xy = 0.0, xz = 0.0, yy = 0.0, yz = 0.0, zz = 0.0;
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
    let wx = 0.0, wy = 0.0, wz = 0.0;
    {
        const det_x = yy * zz - yz * yz;
        const ax = det_x, ay = xz * yz - xy * zz, az = xy * yz - xz * yy;
        let w = det_x * det_x;
        if (wx * ax + wy * ay + wz * az < 0.0)
            w = -w;
        wx += ax * w;
        wy += ay * w;
        wz += az * w;
    }
    {
        const det_y = xx * zz - xz * xz;
        const ax = xz * yz - xy * zz, ay = det_y, az = xy * xz - yz * xx;
        let w = det_y * det_y;
        if (wx * ax + wy * ay + wz * az < 0.0)
            w = -w;
        wx += ax * w;
        wy += ay * w;
        wz += az * w;
    }
    {
        const det_z = xx * yy - xy * xy;
        const ax = xy * yz - xz * yy, ay = xy * xz - yz * xx, az = det_z;
        let w = det_z * det_z;
        if (wx * ax + wy * ay + wz * az < 0.0)
            w = -w;
        wx += ax * w;
        wy += ay * w;
        wz += az * w;
    }
    const len = Math.hypot(wx, wy, wz);
    if (!(len > 0) || !Number.isFinite(len))
        return [centroid, null];
    let nx = wx / len, ny = wy / len, nz = wz / len;
    if (ny < 0.0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
    }
    return [centroid, { x: nx, y: ny, z: nz }];
}
//# sourceMappingURL=mod.js.map