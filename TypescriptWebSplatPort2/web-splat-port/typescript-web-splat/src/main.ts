// src/main.ts
// Entry that compiles to js/web_splat.js.
// Directly import your TS modules instead of dynamically importing a built file.

import { run_wasm } from './lib'; // <- adjust path if lib.ts lives elsewhere

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}
function qs<T extends Element>(selector: string): T {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el as T;
}

async function checkWebGPU(): Promise<boolean> {
  // Narrow typing to satisfy TS in some setups
  const navAny = navigator as any;
  if (!navAny.gpu) return false;
  try {
    const adapter = await navAny.gpu.requestAdapter();
    if (!adapter) return false;
    await adapter.requestDevice();
    return true;
  } catch {
    return false;
  }
}

function withProgress(response: Response): Response {
  if (!response.ok) throw new Error('Cannot download file', { cause: response });

  const ce = response.headers.get('content-encoding');
  const cl = response.headers.get(ce ? 'x-file-size' : 'content-length');
  if (cl === null) throw new Error('Response size header unavailable');
  const total = parseInt(cl, 10);
  let loaded = 0;

  const meter = qs<SVGCircleElement>('.meter-1');
  const display = qs<SVGTextElement>('#loading-display');

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = response.body!.getReader();
      const read = (): any =>
        reader.read().then(({ done, value }) => {
          if (done) { controller.close(); return; }
          loaded += value!.byteLength;
          meter.style.strokeDashoffset = String(360 - Math.round((loaded / total) * 360));
          display.textContent = `${Math.round((loaded / (1024 * 1024)) * 10) / 10} MB`;
          controller.enqueue(value!);
          return read();
        }).catch(err => { console.error(err); controller.error(err); });
      return read();
    }
  });

  return new Response(stream);
}

async function main() {
  if (!(await checkWebGPU())) {
    $('no-webgpu').style.display = 'flex';
    throw new Error('WebGPU not supported.');
  }

  const params = new URLSearchParams(location.search);
  const scene_url = params.get('scene');
  const pc_url = params.get('file');

  if (!pc_url) {
    $('no-file').style.display = 'flex';
    return;
  }

  try {
    $('spinner').style.display = 'flex';

    const pcPromise = fetch(pc_url).then(withProgress).then(r => r.arrayBuffer());
    const scenePromise = scene_url
      ? fetch(scene_url, { headers: { 'Accept': 'application/json' } }).then(r => r.arrayBuffer())
      : Promise.resolve<ArrayBuffer | null>(null);

    const [pc_data, scene_data] = await Promise.all([pcPromise, scenePromise]);

    // Let lib.ts handle DPR/backing-store sizing; just call its entry
    await run_wasm(pc_data, scene_data, pc_url, scene_url || null);

    $('spinner').style.display = 'none';
  } catch (e: any) {
    $('spinner').style.display = 'none';
    const pane = $('loading-error');
    pane.style.display = 'flex';
    const causeText = e?.cause?.statusText ? ': ' + e.cause.statusText : '';
    pane.querySelector('p')!.innerHTML = `${e.message || e}${causeText}<pre>${pc_url || ''}</pre>`;
    console.error(e);
  }

  // Do NOT touch canvas.width/height here; lib.ts’ ResizeObserver handles DPR correctly.
  document.addEventListener('contextmenu', (ev) => ev.preventDefault());
}

main().catch((e) => console.error(e));
