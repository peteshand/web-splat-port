import { mat4, vec3, quat } from 'gl-matrix';
import type { Aabb } from '../pointcloud';
import { PerspectiveProjection } from './PerspectiveProjection';
import { clog } from './internal';
import type { Camera, FrustumPlanes } from './types';

export class PerspectiveCamera implements Camera {
  position: vec3;
  rotation: quat;
  projection: PerspectiveProjection;

  constructor(position: vec3, rotation: quat, projection: PerspectiveProjection) {
    this.position = vec3.clone(position);
    this.rotation = quat.clone(rotation);
    this.projection = projection;
    clog('PerspectiveCamera.ctor', { position: Array.from(this.position), rotation: Array.from(this.rotation) });
  }

  static default(): PerspectiveCamera {
    clog('PerspectiveCamera.default()');
    return new PerspectiveCamera(
      vec3.fromValues(0, 0, -1),
      quat.create(),
      new PerspectiveProjection(
        (45 * Math.PI) / 180,
        (45 * Math.PI) / 180,
        0.1,
        100,
        1
      )
    );
  }

  fit_near_far(aabb: Aabb): void {
    const c = aabb.center();
    const r = aabb.radius();
    const d = Math.hypot(
      this.position[0] - c.x,
      this.position[1] - c.y,
      this.position[2] - c.z
    );
    const zfar = d + r;
    const znear = Math.max(d - r, zfar / 1000.0);
    this.projection.zfar = zfar;
    this.projection.znear = znear;
  }

  viewMatrix(): mat4 {
    const world = mat4.create();
    mat4.fromRotationTranslation(world, this.rotation, this.position);
    const view = mat4.create();
    mat4.invert(view, world);
    return view;
  }
  view_matrix(): mat4 { return this.viewMatrix(); }

  projMatrix(): mat4 {
    const m = this.projection.projectionMatrix();
    clog('PerspectiveCamera.projMatrix()');
    return m;
  }
  proj_matrix(): mat4 { return this.projMatrix(); }

  positionVec(): vec3 { return vec3.clone(this.position); }

  frustum_planes(): FrustumPlanes {
    const p = this.projMatrix();
    const v = this.viewMatrix();
    const pv = mat4.create();
    mat4.multiply(pv, p, v);

    const row = (r: number): [number, number, number, number] => [
      pv[0 + r], pv[4 + r], pv[8 + r], pv[12 + r]
    ];

    const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3);

    const add = (a: number[], b: number[]) => ([
      a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]
    ] as [number, number, number, number]);
    const sub = (a: number[], b: number[]) => ([
      a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]
    ] as [number, number, number, number]);

    const normalize = (p: [number, number, number, number]) => {
      const n = Math.hypot(p[0], p[1], p[2]);
      return (n > 0) ? ([p[0] / n, p[1] / n, p[2] / n, p[3] / n] as [number, number, number, number]) : p;
    };

    const left   = normalize(add(r3, r0));
    const right  = normalize(sub(r3, r0));
    const bottom = normalize(add(r3, r1));
    const top    = normalize(sub(r3, r1));
    const near   = normalize(add(r3, r2));
    const far    = normalize(sub(r3, r2));

    clog('PerspectiveCamera.frustum_planes() computed');
    return { near, far, left, right, top, bottom };
  }

  lerp(other: PerspectiveCamera, amount: number): PerspectiveCamera {
    const outPos = vec3.create();
    vec3.lerp(outPos, this.position, other.position, amount);
    const outRot = quat.create();
    quat.slerp(outRot, this.rotation, other.rotation, amount);
    const proj = this.projection.lerp(other.projection, amount);
    const out = new PerspectiveCamera(outPos, outRot, proj);
    clog('PerspectiveCamera.lerp()', { amount, fromPos: Array.from(this.position), toPos: Array.from(other.position) });
    return out;
  }
}
