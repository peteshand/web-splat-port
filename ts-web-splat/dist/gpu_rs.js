// Mirrors gpu_rs.rs (skeleton for GPU radix sort)
export class GPURSSorter {
    static async new(_device, _queue) {
        return new GPURSSorter();
    }
    create_sort_stuff( /* device: GPUDevice, num_points: number */) {
        return new PointCloudSortStuff();
    }
}
export class PointCloudSortStuff {
    constructor() { }
}
