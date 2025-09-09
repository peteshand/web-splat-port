package gs.utils;

/** Simple fixed-size ring buffer */
class RingBuffer<T> {
  var index:Int = 0;
  var size:Int = 0;
  var store:Array<Null<T>>;

  public function new(capacity:Int) {
    this.store = new Array();
    final cap = Std.int(Math.max(1, capacity));
    this.store[cap - 1] = null; // pre-alloc
  }

  public function push(item:T):Void {
    this.store[this.index] = item;
    this.index = (this.index + 1) % this.store.length;
    this.size = Std.int(Math.min(this.size + 1, this.store.length));
  }

  public function to_array():Array<T> {
    final out:Array<T> = [];
    if (this.size == 0) return out;
    final start = (this.index - this.size + this.store.length) % this.store.length;
    for (i in 0...this.size) {
      final v = this.store[(start + i) % this.store.length];
      if (v != null) out.push(v);
    }
    return out;
  }
}
