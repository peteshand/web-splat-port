package loader;

import js.Browser;
import js.html.Response;
import js.html.CustomEvent;
import js.html.EventTarget;

/* ------------------- ReadableStream externs (scoped here) ------------------ */
@:native("ReadableStream")
extern class ReadableStream<T> {
  public var locked(default, null):Bool;
  public function new(?underlyingSource:ReadableStreamUnderlyingSource<T>, ?strategy:Dynamic):Void;
  public function getReader():ReadableStreamDefaultReader<T>;
}

@:native("ReadableStreamDefaultReader")
extern class ReadableStreamDefaultReader<T> {
  /** Resolves to { done: Bool, value: T } (value optional when done=true) */
  public function read():js.lib.Promise<ReadableStreamReadResult<T>>;
  public function releaseLock():Void;
}

@:native("ReadableStreamReadResult")
extern class ReadableStreamReadResult<T> {
  public var done(default, null):Bool;
  public var value(default, null):T;
}

@:native("ReadableStreamUnderlyingSource")
extern class ReadableStreamUnderlyingSource<T> {
  public function start(controller:ReadableStreamDefaultController<T>):Void;
}

@:native("ReadableStreamDefaultController")
extern class ReadableStreamDefaultController<T> {
  public function enqueue(chunk:T):Void;
  public function close():Void;
  public function error(reason:Dynamic):Void;
}
/* -------------------------------------------------------------------------- */

/**
 * GaussianLoader — fetches a URL (PLY/NPZ/etc.) and emits progress events.
 *
 * Events (use the static string constants below):
 *  - EVT_START    : detail = { total: Null<Int> }          // total bytes if known
 *  - EVT_PROGRESS : detail = { loaded:Int, total:Null<Int>, percent:Null<Int> }
 *  - EVT_END      : detail = { loaded:Int, total:Null<Int> }
 *  - EVT_ERROR    : detail = { error:String }
 *
 * Usage:
 *   final loader = new loader.GaussianLoader();
 *   loader.addEventListener(loader.GaussianLoader.EVT_PROGRESS, (e) -> { ... });
 *   final bytes = loader.load(url); // returns Promise<ArrayBuffer>
 */
class GaussianLoader extends EventTarget {
  public static inline var EVT_START    = "loaderstart";
  public static inline var EVT_PROGRESS = "loaderprogress";
  public static inline var EVT_END      = "loaderend";
  public static inline var EVT_ERROR    = "loadererror";

  public function new() { super(); }

  /**
   * Load a URL to bytes. Optional `accept` sets the HTTP Accept header.
   * Dispatches progress events while the original Response is left intact for .arrayBuffer().
   */
  public function load(url:String, ?accept:String):js.lib.Promise<js.lib.ArrayBuffer> {
    final init:Dynamic = (accept != null) ? { headers: { 'Accept': accept } } : null;
    return Browser.window.fetch(url, init).then((res) -> this.withProgress(res)).then((res) -> res.arrayBuffer());
  }

  // Internal: wraps the Response with a side-channel progress reader on a clone.
  function withProgress(response:Response):Response {
    if (!response.ok) {
      dispatchEvent(new CustomEvent(EVT_ERROR, { detail: { error: 'HTTP ' + response.status } }));
      throw 'Cannot download file';
    }

    // Total size: prefer content-length; if content-encoding present, allow x-file-size.
    final ce = response.headers.get('content-encoding');
    final cl = response.headers.get(ce != null ? 'x-file-size' : 'content-length');
    final total:Null<Int> = (cl != null) ? Std.parseInt(cl) : null;

    // If there is no streamable body, just return the response (no progress)
    var stream:ReadableStream<js.lib.Uint8Array> = null;
    try stream = cast (untyped response.body) catch (_:Dynamic) {};
    if (stream == null) {
      // fire minimal start/end so UI can reset
      dispatchEvent(new CustomEvent(EVT_START,    { detail: { total: total } }));
      dispatchEvent(new CustomEvent(EVT_END,      { detail: { loaded: 0, total: total } }));
      return response;
    }

    // Clone the response for progress reading; we return the ORIGINAL.
    var clone:Response = null;
    try clone = response.clone() catch (_:Dynamic) {};
    if (clone == null) return response;

    dispatchEvent(new CustomEvent(EVT_START, { detail: { total: total } }));

    var loaded = 0;
    try {
      var cloneBody:ReadableStream<js.lib.Uint8Array> = null;
      try cloneBody = cast (untyped clone.body) catch (_:Dynamic) {};

      if (cloneBody != null) {
        final reader = cloneBody.getReader();

        function pump():js.lib.Promise<Dynamic> {
          return reader.read().then(function (obj) {
            if (obj.done) {
              try reader.releaseLock() catch (_:Dynamic) {};
              dispatchEvent(new CustomEvent(EVT_END, { detail: { loaded: loaded, total: total } }));
              return null;
            }

            final chunk = obj.value;
            loaded += (chunk != null ? chunk.length : 0);

            final percent:Null<Int> = (total != null && total > 0)
              ? Std.int(Math.round((loaded / total) * 100))
              : null;

            dispatchEvent(new CustomEvent(EVT_PROGRESS, {
              detail: { loaded: loaded, total: total, percent: percent }
            }));

            return pump();
          }).catchError(function (e) {
            try reader.releaseLock() catch (_:Dynamic) {};
            dispatchEvent(new CustomEvent(EVT_ERROR, { detail: { error: Std.string(e) } }));
            return null;
          });
        }

        untyped pump(); // fire-and-forget
      }
    } catch (e:Dynamic) {
      dispatchEvent(new CustomEvent(EVT_ERROR, { detail: { error: Std.string(e) } }));
    }

    return response; // original usable by caller (.arrayBuffer etc.)
  }
}
