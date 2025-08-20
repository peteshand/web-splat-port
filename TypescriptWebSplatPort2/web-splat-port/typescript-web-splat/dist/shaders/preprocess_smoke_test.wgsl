// Smoke test shader to write constants to points_2d buffer
// Same group/binding layout as real preprocess shader
@group(1) @binding(2) var<storage, read_write> points_2d: array<u32>;

@compute @workgroup_size(1)
fn preprocess() {
    // Write non-zero constants to first Splat2D (5 u32)
    points_2d[0] = 0x3C003C00u;
    points_2d[1] = 0x3C003C00u;
    points_2d[2] = 0x3C003C00u;
    points_2d[3] = 0x3C003C00u;
    points_2d[4] = 0x3C003C00u;
}
