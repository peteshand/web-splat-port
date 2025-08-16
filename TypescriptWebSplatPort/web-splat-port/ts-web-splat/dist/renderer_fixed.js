import { GPURSSorter } from './gpu_rs.js';
import { UniformBuffer } from './uniform.js';
export class GaussianRenderer {
    device;
    queue;
    pipeline;
    camera;
    renderSettings;
    drawIndirectBuffer;
    bindGroup0;
    bindGroup1;
    sorter;
    sortPlan;
    sortEnabled = true;
    constructor(device, queue, colorFormat) {
        this.device = device;
        this.queue = queue;
        // Initialize uniform buffers
        this.camera = new UniformBuffer(device, {
            viewMatrix: new Float32Array(16),
            projMatrix: new Float32Array(16),
            viewport: new Float32Array(2),
            focal: new Float32Array(2)
        }, "camera uniform buffer");
        this.renderSettings = new UniformBuffer(device, {
            gaussianScaling: 1.0,
            maxShDeg: 3,
            showEnvMap: false
        }, "render settings uniform buffer");
    }
    static async new(device, queue, colorFormat, shDeg, compressed) {
        const renderer = new GaussianRenderer(device, queue, colorFormat);
        // Initialize GPU resources
        renderer.sorter = await GPURSSorter.new(device, queue);
        // Create draw indirect buffer
        renderer.drawIndirectBuffer = device.createBuffer({
            size: 16, // 4 u32s for DrawIndirectArgs
            usage: GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
        });
        // Initialize with default draw args
        const defaultArgs = new Uint32Array([4, 1000, 0, 0]); // 4 vertices per splat, 1000 splats
        queue.writeBuffer(renderer.drawIndirectBuffer, 0, defaultArgs);
        return renderer;
    }
    updateUniformsFromCamera(camera, viewport) {
        const cameraData = this.camera.getData();
        // Update camera matrices
        const viewMatrix = camera.viewMatrix();
        const projMatrix = camera.projMatrix();
        cameraData.viewMatrix.set(viewMatrix);
        cameraData.projMatrix.set(projMatrix);
        if (viewport) {
            cameraData.viewport[0] = viewport[0];
            cameraData.viewport[1] = viewport[1];
        }
        // Update focal length
        cameraData.focal[0] = camera.fx();
        cameraData.focal[1] = camera.fy();
        this.camera.sync(this.queue);
    }
    encodePreprocessAndSort(pc, camera, viewport) {
        // Update camera uniforms
        this.updateUniformsFromCamera(camera, viewport);
        const encoder = this.device.createCommandEncoder();
        // Create basic bind groups for rendering
        if (!this.bindGroup0 && pc.renderBindGroup) {
            this.bindGroup0 = pc.renderBindGroup();
        }
        if (!this.bindGroup1 && pc.indicesBuffer) {
            const layout = this.device.createBindGroupLayout({
                entries: [{
                        binding: 4,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: "read-only-storage" },
                    }],
            });
            this.bindGroup1 = this.device.createBindGroup({
                layout,
                entries: [{ binding: 4, resource: { buffer: pc.indicesBuffer } }],
            });
        }
        return encoder;
    }
    render(pass, pc) {
        if (!this.pipeline || !this.bindGroup0 || !this.bindGroup1) {
            console.warn("Renderer not fully initialized");
            return;
        }
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bindGroup0);
        pass.setBindGroup(1, this.bindGroup1);
        // Use drawIndirect for consistent rendering
        if (this.drawIndirectBuffer) {
            pass.drawIndirect(this.drawIndirectBuffer, 0);
        }
        else {
            // Emergency fallback
            pass.draw(4, Math.min(pc.numPoints, 1000), 0, 0);
        }
    }
}
