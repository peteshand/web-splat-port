import { vec3, quat, mat3 } from "gl-matrix";
import { PerspectiveCamera } from "./camera.js";

export class CameraController {
  public center: vec3 = vec3.create();
  public up: vec3 | null = null;
  private amount: vec3 = vec3.create();
  private shift: [number, number] = [0, 0];
  private rotation: vec3 = vec3.create();
  private scroll: number = 0;
  public speed: number;
  public sensitivity: number;

  public leftMousePressed: boolean = false;
  public rightMousePressed: boolean = false;
  public altPressed: boolean = false;
  public userInput: boolean = false;

  constructor(speed: number, sensitivity: number) {
    this.speed = speed;
    this.sensitivity = sensitivity;
  }

  processKeyboard(key: string, pressed: boolean): boolean {
    const amount = pressed ? 1.0 : 0.0;
    let processed = false;

    switch (key) {
      case "KeyW":
      case "ArrowUp":
        this.amount[2] += amount;
        processed = true;
        break;
      case "KeyS":
      case "ArrowDown":
        this.amount[2] += -amount;
        processed = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.amount[0] += -amount;
        processed = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.amount[0] += amount;
        processed = true;
        break;
      case "KeyQ":
        this.rotation[2] += amount / this.sensitivity;
        processed = true;
        break;
      case "KeyE":
        this.rotation[2] += -amount / this.sensitivity;
        processed = true;
        break;
      case "Space":
        this.amount[1] += amount;
        processed = true;
        break;
      case "ShiftLeft":
        this.amount[1] += -amount;
        processed = true;
        break;
    }

    this.userInput = processed;
    return processed;
  }

  processMouse(mouseDx: number, mouseDy: number): void {
    if (this.leftMousePressed) {
      this.rotation[0] += mouseDx;
      this.rotation[1] += mouseDy;
      this.userInput = true;
    }
    if (this.rightMousePressed) {
      this.shift[1] += -mouseDx;
      this.shift[0] += mouseDy;
      this.userInput = true;
    }
  }

  processScroll(dy: number): void {
    this.scroll += -dy;
    this.userInput = true;
  }

  /**
   * Moves the controller center to the closest point on a line defined by the camera position and rotation.
   * Adjusts the controller up vector by projecting the current up vector onto the plane defined by the camera right vector.
   */
  resetToCamera(camera: PerspectiveCamera): void {
    const cameraQuat = quat.fromValues(
      camera.rotationQuat[0],
      camera.rotationQuat[1], 
      camera.rotationQuat[2],
      camera.rotationQuat[3]
    );
    
    const invView = mat3.create();
    mat3.fromQuat(invView, cameraQuat);
    mat3.invert(invView, invView);

    const forward = vec3.create();
    vec3.transformMat3(forward, [0, 0, 1], invView);

    const right = vec3.create();
    vec3.transformMat3(right, [1, 0, 0], invView);

    const cameraPos = vec3.fromValues(camera.positionVec[0], camera.positionVec[1], camera.positionVec[2]);
    
    // Move center point
    this.center = closestPoint(cameraPos, forward, this.center);

    // Adjust up vector by projecting it onto the plane defined by the right vector of the camera
    if (this.up) {
      const projection = vec3.create();
      const dot = vec3.dot(this.up, right);
      vec3.scale(projection, right, dot);
      
      const newUp = vec3.create();
      vec3.subtract(newUp, this.up, projection);
      vec3.normalize(newUp, newUp);
      this.up = newUp;
    }
  }

