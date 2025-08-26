export class Quantization {
  zero_point: number;
  scale: number;
  _pad: [number, number];
  constructor(zero_point = 0, scale = 1) {
    this.zero_point = zero_point;
    this.scale = scale;
    this._pad = [0, 0];
  }
  static new(zero_point: number, scale: number) {
    return new Quantization(zero_point, scale);
  }
}

export class GaussianQuantization {
  color_dc: Quantization;
  color_rest: Quantization;
  opacity: Quantization;
  scaling_factor: Quantization;
  constructor(
    color_dc = new Quantization(),
    color_rest = new Quantization(),
    opacity = new Quantization(),
    scaling_factor = new Quantization()
  ) {
    this.color_dc = color_dc;
    this.color_rest = color_rest;
    this.opacity = opacity;
    this.scaling_factor = scaling_factor;
  }
}
