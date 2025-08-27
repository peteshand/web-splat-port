package camera;

import js.Lib;
import js.Syntax;

class Internal {
  /** Read the global logging flag. Defaults to true if unset. */
  public static function loggingEnabled():Bool {
    var g:Dynamic = Lib.global;
    return (g.__LOGGING_ENABLED__ == null) ? true : (g.__LOGGING_ENABLED__ == true);
  }

  /** Set the global logging flag. */
  public static function setLoggingEnabled(enabled:Bool):Void {
    var g:Dynamic = Lib.global;
    g.__LOGGING_ENABLED__ = enabled;
  }

  /** Console logger with a “[camera]” prefix. */
  public static function clog(args:haxe.Rest<Dynamic>):Void {
    if (!loggingEnabled()) return;

    // Build an array like ['[camera]', ...args] and call console.log with proper varargs.
    var a:Array<Dynamic> = ['[camera]'];
    for (x in args) a.push(x);
    // console.log.apply(console, a)
    Syntax.code("console.log.apply(console, {0})", a);
  }
}
