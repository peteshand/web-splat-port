/**
 * TypeScript port of uniform.rs
 * Manages uniform buffers for WebGPU
 */

// Type constraints equivalent to Rust's NoUninit + Pod
export interface BufferData {
    // Data that can be safely cast to bytes for GPU buffers
}

// Unified uniform buffer constants
export const CAMERA_SIZE = 272;    // 4 mat4 + vec2 + vec2
export const SETTINGS_SIZE = 80;   // matches Rust SplattingArgsUniform
const UNIFIED_BUFFER_SIZE = 512;

/**
 * Unified uniform buffer that combines camera and settings uniforms
 * Camera at offset 0 (272 bytes), Settings at offset 256 (80 bytes)
 */
export class UnifiedUniformBuffer {
    private buffer: GPUBuffer;
    // NEW: separate bind groups (camera @ g0, settings @ g3)
    private cameraBG: GPUBindGroup;
    private settingsBG: GPUBindGroup;

    private cameraData: Uint8Array;
    private settingsData: Uint8Array;

    private combinedBG: GPUBindGroup;

    constructor(device: GPUDevice, label?: string) {
        // single 512-byte buffer (camera @ 0..272, settings @ 256..336)
        this.buffer = device.createBuffer({
            label: label || 'unified uniform buffer',
            size: UNIFIED_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });

        // CPU copies (optional, kept from your version)
        this.cameraData = new Uint8Array(CAMERA_SIZE);
        this.settingsData = new Uint8Array(SETTINGS_SIZE);

        // Create TWO 1-binding groups over the same buffer, matching WGSL group layout
        // g0: camera
        this.cameraBG = device.createBindGroup({
            label: `${label || 'unified'} camera bg`,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.buffer,
                    offset: 0,
                    size: CAMERA_SIZE
                }
            }]
        });

        // g3: settings
        this.settingsBG = device.createBindGroup({
            label: `${label || 'unified'} settings bg`,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.buffer,
                    offset: 256,
                    size: SETTINGS_SIZE
                }
            }]
        });

        // NEW: combined bind group with two bindings (0: camera, 1: settings)
        this.combinedBG = device.createBindGroup({
            label: `${label || 'unified'} combined bg`,
            layout: UnifiedUniformBuffer.bindGroupLayout(device),
            entries: [
            { binding: 0, resource: { buffer: this.buffer, offset: 0,   size: CAMERA_SIZE   }},
            { binding: 1, resource: { buffer: this.buffer, offset: 256, size: SETTINGS_SIZE }},
            ],
        });
    }

    getCombinedBindGroup(): GPUBindGroup {
        return this.combinedBG;
    }

    // (Keep this static if other code references it; it's no longer used by this class.)
    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: "unified uniform bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: CAMERA_SIZE }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: SETTINGS_SIZE }
                }
            ]
        });
    }

    updateCamera(queue: GPUQueue, cameraBytes: Uint8Array): void {
        if (cameraBytes.length !== CAMERA_SIZE) {
          console.warn(`[UUBO] camera bytes ${cameraBytes.length}, expected ${CAMERA_SIZE}`);
        }
        const len = Math.min(cameraBytes.byteLength, CAMERA_SIZE);
      
        // keep your local mirror (optional)
        this.cameraData.set(cameraBytes.subarray(0, len));
      
        // NEW: wrap into a fresh Uint8Array so it's typed as ArrayBuffer-backed (not ...Like)
        const view = new Uint8Array(len);
        view.set(cameraBytes.subarray(0, len));
      
        queue.writeBuffer(this.buffer, 0, view, 0, len);
    }

    updateSettings(queue: GPUQueue, settingsBytes: Uint8Array): void {
        if (settingsBytes.length !== SETTINGS_SIZE) {
          console.warn(`[UUBO] settings bytes ${settingsBytes.length}, expected ${SETTINGS_SIZE}`);
        }
        const len = Math.min(settingsBytes.byteLength, SETTINGS_SIZE);
      
        this.settingsData.set(settingsBytes.subarray(0, len));
      
        const view = new Uint8Array(len);
        view.set(settingsBytes.subarray(0, len));
      
        queue.writeBuffer(this.buffer, 256, view, 0, len);
    }

    getBuffer(): GPUBuffer {
        return this.buffer;
    }

    // DEPRECATED: your old combined BG. Return camera BG for compatibility if something still calls it.
    getBindGroup(): GPUBindGroup {
        return this.cameraBG;
    }

    // Use these in the compute pass:
    getCameraBindGroup(): GPUBindGroup {
        return this.cameraBG;
    }

    getSettingsBindGroup(): GPUBindGroup {
        return this.settingsBG;
    }
}

