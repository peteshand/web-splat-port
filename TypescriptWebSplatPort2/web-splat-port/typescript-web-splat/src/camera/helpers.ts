import { mat4, mat3, vec3 } from 'gl-matrix';
import { clog } from './internal';

export function world2view(r: mat3, t: vec3): mat4 {
  const world = mat4.create();

  // embed rotation (columns)
  world[0] = r[0]; world[1] = r[1]; world[2]  = r[2];
  world[4] = r[3]; world[5] = r[4]; world[6]  = r[5];
  world[8] = r[6]; world[9] = r[7]; world[10] = r[8];

  // last column is [0,0,0,1]
  world[12] = 0; world[13] = 0; world[14] = 0; world[15] = 1;

  // translation in the bottom row (matches what worked before)
  world[3]  = t[0];
  world[7]  = t[1];
  world[11] = t[2];

  const view = mat4.create();
  mat4.invert(view, world);
  mat4.transpose(view, view);
  return view;
}

export function build_proj(znear: number, zfar: number, fov_x: number, fov_y: number): mat4 {
  const tanHalfY = Math.tan(fov_y * 0.5);
  const tanHalfX = Math.tan(fov_x * 0.5);

  const top = tanHalfY * znear, bottom = -top;
  const right = tanHalfX * znear, left = -right;

  const m = mat4.create();
  // This matches Rust's build_proj() *after* its final transpose().
  m[0]  = (2 * znear) / (right - left);
  m[5]  = (2 * znear) / (top - bottom);
  m[8]  = (right + left) / (right - left);
  m[9]  = (top + bottom) / (top - bottom);
  m[11] = 1;
  m[10] = zfar / (zfar - znear);
  m[14] = -(zfar * znear) / (zfar - znear);
  m[15] = 0;
  return m;
}

export function focal2fov(focal: number, pixels: number): number {
  const out = 2 * Math.atan(pixels / (2 * focal));
  clog('focal2fov()', { focal, pixels, out });
  return out;
}

export function fov2focal(fov: number, pixels: number): number {
  const out = pixels / (2 * Math.tan(fov * 0.5));
  clog('fov2focal()', { fov, pixels, out });
  return out;
}