  updateCamera(camera: PerspectiveCamera, dt: number): void {
    const cameraPos = vec3.fromValues(camera.positionVec[0], camera.positionVec[1], camera.positionVec[2]);
    const cameraQuat = quat.fromValues(
      camera.rotationQuat[0],
      camera.rotationQuat[1],
      camera.rotationQuat[2], 
      camera.rotationQuat[3]
    );

    const dir = vec3.create();
    vec3.subtract(dir, cameraPos, this.center);
    const distance = vec3.length(dir);

    // Update distance with scroll (matches Rust: normalize_to((distance.ln() + scroll * dt * 10 * speed).exp()))
    const newDistance = Math.exp(Math.log(distance) + this.scroll * dt * 10.0 * this.speed);
    vec3.normalize(dir, dir);
    vec3.scale(dir, dir, newDistance);

    // Get view transform
    const viewT = mat3.create();
    mat3.fromQuat(viewT, cameraQuat);
    mat3.invert(viewT, viewT);

    const xAxis = vec3.fromValues(viewT[0], viewT[3], viewT[6]);
    const yAxis = this.up || vec3.fromValues(viewT[1], viewT[4], viewT[7]);
    const zAxis = vec3.fromValues(viewT[2], viewT[5], viewT[8]);

    // Calculate offset for panning
    const offset = vec3.create();
    const xOffset = vec3.create();
    const yOffset = vec3.create();
    vec3.scale(xOffset, xAxis, this.shift[1]);
    vec3.scale(yOffset, yAxis, -this.shift[0]);
    vec3.add(offset, xOffset, yOffset);
    vec3.scale(offset, offset, dt * this.speed * 0.1 * distance);

    vec3.add(this.center, this.center, offset);
    vec3.add(cameraPos, cameraPos, offset);

    // Calculate rotation angles
    let theta = this.rotation[0] * dt * this.sensitivity;
    let phi = -this.rotation[1] * dt * this.sensitivity;
    let eta = 0;

    if (this.altPressed) {
      eta = -this.rotation[1] * dt * this.sensitivity;
      theta = 0;
      phi = 0;
    }

    // Create rotation quaternions
    const rotTheta = quat.create();
    const rotPhi = quat.create();
    const rotEta = quat.create();
    
    quat.setAxisAngle(rotTheta, yAxis, theta);
    quat.setAxisAngle(rotPhi, xAxis, phi);
    quat.setAxisAngle(rotEta, zAxis, eta);

    // Combine rotations
    const rot = quat.create();
    quat.multiply(rot, rotTheta, rotPhi);
    quat.multiply(rot, rot, rotEta);

    // Apply rotation to direction
    const newDir = vec3.create();
    vec3.transformQuat(newDir, dir, rot);

    // Check if we're too close to the up vector (gimbal lock prevention)
    const angle = angleShort(yAxis, newDir);
    if (angle < 0.1) {
      vec3.copy(newDir, dir);
    }

    vec3.add(cameraPos, this.center, newDir);

    // Update camera rotation using lookAt
    const negNewDir = vec3.create();
    vec3.negate(negNewDir, newDir);
    vec3.normalize(negNewDir, negNewDir);
    
    // Create lookAt quaternion
    const forward = vec3.create();
    vec3.copy(forward, negNewDir);
    
    const right = vec3.create();
    vec3.cross(right, forward, yAxis);
    vec3.normalize(right, right);
    
    const up = vec3.create();
    vec3.cross(up, right, forward);
    vec3.normalize(up, up);
    
    const rotMat = mat3.fromValues(
      right[0], up[0], -forward[0],
      right[1], up[1], -forward[1],
      right[2], up[2], -forward[2]
    );
    
    const newQuat = quat.create();
    quat.fromMat3(newQuat, rotMat);

    // Update camera properties
    camera.positionVec[0] = cameraPos[0];
    camera.positionVec[1] = cameraPos[1];
    camera.positionVec[2] = cameraPos[2];
    
    camera.rotationQuat[0] = newQuat[0];
    camera.rotationQuat[1] = newQuat[1];
    camera.rotationQuat[2] = newQuat[2];
    camera.rotationQuat[3] = newQuat[3];

    // Apply decay based on fps (60fps reference)
    let decay = Math.pow(0.8, dt * 60.0);
    if (decay < 1e-4) {
      decay = 0.0;
    }

    // Apply decay to inputs
    this.rotation[0] *= decay;
    this.rotation[1] *= decay;
    if (Math.hypot(this.rotation[0], this.rotation[1]) < 1e-4) {
      this.rotation[0] = 0;
      this.rotation[1] = 0;
    }

    this.shift[0] *= decay;
    this.shift[1] *= decay;
    if (Math.hypot(this.shift[0], this.shift[1]) < 1e-4) {
      this.shift[0] = 0;
      this.shift[1] = 0;
    }

    this.scroll *= decay;
    if (Math.abs(this.scroll) < 1e-4) {
      this.scroll = 0;
    }

    this.userInput = false;
  }
}

function closestPoint(orig: vec3, dir: vec3, point: vec3): vec3 {
  const normalizedDir = vec3.create();
  vec3.normalize(normalizedDir, dir);
  
  const lhs = vec3.create();
  vec3.subtract(lhs, point, orig);
  
  const dotP = vec3.dot(lhs, normalizedDir);
  
  const result = vec3.create();
  vec3.scaleAndAdd(result, orig, normalizedDir, dotP);
  return result;
}

function angleShort(a: vec3, b: vec3): number {
  const angle = Math.acos(Math.max(-1, Math.min(1, vec3.dot(a, b) / (vec3.length(a) * vec3.length(b)))));
  if (angle > Math.PI / 2) {
    return Math.PI - angle;
  } else {
    return angle;
  }
}
