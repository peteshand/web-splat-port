# Project Outline: Haxe WebSplat Port + WebGPU Demo

## Objective
- **Port the completed TypeScript WebSplat** in `web-splat-port/typescript-web-splat/` to Haxe in `web-splat-port/haxe-web-splat/` with close parity to the TS/Rust behavior.
- **Enable WebGPU Gaussian Splatting rendering** in the browser demo using the Haxe build output with PLY/NPZ loading and visible feedback.

## Ground Rules (Authoritative)
- **1:1 with Rust**: Same classes, functions, properties, types, and behavior. Changes must track the Rust implementation exactly.
- **TS edit protocol**: Before editing any `.ts`, first obtain from you both the latest `.ts` file and its corresponding `.rs` file; edits must keep them aligned.
- **WGSL identity**: All `.wgsl` shaders remain byte-for-byte identical between TypeScript and Haxe ports (use the Rust versions as the source of truth).

## Scope and Requirements
- **Close-parity porting**:
  - Map each relevant `.ts` → `.hx` implementation in `haxe-web-splat/src/`.
  - Preserve data layouts and API shapes expected by the renderer (match the TS/Rust semantics).
  - Copy `.wgsl` shaders unchanged (match Webscript versions exactly).
  - Use `gl-matrix` via externs where needed and WebGPU JS externs provided under `haxe-web-splat/externs/`.
  - **CRITICAL**: Keep struct/field order and binary packing identical to TS to satisfy GPU pipelines.
- **Development Workflow (Haxe)**:
  - **NEVER directly edit generated JS in `haxe-web-splat/dist/`**
  - **ALWAYS edit Haxe `.hx` files in `haxe-web-splat/src/`**
  - Run `npm run build` from `haxe-web-splat/` (compiles Haxe → JS, bundles via webpack, copies shaders).
  - Test using the built `haxe-web-splat/dist/index.html`.

## Codebase Structure
- **Haxe sources**: `web-splat-port/haxe-web-splat/src/`
  - `io/Ply.hx` — PLY reader producing packed buffers and metadata
  - `io/Mod.hx` — entry point for loaders + `GenericGaussianPointCloud` holder
  - `pointcloud/PointCloud.hx` — GPU buffers, bind groups for clouds
  - `pointcloud/Types.hx` — shared types and point cloud interface
  - `pointcloud/Aabb.hx` — AABB helpers
  - (plus additional modules: NPZ reader, quantization, layouts, uniforms, renderer, camera, etc.)
- **Built demo**: `web-splat-port/haxe-web-splat/dist/`
  - `index.html` — UI, event handlers, viewer wiring
  - Bundled JS output and `shaders/gaussian.wgsl` (copied)

## Demo App Behavior (`dist/index.html`)
- **UI**:
  - Buttons for:
    - Load sample PLY from `./Sample.ply`
    - Load local file
    - Load from URL
  - Status panel for progress and info.
- **Flow**:
  - Fetch PLY/NPZ -> `io.Mod.GenericGaussianPointCloud.load(arrayBuffer)`
  - Show parsed metadata (count, SH degree, AABB) in status panel.
  - Initialize WebGPU:
    - Request adapter/device.
    - Canvas context `webgpu` (fallback `gpupresent`).
    - Configure with `navigator.gpu.getPreferredCanvasFormat()`.
  - Upload to GPU: `PointCloud.create(device, pointCloud)` (async shim that resolves immediately)
  - Create renderer (API parity with TS/Rust): `GaussianRenderer.create(device, queue, format, shDeg, compressed)`
  - Build camera and fit near/far to AABB
  - Animation loop: prepare → render → submit

## Technical Decisions
- **ES Modules** with explicit `.js` extensions for browser imports.
- **Import map / bundling** ensures `gl-matrix` is available to generated JS.
- **Shader loading path** fixed to `./shaders/gaussian.wgsl`.
- **Uniform/bind group alignment**: keep 256B alignment where required.

