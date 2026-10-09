import { BoxGeometry, type Color, Group, type Material, Mesh, SphereGeometry } from 'three';
import type { Timeline } from '../../../shared/types';
import { events, type DoorAction } from '../../core/events';
import type { AABB, CollisionWorld } from '../../physics/CollisionWorld';
import { inkEdges } from '../../render/materials/toon';
import type { Interactable, InteractionSystem } from '../../interaction/InteractionSystem';
import type { MaterialLibrary } from '../../render/materials/library';
import type { DoorSpec } from './types';
import { frameBox, type PlacedOpening, type WallFrame } from './walls';

const OPEN_ANGLE = 1.75;

/**
 * A hinged door in a wall opening. Closed doors collide; open ones don't. Locked and bolted
 * doors rattle. The optional bolt is its own interactable on one face only, so it can be
 * slid from the hall but never from the basement stairs.
 */
export class Door implements Interactable {
  readonly root = new Group();
  private readonly pivot = new Group();
  private readonly collider: AABB;
  private readonly boltBar?: Mesh;
  private readonly boltRest: number = 0;
  private readonly boltAxis: 'x' | 'z' = 'x';
  private readonly boltSlide: number = 0;
  private angle: number;
  private target: number;
  private rattle = 0;
  private readonly centre: { x: number; y: number; z: number };
  bolted: boolean;

  constructor(
    readonly spec: DoorSpec,
    frame: WallFrame,
    opening: PlacedOpening,
    timeline: Timeline,
    materials: MaterialLibrary,
    ink: Color,
    collision: CollisionWorld,
    interaction: InteractionSystem,
  ) {
    const width = opening.a1 - opening.a0;
    const mid = (opening.a0 + opening.a1) / 2;
    this.centre = {
      x: frame.axis === 'x' ? mid : frame.c,
      y: opening.y0 + 1.2,
      z: frame.axis === 'x' ? frame.c : mid,
    };
    const height = opening.y1 - opening.y0;
    this.angle = this.target = spec.open?.[timeline] ?? 0;
    this.bolted = spec.bolt?.bolted[timeline] ?? false;

    // Hinge on the wall centreline at one end of the opening. The panel is built along +x
    // from the pivot, then the pivot is turned to lie along the wall.
    const hingeA = spec.hinge === 'start' ? opening.a0 : opening.a1;
    const along = spec.hinge === 'start' ? 1 : -1;
    const hx = frame.axis === 'x' ? hingeA : frame.c;
    const hz = frame.axis === 'x' ? frame.c : hingeA;
    this.pivot.position.set(hx, opening.y0, hz);
    // Base yaw so local +x points along the wall toward the latch side.
    const base =
      frame.axis === 'x' ? (along === 1 ? 0 : Math.PI) : along === 1 ? -Math.PI / 2 : Math.PI / 2;
    this.pivot.userData.base = base;
    this.pivot.userData.sign = spec.swing * along * (frame.axis === 'x' ? -1 : 1);
    this.root.add(this.pivot);

    const panel = new Mesh(
      new BoxGeometry(width - 0.03, height - 0.02, 0.045),
      materials.wood as Material,
    );
    panel.geometry.translate((width - 0.03) / 2 + 0.015, (height - 0.02) / 2, 0);
    inkEdges(panel, ink);
    this.pivot.add(panel);
    for (const face of [-1, 1]) {
      const knob = new Mesh(new SphereGeometry(0.035, 8, 6), materials.metal);
      knob.position.set(width - 0.1, 1.0, face * 0.05);
      this.pivot.add(knob);
    }

    const box = frameBox(frame, opening.a0, opening.a1, opening.y0, opening.y1, 0.1);
    this.collider = collision.addBox({ ...box });

    if (spec.bolt) {
      // Mounted on the wall just past the latch edge, on one face only, at chest height.
      // Bolted, the bar slides across onto the door.
      const latchA = spec.hinge === 'start' ? opening.a1 : opening.a0;
      const restA = latchA + along * 0.12;
      const offset = spec.bolt.side * 0.1;
      const onX = frame.axis === 'x';
      const plate = new Mesh(
        new BoxGeometry(onX ? 0.2 : 0.02, 0.07, onX ? 0.02 : 0.2),
        materials.metal,
      );
      plate.position.set(
        onX ? restA : frame.c + offset,
        opening.y0 + 1.45,
        onX ? frame.c + offset : restA,
      );
      inkEdges(plate, ink);
      const bar = new Mesh(
        new BoxGeometry(onX ? 0.2 : 0.03, 0.03, onX ? 0.03 : 0.2),
        materials.black,
      );
      bar.position.copy(plate.position);
      bar.position[onX ? 'z' : 'x'] += spec.bolt.side * 0.02;
      this.boltBar = bar;
      this.boltRest = restA;
      this.boltAxis = onX ? 'x' : 'z';
      this.boltSlide = -along * 0.14;
      const target = new Group();
      target.add(plate, bar);
      this.root.add(target);
      interaction.register(target, {
        prompt: () =>
          this.angle > 0.05 ? null : this.boltStuck ? 'stuck' : this.bolted ? 'unbolt' : 'bolt',
        interact: () => {
          if (this.boltStuck) {
            this.rattle = 0.3;
            this.sound('rattle');
            return;
          }
          this.bolted = !this.bolted;
          this.placeBolt();
          this.sound(this.bolted ? 'bolt' : 'unbolt');
          this.onBolt?.(this.bolted);
        },
      });
      this.placeBolt();
    }

    interaction.register(this.pivot, this);
    this.apply();
  }

