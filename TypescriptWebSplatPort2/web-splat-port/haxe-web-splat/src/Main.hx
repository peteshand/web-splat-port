package;

import js.Browser;
import js.html.Document;
import js.html.Element;
import js.html.HtmlElement;
import js.html.svg.CircleElement;
import js.html.svg.TextElement;
import js.html.Response;
import js.html.CanvasElement;
import js.lib.Promise;
import haxe.Resource;
import StringTools;


@:native("ReadableStream")
extern class ReadableStream<T> {
  public var locked(default, null):Bool;
  public function new(?underlyingSource:ReadableStreamUnderlyingSource<T>, ?strategy:Dynamic):Void;
  public function getReader():ReadableStreamDefaultReader<T>;
  public function pipeThrough():Dynamic;
  public function pipeTo():Dynamic;
  public function tee():Dynamic;
  public function cancel():Dynamic;
  public function values():Dynamic;
}

@:native("ReadableStreamDefaultReader")
extern class ReadableStreamDefaultReader<T> {
  /** Resolves to { done: Bool, value: T } (value optional when done=true) */
  public function read():js.lib.Promise<ReadableStreamReadResult<T>>;
  public function releaseLock():Void;
  // public var closed(default, null):js.lib.Promise<Dynamic>; // (optional)
}

@:native("ReadableStreamDefaultController")
extern class ReadableStreamDefaultController<T> {
  public function enqueue(chunk:T):Void;
  public function close():Void;
  public function error(reason:Dynamic):Void;
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

@:expose
class Main {
	static var _main:Main;

	public static function main() {
		for (name in Resource.listNames()) {
			if (StringTools.endsWith(name, ".css")) {
				var css = Resource.getString(name);
				var style:js.html.StyleElement = cast Browser.document.createElement("style");
				style.appendChild(Browser.document.createTextNode(css));
				Browser.document.head.appendChild(style);
			}
		}
		if (_main == null)
			_main = new Main();
	}

	public function new() {
		console.log("Main");
		// kick off the TS-equivalent main
		this.tsMain().catchError(function(e) console.error(e));
	}

	inline function getElementById(id:String):HtmlElement {
		var el = Browser.document.getElementById(id);
		if (el == null) throw 'Missing element #' + id;
		return cast el;
	}
	inline function qs<T>(selector:String):T {
		var el = Browser.document.querySelector(selector);
		if (el == null) throw 'Missing element ' + selector;
		return cast el;
	}

	function checkWebGPU():Promise<Bool> {
		final nav:Dynamic = Browser.navigator;
		var gpu:GPU = untyped nav.gpu;
		if (gpu == null){
			trace("GPU not supported");
			return Promise.resolve(false);
		}
		else {
			trace("GPU object found");
			try {
				return cast gpu.requestAdapter().then(function(adapter:Dynamic) {
					if (adapter == null) return false;
					return adapter.requestDevice().then(function(_:Dynamic) return true);
				}).catchError(function(_){ return false; });
			} catch (_:Dynamic) {
				return Promise.resolve(false);
			}
		}
	}

	function withProgress(response:Response):Response {
		if (!response.ok) throw 'Cannot download file';
	  
		// May be unknown → still show MB
		final ce = response.headers.get('content-encoding');
		final cl = response.headers.get(ce != null ? 'x-file-size' : 'content-length');
		final total:Null<Int> = (cl != null) ? Std.parseInt(cl) : null;
	  
		// Must have a streamable body
		final body:Dynamic = untyped response.body;
		if (body == null || Reflect.field(body, "getReader") == null) return response;
	  
		// Clone the response so we can read progress from the clone,
		// while returning the original for normal consumption.
		var clone:Response = null;
		try {
		  clone = cast Reflect.callMethod(response, Reflect.field(response, "clone"), []);
		} catch (_:Dynamic) {}
		if (clone == null) return response;
	  
		// UI
		var loaded = 0;
		final meter:CircleElement  = qs('.meter-1');
		final display:TextElement  = qs('#loading-display');
	  
		// Kick off a non-blocking progress reader on the clone
		try {
		  final cloneBody:Dynamic = untyped clone.body;
		  if (cloneBody != null && Reflect.field(cloneBody, "getReader") != null) {
			final reader:Dynamic = cloneBody.getReader();
	  
			function pump():js.lib.Promise<Dynamic> {
			  final p:js.lib.Promise<Dynamic> = cast reader.read();
			  return p.then(function (obj:Dynamic) {
				if (obj.done) { try reader.releaseLock() catch (_:Dynamic) {}; return null; }
				final chunk:js.lib.Uint8Array = obj.value;
				loaded += (chunk != null ? chunk.length : 0);
	  
				if (display != null) {
				  final mb = Math.round((loaded / (1024 * 1024)) * 10) / 10;
				  if (total != null && total > 0) {
					final mbTot = Math.round((total / (1024 * 1024)) * 10) / 10;
					display.textContent = mb + ' / ' + mbTot + ' MB';
				  } else {
					display.textContent = mb + ' MB';
				  }
				}
				if (meter != null && total != null && total > 0) {
				  meter.style.strokeDashoffset =
					Std.string(360 - Math.round((loaded / total) * 360));
				}
				return pump();
			  }).catchError(function (_){
				try reader.releaseLock() catch (_:Dynamic) {};
				return null;
			  });
			}
			untyped pump(); // fire-and-forget
		  }
		} catch (_:Dynamic) {}
	  
		// Return the ORIGINAL response; downstream .arrayBuffer() works as usual
		return response;
	  }
			

	function tsMain():Promise<Void> {
		return checkWebGPU().then(function(supported) {
			if (!supported) {
				getElementById('no-webgpu').style.display = 'flex';
				throw 'WebGPU not supported.';
			}
			final params = new js.html.URLSearchParams(Browser.location.search);
			final scene_url = params.get('scene');
			final pc_url = params.get('file');
			if (pc_url == null) {
				getElementById('no-file').style.display = 'flex';
				return null;
			}

			getElementById('spinner').style.display = 'flex';

			final pcPromise:Promise<js.lib.ArrayBuffer> =
				js.Browser.window.fetch(pc_url).then(function(r) return withProgress(r)).then(function(r) return r.arrayBuffer());
			final scenePromise:Promise<js.lib.ArrayBuffer> =
				(scene_url != null)
					? js.Browser.window.fetch(scene_url, { headers: cast { 'Accept': 'application/json' } }).then(function(r) return r.arrayBuffer())
					: Promise.resolve(null);

			return Promise.all([pcPromise, scenePromise]).then(function(arr) {
				final pc_data:js.lib.ArrayBuffer = cast arr[0];
				final scene_data:js.lib.ArrayBuffer = cast arr[1];
				console.log(pc_data);
				console.log(scene_data);
				// Call run_wasm (TS exported from lib/open_window.ts)
				return lib.OpenWindow.run_wasm(pc_data, scene_data, pc_url, scene_url);
			}).then(function(_) {
				getElementById('spinner').style.display = 'none';
				return null;
			}).catchError(function(e) {
				getElementById('spinner').style.display = 'none';
				final pane = getElementById('loading-error');
				pane.style.display = 'flex';
				final pc_url_str = (pc_url != null) ? pc_url : '';
				cast(pane.querySelector('p'), js.html.Element).innerHTML = Std.string(e) + '<pre>' + pc_url_str + '</pre>';
				js.Browser.console.error(e);
				return null;
			}).then(function(_) {
				Browser.document.addEventListener('contextmenu', function(ev) { ev.preventDefault(); });
				return null;
			});
		});
	}
}