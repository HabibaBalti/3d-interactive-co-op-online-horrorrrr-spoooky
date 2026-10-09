import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
  BoxGeometry,
  type Color,
} from 'three';
import { seeded } from '../render/textures';

const DRIPS = 40;

/**
 * The entity's silhouette: too tall for the ceiling, neck bent, wet black hair hanging over
 * where a face should be, arms too long, always dripping. Pure unlit black so it reads as a
 * hole in the image rather than an object, and fog swallows it at distance.
 */
export class EntityFigure {
  readonly root = new Group();
  private readonly strands: Mesh[] = [];
  private readonly drips: Points;
  private readonly dripSpeed = new Float32Array(DRIPS);
  private readonly head = new Group();

  constructor(ink: Color) {
    const black = new MeshBasicMaterial({ color: ink });
    const rand = seeded(317);

    const body = new Mesh(new CylinderGeometry(0.13, 0.3, 2.15, 7), black);
    body.position.y = 1.07;
    this.root.add(body);

    // Head bends forward under the ceiling.
    this.head.position.set(0, 2.2, 0.08);
    this.head.rotation.x = 0.55;
    this.head.add(new Mesh(new SphereGeometry(0.15, 10, 8), black));
    this.root.add(this.head);

    // Hair: thin strands hanging from the crown, mostly in front of the face.
    for (let i = 0; i < 46; i++) {
      const len = 0.9 + rand() * 0.9;
      const strand = new Mesh(new BoxGeometry(0.014, len, 0.014), black);
      strand.geometry.translate(0, -len / 2, 0);
      const a = (rand() - 0.5) * Math.PI * 1.4;
      strand.position.set(Math.sin(a) * 0.13, 0.08, Math.cos(a) * 0.12);
      strand.rotation.set(-0.5 + rand() * 0.1, 0, (rand() - 0.5) * 0.1);
      strand.userData.phase = rand() * Math.PI * 2;
      this.head.add(strand);
      this.strands.push(strand);
    }

    // Arms hang past the knees.
    for (const side of [-1, 1]) {
      const arm = new Mesh(new CylinderGeometry(0.035, 0.022, 1.55, 5), black);
      arm.geometry.translate(0, -0.78, 0);
      arm.position.set(side * 0.2, 1.95, 0.02);
      arm.rotation.z = side * 0.07;
      this.root.add(arm);
    }

    // Puddle it stands in.
    const puddle = new Mesh(
      new CircleGeometry(0.6, 16),
      new MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.85 }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.y = 0.012;
    this.root.add(puddle);

    const positions = new Float32Array(DRIPS * 3);
    for (let i = 0; i < DRIPS; i++) this.resetDrip(positions, i, rand() * 2.2);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    this.drips = new Points(
      geo,
      new PointsMaterial({ color: ink, size: 0.025, transparent: true, opacity: 0.9 }),
    );
    this.root.add(this.drips);
  }

  private resetDrip(positions: Float32Array, i: number, y?: number): void {
    const a = Math.random() * Math.PI * 2;
    const r = 0.1 + Math.random() * 0.25;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y ?? 0.6 + Math.random() * 1.6;
    positions[i * 3 + 2] = Math.sin(a) * r;
    this.dripSpeed[i] = 0;
  }

  update(dt: number, time: number): void {
    for (const s of this.strands) {
      const p = s.userData.phase as number;
      s.rotation.z = Math.sin(time * 0.6 + p) * 0.04;
    }
    // Slight, wrong head motion: a slow tilt, then a small twitch.
    this.head.rotation.z = Math.sin(time * 0.3) * 0.12 + (Math.sin(time * 7.3) > 0.995 ? 0.08 : 0);

    const attr = this.drips.geometry.getAttribute('position') as BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < DRIPS; i++) {
      this.dripSpeed[i]! += 9.8 * dt;
      arr[i * 3 + 1]! -= this.dripSpeed[i]! * dt;
      if (arr[i * 3 + 1]! < 0) this.resetDrip(arr, i);
    }
    attr.needsUpdate = true;
  }
}
