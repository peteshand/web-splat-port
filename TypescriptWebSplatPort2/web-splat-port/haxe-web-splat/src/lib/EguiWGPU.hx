package lib;

import gl_matrix.Vec2;
import gl_matrix.Vec3;
import gl_matrix.Quat;
import js.Browser;
import js.html.CanvasElement;
import js.html.KeyboardEvent;
import js.html.PointerEvent;
import js.html.WheelEvent;
import controller.CameraController;
import controller.CameraController.KeyCode;

typedef FullOutput = Dynamic;

/* ------------------------------- No-op UI shims ------------------------------ */
class EguiWGPU {
  public function new(?_device:GPUDevice, ?_format:GPUTextureFormat, ?_canvas:CanvasElement) {}
  public function begin_frame(_w:CanvasElement):Void {}
  public function end_frame(_w:CanvasElement):FullOutput return {};
  public function prepare(_viewport:{width:Int, height:Int}, _scale:Float, _device:GPUDevice, _queue:GPUQueue, _enc:GPUCommandEncoder, shapes:FullOutput):FullOutput return shapes;
  public function render(_pass:GPURenderPassEncoder, _state:FullOutput):Void {}
  public function cleanup(_state:FullOutput):Void {}
}

// Tiny shim to mirror TS `ui.ui(...) -> boolean`
class Ui {
  public static function ui(_wc:Dynamic):Bool return false;
}
/* --------------------------------------------------------------------------- */

// --- helpers to bridge {x,y,z} <-> gl-matrix tuples ---
class Internal {
  public static inline function v3(p:{ x:Float, y:Float, z:Float }):js.lib.Float32Array
    return Vec3.fromValues(p.x, p.y, p.z);

  public static inline function near(a:Float, b:Float, eps:Float = 1e-4):Bool
    return Math.abs(a - b) <= eps;

  public static inline function nearVec3(a:js.lib.Float32Array, b:js.lib.Float32Array, eps:Float = 1e-4):Bool
    return near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps);

  public static inline function nearQuat(a:js.lib.Float32Array, b:js.lib.Float32Array, eps:Float = 1e-4):Bool
    return near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps) && near(a[3], b[3], eps);

  // -------------------------------- helpers ----------------------------------
  public static inline function deSRGB(fmt:GPUTextureFormat):GPUTextureFormat {
    return switch (fmt) {
      case "bgra8unorm-srgb": "bgra8unorm";
      case "rgba8unorm-srgb": "rgba8unorm";
      default: fmt;
    }
  }

  // --------------------------- input binding helper ---------------------------
  /**
   * Bind DOM input events to the camera controller, mirroring the TS behavior.
   * Fully typed; no reflection.
   */
  public static function bind_input(canvas:CanvasElement, controller:CameraController):Void->Void {
    // Ensure keyboard focus can land on the canvas
    if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;

    var pressedPointerId:Null<Int> = null;

    var DEBUG = true; // flip to false to silence logs
    var log = function(a:Dynamic, ?b:Dynamic, ?c:Dynamic, ?d:Dynamic, ?e:Dynamic) {
      if (DEBUG) Browser.console.debug("[input]", a, b, c, d, e);
    };

    inline function mapCode(code:String):Null<KeyCode> {
      return switch (code) {
        case "KeyW" | "KeyS" | "KeyA" | "KeyD"
           | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
           | "KeyQ" | "KeyE" | "Space" | "ShiftLeft":
          cast code; // KeyCode is an enum abstract from String
        default:
          null;
      }
    }

    inline function updateAltK(e:KeyboardEvent):Void controller.alt_pressed = e.altKey;
    inline function updateAltP(e:PointerEvent):Void controller.alt_pressed = e.altKey;
    inline function updateAltW(e:WheelEvent):Void    controller.alt_pressed = e.altKey;

    // Keyboard
    var onKeyDown = function(e:KeyboardEvent) {
      updateAltK(e);
      var code = mapCode(e.code);
      if (code == null) return;
      if (controller.process_keyboard(code, true)) {
        log("keydown", code);
        e.preventDefault();
      }
    };
    var onKeyUp = function(e:KeyboardEvent) {
      updateAltK(e);
      var code = mapCode(e.code);
      if (code == null) return;
      if (controller.process_keyboard(code, false)) {
        log("keyup", code);
        e.preventDefault();
      }
    };

    // Pointer (mouse/touch/pen)
    var onPointerDown = function(e:PointerEvent) {
      updateAltP(e);
      canvas.focus();
      pressedPointerId = e.pointerId;
      try canvas.setPointerCapture(e.pointerId) catch (_:Dynamic) {}
      if (e.button == 0) controller.left_mouse_pressed  = true;
      if (e.button == 2) controller.right_mouse_pressed = true;
      log("pointerdown", e.button, "alt=", controller.alt_pressed);
      e.preventDefault();
    };
    var onPointerMove = function(e:PointerEvent) {
      updateAltP(e);
      var dx = (e.movementX != null) ? e.movementX : 0;
      var dy = (e.movementY != null) ? e.movementY : 0;
      if (controller.left_mouse_pressed || controller.right_mouse_pressed) {
        controller.process_mouse(dx, dy);
        log("pointermove", dx, dy);
        e.preventDefault();
      }
    };
    var onPointerUp = function(e:PointerEvent) {
      updateAltP(e);
      if (pressedPointerId != null) {
        try canvas.releasePointerCapture(e.pointerId) catch (_:Dynamic) {}
        pressedPointerId = null;
      }
      if (e.button == 0) controller.left_mouse_pressed  = false;
      if (e.button == 2) controller.right_mouse_pressed = false;
      log("pointerup", e.button);
      e.preventDefault();
    };

    // Prevent browser context menu so right-drag pans like in Rust
    var onContextMenu = function(e:Event) e.preventDefault();

    // Wheel
    var onWheel = function(e:WheelEvent) {
      updateAltW(e);
      controller.process_scroll(e.deltaY / 100);
      log("wheel", e.deltaY);
      e.preventDefault(); // stop page scroll
    };

    // Blur: clear pressed flags similar to losing focus in winit
    var onWindowBlur = function(_){
      controller.left_mouse_pressed  = false;
      controller.right_mouse_pressed = false;
    };

    // Attach
    Browser.window.addEventListener("keydown", onKeyDown, true);
    Browser.window.addEventListener("keyup", onKeyUp, true);
    Browser.window.addEventListener("blur", onWindowBlur);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Return unbind if you need teardown later
    return function() {
      // removeEventListener options need to match the ones used to add
      Browser.window.removeEventListener("keydown", onKeyDown, true);
      Browser.window.removeEventListener("keyup", onKeyUp, true);
      Browser.window.removeEventListener("blur", onWindowBlur);

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("wheel", onWheel);
    };
  }
}
