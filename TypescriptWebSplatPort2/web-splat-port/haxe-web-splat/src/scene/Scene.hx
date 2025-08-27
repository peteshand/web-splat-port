package scene;

class Scene {
  final cameras:Map<Int, SceneCamera>;
  final extend:Float;

  public function new(cameras:Array<SceneCamera>) {
    // compute extent first (max pairwise distance)
    this.extend = calculateMaxDistance([
      for (c in cameras) { x:c.position[0], y:c.position[1], z:c.position[2] }
    ]);

    this.cameras = new Map();
    for (camera in cameras) {
      if (this.cameras.exists(camera.id)) {
        console.warn('Duplicate camera id ${camera.id} in scene (duplicates were removed)');
        continue;
      }
      this.cameras.set(camera.id, camera);
    }
  }

  public static inline function fromCameras(cameras:Array<SceneCamera>):Scene
    return new Scene(cameras);

  public static function fromJson(json:Array<Dynamic>):Scene {
    final cams = new Array<SceneCamera>();
    for (i in 0...json.length) {
      final d = json[i];
      final split = Split.fromIndex(i);
      cams.push(new SceneCamera(
        (d.id != null) ? d.id : i,
        (d.img_name != null) ? d.img_name : 'image_${i}',
        d.width, d.height,
        d.position, // expect [x,y,z]
        d.rotation, // expect 3x3
        d.fx, d.fy,
        split
      ));
    }
    console.log('Loaded scene file with ${cams.length} views');
    return new Scene(cams);
  }

  public function camera(id:Int):Null<SceneCamera> {
    final c = this.cameras.get(id);
    return c != null ? c.clone() : null;
  }

  public inline function numCameras():Int return this.cameras.size();

  public function getCameras(?split:Split):Array<SceneCamera> {
    var arr = [ for (c in this.cameras) c ];
    if (split != null) arr = arr.filter(c -> c.split == split);
    arr = [ for (c in arr) c.clone() ];
    arr.sort(function(a, b) return a.id - b.id);
    return arr;
  }

  public inline function getExtend():Float return this.extend;

  public function nearestCamera(pos:Point3f32, ?split:Split):Null<Int> {
    var minD = Math.POSITIVE_INFINITY;
    var nearest:Null<Int> = null;
    for (c in this.cameras) {
      if (split != null && c.split != split) continue;
      final cp = { x:c.position[0], y:c.position[1], z:c.position[2] };
      final d2 = distance2(pos, cp);
      if (d2 < minD) { minD = d2; nearest = c.id; }
    }
    return nearest;
  }

  inline function distance2(a:Point3f32, b:Point3f32):Float {
    final dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx*dx + dy*dy + dz*dz;
  }

  function calculateMaxDistance(points:Array<Point3f32>):Float {
    var maxD = 0.0;
    for (i in 0...points.length)
      for (j in i+1...points.length)
        maxD = Math.max(maxD, Math.sqrt(distance2(points[i], points[j])));
    return maxD;
  }
}
