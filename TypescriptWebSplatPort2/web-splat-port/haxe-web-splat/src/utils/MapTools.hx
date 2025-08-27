package utils;

import haxe.ds.Map;

class MapTools {
  // Count entries in a generic Map<K,V>
  public static inline function size<K,V>(m:Map<K,V>):Int {
    var n = 0;
    // Fast and works across targets
    for (_ in m) n++;
    return n;
  }

  // Handy extra
  public static inline function isEmpty<K,V>(m:Map<K,V>):Bool {
    return !m.keys().hasNext();
  }
}