export class UniformBuffer<T extends BufferData> {
    private buffer: GPUBuffer;
    private data: T;
    private label: string | null;
    private bindGroup: GPUBindGroup;

    constructor(
        device: GPUDevice,
        data: T,
        label?: string
    ) {
        this.data = data;
        this.label = label || null;

        // Create buffer with data
        const dataArray = this.castToBytes(data);
        this.buffer = device.createBuffer({
            label: label,
            size: dataArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });

        // Write initial data
        new Uint8Array(this.buffer.getMappedRange()).set(dataArray);
        this.buffer.unmap();

        // Create bind group
        const bgLabel = label ? `${label} bind group` : undefined;
        this.bindGroup = device.createBindGroup({
            label: bgLabel,
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.buffer
                }
            }]
        });
    }

    static newDefault<T extends BufferData>(
        device: GPUDevice,
        defaultData: T,
        label?: string
    ): UniformBuffer<T> {
        return new UniformBuffer(device, defaultData, label);
    }

    static new<T extends BufferData>(
        device: GPUDevice,
        data: T,
        label?: string
    ): UniformBuffer<T> {
        return new UniformBuffer(device, data, label);
    }

    getBuffer(): GPUBuffer {
        return this.buffer;
    }

    getData(): T {
        return this.data;
    }

    getBindGroup(): GPUBindGroup {
        return this.bindGroup;
    }

    static bindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: "uniform bind group layout",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: false
                    // minBindingSize omitted - WebGPU will validate based on actual usage
                }
            }]
        });
    }

    static bindGroupLayoutWithSize(device: GPUDevice, minBindingSize: number): GPUBindGroupLayout {
        return device.createBindGroupLayout({
            label: "uniform bind group layout (sized)",
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: false,
                    minBindingSize
                }
            }]
        });
    }

    /**
     * Uploads data from CPU to GPU if necessary
     */
    sync(queue: GPUQueue): void {
        const dataBytes = this.castToBytes(this.data);
      
        // NEW: force an ArrayBuffer-backed view
        const view = new Uint8Array(dataBytes); // copies, but tiny
        queue.writeBuffer(this.buffer, 0, view, 0, view.byteLength);
    }

    static bindingType(minBindingSize?: number): GPUBufferBindingLayout {
        return {
            type: "uniform" as const,
            hasDynamicOffset: false,
            minBindingSize
        };
    }

    clone(device: GPUDevice, queue: GPUQueue): UniformBuffer<T> {
        // Create new buffer with same size
        const newBuffer = device.createBuffer({
            label: this.label || undefined,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            size: this.buffer.size,
            mappedAtCreation: false
        });

        // Copy buffer contents
        const encoder = device.createCommandEncoder({
            label: "copy uniform buffer encoder"
        });
        encoder.copyBufferToBuffer(
            this.buffer, 0,
            newBuffer, 0,
            this.buffer.size
        );
        queue.submit([encoder.finish()]);

        // Create new bind group
        const bindGroup = device.createBindGroup({
            label: "uniform bind group",
            layout: UniformBuffer.bindGroupLayout(device),
            entries: [{
                binding: 0,
                resource: {
                    buffer: newBuffer
                }
            }]
        });

        // Create new instance with copied data
        const cloned = Object.create(UniformBuffer.prototype);
        cloned.buffer = newBuffer;
        cloned.data = { ...this.data }; // Shallow clone of data
        cloned.label = this.label;
        cloned.bindGroup = bindGroup;
        return cloned;
    }

    /**
     * Get mutable reference to data (equivalent to AsMut<T>)
     */
    asMut(): T {
        return this.data;
    }

    /**
     * Convert data to byte array for GPU buffer
     * This is equivalent to bytemuck::cast_slice in Rust
     */
    private castToBytes(data: T): Uint8Array {
        // Single number -> f32
        if (typeof data === 'number') {
          const buf = new ArrayBuffer(4);
          new DataView(buf).setFloat32(0, data, true);
          return new Uint8Array(buf);
        }
      
        if (typeof data === 'object' && data !== null) {
          // ---- CameraUniform: 4 * mat4<f32> (64 floats = 256 bytes) + vec2 + vec2 (4 floats = 16 bytes) = 272 bytes ----
          if ('viewMatrix' in data && 'viewInvMatrix' in data && 'projMatrix' in data && 'projInvMatrix' in data && 'viewport' in data && 'focal' in data) {
            const buf = new ArrayBuffer(272);
            const f32 = new Float32Array(buf);
      
            // view_matrix [0..16)
            f32.set((data as any).viewMatrix as Float32Array, 0);
            // view_inv_matrix [16..32)
            f32.set((data as any).viewInvMatrix as Float32Array, 16);
            // proj_matrix [32..48)
            f32.set((data as any).projMatrix as Float32Array, 32);
            // proj_inv_matrix [48..64)
            f32.set((data as any).projInvMatrix as Float32Array, 48);
            // viewport (vec2) [64..66)
            const vp = (data as any).viewport as Float32Array | number[];
            f32[64] = vp[0];
            f32[65] = vp[1];
            // focal (vec2) [66..68)
            const fc = (data as any).focal as Float32Array | number[];
            f32[66] = fc[0];
            f32[67] = fc[1];
      
            return new Uint8Array(buf);
          }
      
          // ---- SplattingArgsUniform (matches Rust struct order & alignment) ----
          // Rust:
          // struct SplattingArgsUniform {
          //   clipping_box_min: vec4<f32>,
          //   clipping_box_max: vec4<f32>,
          //   gaussian_scaling: f32,
          //   max_sh_deg: u32,
          //   show_env_map: u32,
          //   mip_splatting: u32,
          //   kernel_size: f32,
          //   walltime: f32,
          //   scene_extend: f32,
          //   _pad: u32,
          //   scene_center: vec4<f32>,
          // };
          if ('clippingBoxMin' in data && 'clippingBoxMax' in data && 'gaussianScaling' in data && 'maxShDeg' in data) {
            const buf = new ArrayBuffer(80); // multiples of 16; 80 bytes = 5 * 16, ok
            const dv = new DataView(buf);
            let off = 0;
      
            // clipping_box_min (vec4)
            for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, (data as any).clippingBoxMin[i], true);
            off += 16;
      
            // clipping_box_max (vec4)
            for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, (data as any).clippingBoxMax[i], true);
            off += 16;
      
            // gaussian_scaling f32
            dv.setFloat32(off, (data as any).gaussianScaling, true); off += 4;
            // max_sh_deg u32
            dv.setUint32(off, (data as any).maxShDeg >>> 0, true); off += 4;
            // show_env_map u32
            dv.setUint32(off, ((data as any).showEnvMap >>> 0) || 0, true); off += 4;
            // mip_splatting u32
            dv.setUint32(off, ((data as any).mipSplatting >>> 0) || 0, true); off += 4;
      
            // kernel_size, walltime, scene_extend (3 * f32)
            dv.setFloat32(off, (data as any).kernelSize, true); off += 4;
            dv.setFloat32(off, (data as any).walltime, true); off += 4;
            dv.setFloat32(off, (data as any).sceneExtend, true); off += 4;
      
            // _pad u32
            dv.setUint32(off, 0, true); off += 4;
      
            // scene_center vec4 (Rust uses vec4; WGSL RenderSettings uses vec3, which reads the first 12 bytes)
            const sc = (data as any).sceneCenter as Float32Array | number[];
            for (let i = 0; i < 4; i++) dv.setFloat32(off + i * 4, sc[i] ?? 0, true);
            // off += 16; // not needed further
      
            return new Uint8Array(buf);
          }
      
          throw new Error(`Unsupported object type for GPU buffer: ${Object.keys(data)}`);
        }
      
        throw new Error('Unsupported data type for GPU buffer');
      }      
}
