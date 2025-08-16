Shaders are kept unchanged and sourced from the Rust project:

- ../src-rust-web-splat/src/shaders/gaussian.wgsl
- ../src-rust-web-splat/src/shaders/preprocess.wgsl
- ../src-rust-web-splat/src/shaders/preprocess_compressed.wgsl
- ../src-rust-web-splat/src/shaders/radix_sort.wgsl
- ../src-rust-web-splat/src/shaders/display.wgsl

In the TS implementation, we'll load these paths at runtime (e.g., via fetch) or copy them in build steps without modification.
