import { events } from '../core/events';
import { type Object3D, type PerspectiveCamera, SpotLight } from 'three';

/**
 * Sam's flashlight. Hangs off the camera and trails slightly behind fast turns, the way a
 * hand-held light does.
 */
export class Flashlight {
  readonly light = new SpotLight('#d8f0e8', 34, 18, 0.52, 0.55, 1.5);
  private readonly target: Object3D;
  private lagX = 0;
  private lagY = 0;
  private lastYaw = 0;
  private lastPitch = 0;
  on = true;

  constructor(private readonly camera: PerspectiveCamera) {
    this.light.position.set(0.16, -0.14, 0.05);
    this.target = this.light.target;
    this.target.position.set(0, -0.1, -4);
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.bias = -0.002;
    this.light.shadow.camera.near = 0.2;
    camera.add(this.light, this.target);
  }

  setShadows(enabled: boolean): void {
    this.light.castShadow = enabled;
  }

  toggle(): void {
    this.on = !this.on;
    this.light.visible = this.on;
    events.emit('flashlight', { on: this.on });
  }

  /** `dim` 0..1 softens the beam (close-ups would otherwise glare). */
  update(dt: number, yaw: number, pitch: number, dim = 0): void {
    this.light.intensity = 34 * (1 - dim * 0.6);
    // Lag: the beam lags behind the change in view direction, then catches up.
    this.lagX += (yaw - this.lastYaw) * 1.6;
    this.lagY += (pitch - this.lastPitch) * 1.6;
    this.lastYaw = yaw;
    this.lastPitch = pitch;
    const k = Math.exp(-dt * 9);
    this.lagX *= k;
    this.lagY *= k;
    this.target.position.set(this.lagX * 4, -0.1 - this.lagY * 4, -4);
  }

  dispose(): void {
    this.camera.remove(this.light, this.target);
    this.light.dispose();
  }
}
