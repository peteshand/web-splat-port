use cgmath::*;
#[cfg(target_arch = "wasm32")]
use web_time::Duration;
use num_traits::Float;
use std::f32::consts::PI;
#[cfg(not(target_arch = "wasm32"))]
use std::time::Duration;

use winit::keyboard::KeyCode;

use crate::camera::PerspectiveCamera;

#[derive(Debug)]
pub struct CameraController {
    pub center: Point3<f32>,
    pub up: Option<Vector3<f32>>,
    amount: Vector3<f32>,
    shift: Vector2<f32>,
    rotation: Vector3<f32>, // x = yaw input, y = pitch input, z unused (roll removed)
    scroll: f32,
    pub speed: f32,
    pub sensitivity: f32,

    pub left_mouse_pressed: bool,
    pub right_mouse_pressed: bool,
    pub alt_pressed: bool, // no special behavior now, kept for API compatibility
    pub user_inptut: bool,
}

impl CameraController {
    pub fn new(speed: f32, sensitivity: f32) -> Self {
        Self {
            center: Point3::origin(),
            amount: Vector3::zero(),
            shift: Vector2::zero(),
            rotation: Vector3::zero(),
            up: None,
            scroll: 0.0,
            speed,
            sensitivity,
            left_mouse_pressed: false,
            right_mouse_pressed: false,
            alt_pressed: false,
            user_inptut: false,
        }
    }

    pub fn process_keyboard(&mut self, key: KeyCode, pressed: bool) -> bool {
        let amount = if pressed { 1.0 } else { 0.0 };
        let processed = match key {
            KeyCode::KeyW | KeyCode::ArrowUp => {
                self.amount.z += amount; // forward
                true
            }
            KeyCode::KeyS | KeyCode::ArrowDown => {
                self.amount.z += -amount; // back
                true
            }
            KeyCode::KeyA | KeyCode::ArrowLeft => {
                self.amount.x += -amount; // left
                true
            }
            KeyCode::KeyD | KeyCode::ArrowRight => {
                self.amount.x += amount; // right
                true
            }

            // Roll removed: Q/E no longer affect rotation.z. If you prefer, you can
            // repurpose these to something else later. For now, ignore.
            KeyCode::KeyQ | KeyCode::KeyE => false,

            KeyCode::Space => {
                self.amount.y += amount; // up
                true
            }
            KeyCode::ShiftLeft => {
                self.amount.y += -amount; // down
                true
            }
            _ => false,
        };
        self.user_inptut = processed;
        processed
    }

    pub fn process_mouse(&mut self, mouse_dx: f32, mouse_dy: f32) {
        if self.left_mouse_pressed {
            // Left-drag: yaw (around up) and pitch (around right)
            self.rotation.x += mouse_dx as f32; // yaw input
            self.rotation.y += mouse_dy as f32; // pitch input
            self.user_inptut = true;
        }
        if self.right_mouse_pressed {
            // Right-drag: pan
            self.shift.y += -mouse_dx as f32;
            self.shift.x += mouse_dy as f32;
            self.user_inptut = true;
        }
    }

    pub fn process_scroll(&mut self, dy: f32) {
        self.scroll += -dy;
        self.user_inptut = true;
    }

    /// moves the controller center to the closest point on a line defined by the camera position and rotation
    /// ajusts the controller up vector by projecting the current up vector onto the plane defined by the camera right vector
    pub fn reset_to_camera(&mut self, camera: PerspectiveCamera) {
        let inv_view = camera.rotation.invert();
        let forward = inv_view * Vector3::unit_z();
        let right = inv_view * Vector3::unit_x();

        // move center point
        self.center = closest_point(camera.position, forward, self.center);
        // adjust up vector by projecting it onto the plane defined by the right vector of the camera
        if let Some(up) = &self.up {
            let new_up = up - up.project_on(right);
            self.up = Some(new_up.normalize());
        }
    }

    pub fn update_camera(&mut self, camera: &mut PerspectiveCamera, dt: Duration) {
        let dt: f32 = dt.as_secs_f32();

        // radial dolly with logarithmic distance mapping
        let mut dir = camera.position - self.center;
        let distance = dir.magnitude();
        dir = dir.normalize_to((distance.ln() + self.scroll * dt * 10.0 * self.speed).exp());

        // camera local axes in world space
        let view_t: Matrix3<f32> = camera.rotation.invert().into();
        let x_axis = view_t.x;                       // camera right
        let y_axis = self.up.unwrap_or(view_t.y);    // world/camera up
        // let z_axis = view_t.z;                    // camera forward (unused for roll)

        // pan (screen-space)
        let offset = (self.shift.y * x_axis - self.shift.x * y_axis) * dt * self.speed * 0.1 * distance;
        self.center += offset;
        camera.position += offset;

        // convert smoothed mouse deltas into angular velocities
        let theta = Rad((self.rotation.x) * dt * self.sensitivity);  // yaw around up
        let phi   = Rad((-self.rotation.y) * dt * self.sensitivity); // pitch around right

        // roll removed: no eta around z_axis, and alt no longer changes mode
        let rot_yaw   = Quaternion::from_axis_angle(y_axis, theta);
        let rot_pitch = Quaternion::from_axis_angle(x_axis, phi);
        let rot = rot_yaw * rot_pitch;

        // apply yaw+pitch to the camera-to-center vector
        let mut new_dir = rot.rotate_vector(dir);

        // prevent flipping over the poles: if too close to up direction, keep the old dir
        // (you can tighten/loosen 0.1 rad as needed)
        if angle_short(y_axis, new_dir) < Rad(0.1) {
            new_dir = dir;
        }

        camera.position = self.center + new_dir;

        // face the center with the chosen up axis (keeps horizon level; no roll)
        camera.rotation = Quaternion::look_at(-new_dir, y_axis);

        // decay based on fps
        let mut decay = (0.8).powf(dt * 60.0);
        if decay < 1e-4 {
            decay = 0.0;
        }

        // decay inputs
        self.rotation.x *= decay; // yaw
        self.rotation.y *= decay; // pitch
        self.rotation.z = 0.0;    // ensure roll stays zero
        if self.rotation.truncate().magnitude() < 1e-4 {
            self.rotation = Vector3::zero();
        }

        self.shift *= decay;
        if self.shift.magnitude() < 1e-4 {
            self.shift = Vector2::zero();
        }

        self.scroll *= decay;
        if self.scroll.abs() < 1e-4 {
            self.scroll = 0.0;
        }

        self.user_inptut = false;
    }
}

fn closest_point(orig: Point3<f32>, dir: Vector3<f32>, point: Point3<f32>) -> Point3<f32> {
    let dir = dir.normalize();
    let lhs = point - orig;
    let dot_p = lhs.dot(dir);
    orig + dir * dot_p
}

fn angle_short(a: Vector3<f32>, b: Vector3<f32>) -> Rad<f32> {
    let angle = a.angle(b);
    if angle > Rad(PI / 2.0) {
        Rad(PI) - angle
    } else {
        angle
    }
}
