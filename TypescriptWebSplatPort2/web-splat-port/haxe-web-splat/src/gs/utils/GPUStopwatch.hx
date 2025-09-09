package gs.utils;

import gs.utils.BigUint64Array;

typedef LabelIdx = { label:String, idx:Int };

class GPUStopwatch {
  var query_set:GPUQuerySet;
  var query_buffer:GPUBuffer;
  var query_set_capacity:Int;
  var index:Int;
  var labels:Map<String, Int>;
  var timestamp_period_ns:Float = 1.0;

  public static function _new(device:GPUDevice, ?capacity:Int):GPUStopwatch {
    return new GPUStopwatch(device, capacity);
  }

  public function new(device:GPUDevice, ?capacity:Int) {
    final pairs = Std.int(Math.max(1, capacity != null ? capacity : (8192 >> 1)));
    this.query_set_capacity = pairs * 2;
    this.index = 0;
    this.labels = new Map();

    var qs:GPUQuerySet = null;
    var qb:GPUBuffer = null;
    try {
      qs = device.createQuerySet({
        label: 'time stamp query set',
        type: 'timestamp',
        count: this.query_set_capacity
      });
      qb = device.createBuffer({
        label: 'query set buffer',
        size: this.query_set_capacity * 8, // u64
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      });
    } catch (_:Dynamic) {
      qs = null;
      qb = null;
    }
    this.query_set = qs;
    this.query_buffer = qb;
  }

  inline function labelCount():Int {
    var n = 0;
    for (_ in this.labels.keys()) n++;
    return n;
  }

  public function start(encoder:GPUCommandEncoder, label:String):Void {
    if (this.query_set == null) return;
    if (this.labels.exists(label)) throw 'cannot start measurement for same label twice';
    if (labelCount() * 2 >= this.query_set_capacity) throw 'query set capacity (' + this.query_set_capacity + ')reached';

    this.labels.set(label, this.index);
    js.Syntax.code("(encoder.writeTimestamp && encoder.writeTimestamp({0},{1}))", this.query_set, this.index * 2);
    this.index += 1;
  }

  public function stop(encoder:GPUCommandEncoder, label:String):Void {
    if (this.query_set == null) return;
    final idx = this.labels.get(label);
    if (idx == null) throw 'start was not yet called for label ' + label;
    js.Syntax.code("(encoder.writeTimestamp && encoder.writeTimestamp({0},{1}))", this.query_set, idx * 2 + 1);
  }

  public function end(encoder:GPUCommandEncoder):Void {
    if (this.query_set == null || this.query_buffer == null) return;
    encoder.resolveQuerySet(this.query_set, 0, this.query_set_capacity, this.query_buffer, 0);
    this.index = 0;
  }

  public function reset():Void this.labels.clear();

  /** Promise<Map<label, duration_ms>> */
  public function take_measurements(device:GPUDevice, queue:GPUQueue):Promise<Map<String, Float>> {
    return new Promise((resolve, reject) -> {
      final out = new Map<String, Float>();
      if (this.query_buffer == null) { resolve(out); return; }

      final saved:Array<LabelIdx> = [];
      for (kv in this.labels.keyValueIterator()) saved.push({ label: kv.key, idx: kv.value });
      this.labels.clear();

      final byteSize = this.query_set_capacity * 8;
      final staging = device.createBuffer({
        size: byteSize,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      final enc = device.createCommandEncoder({ label: 'GPUStopwatch readback' });
      enc.copyBufferToBuffer(this.query_buffer, 0, staging, 0, byteSize);
      queue.submit([enc.finish()]);

      final pMap = js.Syntax.code("(async ()=>{await this.staging.mapAsync(GPUMapMode.READ); return true;}).call({staging:staging})");
      (cast pMap : Promise<Bool>).then(_ -> {
        final data:js.lib.ArrayBuffer = staging.getMappedRange();
        final timestamps = new BigUint64Array(data);

        for (pair in saved) {
          final label = pair.label;
          final idx = pair.idx;
          final start:Dynamic = timestamps.get(idx * 2);
          final stop:Dynamic  = timestamps.get(idx * 2 + 1);
          if (js.Syntax.code("({0} > {1})", stop, start)) {
            final diff_ns:Float = js.Syntax.code("Number({0} - {1})", stop, start);
            final ms = diff_ns / 1000000 / this.timestamp_period_ns; // 1e6
            out.set(label, ms);
          }
        }

        staging.unmap();
        staging.destroy();
        resolve(out);
      }, e -> {
        staging.destroy();
        reject(e);
      });
    });
  }
}
