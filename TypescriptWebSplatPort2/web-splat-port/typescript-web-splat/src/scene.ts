import { mat3, vec2 } from 'gl-matrix';
import { PerspectiveCamera, PerspectiveProjection, focal2fov, fov2focal } from './camera.js';
import { Point3f32 } from './pointcloud.js';

// Define Vector2f32 locally since it's not exported from pointcloud
interface Vector2f32 {
    x: number;
    y: number;
}

/**
 * Split enum for training/test data
 */
export enum Split {
    Train = 'train',
    Test = 'test'
}

/**
 * Scene camera representation
 */
export class SceneCamera {
    public id: number;
    public imgName: string;
    public width: number;
    public height: number;
    public position: [number, number, number];
    public rotation: [[number, number, number], [number, number, number], [number, number, number]];
    public fx: number;
    public fy: number;
    public split: Split;

    constructor(
        id: number,
        imgName: string,
        width: number,
        height: number,
        position: [number, number, number],
        rotation: [[number, number, number], [number, number, number], [number, number, number]],
        fx: number,
        fy: number,
        split: Split = Split.Train
    ) {
        this.id = id;
        this.imgName = imgName;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;
        this.fx = fx;
        this.fy = fy;
        this.split = split;
    }

    /**
     * Create SceneCamera from PerspectiveCamera
     */
    static fromPerspective(
        cam: PerspectiveCamera,
        name: string,
        id: number,
        viewport: Vector2f32,
        split: Split
    ): SceneCamera {
        const fx = fov2focal(cam.projection.fovx, viewport.x);
        const fy = fov2focal(cam.projection.fovy, viewport.y);
        
        // Convert quaternion to rotation matrix
        const rot = mat3.create();
        mat3.fromQuat(rot, cam.rotation);
        
        const rotationArray: [[number, number, number], [number, number, number], [number, number, number]] = [
            [rot[0], rot[1], rot[2]],
            [rot[3], rot[4], rot[5]],
            [rot[6], rot[7], rot[8]]
        ];

        return new SceneCamera(
            id,
            name,
            viewport.x,
            viewport.y,
            [cam.position.x, cam.position.y, cam.position.z],
            rotationArray,
            fx,
            fy,
            split
        );
    }

    /**
     * Convert to PerspectiveCamera
     */
    toPerspectiveCamera(): PerspectiveCamera {
        const fovx = focal2fov(this.fx, this.width);
        const fovy = focal2fov(this.fy, this.height);
        
        // Create rotation matrix from array
        const rot = mat3.fromValues(
            this.rotation[0][0], this.rotation[0][1], this.rotation[0][2],
            this.rotation[1][0], this.rotation[1][1], this.rotation[1][2],
            this.rotation[2][0], this.rotation[2][1], this.rotation[2][2]
        );
        
        // Check determinant and fix if needed
        if (mat3.determinant(rot) < 0) {
            // Flip y axis if determinant is -1
            rot[1] = -rot[1];
            rot[4] = -rot[4];
            rot[7] = -rot[7];
        }
        
        // Convert rotation matrix to quaternion
        const rotation = mat3.create();
        mat3.copy(rotation, rot);
        
        const position: Point3f32 = {
            x: this.position[0],
            y: this.position[1],
            z: this.position[2]
        };
        
        const projection = new PerspectiveProjection(
            fovx,
            fovy,
            0.01,
            100.0
        );
        
        return new PerspectiveCamera(position, rotation, projection);
    }

    /**
     * Generate hash for the camera (simplified version)
     */
    hash(): string {
        return JSON.stringify({
            imgName: this.imgName,
            width: this.width,
            height: this.height,
            position: this.position,
            rotation: this.rotation,
            fx: this.fx,
            fy: this.fy,
            split: this.split
        });
    }

    /**
     * Clone the camera
     */
    clone(): SceneCamera {
        return new SceneCamera(
            this.id,
            this.imgName,
            this.width,
            this.height,
            [...this.position],
            [
                [...this.rotation[0]],
                [...this.rotation[1]],
                [...this.rotation[2]]
            ] as [[number, number, number], [number, number, number], [number, number, number]],
            this.fx,
            this.fy,
            this.split
        );
    }
}

/**
 * Scene containing multiple cameras
 */
export class Scene {
    private cameras: Map<number, SceneCamera>;
    private extend: number;

    constructor(cameras: SceneCamera[]) {
        this.extend = this.calculateMaxDistance(cameras.map(c => ({
            x: c.position[0],
            y: c.position[1],
            z: c.position[2]
        })));
        
        this.cameras = new Map();
        for (const camera of cameras) {
            if (this.cameras.has(camera.id)) {
                console.warn(`Duplicate camera id ${camera.id} in scene (duplicates were removed)`);
            }
            this.cameras.set(camera.id, camera);
        }
    }

