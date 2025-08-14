export class PointCloud {
    num_points;
    sh_deg;
    constructor(num_points, sh_deg) {
        this.num_points = num_points;
        this.sh_deg = sh_deg;
    }
    static async new(device, pc) {
        // TODO: create buffers and bind groups
        return new PointCloud(pc.num_points, pc.sh_deg);
    }
    compressed() { return false; }
    bbox() { return { min: [0, 0, 0], max: [0, 0, 0] }; }
    center() { return [0, 0, 0]; }
    up() { return undefined; }
}
