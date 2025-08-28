package utils;

/** Array helpers as extension methods. */
class ArrayTools {
  /** Returns true iff all elements satisfy `pred`. */
  public static inline function every<T>(self:Array<T>, pred:T->Bool):Bool {
    var ok = true;
    for (item in self) {
      if (!pred(item)) { ok = false; break; }
    }
    return ok;
  }

  /** Returns true iff any element satisfies `pred`. */
  public static inline function some<T>(self:Array<T>, pred:T->Bool):Bool {
    var any = false;
    for (item in self) {
      if (pred(item)) { any = true; break; }
    }
    return any;
  }

  /** Alias of `some` to mirror TS/other APIs. */
  public static inline function exists<T>(self:Array<T>, pred:T->Bool):Bool {
    var any = false;
    for (item in self) {
      if (pred(item)) { any = true; break; }
    }
    return any;
  }
}
