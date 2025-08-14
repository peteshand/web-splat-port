// Mirrors scene.rs
import { PerspectiveCamera, PerspectiveProjection, focal2fov, fov2focal } from "./camera";

export enum Split {
  Train = "train",
  Test = "test",
}

export class SceneCamera {
  constructor(
    public id: number,
    public img_name: string,
    public width: number,
    public height: number,
    public position: [number, number, number],
    public rotation: number[][], // 3x3
    public fx: number,
    public fy: number,
    public split: Split
  ) {}

  static from_perspective(
    cam: PerspectiveCamera,
    name: string,
    id: number,
    viewport: [number, number],
    split: Split
  ): SceneCamera {
    const [vw, vh] = viewport;
    const fx = fov2focal(cam.projection.fovx, vw);
    const fy = fov2focal(cam.projection.fovy, vh);
    // TODO: convert quaternion to 3x3
    return new SceneCamera(id, name, vw, vh, cam.positionVec, [[1,0,0],[0,1,0],[0,0,1]], fx, fy, split);
  }

  into(): PerspectiveCamera {
    // TODO: compute fovx/fovy from fx/fy and width/height
    return new PerspectiveCamera(
      this.position,
      [1, 0, 0, 0],
      new PerspectiveProjection(1, 1, 0.01, 100, 1)
    );
  }
}

export class Scene {
  private camerasMap = new Map<number, SceneCamera>();
  private _extend = 0;

  static from_cameras(cameras: SceneCamera[]): Scene {
    const s = new Scene();
    cameras.forEach((c) => s.camerasMap.set(c.id, c));
    // TODO: compute extend
    return s;
  }

  static async from_json(file: ArrayBuffer): Promise<Scene> {
    const text = new TextDecoder().decode(file);
    const list = JSON.parse(text) as SceneCamera[];
    // TODO: assign split 7/8 rule
    return Scene.from_cameras(list);
  }

  camera(i: number): SceneCamera | undefined { return this.camerasMap.get(i); }
  num_cameras(): number { return this.camerasMap.size; }
  cameras(split?: Split): SceneCamera[] {
    const arr = Array.from(this.camerasMap.values());
    return split ? arr.filter((c) => c.split === split) : arr;
  }
  extend(): number { return this._extend; }
  nearest_camera(_pos: [number, number, number], _split?: Split): number | undefined {
    // TODO
    return undefined;
  }
}
