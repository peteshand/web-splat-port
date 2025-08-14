export class GaussianRenderer {
    constructor( /* device: GPUDevice, queue: GPUQueue, colorFormat: GPUTextureFormat, sh_deg: number, compressed: boolean */) { }
    static async new(_device, _queue, _color_format, _sh_deg, _compressed) {
        // TODO: create pipeline, bind groups, etc. Load WGSL from src-rust path.
        return new GaussianRenderer();
    }
    preprocess( /* encoder: GPUCommandEncoder, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */) {
        // TODO
    }
    prepare( /* encoder: GPUCommandEncoder, device: GPUDevice, queue: GPUQueue, pc: PointCloud, render_settings: SplattingArgs */) {
        // TODO
    }
    render( /* pass: GPURenderPassEncoder, pc: PointCloud */) {
        // TODO
    }
}
