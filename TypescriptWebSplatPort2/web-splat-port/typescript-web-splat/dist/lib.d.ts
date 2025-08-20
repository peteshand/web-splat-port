type FullOutput = unknown;
export declare class RenderConfig {
    no_vsync: boolean;
    skybox: string | null;
    hdr: boolean;
    constructor(no_vsync: boolean, skybox?: string | null, hdr?: boolean);
}
export declare class WGPUContext {
    device: GPUDevice;
    queue: GPUQueue;
    adapter: GPUAdapter;
    static new_instance(): Promise<WGPUContext>;
    static new(_instance?: unknown, _surface?: GPUCanvasContext | null): Promise<WGPUContext>;
}
export declare class WindowContext {
    private wgpu_context;
    private surface;
    private config;
    private window;
    private scale_factor;
    private pc;
    private pointcloud_file_path;
    private renderer;
    private animation;
    private controller;
    private scene;
    private scene_file_path;
    private current_view;
    private ui_renderer;
    private fps;
    private ui_visible;
    private display;
    private splatting_args;
    private saved_cameras;
    private stopwatch;
    static new(window: HTMLCanvasElement, pc_file: any, render_config: RenderConfig): Promise<WindowContext>;
    reload(): void;
    resize(new_size: {
        width: number;
        height: number;
    }, scale_factor?: number): void;
    ui(): [boolean, FullOutput];
    update(dt_seconds: number): void;
    render(redraw_scene: boolean, shapes?: FullOutput): void;
    private set_scene;
    private set_env_map;
    private cancle_animation;
    private stop_animation;
    private update_camera;
    private save_view;
}
export declare function smoothstep(x: number): number;
export declare function open_window(file: any, scene_file: any | null, config: RenderConfig, pointcloud_file_path: string | null, scene_file_path: string | null): Promise<void>;
export declare function run_wasm(pc: ArrayBuffer, scene: ArrayBuffer | null, pc_file: string | null, scene_file: string | null): Promise<void>;
export {};
//# sourceMappingURL=lib.d.ts.map