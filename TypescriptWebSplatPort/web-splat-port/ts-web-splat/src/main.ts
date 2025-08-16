import { GaussianRenderer } from "./renderer.js";
import { PointCloud } from "./pointcloud.js";
import { createDummyPointCloud, loadGaussianPLY } from "./io.js";
import { PerspectiveCamera, PerspectiveProjection } from "./camera.js";
import { CameraController } from "./controller.js";

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

  // Try to load a real PLY; fallback to dummy
  let parsed = null as null | Awaited<ReturnType<typeof loadGaussianPLY>>;
  try {
    parsed = await loadGaussianPLY("/public/Sample.ply");
    console.log(`Loaded PLY: ${parsed.num_points} points, sh_deg=${parsed.sh_deg}`);
  } catch (e) {
    console.warn("Failed to load PLY. Falling back to dummy.", e);
  }
  const source = parsed ?? createDummyPointCloud(200_000, 3);
  const pc = await PointCloud.new(device, source);

  const renderer = await GaussianRenderer.new(device, device.queue, format, source.sh_deg, false);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(canvas.clientWidth * dpr) || 800;
    const h = Math.floor(canvas.clientHeight * dpr) || 600;
    canvas.width = w;
    canvas.height = h;
  };
  window.addEventListener("resize", resize);
  resize();

  // Camera with controller
  let cam = new PerspectiveCamera(
    [0, 0, 3],
    [0, 0, 0, 1],
    new PerspectiveProjection((60 * Math.PI) / 180, (60 * Math.PI) / 180, 0.01, 100.0, 1.0)
  );
  
  const controller = new CameraController(1.0, 0.01);
  controller.resetToCamera(cam);

  // Input handling
  const keys = new Set<string>();
  
  window.addEventListener("keydown", (e) => {
    if (!keys.has(e.code)) {
      keys.add(e.code);
      controller.processKeyboard(e.code, true);
    }
    if (e.code === "AltLeft") controller.altPressed = true;
  });
  
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
    controller.processKeyboard(e.code, false);
    if (e.code === "AltLeft") controller.altPressed = false;
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) controller.leftMousePressed = true;
    if (e.button === 2) controller.rightMousePressed = true;
    canvas.requestPointerLock();
  });

  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) controller.leftMousePressed = false;
    if (e.button === 2) controller.rightMousePressed = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
      controller.processMouse(e.movementX, e.movementY);
    }
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    controller.processScroll(e.deltaY * 0.01);
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  let lastTime = performance.now();
  let frameCount = 0;
  
  async function frame() {
    const dt = 1 / 60; // Fixed timestep for now
    frameCount++;

    // controller.update(cam, dt); // TODO: Fix controller update method
    
    // Await preprocessing to ensure bind groups are created before render
    const renderEncoder = await renderer.encodePreprocessAndSort(pc, cam, [canvas.width, canvas.height]);
    
    // Create render pass on returned encoder
    const view = context.getCurrentTexture().createView();
    const renderPass = renderEncoder.beginRenderPass({
      colorAttachments: [
        { view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: "clear", storeOp: "store" },
      ],
    });
    
    renderer.render(renderPass, pc);
    renderPass.end();
    
    // Submit render encoder
    device.queue.submit([renderEncoder.finish()]);
    
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
