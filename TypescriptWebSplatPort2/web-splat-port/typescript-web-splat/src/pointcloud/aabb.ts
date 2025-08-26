import type { Vec3 } from './types';

export class Aabb {
  min: Vec3;
  max: Vec3;

  constructor(min: Vec3, max: Vec3) {
    this.min = { ...min };
    this.max = { ...max };
  }

  static unit(): Aabb {
    return new Aabb({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 });
  }

  static zeroed(): Aabb {
    return new Aabb({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  }

  center(): Vec3 {
    return {
      x: (this.min.x + this.max.x) * 0.5,
      y: (this.min.y + this.max.y) * 0.5,
      z: (this.min.z + this.max.z) * 0.5,
    };
  }

  radius(): number {
    const dx = this.max.x - this.min.x;
    const dy = this.max.y - this.min.y;
    const dz = this.max.z - this.min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
  }

  size(): Vec3 {
    return {
      x: this.max.x - this.min.x,
      y: this.max.y - this.min.y,
      z: this.max.z - this.min.z,
    };
  }

  grow(pos: Vec3): void {
    this.min.x = Math.min(this.min.x, pos.x);
    this.min.y = Math.min(this.min.y, pos.y);
    this.min.z = Math.min(this.min.z, pos.z);
    this.max.x = Math.max(this.max.x, pos.x);
    this.max.y = Math.max(this.max.y, pos.y);
    this.max.z = Math.max(this.max.z, pos.z);
  }

  grow_union(other: Aabb): void {
    this.min.x = Math.min(this.min.x, other.min.x);
    this.min.y = Math.min(this.min.y, other.min.y);
    this.min.z = Math.min(this.min.z, other.min.z);
    this.max.x = Math.max(this.max.x, other.max.x);
    this.max.y = Math.max(this.max.y, other.max.y);
    this.max.z = Math.max(this.max.z, other.max.z);
  }
}
