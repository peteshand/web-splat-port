package resize;

// Minimal extern for ResizeObserver
@:native("ResizeObserver")
extern class ResizeObserver {
  public function new(cb:Dynamic->Void):Void;
  public function observe(target:js.html.Element):Void;
  public function unobserve(target:js.html.Element):Void;
  public function disconnect():Void;
}