## Error Handling and Diagnostics
- **Context acquisition**:
  - Try `webgpu` and `gpupresent`.
  - Clear diagnostic on failure: origin, navigator.gpu presence, adapter status.
- **Status updates**:
  - All load/parse/render steps update `#status`.
- **Avoid conflicting contexts**:
  - No 2D context on the WebGPU canvas (info moved to status panel).

## Performance and Large Data
- Handles large PLYs (~300MB+) with visible progress logs.
- Sorting/preprocess stubs present via `renderer.prepare(...)`.
- Future: leverage `gpu_rs.ts` radix sort fully if not already wired in the build.

## Deliverables
- **Ported Haxe library** mirroring the TypeScript/Rust behavior.
- **Functional browser demo** (`dist/index.html`) that:
  - Loads PLY
  - Parses successfully
  - Initializes WebGPU and renders with Gaussian shader
  - Displays useful logs/errors

## Current Status
- **TypeScript → Haxe port in progress**: core loaders and point cloud GPU wrapper implemented (e.g., `io/Ply.hx`, `io/Mod.hx`, `pointcloud/PointCloud.hx`, `pointcloud/Types.hx`, `pointcloud/Aabb.hx`).
- **Demo wired up**:
  - `haxe-web-splat/dist/index.html` initializes WebGPU and renderer after load.
  - Shader path and uniform alignment handled in build.
- **Remaining**: fill out or verify NPZ reader, quantization structs/uniforms, layout/bind groups across all passes, and ensure API parity with TS viewer where applicable.

## Open Tasks
- **Haxe parity checks**:
  - Verify f32→f16 packing matches TS for gaussians and SH.
  - Validate SH degree inference and coefficient ordering.
  - Confirm plane/up estimation matches TS behavior.
- **NPZ / Compressed path**:
  - Implement/verify `io.Npz.*` reader and quantization pipeline.
  - Bind and upload `covars` and `quantization` buffers; ensure layout parity.
- **Renderer/layout integration**:
  - Ensure `Layout.getLayouts(device)` bindings match TS/Rust.
  - Confirm `PointCloud` bind groups in both plain and compressed modes.
- **Optional enhancements**:
  - Camera controls, UI toggles for render settings.
  - FPS and GPU timings (stopwatch) if wired.
  - Progressive loading UI for very large files.

## File References
- Demo: `haxe-web-splat/dist/index.html`
- Haxe sources (examples): `haxe-web-splat/src/io/Ply.hx`, `src/io/Mod.hx`, `src/pointcloud/PointCloud.hx`, `src/pointcloud/Types.hx`, `src/pointcloud/Aabb.hx`
- Shaders: `haxe-web-splat/dist/shaders/gaussian.wgsl`
- Build configs: `haxe-web-splat/build.hxml`, `haxe-web-splat/webpack.config.js`, `haxe-web-splat/package.json`

## How to Run
- From `web-splat-port/haxe-web-splat/`:
  - `npm install`
  - `npm run build` (runs Haxe compile → webpack bundle → copy shaders)
  - Serve `./dist/` over HTTP/HTTPS (e.g., `npm run start`)
- Use a WebGPU-capable browser (recent Chrome/Edge; flags if necessary).
- Open the page and click “Load Sample.ply”, or load your own PLY/URL.
- Check console/status for shader fetch, pipeline creation, and render logs.

## Risks and Mitigation
- **WebGPU availability**: provide clear diagnostics and fallback guidance.
- **Shader resource path**: fixed to relative `./shaders/` to work in `dist/`.
- **Uniform/bind group alignment**: padded to 256 bytes.
- **API mismatches**: prefer direct wiring in `index.html`; align helper modules separately.

---

Checklist (active):
- [x] Copy shaders to `dist/shaders/`
- [x] Fix shader path to `./shaders/gaussian.wgsl`
- [x] Wire WebGPU render path in `dist/index.html`
- [x] Fix uniform buffer size alignment
- [ ] Complete NPZ/quantization compressed path in Haxe
- [ ] Verify bind group layouts across plain/compressed
- [ ] Optional: controls, UI toggles, FPS, progressive loading