  private placeBolt(): void {
    if (!this.boltBar) return;
    this.boltBar.position[this.boltAxis] = this.boltRest + (this.bolted ? this.boltSlide : 0);
  }

  /** Rusted solid: the bolt won't move (until the story lets it). */
  boltStuck = false;
  /** Someone slid the bolt by hand. */
  onBolt: ((bolted: boolean) => void) | null = null;

  /** Story overrides: the house can lock, unlock or bolt a door by itself. */
  forceLocked: boolean | null = null;

  get locked(): boolean {
    return (this.forceLocked ?? !!this.spec.locked) || this.bolted;
  }

  get isOpen(): boolean {
    return this.target > 0;
  }

  setOpen(open: boolean): void {
    if (open === this.target > 0) return;
    this.target = open ? OPEN_ANGLE : 0;
    if (open) this.sound('open');
  }

  /** Slide the bolt without anyone touching it. */
  setBolted(bolted: boolean): void {
    if (this.bolted === bolted) return;
    this.bolted = bolted;
    this.placeBolt();
    this.sound(bolted ? 'bolt' : 'unbolt');
  }

  /** Hook for puzzles: a locked door with a key in hand says "unlock". */
  onLockedUse: (() => boolean) | null = null;
  lockedPrompt: (() => string | null) | null = null;

  prompt(): string {
    if (this.forceLocked ?? this.spec.locked) return this.lockedPrompt?.() ?? 'locked';
    if (this.bolted && this.target === 0) return 'stuck';
    return this.target > 0 ? 'close' : 'open';
  }

  private sound(action: DoorAction): void {
    events.emit('door', { action, ...this.centre });
  }

  interact(): void {
    if ((this.forceLocked ?? this.spec.locked) && this.target === 0 && this.onLockedUse?.()) return;
    if (this.locked && this.target === 0) {
      this.rattle = 0.4;
      this.sound('rattle');
      return;
    }
    this.target = this.target > 0 ? 0 : OPEN_ANGLE;
    if (this.target > 0) this.sound('open');
  }

  private apply(): void {
    const wiggle = this.rattle > 0 ? Math.sin(this.rattle * 60) * 0.015 * this.rattle : 0;
    this.pivot.rotation.y =
      (this.pivot.userData.base as number) +
      (this.pivot.userData.sign as number) * (this.angle + wiggle);
    this.collider.enabled = this.angle < 0.25;
  }

  update(dt: number): void {
    const before = this.angle;
    this.angle += (this.target - this.angle) * (1 - Math.exp(-dt * 6));
    if (this.target === 0 && before >= 0.04 && this.angle < 0.04) this.sound('close');
    if (Math.abs(this.target - this.angle) < 0.001) this.angle = this.target;
    this.rattle = Math.max(0, this.rattle - dt);
    this.apply();
  }
}
