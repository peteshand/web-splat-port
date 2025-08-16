import { PerspectiveCamera } from './camera.js';
import { Point3f32 } from './pointcloud.js';
interface Vector2f32 {
    x: number;
    y: number;
}
/**
 * Split enum for training/test data
 */
export declare enum Split {
    Train = "train",
    Test = "test"
}
/**
 * Scene camera representation
 */
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
    /**
     * Create SceneCamera from PerspectiveCamera
     */
    static fromPerspective(cam: PerspectiveCamera, name: string, id: number, viewport: Vector2f32, split: Split): SceneCamera;
    /**
     * Convert to PerspectiveCamera
     */
    toPerspectiveCamera(): PerspectiveCamera;
    /**
     * Generate hash for the camera (simplified version)
     */
    hash(): string;
    /**
     * Clone the camera
     */
    clone(): SceneCamera;
}
/**
 * Scene containing multiple cameras
 */
export declare class Scene {
    private cameras;
    private extend;
    constructor(cameras: SceneCamera[]);
    /**
     * Create scene from cameras array
     */
    static fromCameras(cameras: SceneCamera[]): Scene;
    /**
     * Load scene from JSON data
     */
    static fromJson(jsonData: any[]): Scene;
    /**
     * Get camera by ID
     */
    camera(id: number): SceneCamera | undefined;
    /**
     * Get number of cameras
     */
    numCameras(): number;
    /**
     * Get cameras filtered by split
     */
    getCameras(split?: Split): SceneCamera[];
    /**
     * Get scene extend (maximum distance between cameras)
     */
    getExtend(): number;
    /**
     * Find nearest camera to given position
     */
    nearestCamera(pos: Point3f32, split?: Split): number | undefined;
    /**
     * Calculate squared distance between two points
     */
    private distance2;
    /**
     * Calculate maximum distance between any two points (naive O(n^2) implementation)
     */
    private calculateMaxDistance;
}
/**
 * Utility functions for scene management
 */
export declare class SceneUtils {
    /**
     * Load scene from JSON file
     */
    static loadFromFile(filePath: string): Promise<Scene>;
    /**
     * Save scene to JSON format
     */
    static sceneToJson(scene: Scene): any[];
    /**
     * Create a simple test scene with a few cameras
     */
    static createTestScene(): Scene;
}
export {};
//# sourceMappingURL=scene.d.ts.map