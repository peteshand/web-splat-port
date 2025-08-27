package lib;

// Mirrors the TS usage: new RenderConfig(hdr?:boolean, skybox?:string|null, no_vsync?:boolean)
class RenderConfig {
  public var hdr:Bool;
  public var skybox:Null<String>;
  public var no_vsync:Bool;

  public function new(?hdr:Bool, ?skybox:Null<String>, ?no_vsync:Bool) {
    this.hdr = hdr != null ? hdr : false;
    this.skybox = skybox != null ? skybox : null;
    this.no_vsync = no_vsync != null ? no_vsync : false;
  }
}
