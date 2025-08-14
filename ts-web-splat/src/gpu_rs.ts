// Mirrors gpu_rs.rs (skeleton for GPU radix sort)
export class GPURSSorter {
  static async new(_device: GPUDevice, _queue: GPUQueue): Promise<GPURSSorter> {
    return new GPURSSorter();
  }
  create_sort_stuff(/* device: GPUDevice, num_points: number */): PointCloudSortStuff {
    return new PointCloudSortStuff();
  }
}

export class PointCloudSortStuff {
  constructor() {}
}
