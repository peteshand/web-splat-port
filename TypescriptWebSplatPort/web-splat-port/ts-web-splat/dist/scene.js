// Mirrors scene.rs
import { PerspectiveCamera, PerspectiveProjection, focal2fov, fov2focal } from "./camera.js";
import { mat3, quat } from "gl-matrix";
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
        // Convert quaternion to 3x3 rotation matrix
        const q = quat.fromValues(cam.rotationQuat[0], cam.rotationQuat[1], cam.rotationQuat[2], cam.rotationQuat[3]);
        quat.normalize(q, q);
        const R = mat3.create();
        mat3.fromQuat(R, q);
        // mat3 is column-major; build row-major 3x3 for JSON
        const rot = [
            [R[0], R[3], R[6]],
            [R[1], R[4], R[7]],
            [R[2], R[5], R[8]],
        ];
        return new SceneCamera(id, name, vw, vh, cam.positionVec, rot, fx, fy, split);
    }
    into() {
        // Compute fovx/fovy from fx/fy and width/height
        const fovx = focal2fov(this.fx, Math.max(1, this.width));
        const fovy = focal2fov(this.fy, Math.max(1, this.height));
        // Convert 3x3 rotation matrix to quaternion
        const R = mat3.fromValues(this.rotation[0][0], this.rotation[1][0], this.rotation[2][0], this.rotation[0][1], this.rotation[1][1], this.rotation[2][1], this.rotation[0][2], this.rotation[1][2], this.rotation[2][2]);
        const q = quat.create();
        quat.fromMat3(q, R);
        quat.normalize(q, q);
        const proj = new PerspectiveProjection(fovx, fovy, 0.01, 100.0, 1.0);
        return new PerspectiveCamera(this.position, [q[0], q[1], q[2], q[3]], proj);
    }
}
export class Scene {
    camerasMap = new Map();
    _extend = 0;
    static from_cameras(cameras) {
        const s = new Scene();
        cameras.forEach((c) => s.camerasMap.set(c.id, c));
        // Compute extend as max distance from centroid of camera positions
        if (cameras.length > 0) {
            let cx = 0, cy = 0, cz = 0;
            for (const c of cameras) {
                cx += c.position[0];
                cy += c.position[1];
                cz += c.position[2];
            }
            cx /= cameras.length;
            cy /= cameras.length;
            cz /= cameras.length;
            let maxd = 0;
            for (const c of cameras) {
                const dx = c.position[0] - cx, dy = c.position[1] - cy, dz = c.position[2] - cz;
                const d = Math.hypot(dx, dy, dz);
                if (d > maxd)
                    maxd = d;
            }
            s._extend = maxd;
        }
        return s;
    }
    static async from_json(file) {
        const text = new TextDecoder().decode(file);
        const list = JSON.parse(text);
        // Assign split 7/8 rule if missing
        const n = list.length;
        for (let i = 0; i < n; i++) {
            const c = list[i];
            if (!c.split)
                c.split = i < Math.floor(0.875 * n) ? Split.Train : Split.Test;
        }
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
        const cams = this.cameras(_split);
        if (cams.length === 0)
            return undefined;
        let bestId;
        let bestD = Infinity;
        for (const c of cams) {
            const dx = c.position[0] - _pos[0];
            const dy = c.position[1] - _pos[1];
            const dz = c.position[2] - _pos[2];
            const d = dx * dx + dy * dy + dz * dz;
            if (d < bestD) {
                bestD = d;
                bestId = c.id;
            }
        }
        return bestId;
    }
}