    /**
     * Create scene from cameras array
     */
    static fromCameras(cameras: SceneCamera[]): Scene {
        return new Scene(cameras);
    }

    /**
     * Load scene from JSON data
     */
    static fromJson(jsonData: any[]): Scene {
        const cameras: SceneCamera[] = [];
        
        for (let i = 0; i < jsonData.length; i++) {
            const data = jsonData[i];
            
            // According to Kerbl et al "3D Gaussian Splatting for Real-Time Radiance Field Rendering"
            // 7 out of 8 cameras are taken as training images
            const split = i % 8 === 0 ? Split.Test : Split.Train;
            
            const camera = new SceneCamera(
                data.id || i,
                data.img_name || `image_${i}`,
                data.width,
                data.height,
                data.position,
                data.rotation,
                data.fx,
                data.fy,
                split
            );
            
            cameras.push(camera);
        }
        
        console.log(`Loaded scene file with ${cameras.length} views`);
        return new Scene(cameras);
    }

    /**
     * Get camera by ID
     */
    camera(id: number): SceneCamera | undefined {
        const camera = this.cameras.get(id);
        return camera ? camera.clone() : undefined;
    }

    /**
     * Get number of cameras
     */
    numCameras(): number {
        return this.cameras.size;
    }

    /**
     * Get cameras filtered by split
     */
    getCameras(split?: Split): SceneCamera[] {
        let cameras: SceneCamera[];
        
        if (split !== undefined) {
            cameras = Array.from(this.cameras.values())
                .filter(c => c.split === split)
                .map(c => c.clone());
        } else {
            cameras = Array.from(this.cameras.values())
                .map(c => c.clone());
        }
        
        // Sort by ID
        cameras.sort((a, b) => a.id - b.id);
        return cameras;
    }

    /**
     * Get scene extend (maximum distance between cameras)
     */
    getExtend(): number {
        return this.extend;
    }

    /**
     * Find nearest camera to given position
     */
    nearestCamera(pos: Point3f32, split?: Split): number | undefined {
        let minDistance = Number.POSITIVE_INFINITY;
        let nearestId: number | undefined;
        
        for (const camera of this.cameras.values()) {
            // Filter by split if specified
            if (split !== undefined && camera.split !== split) {
                continue;
            }
            
            const cameraPos = {
                x: camera.position[0],
                y: camera.position[1],
                z: camera.position[2]
            };
            
            const distance = this.distance2(pos, cameraPos);
            if (distance < minDistance) {
                minDistance = distance;
                nearestId = camera.id;
            }
        }
        
        return nearestId;
    }

    /**
     * Calculate squared distance between two points
     */
    private distance2(a: Point3f32, b: Point3f32): number {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * Calculate maximum distance between any two points (naive O(n^2) implementation)
     */
    private calculateMaxDistance(points: Point3f32[]): number {
        let maxDistance = 0;
        
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const distance = Math.sqrt(this.distance2(points[i], points[j]));
                maxDistance = Math.max(maxDistance, distance);
            }
        }
        
        return maxDistance;
    }
}

/**
 * Utility functions for scene management
 */
export class SceneUtils {
    /**
     * Load scene from JSON file
     */
    static async loadFromFile(filePath: string): Promise<Scene> {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load scene file: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        return Scene.fromJson(jsonData);
    }

    /**
     * Save scene to JSON format
     */
    static sceneToJson(scene: Scene): any[] {
        const cameras = scene.getCameras();
        return cameras.map(camera => ({
            id: camera.id,
            img_name: camera.imgName,
            width: camera.width,
            height: camera.height,
            position: camera.position,
            rotation: camera.rotation,
            fx: camera.fx,
            fy: camera.fy
        }));
    }

    /**
     * Create a simple test scene with a few cameras
     */
    static createTestScene(): Scene {
        const cameras: SceneCamera[] = [
            new SceneCamera(
                0,
                'test_0.jpg',
                800,
                600,
                [0, 0, 5],
                [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                400,
                400,
                Split.Train
            ),
            new SceneCamera(
                1,
                'test_1.jpg',
                800,
                600,
                [3, 0, 4],
                [[0.8, 0, 0.6], [0, 1, 0], [-0.6, 0, 0.8]],
                400,
                400,
                Split.Test
            ),
            new SceneCamera(
                2,
                'test_2.jpg',
                800,
                600,
                [-3, 0, 4],
                [[0.8, 0, -0.6], [0, 1, 0], [0.6, 0, 0.8]],
                400,
                400,
                Split.Train
            )
        ];
        
        return Scene.fromCameras(cameras);
    }
}
