export class PlyReader {
    file;
    constructor(file) {
        this.file = file;
    }
    static magic_bytes() { return new TextEncoder().encode("ply\n"); }
    static file_ending() { return ".ply"; }
    async read() {
        const { header, headerEnd } = parseHeader(this.file);
        if (header.format !== "binary_little_endian 1.0") {
            throw new Error(`Unsupported PLY format: ${header.format}`);
        }
        const vtx = header.elements.find(e => e.name === "vertex");
        if (!vtx)
            throw new Error("PLY missing vertex element");
        // Required properties (as emitted by 3DGS exporters like Sample.ply)
        const reqProps = [
            "x", "y", "z", "nx", "ny", "nz",
            "f_dc_0", "f_dc_1", "f_dc_2",
            ...Array.from({ length: 45 }, (_, i) => `f_rest_${i}`),
            "opacity",
            "scale_0", "scale_1", "scale_2",
            "rot_0", "rot_1", "rot_2", "rot_3",
        ];
        for (const p of reqProps) {
            if (!vtx.properties.some(pp => pp.name === p && (pp.type === "float" || pp.type === "float32"))) {
                throw new Error(`Required property ${p} missing or wrong type`);
            }
        }
        const MAX_TEST_POINTS = 1000;
        const n_total = vtx.count >>> 0;
        const n = Math.min(n_total, MAX_TEST_POINTS);
        const stride = vtx.properties.length * 4; // bytes per vertex (all float32)
        const dataStart = headerEnd;
        const neededBytes = dataStart + n * stride;
        if (this.file.byteLength < neededBytes) {
            throw new Error(`PLY truncated: expected ${neededBytes} bytes, have ${this.file.byteLength}`);
        }
        // Output buffers per point: gaussians = 5*u32 (20 bytes), sh_coefs = 24*u32 (96 bytes)
        const gaussians = new ArrayBuffer(n * 20);
        const g32 = new Uint32Array(gaussians);
        const sh_buf = new ArrayBuffer(n * 96);
        const sh32 = new Uint32Array(sh_buf);
        const dv = new DataView(this.file, dataStart);
        const pIndex = {};
        for (let i = 0; i < vtx.properties.length; i++)
            pIndex[vtx.properties[i].name] = i;
        const tmpCov = new Float32Array(6);
        const halfSeq = new Uint16Array(48); // temporary for SH packing
        for (let i = 0; i < n; i++) {
            const off = i * stride;
            const f = (name) => dv.getFloat32(off + 4 * pIndex[name], true);
            // Position + opacity
            const x = f("x"), y = f("y"), z = f("z");
            const opacity = f("opacity");
            // Scale + rotation → covariance
            const sx = f("scale_0"), sy = f("scale_1"), sz = f("scale_2");
            let qx = f("rot_0"), qy = f("rot_1"), qz = f("rot_2"), qw = f("rot_3");
            const qn = Math.hypot(qx, qy, qz, qw) || 1;
            qx /= qn;
            qy /= qn;
            qz /= qn;
            qw /= qn;
            quatToCov6(qx, qy, qz, qw, sx, sy, sz, tmpCov);
            // Pack gaussians
            const gBase = i * 5;
            g32[gBase + 0] = pack2x16f(x, y);
            g32[gBase + 1] = pack2x16f(z, opacity);
            g32[gBase + 2] = pack2x16f(tmpCov[0], tmpCov[1]); // c00,c01
            g32[gBase + 3] = pack2x16f(tmpCov[2], tmpCov[3]); // c02,c11
            g32[gBase + 4] = pack2x16f(tmpCov[4], tmpCov[5]); // c12,c22
            // Build 16 RGB SH coefficients (degree 3 => 16 coeffs)
            let h = 0;
            halfSeq[h++] = f32tof16(f("f_dc_0"));
            halfSeq[h++] = f32tof16(f("f_dc_1"));
            halfSeq[h++] = f32tof16(f("f_dc_2"));
            for (let c = 1; c < 16; c++) {
                const base = (c - 1) * 3;
                halfSeq[h++] = f32tof16(f(`f_rest_${base + 0}`));
                halfSeq[h++] = f32tof16(f(`f_rest_${base + 1}`));
                halfSeq[h++] = f32tof16(f(`f_rest_${base + 2}`));
            }
            // Pack 48 halfs into 24 u32 (pair consecutive halfs)
            const shBase = i * 24;
            for (let k = 0; k < 24; k++) {
                const a = halfSeq[k * 2 + 0];
                const b = halfSeq[k * 2 + 1];
                sh32[shBase + k] = (b << 16) | a;
            }
        }
        // LIMIT TO 1000 SPLATS FOR COMPARISON
        const limitedPoints = Math.min(n, 1000);
        console.log(`Loaded PLY: ${n} points (limited to ${limitedPoints}), sh_deg=3`);
        // Log first few splat positions for debugging
        if (limitedPoints >= 3) {
            const pos1 = [g32[0] >>> 16, g32[0] & 0xffff, g32[1] >>> 16];
            const pos2 = [g32[5] >>> 16, g32[5] & 0xffff, g32[6] >>> 16];
            const pos3 = [g32[10] >>> 16, g32[10] & 0xffff, g32[11] >>> 16];
            console.log(`First 3 splat positions:`, pos1, pos2, pos3);
        }
        return {
            num_points: limitedPoints,
            sh_deg: 3,
            gaussians,
            sh_coefs: sh_buf,
            compressed: () => false,
            aabb: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
            center: { x: 0, y: 0, z: 0 }
        };
    }
}
function parseHeader(buf) {
    // Scan bytes for "end_header" line, decode only header region
    const u8 = new Uint8Array(buf);
    const needle = new TextEncoder().encode("end_header");
    let pos = -1;
    search: for (let i = 0; i + needle.length <= u8.length && i < 1_000_000; i++) {
        let ok = true;
        for (let j = 0; j < needle.length; j++) {
            if (u8[i + j] !== needle[j]) {
                ok = false;
                break;
            }
        }
        if (ok) {
            pos = i;
            break search;
        }
    }
    if (pos < 0)
        throw new Error("PLY header not found (no end_header within first 1MB)");
    // Advance to end of line (LF) after end_header
    let end = pos;
    while (end < u8.length && u8[end] !== 0x0a)
        end++;
    if (end < u8.length)
        end++; // include LF
    const headerBytes = u8.slice(0, end);
    const text = new TextDecoder().decode(headerBytes);
    const lines = text.split(/\r?\n/);
    if (lines[0]?.trim() !== "ply")
        throw new Error("Missing ply magic");
    let i = 1;
    const header = { format: "", elements: [] };
    let cur = null;
    for (; i < lines.length; i++) {
        const line = lines[i];
        if (line === "end_header") {
            i++;
            break;
        }
        if (!line)
            continue;
        const toks = line.trim().split(/\s+/);
        if (toks[0] === "format") {
            header.format = `${toks[1]} ${toks[2]}`;
        }
        else if (toks[0] === "element") {
            cur = { name: toks[1], count: parseInt(toks[2], 10), properties: [] };
            header.elements.push(cur);
        }
        else if (toks[0] === "property" && cur) {
            const type = toks[1];
            const name = toks[2];
            cur.properties.push({ name, type });
        }
    }
    const headerEnd = end;
    return { header, headerEnd };
}
// ===== Math/helpers =====
function quatToCov6(qx, qy, qz, qw, sx, sy, sz, out) {
    // Rotation from normalized quaternion
    const xx = qx * qx, yy = qy * qy, zz = qz * qz;
    const xy = qx * qy, xz = qx * qz, yz = qy * qz;
    const wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r00 = 1 - 2 * (yy + zz);
    const r01 = 2 * (xy - wz);
    const r02 = 2 * (xz + wy);
    const r10 = 2 * (xy + wz);
    const r11 = 1 - 2 * (xx + zz);
    const r12 = 2 * (yz - wx);
    const r20 = 2 * (xz - wy);
    const r21 = 2 * (yz + wx);
    const r22 = 1 - 2 * (xx + yy);
    const s0 = sx * sx, s1 = sy * sy, s2 = sz * sz;
    // Sigma = R * diag(s^2) * R^T
    const c00 = r00 * r00 * s0 + r01 * r01 * s1 + r02 * r02 * s2;
    const c01 = r00 * r10 * s0 + r01 * r11 * s1 + r02 * r12 * s2;
    const c02 = r00 * r20 * s0 + r01 * r21 * s1 + r02 * r22 * s2;
    const c11 = r10 * r10 * s0 + r11 * r11 * s1 + r12 * r12 * s2;
    const c12 = r10 * r20 * s0 + r11 * r21 * s1 + r12 * r22 * s2;
    const c22 = r20 * r20 * s0 + r21 * r21 * s1 + r22 * r22 * s2;
    out[0] = c00;
    out[1] = c01;
    out[2] = c02;
    out[3] = c11;
    out[4] = c12;
    out[5] = c22;
}
function pack2x16f(a, b) {
    const ha = f32tof16(a);
    const hb = f32tof16(b);
    return (hb << 16) | ha;
}
function f32tof16(val) {
    const f32 = new Float32Array(1);
    const u32 = new Uint32Array(f32.buffer);
    f32[0] = val;
    const x = u32[0];
    const sign = (x >>> 16) & 0x8000;
    let mant = x & 0x7fffff;
    let exp = (x >>> 23) & 0xff;
    if (exp === 0xff)
        return sign | (mant ? 0x7e00 : 0x7c00);
    exp = exp - 127 + 15;
    if (exp >= 0x1f)
        return sign | 0x7c00;
    if (exp <= 0) {
        if (exp < -10)
            return sign;
        mant = (mant | 0x800000) >>> (1 - exp);
        const half = (mant + 0x1000 + ((mant >>> 13) & 1)) >>> 13;
        return sign | half;
    }
    const half = ((exp & 0x1f) << 10) | ((mant + 0x1000 + ((mant >>> 13) & 1)) >>> 13);
    return sign | half;
}
