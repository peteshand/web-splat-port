import { GaussianRenderer } from "./renderer";
import { PointCloud } from "./pointcloud";
import { createDummyPointCloud } from "./io";

async function init() {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported in this browser");
  }
  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No GPU adapter");
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  // Dummy data until real IO parser is wired
  const shDeg = 0;
  const dummy = createDummyPointCloud(100_000, shDeg);
  const pc = await PointCloud.new(device, dummy);

  const renderer = await GaussianRenderer.new(device, device.queue, format, shDeg, false);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr) || 800;
    const h = Math.floor(canvas.clientHeight * dpr) || 600;
    canvas.width = w;
    canvas.height = h;
  };
  window.addEventListener("resize", resize);
  resize();

  function frame() {
    // Update minimal uniforms
    renderer.updateUniforms([canvas.width, canvas.height]);

    // Encode preprocess + sort, then render in one command buffer
    const encoder = renderer.encodePreprocessAndSort(pc);

    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" },
      ],
    });
    renderer.render(pass, pc);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init().catch(err => {
  console.error(err);
  const pre = document.createElement("pre");
  pre.textContent = String(err?.stack || err);
  document.body.appendChild(pre);
});
