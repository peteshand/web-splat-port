// Mirrors scene.rs
import { PerspectiveCamera, PerspectiveProjection, fov2focal } from "./camera";
export var Split;
(function (Split) {
    Split["Train"] = "train";
    Split["Test"] = "test";
})(Split || (Split = {}));
export class SceneCamera {
    id;
    img_name;
    width;
    height;
    position;
    rotation;
    fx;
    fy;
    split;
    constructor(id, img_name, width, height, position, rotation, // 3x3
    fx, fy, split) {
        this.id = id;
        this.img_name = img_name;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;
        this.fx = fx;
        this.fy = fy;
        this.split = split;
    }
    static from_perspective(cam, name, id, viewport, split) {
        const [vw, vh] = viewport;
        const fx = fov2focal(cam.projection.fovx, vw);
        const fy = fov2focal(cam.projection.fovy, vh);
        // TODO: convert quaternion to 3x3
        return new SceneCamera(id, name, vw, vh, cam.positionVec, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], fx, fy, split);
    }
    into() {
        // TODO: compute fovx/fovy from fx/fy and width/height
        return new PerspectiveCamera(this.position, [1, 0, 0, 0], new PerspectiveProjection(1, 1, 0.01, 100, 1));
    }
}
export class Scene {
    camerasMap = new Map();
    _extend = 0;
    static from_cameras(cameras) {
        const s = new Scene();
        cameras.forEach((c) => s.camerasMap.set(c.id, c));
        // TODO: compute extend
        return s;
    }
    static async from_json(file) {
        const text = new TextDecoder().decode(file);
        const list = JSON.parse(text);
        // TODO: assign split 7/8 rule
        return Scene.from_cameras(list);
    }
    camera(i) { return this.camerasMap.get(i); }
    num_cameras() { return this.camerasMap.size; }
    cameras(split) {
        const arr = Array.from(this.camerasMap.values());
        return split ? arr.filter((c) => c.split === split) : arr;
    }
    extend() { return this._extend; }
    nearest_camera(_pos, _split) {
        // TODO
        return undefined;
    }
}
