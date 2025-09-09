package gs.scene;

import js.lib.Promise;
import haxe.Json;

class SceneUtils {
  /** Browser/JS target: load a JSON array and build a Scene. */
  public static function loadFromFile(filePath:String):Promise<Scene> {
    // Use the global fetch from the JS target.
    return untyped __js__("fetch")(filePath)
      .then(function(res:Dynamic) {
        if (!res.ok) throw new js.lib.Error('Failed to load scene file: ' + res.statusText);
        return res.json();
      })
      .then(function(json:Dynamic) {
        final arr:Array<Dynamic> = cast json;
        return Scene.fromJson(arr);
      });
  }

  public static function sceneToJson(scene:Scene):Array<Dynamic> {
    return scene.getCameras().map(function(c) return {
      id: c.id,
      img_name: c.imgName,
      width: c.width, height: c.height,
      position: c.position,
      rotation: c.rotation,
      fx: c.fx, fy: c.fy,
      split: c.split
    });
  }

  public static function createTestScene():Scene {
    final cams = [
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
