package build;

#if macro
import haxe.macro.Context;
import sys.FileSystem;
import sys.io.File;
using StringTools;

class Build {
  /** Generic entry point: embed all files under `root` whose names end with any of `exts` (e.g. [".css", ".json"]). */
  public static function embedAll(root:String, exts:Array<String>) {
    if (exts == null || exts.length == 0) return;
    // Normalize extensions to lowercase for case-insensitive matching
    final normExts = [for (e in exts) e.toLowerCase()];
    addDirWithExts(root, root.length, normExts);
  }

  /** Convenience: embed all .css files under `root`. */
  public static function embedAllCss(root:String) {
    embedAll(root, [".css"]);
  }

  /** Convenience: embed all .json files under `root`. */
  public static function embedAllJson(root:String) {
    embedAll(root, [".json"]);
  }

  /** Convenience: embed all .wgsl shader files under `root`. */
  public static function embedAllWgsl(root:String) {
    embedAll(root, [".wgsl"]);
  }

  /** Convenience: embed CSS + JSON + WGSL in one go. */
  public static function embedCommonAssets(root:String) {
    embedAll(root, [".css", ".json", ".wgsl"]);
  }

  static function addDirWithExts(dir:String, baseLen:Int, exts:Array<String>) {
    for (entry in FileSystem.readDirectory(dir)) {
      // Skip hidden directories like .git, .DS_Store, etc. (optional)
      if (entry.startsWith(".")) continue;

      final full = dir + "/" + entry;
      if (FileSystem.isDirectory(full)) {
        addDirWithExts(full, baseLen, exts);
      } else {
        final entryLower = entry.toLowerCase();
        if (endsWithAny(entryLower, exts)) {
          final content = File.getContent(full);
          if (content.trim() != "") {
            final rel = full.substr(baseLen + 1);
            Context.addResource(rel, haxe.io.Bytes.ofString(content));
          }
        }
      }
    }
  }

  static function endsWithAny(name:String, exts:Array<String>):Bool {
    for (ext in exts) {
      if (StringTools.endsWith(name, ext)) return true;
    }
    return false;
  }
}
#end
