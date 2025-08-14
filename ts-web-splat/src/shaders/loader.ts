// Simple WGSL loader that fetches shaders served alongside the bundle.
// The files are expected under ts-web-splat/src/shaders/ and copied to your web root.
export async function loadWGSL(fileName: string): Promise<string> {
  const res = await fetch(new URL(`./shaders/${fileName}`, import.meta.url));
  if (!res.ok) throw new Error(`Failed to load WGSL: ${fileName}`);
  return await res.text();
}

export const SHADERS = {
  gaussian: "gaussian.wgsl",
  preprocess: "preprocess.wgsl",
  preprocessCompressed: "preprocess_compressed.wgsl",
  radixSort: "radix_sort.wgsl",
  display: "display.wgsl",
} as const;
