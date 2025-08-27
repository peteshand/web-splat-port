package pointcloud;

class Aabb {
  public var min:Types.Vec3;
  public var max:Types.Vec3;

  public function new(min:Types.Vec3, max:Types.Vec3) {
    this.min = { x: min.x, y: min.y, z: min.z };
    this.max = { x: max.x, y: max.y, z: max.z };
  }

  public static function unit():Aabb {
    return new Aabb({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 });
  }

  public static function zeroed():Aabb {
    return new Aabb({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  }

  public function center():Types.Vec3 {
    return {
      x: 0.5 * (min.x + max.x),
      y: 0.5 * (min.y + max.y),
      z: 0.5 * (min.z + max.z)
    };
  }

  public function radius():Float {
    var dx = max.x - min.x;
    var dy = max.y - min.y;
    var dz = max.z - min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
  }

  public function size():Types.Vec3 {
    return { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z };
  }

  public function grow(pos:Types.Vec3) {
    min.x = Math.min(min.x, pos.x);
    min.y = Math.min(min.y, pos.y);
    min.z = Math.min(min.z, pos.z);
    max.x = Math.max(max.x, pos.x);
    max.y = Math.max(max.y, pos.y);
    max.z = Math.max(max.z, pos.z);
  }

  public function grow_union(other:Aabb) {
    min.x = Math.min(min.x, other.min.x);
    min.y = Math.min(min.y, other.min.y);
    min.z = Math.min(min.z, other.min.z);
    max.x = Math.max(max.x, other.max.x);
    max.y = Math.max(max.y, other.max.y);
    max.z = Math.max(max.z, other.max.z);
  }
}
