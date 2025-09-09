package gs.pointcloud;

class Quantization {
  public var zero_point:Int;
  public var scale:Float;
  public var _pad:Array<Int>;

  public function new(zero_point:Int = 0, scale:Float = 1.0) {
    this.zero_point = zero_point;
    this.scale = scale;
    _pad = [0, 0];
  }
}

class GaussianQuantization {
  public var color_dc:Quantization;
  public var color_rest:Quantization;
  public var opacity:Quantization;
  public var scaling_factor:Quantization;

  public function new(?color_dc:Quantization, ?color_rest:Quantization, ?opacity:Quantization, ?scaling_factor:Quantization) {
    this.color_dc = color_dc != null ? color_dc : new Quantization();
    this.color_rest = color_rest != null ? color_rest : new Quantization();
    this.opacity = opacity != null ? opacity : new Quantization();
    this.scaling_factor = scaling_factor != null ? scaling_factor : new Quantization();
  }
}
