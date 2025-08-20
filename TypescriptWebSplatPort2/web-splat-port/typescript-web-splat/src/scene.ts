// scene.ts
import { mat3, vec2, vec3, quat } from 'gl-matrix';
import { PerspectiveCamera, PerspectiveProjection, focal2fov, fov2focal } from './camera';
import type { Point3f32 } from './pointcloud';

// Define Vector2f32 locally if needed
interface Vector2f32 {
  x: number;
  y: number;
}

export enum Split {
  Train = 'train',
  Test = 'test',
}

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

  static fromPerspective(
    cam: PerspectiveCamera,
    name: string,
    id: number,
    viewport: Vector2f32,
    split: Split
  ): SceneCamera {
    const fx = fov2focal(cam.projection.fovx, viewport.x);
    const fy = fov2focal(cam.projection.fovy, viewport.y);

    const r = mat3.create();
    mat3.fromQuat(r, cam.rotation);

    const rotationArray: [[number, number, number], [number, number, number], [number, number, number]] = [
      [r[0], r[1], r[2]],
      [r[3], r[4], r[5]],
      [r[6], r[7], r[8]],
    ];

    return new SceneCamera(
      id,
      name,
      viewport.x,
      viewport.y,
      [cam.position[0], cam.position[1], cam.position[2]],
      rotationArray,
      fx,
      fy,
      split
    );
  }

  toPerspectiveCamera(): PerspectiveCamera {
    const fovx = focal2fov(this.fx, this.width);
    const fovy = focal2fov(this.fy, this.height);

    const r = mat3.fromValues(
      this.rotation[0][0], this.rotation[0][1], this.rotation[0][2],
      this.rotation[1][0], this.rotation[1][1], this.rotation[1][2],
      this.rotation[2][0], this.rotation[2][1], this.rotation[2][2]
    );

    // Fix handedness if needed
    if (mat3.determinant(r) < 0) {
      r[1] = -r[1];  r[4] = -r[4];  r[7] = -r[7];
    }

    const q = quat.create();
    // gl-matrix provides fromMat3 on quat (undocumented in some builds; if missing, convert via mat4)
    if ((quat as any).fromMat3) {
      (quat as any).fromMat3(q, r);
    } else {
      // Fallback: promote to mat4 then extract quaternion
      const m00 = r[0], m01 = r[1], m02 = r[2];
      const m10 = r[3], m11 = r[4], m12 = r[5];
      const m20 = r[6], m21 = r[7], m22 = r[8];
      const t = m00 + m11 + m22;
      if (t > 0) {
        const s = Math.sqrt(t + 1.0) * 2;
        q[3] = 0.25 * s;
        q[0] = (m21 - m12) / s;
        q[1] = (m02 - m20) / s;
        q[2] = (m10 - m01) / s;
      } else if (m00 > m11 && m00 > m22) {
        const s = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
        q[3] = (m21 - m12) / s;
        q[0] = 0.25 * s;
        q[1] = (m01 + m10) / s;
        q[2] = (m02 + m20) / s;
      } else if (m11 > m22) {
        const s = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
        q[3] = (m02 - m20) / s;
        q[0] = (m01 + m10) / s;
        q[1] = 0.25 * s;
        q[2] = (m12 + m21) / s;
      } else {
        const s = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
        q[3] = (m10 - m01) / s;
        q[0] = (m02 + m20) / s;
        q[1] = (m12 + m21) / s;
        q[2] = 0.25 * s;
      }
    }
    quat.normalize(q, q);

    const pos = vec3.fromValues(this.position[0], this.position[1], this.position[2]);
    const proj = new PerspectiveProjection(fovx, fovy, 0.01, 100.0);

    return new PerspectiveCamera(pos, q, proj);
  }

  hash(): string {
    return JSON.stringify({
      imgName: this.imgName,
      width: this.width,
      height: this.height,
      position: this.position,
      rotation: this.rotation,
      fx: this.fx,
      fy: this.fy,
      split: this.split,
    });
  }

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
        [...this.rotation[2]],
      ] as [[number, number, number], [number, number, number], [number, number, number]],
      this.fx,
      this.fy,
      this.split
    );
  }
}

