package gs.pointcloud;

import gs.uniform.UniformBuffer;

class PointCloud {
  // ---- logging helper ----
  static inline function pclog(tag:String, v:Dynamic = null) {
    if (v == null) console.log('[pointcloud]', tag);
    else console.log('[pointcloud]', tag, v);
  }

  // GPU-side resources
  var splat_2d_buffer:GPUBuffer;
  var vertex_buffer:GPUBuffer;              // 3D gaussians
  var sh_buffer:GPUBuffer;                  // SH coefficients
  var covars_buffer:Null<GPUBuffer>;        // compressed only
  var quantization_uniform:Null<UniformBuffer<ArrayBufferView>>;

  // bind groups
  var _bind_group:GPUBindGroup;
  var _render_bind_group:GPUBindGroup;

  // metadata / cached properties
  var num_points_:Int;
  var sh_deg_:Int;
  var bbox_:Aabb;
  var compressed_:Bool;

  var center_:Vec3;
  var up_:Null<Vec3>;

  var mip_splatting_:Null<Bool>;
  var kernel_size_:Null<Float>;
  var background_color_:Null<GPUColor>;

  // captured for optional debug
  var _gaussianSrc:Null<js.lib.Uint8Array>;
  var _shSrc:Null<js.lib.Uint8Array>;

  /** Async-style factory to mirror TS usage: `await PointCloud.create(device, pc)` */
  public static function create(device:GPUDevice, pc:GenericGaussianPointCloud):Promise<PointCloud> {
    // All work here is synchronous; return a resolved Promise for parity with TS.
    return Promise.resolve(new PointCloud(device, pc));
  }

