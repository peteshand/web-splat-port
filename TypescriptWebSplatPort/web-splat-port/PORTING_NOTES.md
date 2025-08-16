# Porting Notes: Rust WebGPU -> TypeScript/WebGPU

This document captures Rust-specific and WASM-specific constructs in `src-rust-web-splat/` and how we will adapt them in TypeScript under `ts-web-splat/`.

- __Traits, lifetimes, ownership__
  - Rust traits (e.g., `Camera`) become TS interfaces/classes.
  - Lifetimes/ownership patterns map to GC semantics; be mindful of GPU resource disposal.

- __Math (`cgmath`)__
  - Use `gl-matrix` for matrices/quaternions in TS.
  - Ensure consistent handedness and matrix convention with shaders (column-major, right-handed).

- __Binary layouts & half floats__
  - Rust uses `#[repr(C)]`, `bytemuck`, and `half::f16`.
  - TS will pack with `ArrayBuffer`/`TypedArray` and, if needed, a small `float16` pack/unpack helper.

- __WebGPU feature flags & limits__
  - Rust/`wgpu` requests features (e.g., timestamp queries, 16-bit formats). TS can’t request all features explicitly; we’ll feature-detect and gracefully degrade.

- __Pipelines & bind groups__
  - Recreate `GaussianRenderer` pipelines in TS using the same WGSL (now copied to `ts-web-splat/src/shaders/`).
  - Bind group layouts will be mirrored; keep binding indices and struct layouts identical.

- __Indirect draw & sorting__
  - GPU radix sort (`gpu_rs.rs`) will be ported 1:1 using compute pipelines and the same WGSL `radix_sort.wgsl`.
  - Indirect buffers/dispatch will be created with TS WebGPU APIs.

- __IO formats (`io/ply.rs`, optional `io/npz.rs`)__
  - Implement PLY parsing in TS (ASCII/binary) for Gaussian data + SH coeffs.
  - NPZ optional; can add a zip reader later.

- __Windowing & UI__
  - Rust uses `winit` and `egui`. TS uses DOM canvas and optional UI libs. `WindowContext` exposes hooks rather than owning UI.

- __Timing__
  - Rust `std::time`/`web_time` -> TS uses `performance.now()`.

- __Testing & examples__
  - Add a simple demo page under `ts-web-splat/` for validation.

## Implementation order (planned)
1. Camera math (done) and view/projection parity checks.
2. Renderer: load WGSL, create render/compute pipelines, minimal draw path.
3. PointCloud: GPU buffers/bind groups for uncompressed path first.
4. GPU radix sort: compute pipelines.
5. IO: PLY parser for dataset ingestion.
