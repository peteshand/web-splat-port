package;

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
	}
}
