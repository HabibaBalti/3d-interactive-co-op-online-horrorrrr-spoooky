import { Box3, Matrix4, type PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Input } from '../core/Input';
import { events } from '../core/events';
import type { InspectTarget } from '../world/house/House';

const DURATION = 0.7;
const FOV_CLOSE = 42;
const ORBIT = 0.35;

const ease = (t: number) => t * t * (3 - 2 * t);

export interface InspectView {
  show(target: InspectTarget): void;
  hide(): void;
}

/**
 * Close-up view: the camera glides from the player's eyes to frame an object, the mouse lets
 * you look around it a little, and the same key brings you back. The player stays where they
 * were; only the camera travels.
 */
export class Inspector {
  private target: InspectTarget | null = null;
  private t = 0;
  private dir: 1 | -1 = 1;
  private readonly centre = new Vector3();
  private readonly toPos = new Vector3();
  private readonly toQuat = new Quaternion();
  private readonly fromPos = new Vector3();
  private readonly fromQuat = new Quaternion();
  private baseFov: number;
  private dist = 1;
  private orbitX = 0;
  private orbitY = 0;
  private readonly m = new Matrix4();
  private readonly up = new Vector3(0, 1, 0);

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly input: Input,
    private readonly view: InspectView,
  ) {
    this.baseFov = camera.fov;
  }

  /** True while the close-up is open or the camera is still travelling. */
  get busy(): boolean {
    return this.target !== null;
  }

  /** True once fully open and not on its way back (accepts "close"). */
  get open(): boolean {
    return this.target !== null && this.dir === 1;
  }

  /** 0 = player's eyes, 1 = fully framed. */
  get amount(): number {
    return ease(this.t);
  }

  show(target: InspectTarget): void {
    this.target = target;
    this.dir = 1;
    this.orbitX = this.orbitY = 0;
    this.input.consumeMouse();

    const box = new Box3().setFromObject(target.object);
    const size = box.getSize(new Vector3());
    box.getCenter(this.centre);
    if (target.def.focusY !== undefined) this.centre.y = box.min.y + target.def.focusY;
    const dist =
      target.def.distance ??
      Math.min(2.5, Math.max(0.5, Math.max(size.x, size.y, size.z) * 1.2 + 0.25));
    this.framing(dist);
    this.view.show(target);

    const sound = target.text.sound;
    if (sound) events.emit('inspect', { id: target.id, sound, ...this.centre });
  }

  private framing(dist: number): void {
    const f = this.target!.front;
    const top = this.target!.def.view === 'top';
    // Orbit: swing a little around the object with the mouse.
    const yaw = this.orbitX;
    const pitch = this.orbitY;
    const dir = new Vector3(f.x, 0, f.z).normalize().applyAxisAngle(this.up, yaw);
    if (top) {
      dir
        .multiplyScalar(0.3)
        .add(new Vector3(0, 1, 0))
        .normalize();
    } else {
      dir.y = 0.22;
      dir.normalize();
    }
    const side = new Vector3().crossVectors(this.up, dir).normalize();
    dir.applyAxisAngle(side, -pitch).normalize();
    this.toPos.copy(this.centre).addScaledVector(dir, dist);
    this.m.lookAt(this.toPos, this.centre, top ? new Vector3(-f.x, 0, -f.z) : this.up);
    this.toQuat.setFromRotationMatrix(this.m);
    this.dist = dist;
  }

  close(): void {
    if (!this.target || this.dir === -1) return;
    this.dir = -1;
    this.view.hide();
  }

  /**
   * Call after the player has placed the camera at their eyes for this frame; blends from there
   * to the close-up.
   */
  update(dt: number): void {
    if (!this.target) return;
    this.t = Math.min(1, Math.max(0, this.t + (this.dir * dt) / DURATION));
    if (this.dir === 1) {
      const [mx, my] = this.input.consumeMouse();
      this.orbitX = Math.max(-ORBIT, Math.min(ORBIT, this.orbitX - mx * 0.0015));
      this.orbitY = Math.max(-ORBIT * 0.6, Math.min(ORBIT * 0.6, this.orbitY - my * 0.0015));
      this.framing(this.dist);
    }
    const k = ease(this.t);
    this.fromPos.copy(this.camera.position);
    this.fromQuat.copy(this.camera.quaternion);
    this.camera.position.lerpVectors(this.fromPos, this.toPos, k);
    this.camera.quaternion.slerpQuaternions(this.fromQuat, this.toQuat, k);
    this.camera.fov = this.baseFov + (FOV_CLOSE - this.baseFov) * k;
    this.camera.updateProjectionMatrix();
    if (this.dir === -1 && this.t === 0) {
      this.target = null;
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
