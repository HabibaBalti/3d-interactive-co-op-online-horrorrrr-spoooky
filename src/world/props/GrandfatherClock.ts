import { BoxGeometry, CircleGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { inkEdges, toonMaterial } from '../../render/materials/toon';
import { clockFaceTexture } from '../../render/textures';
import type { TimelinePalette } from '../../render/palettes';

/** Hand angles for the clock (clockwise from 12, radians). */
export function handAngles(hours: number, minutes: number): { hour: number; minute: number } {
  return {
    hour: (((hours % 12) + minutes / 60) / 12) * Math.PI * 2,
    minute: (minutes / 60) * Math.PI * 2,
  };
}

/**
 * The grandfather clock. In 1994 it runs; in the present it is stopped at 3:17.
 * (M3 turns this into the first puzzle.)
 */
export class GrandfatherClock {
  readonly root = new Group();
  private readonly hourHand: Mesh;
  private readonly minuteHand: Mesh;
  private readonly pendulum: Group;
  /** Clock time in minutes past midnight. */
  private minutes = 2 * 60 + 41;

  constructor(
    palette: TimelinePalette,
    private running: boolean,
  ) {
    const wood = toonMaterial({ color: palette.surfaces.wood });
    const case_ = inkEdges(new Mesh(new BoxGeometry(0.55, 2.1, 0.35), wood), palette.ink);
    case_.position.y = 1.05;
    this.root.add(case_);
    const hood = inkEdges(new Mesh(new BoxGeometry(0.66, 0.16, 0.42), wood), palette.ink);
    hood.position.y = 2.18;
    this.root.add(hood);

    const face = new Mesh(
      new CircleGeometry(0.22, 32),
      toonMaterial({ map: clockFaceTexture(!running) }),
    );
    face.position.set(0, 1.78, 0.18);
    this.root.add(face);

    const handMat = new MeshBasicMaterial({ color: palette.ink });
    this.hourHand = new Mesh(new BoxGeometry(0.018, 0.12, 0.005), handMat);
    this.hourHand.geometry.translate(0, 0.05, 0);
    this.minuteHand = new Mesh(new BoxGeometry(0.012, 0.18, 0.005), handMat);
    this.minuteHand.geometry.translate(0, 0.08, 0);
    for (const h of [this.hourHand, this.minuteHand]) {
      h.position.set(0, 1.78, 0.19);
      this.root.add(h);
    }

    // Pendulum behind a dark glass window.
    const window_ = new Mesh(
      new BoxGeometry(0.32, 0.9, 0.01),
      new MeshBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.75 }),
    );
    // The glass door is hinged on its left edge so it can swing open.
    window_.geometry.translate(0.16, 0, 0);
    this.door.position.set(-0.16, 1.0, 0.176);
    this.door.add(window_);
    this.root.add(this.door);
    // The compartment behind it (where things can be hidden).
    const back = new Mesh(
      new BoxGeometry(0.3, 0.86, 0.01),
      new MeshBasicMaterial({ color: '#0a0606' }),
    );
    back.position.set(0, 1.0, -0.15);
    this.root.add(back);
    this.pendulum = new Group();
    this.pendulum.position.set(0, 1.4, 0.15);
    const rod = new Mesh(new BoxGeometry(0.01, 0.7, 0.01), handMat);
    rod.position.y = -0.35;
    const bob = new Mesh(new CircleGeometry(0.07, 16), toonMaterial({ color: '#8a6a2a' }));
    bob.position.y = -0.7;
    this.pendulum.add(rod, bob);
    this.root.add(this.pendulum);

    if (!running) this.minutes = 3 * 60 + 17;
    this.applyHands();
  }

  /** The hinged glass door over the pendulum; inside is room to hide something. */
  readonly door = new Group();
  private doorTarget = 0;

  /** Where something left inside the case sits (local coordinates). */
  static readonly COMPARTMENT = { x: 0, y: 0.62, z: 0.02 };

  setRunning(on: boolean): void {
    this.running = on;
    if (!on) this.pendulum.rotation.z = 0;
  }

  setTime(hours: number, minutes: number): void {
    this.minutes = (((hours % 12) + 12) % 12) * 60 + minutes;
    this.applyHands();
  }

  get time(): { h: number; m: number } {
    const total = Math.round(this.minutes) % 720;
    return { h: Math.floor(total / 60) || 12, m: total % 60 };
  }

  openDoor(open = true): void {
    this.doorTarget = open ? -1.9 : 0;
  }

  private applyHands(): void {
    const { hour, minute } = handAngles(Math.floor(this.minutes / 60), this.minutes % 60);
    this.hourHand.rotation.z = -hour;
    this.minuteHand.rotation.z = -minute;
  }

  update(dt: number, time: number): void {
    this.door.rotation.y += (this.doorTarget - this.door.rotation.y) * (1 - Math.exp(-dt * 3));
    if (!this.running) return;
    this.pendulum.rotation.z = Math.sin(time * Math.PI) * 0.12;
    this.minutes += dt / 60;
    this.applyHands();
  }
}
