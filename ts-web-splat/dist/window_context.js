import { WGPUContext } from "./wgpu_context";
export class WindowContext {
    wgpu_context;
    canvas;
    ctx;
    config; // modern API uses context.configure()
    pc;
    renderer;
    scene = null;
    splatting_args;
    // Creating some WebGPU types requires async code
    static async new(canvas, pcData, render_config) {
        const s = new WindowContext();
        s.canvas = canvas;
        s.ctx = canvas.getContext("webgpu");
        s.wgpu_context = await WGPUContext.new_instance();
        // TODO: configure canvas, load point cloud, init renderer
        return s;
    }
    async reload() {
        // TODO
    }
    resize(width, height, scale_factor) {
        // TODO: update canvas config and renderer if needed
    }
    ui() {
        // Placeholder for UI integration
        return { redraw: false };
    }
    update(dtMs) {
        // TODO: advance animation/controller; update splatting_args
    }
    async render(redraw_scene, shapes) {
        // TODO: begin command encoder, call renderer
    }
    set_scene(scene) {
        this.scene = scene;
    }
}
