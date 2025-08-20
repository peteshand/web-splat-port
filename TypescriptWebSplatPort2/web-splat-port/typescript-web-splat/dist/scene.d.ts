import { PerspectiveCamera } from './camera.js';
import type { Point3f32 } from './pointcloud.js';
interface Vector2f32 {
    x: number;
    y: number;
}
export declare enum Split {
    Train = "train",
    Test = "test"
}
export declare class SceneCamera {
    id: number;
    imgName: string;
    width: number;
    height: number;
    position: [number, number, number];
    rotation: [[number, number, number], [number, number, number], [number, number, number]];
    fx: number;
    fy: number;
    split: Split;
    constructor(id: number, imgName: string, width: number, height: number, position: [number, number, number], rotation: [[number, number, number], [number, number, number], [number, number, number]], fx: number, fy: number, split?: Split);
    static fromPerspective(cam: PerspectiveCamera, name: string, id: number, viewport: Vector2f32, split: Split): SceneCamera;
    toPerspectiveCamera(): PerspectiveCamera;
    hash(): string;
    clone(): SceneCamera;
}
export declare class Scene {
    private cameras;
    private extend;
    constructor(cameras: SceneCamera[]);
    static fromCameras(cameras: SceneCamera[]): Scene;
    static fromJson(jsonData: any[]): Scene;
    camera(id: number): SceneCamera | undefined;
    numCameras(): number;
    getCameras(split?: Split): SceneCamera[];
    getExtend(): number;
    nearestCamera(pos: Point3f32, split?: Split): number | undefined;
    private distance2;
    private calculateMaxDistance;
}
export declare class SceneUtils {
    static loadFromFile(filePath: string): Promise<Scene>;
    static sceneToJson(scene: Scene): any[];
    static createTestScene(): Scene;
}
export {};
//# sourceMappingURL=scene.d.ts.map