import { type PerspectiveCamera, Vector3 } from 'three';
import type { Input } from '../core/Input';
import type { CollisionWorld } from '../physics/CollisionWorld';
import type { Settings } from '../settings/settings';
import type { Vec3 } from '../world/house/types';

const RADIUS = 0.28;
const STAND = { height: 1.7, eye: 1.58 };
const CROUCH = { height: 1.1, eye: 1.0 };
const SPEED = { walk: 1.9, run: 3.4, crouch: 0.9 };
const LOOK = 0.0022;
const GRAVITY = 20;
const STEP_UP = 0.45;
/** How far below the feet we still snap down to the floor (walking down stairs). */
const SNAP_DOWN = 0.5;

/**
 * First-person walker: WASD + mouse look, run, crouch, stairs, gravity, collision against the
 * house. Slow by design: this is a house you creep through, not run around.
 */
export class PlayerController {
  readonly feet = new Vector3();
  yaw = 0;
  pitch = 0;
  crouched = false;
  room: string | null = null;
  private readonly vel = new Vector3();
  private vy = 0;
  private grounded = false;
  private eye = STAND.eye;
  private eyeY = 0;
  private bobPhase = 0;
  private bobAmount = 0;
  /** Horizontal speed this frame, m/s (the entity will listen to this in M5). */
  speed = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly input: Input,
    private collision: CollisionWorld,
    private readonly settings: () => Settings,
  ) {
    input.onKey('KeyC', () => (this.crouched = !this.crouched));
  }

  setCollision(collision: CollisionWorld): void {
    this.collision = collision;
  }

  spawn(pos: Vec3, yawDeg: number): void {
    this.feet.set(...pos);
    this.yaw = (yawDeg * Math.PI) / 180;
    this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.eyeY = this.feet.y + this.eye;
  }

  /** `active` is false while paused: no input, but the world keeps its grip on the body. */
  update(dt: number, active: boolean): void {
    const s = this.settings();
    if (active) {
      const [mx, my] = this.input.consumeMouse();
      this.yaw -= mx * LOOK * s.mouseSensitivity;
      this.pitch -= my * LOOK * s.mouseSensitivity * (s.invertY ? -1 : 1);
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    }

    // Wish direction relative to where we're looking.
    let f = 0;
    let r = 0;
    if (active) {
      if (this.input.isDown('KeyW', 'ArrowUp')) f += 1;
      if (this.input.isDown('KeyS', 'ArrowDown')) f -= 1;
      if (this.input.isDown('KeyD', 'ArrowRight')) r += 1;
      if (this.input.isDown('KeyA', 'ArrowLeft')) r -= 1;
    }
    const len = Math.hypot(f, r) || 1;
    const running = this.input.isDown('ShiftLeft', 'ShiftRight') && !this.crouched && f > 0;
    const max = this.crouched ? SPEED.crouch : running ? SPEED.run : SPEED.walk;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const tx = ((-sin * f + cos * r) / len) * max;
    const tz = ((-cos * f - sin * r) / len) * max;
    const k = 1 - Math.exp(-dt * 10);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;

    // Move in small substeps so thin walls can't be skipped over.
    const height = this.crouched ? CROUCH.height : STAND.height;
    const dist = Math.hypot(this.vel.x, this.vel.z) * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.08));
    const before = this.feet.clone();
    for (let i = 0; i < steps; i++) {
      this.feet.x += (this.vel.x * dt) / steps;
      this.feet.z += (this.vel.z * dt) / steps;
      this.collision.resolve(this.feet, RADIUS, height, STEP_UP);
    }
    this.speed = Math.hypot(this.feet.x - before.x, this.feet.z - before.z) / Math.max(dt, 1e-4);

    const ground = this.collision.groundAt(this.feet.x, this.feet.z, this.feet.y, STEP_UP);
    if (
      ground &&
      (this.grounded || this.feet.y <= ground.y) &&
      this.feet.y - ground.y < SNAP_DOWN
    ) {
      this.feet.y = ground.y;
      this.vy = 0;
      this.grounded = true;
      this.room = ground.zone.room;
    } else {
      this.grounded = false;
      this.vy -= GRAVITY * dt;
      this.feet.y += this.vy * dt;
      if (ground && this.feet.y <= ground.y) {
        this.feet.y = ground.y;
        this.vy = 0;
        this.grounded = true;
      }
    }
    if (this.feet.y < -30) this.feet.set(0.5, 0, 5); // fell out of the world

    // Camera: smoothed eye height (stairs, crouch) and a gentle head bob.
    const targetEye = this.crouched ? CROUCH.eye : STAND.eye;
    this.eye += (targetEye - this.eye) * (1 - Math.exp(-dt * 8));
    this.eyeY += (this.feet.y + this.eye - this.eyeY) * (1 - Math.exp(-dt * 14));
    const moving = this.grounded && this.speed > 0.2;
    this.bobAmount += ((moving && s.headBob ? 1 : 0) - this.bobAmount) * (1 - Math.exp(-dt * 6));
    this.bobPhase += dt * (running ? 10.5 : this.crouched ? 5 : 7.5) * (moving ? 1 : 0);
    const bobY = Math.sin(this.bobPhase * 2) * 0.022 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase) * 0.012 * this.bobAmount;

    this.camera.position.set(
      this.feet.x + Math.cos(this.yaw) * bobX,
      this.eyeY + bobY,
      this.feet.z - Math.sin(this.yaw) * bobX,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