  /** Actual constructor */
  public function new(device:GPUDevice, pc:GenericGaussianPointCloud) {
    // Persist zero-copy byte views exactly once
    console.log(pc);
    var gaussBytes:js.lib.Uint8Array = Utils.asBytes(pc.gaussian_buffer());
    var shBytes:js.lib.Uint8Array    = Utils.asBytes(pc.sh_coefs_buffer());
    _gaussianSrc = gaussBytes;
    _shSrc = shBytes;

    // Work buffer for 2D projected splats (written in preprocess)
    splat_2d_buffer = device.createBuffer({
      label: 'splat_2d_buffer',
      size: Constants.SPLAT2D_BYTES_PER_POINT * pc.num_points,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    pclog('ctor: created splat_2d_buffer', { bytes: Constants.SPLAT2D_BYTES_PER_POINT * pc.num_points });

    // GPU buffers for 3D gaussians + SH coefs
    vertex_buffer = device.createBuffer({
      label: 'pc.vertex_buffer',
      size: gaussBytes.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertex_buffer, 0, gaussBytes);
    pclog('ctor: uploaded vertex_buffer', { bytes: gaussBytes.byteLength });

    sh_buffer = device.createBuffer({
      label: 'pc.sh_buffer',
      size: shBytes.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(sh_buffer, 0, shBytes);
    pclog('ctor: uploaded sh_buffer', { bytes: shBytes.byteLength });

    // Bind group layouts (shared across plain/compressed)
    var layouts = Layout.getLayouts(device);

    // Build the preprocess bind group
    var entries:Array<GPUBindGroupEntry> = [
      { binding: 0, resource: { buffer: vertex_buffer } },
      { binding: 1, resource: { buffer: sh_buffer } },
      { binding: 2, resource: { buffer: splat_2d_buffer } }
    ];

    covars_buffer = null;
    quantization_uniform = null;

    if (pc.compressed()) {
      if (pc.covars == null) throw 'compressed() true but covars missing';
      var covBytes = Utils.asBytes(pc.covars);
      covars_buffer = device.createBuffer({
        label: 'pc.covars_buffer',
        size: covBytes.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
      device.queue.writeBuffer(covars_buffer, 0, covBytes);
      entries.push({ binding: 3, resource: { buffer: covars_buffer } });

      if (pc.quantization == null) throw 'compressed() true but quantization missing';
      var quantView:ArrayBufferView;
      if (Utils.isArrayBufferView(pc.quantization)) {
        quantView = Utils.asBytes(pc.quantization);
      } else {
        quantView = Utils.packGaussianQuantizationToBytes(cast pc.quantization);
      }

      quantization_uniform = UniformBuffer.create(device, quantView, 'quantization uniform buffer');
      entries.push({ binding: 4, resource: { buffer: quantization_uniform.bufferRef() } });

      _bind_group = device.createBindGroup({
        label: 'preprocess.bind_group.compressed',
        layout: layouts.compressed,
        entries: entries
      });
      pclog('ctor: created preprocess bind group (compressed)');
    } else {
      _bind_group = device.createBindGroup({
        label: 'preprocess.bind_group.plain',
        layout: layouts.plain,
        entries: entries
      });
      pclog('ctor: created preprocess bind group (plain)');
    }

    _render_bind_group = device.createBindGroup({
      label: 'render.bind_group',
      layout: layouts.render,
      entries: [
        { binding: 2, resource: { buffer: splat_2d_buffer } }
      ]
    });
    pclog('ctor: created render bind group');

    // mirror Rust fields
    num_points_ = pc.num_points;
    sh_deg_ = pc.sh_deg;
    compressed_ = pc.compressed();
    bbox_ = new Aabb(pc.aabb.min, pc.aabb.max);

    center_ = { x: pc.center.x, y: pc.center.y, z: pc.center.z };
    up_ = (pc.up != null) ? { x: pc.up.x, y: pc.up.y, z: pc.up.z } : null;

    mip_splatting_ = pc.mip_splatting;
    kernel_size_ = pc.kernel_size;

    background_color_ = null;
    if (pc.background_color != null) {
      var bc:Array<Float> = cast pc.background_color;
      background_color_ = { r: bc[0], g: bc[1], b: bc[2], a: 1.0 };
    }

    pclog('ctor: initialized fields', { num_points: num_points_, sh_deg: sh_deg_, compressed: compressed_ });
  }

  // --- DEBUG: log first Gaussian & SH buffer sanity info
  public function debugLogFirstGaussian() {
    if (_gaussianSrc == null) {
      console.warn('[pc] no gaussian src captured');
      return;
    }
    if (compressed_) {
      console.log('[pc] compressed point cloud; first-gaussian debug for raw halfs is skipped');
      console.log('[pc] aabb:', bbox_, 'num_points:', num_points_);
      return;
    }

    // uncompressed: 10 halfs (20 bytes) per gaussian (matches TS commentary)
    var dv = new js.lib.DataView(_gaussianSrc.buffer, _gaussianSrc.byteOffset, _gaussianSrc.byteLength);
    var halves:Array<Int> = [];
    var max = Std.int(Math.min(10, _gaussianSrc.byteLength / 2));
    for (i in 0...max) halves.push(dv.getUint16(i * 2, true));

    var floats = halves.map(Utils.halfToFloat);
    var xyz = floats.slice(0, 3);
    var opacity = floats[3];
    var cov = floats.slice(4, 10);

    console.log('[pc] first gaussian (halfs):', halves);
    console.log('[pc] first gaussian (floats):', { xyz: xyz, opacity: opacity, cov: cov });
    console.log('[pc] aabb:', bbox_);
    console.log('[pc] num_points:', num_points_);
    console.log('[pc] sh bytes:', (_shSrc != null) ? _shSrc.byteLength : null);
  }

  // ---- getters matching Rust/TS API ----
  public inline function compressed():Bool return compressed_;
  public inline function num_points():Int return num_points_;     // exact Rust name
  public inline function numPoints():Int return num_points_;
  public inline function sh_deg():Int return sh_deg_;             // exact Rust name
  public inline function shDeg():Int return sh_deg_;              // TS convenience
  public inline function bbox():Aabb return bbox_;

  // Rust names (methods)
  public inline function bind_group():GPUBindGroup return _bind_group;
  public inline function render_bind_group():GPUBindGroup return _render_bind_group;

  // TS-friendly aliases used by renderer.ts:
  public inline function getBindGroup():GPUBindGroup return _bind_group;
  public inline function getRenderBindGroup():GPUBindGroup return _render_bind_group;

  public inline function mip_splatting():Null<Bool> return mip_splatting_;         // exact Rust
  public inline function mipSplatting():Null<Bool> return mip_splatting_;          // TS convenience
  public inline function dilation_kernel_size():Null<Float> return kernel_size_;   // exact Rust
  public inline function dilationKernelSize():Null<Float> return kernel_size_;     // TS convenience
  public inline function center():Vec3 return center_;
  public inline function up():Null<Vec3> return up_;

  // ---- static bind group layouts (exact bindings/visibility as Rust) ----
  public static inline function bind_group_layout_compressed(device:GPUDevice):GPUBindGroupLayout {
    return Layout.getLayouts(device).compressed;
  }
  public static inline function bind_group_layout(device:GPUDevice):GPUBindGroupLayout {
    return Layout.getLayouts(device).plain;
  }
  public static inline function bind_group_layout_render(device:GPUDevice):GPUBindGroupLayout {
    return Layout.getLayouts(device).render;
  }
}
