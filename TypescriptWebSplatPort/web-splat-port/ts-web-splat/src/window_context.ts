// Skeleton for `WindowContext` responsibilities (render loop, resize, UI hooks)
import { GaussianRenderer, SplattingArgs } from "./renderer";
import { PointCloud } from "./pointcloud";
import { Scene } from "./scene";
import { WGPUContext, RenderConfig } from "./wgpu_context";

export class WindowContext {
  private wgpu_context!: WGPUContext;
  private canvas!: HTMLCanvasElement;
  private ctx!: GPUCanvasContext;
  private config!: GPUCanvasConfiguration | undefined; // modern API uses context.configure()

  private pc!: PointCloud;
  private renderer!: GaussianRenderer;
  private scene: Scene | null = null;
  private splatting_args!: SplattingArgs;

  // Creating some WebGPU types requires async code
  static async new(
    canvas: HTMLCanvasElement,
    pcData: ArrayBuffer,
    render_config: RenderConfig
  ): Promise<WindowContext> {
    const s = new WindowContext();
    s.canvas = canvas;
    s.ctx = canvas.getContext("webgpu") as GPUCanvasContext;
    s.wgpu_context = await WGPUContext.new_instance();
    // TODO: configure canvas, load point cloud, init renderer
    return s;
  }

  async reload(): Promise<void> {
    // TODO
  }

  resize(width: number, height: number, scale_factor?: number): void {
    // TODO: update canvas config and renderer if needed
  }

  ui(): { redraw: boolean; /* shapes: egui FullOutput analog */ shapes?: unknown } {
    // Placeholder for UI integration
    return { redraw: false };
  }

  update(dtMs: number): void {
    // TODO: advance animation/controller; update splatting_args
  }

  async render(redraw_scene: boolean, shapes?: unknown): Promise<void> {
    // TODO: begin command encoder, call renderer
  }

  set_scene(scene: Scene): void {
    this.scene = scene;
  }
}
