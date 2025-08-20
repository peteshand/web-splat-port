# Project Outline: TypeScript WebSplat Port + WebGPU Demo

## Objective
- **Port Rust WebSplat** in `web-splat-port/rust-web-splat/` to TypeScript in `web-splat-port/typescript-web-splat/` one-for-one.
- **Enable WebGPU Gaussian Splatting rendering** in the browser demo with PLY loading and visible feedback.

## Scope and Requirements
- **One-for-one porting**:
  - Each `.rs` -> corresponding `.ts` file.
  - Port all structs/classes/functions exactly (no additions/removals).
  - Copy `.wgsl` shaders unchanged.
  - Use `gl-matrix` for math; `@webgpu/types` for WebGPU typings.
  - **CRITICAL**: All changes must align with Rust source implementation. When fixing bugs or issues, always check the corresponding Rust source files to ensure struct layouts, field orders, and data types match exactly.
- **Development Workflow**:
  - **NEVER directly edit `.js` files in `dist/` directory**
  - **ALWAYS edit TypeScript `.ts` files in `src/` directory**
  - **ALWAYS run `npm run build` after making changes to compile TypeScript to JavaScript**
  - **Test changes using the compiled output in `dist/index.html`**
  - This ensures consistency and prevents loss of changes during rebuilds
- **Browser demo**:
  - Load large PLY files.
  - Parse into `GenericGaussianPointCloud`.
  - Upload to GPU as `PointCloud`.
  - Render via `GaussianRenderer` with WebGPU.
  - Provide clear UI feedback and error handling.

## Codebase Structure
- **TypeScript sources**: `web-splat-port/typescript-web-splat/src/`
  - `uniform.ts` — uniform buffer management
  - `utils.ts` — utilities (GPUStopwatch stub)
  - `pointcloud.ts` — GPU buffers, bind groups for clouds
  - `camera.ts` — perspective camera/projection
  - `animation.ts` — interpolation, tracking shots
  - `controller.ts` — camera controls
  - `io/mod.ts` — loading PLY/NPZ as `GenericGaussianPointCloud`
  - `renderer.ts` — Gaussian pipeline, shaders, prepare/render
  - `scene.ts` — scene + cameras
  - `gpu_rs.ts` — GPU radix sort (point sorting)
  - `lib.ts` — library entrypoint, WGPU context, exports
- **Built demo**: `web-splat-port/typescript-web-splat/dist/`
  - `index.html` — UI, event handlers, inline viewer wiring
  - `renderer.js`, `pointcloud.js`, `camera.js`, `scene.js`, `lib.js`, `uniform.js`
  - `shaders/gaussian.wgsl` (copied)

## Demo App Behavior (`dist/index.html`)
- **UI**:
  - Buttons for:
    - Load sample PLY from `./Sample.ply`
    - Load local file
    - Load from URL
  - Status panel for progress and info.
- **Flow**:
  - Fetch PLY -> `GenericGaussianPointCloud.load(arrayBuffer)`
  - Show parsed metadata (count, SH degree, AABB) in status panel.
  - Initialize WebGPU:
    - Request adapter/device.
    - Canvas context `webgpu` (fallback `gpupresent`).
    - Configure with `navigator.gpu.getPreferredCanvasFormat()`.
  - Upload to GPU: `new PointCloud(device, pointCloud)`
  - Create renderer: `GaussianRenderer.create(device, queue, format, shDeg, compressed)`
  - Build camera: `PerspectiveCamera.createDefault()` + `fitNearFar(pointCloud.aabb)`
  - Animation loop:
    - `renderer.prepare(encoder, device, queue, pcGpu, renderSettings, null)`
    - Begin render pass on current texture
    - `renderer.render(pass, pcGpu)`
    - Submit commands

## Technical Decisions
- **ES Modules** with explicit `.js` extensions for browser imports.
- **Import map** (CDN) for `gl-matrix` in `dist/index.html`.
- **Shader loading path** fixed to `./shaders/gaussian.wgsl` in `dist/renderer.js`.
- **Uniform buffer alignment**: pad to 256 bytes in `dist/uniform.js` to satisfy WebGPU alignment and avoid createBuffer errors.

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
- **Ported TS library** mirroring Rust WebSplat.
- **Functional browser demo** (`dist/index.html`) that:
  - Loads PLY
  - Parses successfully
  - Initializes WebGPU and renders with Gaussian shader
  - Displays useful logs/errors

## Current Status
- **Port complete** (as per prior work): core files implemented and compiled.
- **Demo wired up**:
  - `index.html` now initializes WebGPU and renderer after PLY load.
  - Shader path fixed.
  - Uniform alignment fixed.
- **Remaining**: `dist/lib.js` viewer has API mismatches and is bypassed in demo.

## Open Tasks
- **Fix `dist/lib.js` runtime**:
  - Use `WGPUContext.newInstance()` (async) for adapter/device.
  - Construct `Scene` with cameras array.
  - Remove non-existent calls (e.g., `scene.loadPointCloud`, ad-hoc `setPosition`, `lookAt` if not defined).
  - Ensure `GaussianRenderer.create(...)` usage matches current API.
  - Add robust error handling.
- **Optional enhancements**:
  - Camera controls from `controller.ts`.
  - UI toggles for render settings (e.g., SH degree cap, scaling).
  - FPS and GPU timings (using `GPUStopwatch` stub if extended).
  - Progressive loading UI for very large files.

## File References
- Demo: `typescript-web-splat/dist/index.html`
- Renderer: `typescript-web-splat/dist/renderer.js`, `src/renderer.ts`
- Point cloud: `typescript-web-splat/dist/pointcloud.js`, `src/pointcloud.ts`
- Camera: `typescript-web-splat/dist/camera.js`, `src/camera.ts`
- Uniform: `typescript-web-splat/dist/uniform.js`, `src/uniform.ts`
- Scene: `typescript-web-splat/dist/scene.js`, `src/scene.ts`
- IO: `typescript-web-splat/dist/io/mod.js`, `src/io/mod.ts`
- Shaders: `typescript-web-splat/dist/shaders/gaussian.wgsl`

## How to Run
- Serve `typescript-web-splat/dist/` over HTTP/HTTPS (not file://).
- Use a WebGPU-capable browser (recent Chrome/Edge; flags if necessary).
- Open the page and click “Load Sample.ply”, or load your own PLY/URL.
- Check console/status for shader fetch, pipeline creation, and render logs.

## Risks and Mitigation
- **WebGPU availability**: provide clear diagnostics and fallback guidance.
- **Shader resource path**: fixed to relative `./shaders/` to work in `dist/`.
- **Uniform/bind group alignment**: padded to 256 bytes.
- **API mismatches**: contained by using direct wiring in `index.html`; fix `lib.js` separately.

---

Checklist (active):
- [x] Copy shaders to `dist/shaders/`
- [x] Fix shader path to `./shaders/gaussian.wgsl`
- [x] Wire WebGPU render path in `dist/index.html`
- [x] Fix uniform buffer size alignment
- [ ] Align `dist/lib.js` viewer runtime with APIs
- [ ] Optional: controls, UI toggles, FPS, progressive loading
