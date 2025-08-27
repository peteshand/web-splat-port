package utils;

/**
 * Minimal extern for JS BigUint64Array (timestamp reads).
 * Values are JS BigInt; compare/subtract via js.Syntax.
 */
@:native("BigUint64Array")
extern class BigUint64Array {
  public var length(default, null):Int;
  public function new(buffer:js.lib.ArrayBuffer, ?byteOffset:Int, ?length:Int):Void;

  // Enable a[i]-style access via get(); some Haxe targets prefer explicit get()
  @:arrayAccess public function get(index:Int):Dynamic;
}
