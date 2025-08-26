package build;

#if macro
import haxe.macro.Context;
import sys.FileSystem;
import sys.io.File;
using StringTools;

class Build {
  public static function embedAllCss(root:String) {
    addDirCss(root, root.length);
  }

  public static function embedAllJson(root:String) {
    addDirJson(root, root.length);
  }

  static function addDirCss(dir:String, baseLen:Int) {
    for (entry in FileSystem.readDirectory(dir)) {
      var full = dir + "/" + entry;
      if (FileSystem.isDirectory(full)) {
        addDirCss(full, baseLen);
      } else if (StringTools.endsWith(entry, ".css")) {
        var content = File.getContent(full);
        if (content.trim() != "") {
          var rel = full.substr(baseLen + 1);
          Context.addResource(rel, haxe.io.Bytes.ofString(content));
        }
      }
    }
  }

  static function addDirJson(dir:String, baseLen:Int) {
    for (entry in FileSystem.readDirectory(dir)) {
      var full = dir + "/" + entry;
      if (FileSystem.isDirectory(full)) {
        addDirJson(full, baseLen);
      } else if (StringTools.endsWith(entry, ".json")) {
        var content = File.getContent(full);
        if (content.trim() != "") {
          var rel = full.substr(baseLen + 1);
          Context.addResource(rel, haxe.io.Bytes.ofString(content));
        }
      }
    }
  }
}
#end
