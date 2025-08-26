# Build & Run the Web (WASM) version

This guide shows how to compile the project to WebAssembly, generate the JS glue, and run it in the browser using WebGPU.

Your repo already has `public/index.html` that imports `./web_splats.js`, so we’ll output artifacts directly into `./public`.

---

## TL;DR

```bash
# 1) Install target + matching wasm-bindgen
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.100

# 2) Build the WASM (uses the project's web-release profile)
cargo build --target wasm32-unknown-unknown --profile web-release

# 3) Generate JS glue into ./public (next to index.html)
wasm-bindgen   --target web   --out-dir public   target/wasm32-unknown-unknown/web-release/web_splats.wasm

# 4) Serve ./public over localhost and open it in a WebGPU-capable browser
python3 -m http.server --directory public 8080
# or: npx http-server public -p 8080
```

Open http://localhost:8080 and check DevTools console for logs.

---

## Prerequisites

- Rust toolchain (e.g. via [rustup](https://rustup.rs/))
- WebAssembly target: `rustup target add wasm32-unknown-unknown`
- `wasm-bindgen-cli` **version 0.2.100** (matches `wasm-bindgen = 0.2.100` in Cargo):
  ```bash
  cargo install wasm-bindgen-cli --version 0.2.100
  ```
- Modern browser with WebGPU:
  - Chrome/Edge 113+ (best bet)
  - Firefox Nightly (with WebGPU flag)
  - Safari Technology Preview

> WebGPU requires a secure context. `localhost` is fine. For remote hosting, use HTTPS.

---

## Project layout

```
public/
  index.html             # already imports ./web_splats.js
src/
  lib.rs                 # builds to WASM (cdylib)
.cargo/config.toml       # sets getrandom backend for wasm
Cargo.toml               # includes target-specific deps for wasm32
```

Your `.cargo/config.toml` includes:
```toml
[target.wasm32-unknown-unknown]
rustflags = ['--cfg', 'getrandom_backend="wasm_js"']
```
This fixes the `getrandom` WASM compilation issue.

---

## Build for the web

1) **Compile to WASM** (using the custom `web-release` profile for smaller output):

```bash
cargo build --target wasm32-unknown-unknown --profile web-release
```

Artifacts:
```
target/wasm32-unknown-unknown/web-release/web_splats.wasm
```

2) **Generate the JS glue** into `./public`:

```bash
wasm-bindgen   --target web   --out-dir public   target/wasm32-unknown-unknown/web-release/web_splats.wasm
```

This will emit:
```
public/web_splats.js
public/web_splats_bg.wasm
```

Your existing `public/index.html` should then load `./web_splats.js` without changes.

---

## Serving locally

Any static server pointed at `public/` works:

```bash
python3 -m http.server --directory public 8080
# or
npx http-server public -p 8080
```

Open `http://localhost:8080`.

---

## Optional features

### NPZ support in the browser

The default WASM build only supports `.ply`. To load compressed `.npz` files in the browser you must compile with the `npz` feature:

```bash
# build with npz enabled
cargo build --target wasm32-unknown-unknown --profile web-release --features npz

# regenerate JS glue
wasm-bindgen --target web --out-dir public   target/wasm32-unknown-unknown/web-release/web_splats.wasm
```

Artifacts:
```
public/web_splats.js
public/web_splats_bg.wasm
```

Now you can pass `.npz` files to the viewer just like `.ply`.  
If you don’t compile with `--features npz`, you’ll see runtime errors like:

```
called `Result::unwrap()` on an `Err` value: Unknown file format
```

### Video feature

If you use the `video` feature (defined in `Cargo.toml`), enable it the same way:

```bash
cargo build --target wasm32-unknown-unknown --profile web-release --features video
```

---

## Debugging

- Enable clean panics & logging on the web:
  - `console_error_panic_hook` and `console_log` are already in `Cargo.toml`.
  - In your `wasm32` entrypoint, call:
    ```rust
    console_error_panic_hook::set_once();
    console_log::init_with_level(log::Level::Info).ok();
    ```
- Open DevTools → Console to see Rust logs (`log` crate).

If the app renders a white screen, check the console for errors first. It’s almost always a bad import path, a missing WebGPU adapter/surface, or a panic.

---

## Common errors & fixes

**wasm-bindgen version mismatch**  
Make sure the CLI and crate versions match. This repo expects `0.2.100`:
```bash
cargo install wasm-bindgen-cli --version 0.2.100
```

**`navigator.gpu` is undefined**  
- Use a browser with WebGPU enabled.
- Serve via `localhost` or HTTPS.

**CORS or COEP/COOP issues**  
Basic WebGPU rendering usually works without cross-origin isolation. If you later use advanced APIs/workers, you might need:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**`getrandom` on wasm**  
Already handled by `.cargo/config.toml` and `getrandom = { features = ["wasm_js"] }` in `Cargo.toml`.

---

## Reducing bundle size

If you have Binaryen:
```bash
wasm-opt -Oz -o public/web_splats_bg.opt.wasm public/web_splats_bg.wasm
# update index.html (or overwrite the original)
```

You can also experiment with:
- `opt-level = "z"` or `"s"` (already set to `"s"` in `profile.web-release`)
- `strip = "debuginfo"` (already set)
- LTO and `codegen-units = 1` in the profile (trade build time for size)

---

## CI example (GitHub Actions)

Minimal workflow to build and publish artifacts into `public/` (use Pages or your own host to deploy):

```yaml
name: build-wasm
on: [push]
jobs:
  wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown
      - name: Install wasm-bindgen-cli
        run: cargo install wasm-bindgen-cli --version 0.2.100
      - name: Build
        run: cargo build --target wasm32-unknown-unknown --profile web-release
      - name: Bindgen
        run: wasm-bindgen --target web --out-dir public target/wasm32-unknown-unknown/web-release/web_splats.wasm
      - name: Upload site artifacts
        uses: actions/upload-artifact@v4
        with:
          name: site
          path: public
```

---

## Notes

- Keep `[[bin]]` targets (`viewer`, `video`) for native runs. The browser build comes from the `lib` crate type (`cdylib`).
- If your `lib.rs` doesn’t have a web entrypoint, export one for wasm:
  ```rust
  #[cfg(target_arch = "wasm32")]
  use wasm_bindgen::prelude::*;

  #[cfg(target_arch = "wasm32")]
  #[wasm_bindgen(start)]
  pub async fn start() -> Result<(), JsValue> {
      console_error_panic_hook::set_once();
      console_log::init_with_level(log::Level::Info).ok();
      // TODO: initialize winit/wgpu bound to your canvas here
      Ok(())
  }
  ```

That’s it. Build, bindgen into `public/`, and serve.
