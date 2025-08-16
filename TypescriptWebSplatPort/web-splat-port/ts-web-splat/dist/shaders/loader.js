// Simple WGSL loader that fetches shaders served alongside the bundle.
// The files are expected under ts-web-splat/src/shaders/ and copied to your web root.
export async function loadWGSL(fileName) {
    // When bundled, this file lives at dist/shaders/loader.js.
    // We serve the original WGSLs from src-rust-web-splat/src/shaders at runtime.
    // dist/shaders/loader.js -> ../../src/shaders/
    const url = new URL(`../../src/shaders/${fileName}`, import.meta.url);
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to load WGSL: ${fileName}`);
    return await res.text();
}
export const SHADERS = {
    gaussian: "gaussian.wgsl",
    preprocess: "preprocess.wgsl",
    preprocessCompressed: "preprocess_compressed.wgsl",
    radixSort: "radix_sort.wgsl",
    display: "display.wgsl",
};