export class Scene {
  private cameras: Map<number, SceneCamera>;
  private extend: number;

  constructor(cameras: SceneCamera[]) {
    this.extend = this.calculateMaxDistance(
      cameras.map(c => ({ x: c.position[0], y: c.position[1], z: c.position[2] }))
    );
    this.cameras = new Map();
    for (const camera of cameras) {
      if (this.cameras.has(camera.id)) {
        console.warn(`Duplicate camera id ${camera.id} in scene (duplicates were removed)`);
      }
      this.cameras.set(camera.id, camera);
    }
  }

  static fromCameras(cameras: SceneCamera[]): Scene { return new Scene(cameras); }

  static fromJson(jsonData: any[]): Scene {
    const cameras: SceneCamera[] = [];
    for (let i = 0; i < jsonData.length; i++) {
      const d = jsonData[i];
      const split = i % 8 === 0 ? Split.Test : Split.Train; // Kerbl et al.
      cameras.push(new SceneCamera(
        d.id ?? i,
        d.img_name ?? `image_${i}`,
        d.width, d.height,
        d.position,
        d.rotation,
        d.fx, d.fy,
        split
      ));
    }
    console.log(`Loaded scene file with ${cameras.length} views`);
    return new Scene(cameras);
  }

  camera(id: number): SceneCamera | undefined {
    const c = this.cameras.get(id);
    return c ? c.clone() : undefined;
  }

  numCameras(): number { return this.cameras.size; }

  getCameras(split?: Split): SceneCamera[] {
    let cams = Array.from(this.cameras.values());
    if (split !== undefined) cams = cams.filter(c => c.split === split);
    cams = cams.map(c => c.clone());
    cams.sort((a, b) => a.id - b.id);
    return cams;
  }

  getExtend(): number { return this.extend; }

  nearestCamera(pos: Point3f32, split?: Split): number | undefined {
    let minD = Number.POSITIVE_INFINITY;
    let nearest: number | undefined;
    for (const c of this.cameras.values()) {
      if (split !== undefined && c.split !== split) continue;
      const cp = { x: c.position[0], y: c.position[1], z: c.position[2] };
      const d2 = this.distance2(pos, cp);
      if (d2 < minD) { minD = d2; nearest = c.id; }
    }
    return nearest;
  }

  private distance2(a: Point3f32, b: Point3f32): number {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx*dx + dy*dy + dz*dz;
  }

  private calculateMaxDistance(points: Point3f32[]): number {
    let maxD = 0;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        maxD = Math.max(maxD, Math.sqrt(this.distance2(points[i], points[j])));
      }
    }
    return maxD;
  }
}

export class SceneUtils {
  static async loadFromFile(filePath: string): Promise<Scene> {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`Failed to load scene file: ${res.statusText}`);
    const json = await res.json();
    return Scene.fromJson(json);
  }

  static sceneToJson(scene: Scene): any[] {
    return scene.getCameras().map(c => ({
      id: c.id,
      img_name: c.imgName,
      width: c.width,
      height: c.height,
      position: c.position,
      rotation: c.rotation,
      fx: c.fx,
      fy: c.fy,
    }));
  }

  static createTestScene(): Scene {
    const cams: SceneCamera[] = [
      new SceneCamera(0, 'test_0.jpg', 800, 600, [0, 0, 5],
        [[1,0,0],[0,1,0],[0,0,1]], 400, 400, Split.Train),
      new SceneCamera(1, 'test_1.jpg', 800, 600, [3, 0, 4],
        [[0.8,0,0.6],[0,1,0],[-0.6,0,0.8]], 400, 400, Split.Test),
      new SceneCamera(2, 'test_2.jpg', 800, 600, [-3, 0, 4],
        [[0.8,0,-0.6],[0,1,0],[0.6,0,0.8]], 400, 400, Split.Train),
    ];
    return Scene.fromCameras(cams);
  }
}
