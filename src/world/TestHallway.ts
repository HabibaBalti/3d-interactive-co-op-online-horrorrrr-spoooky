import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  PointLight,
  SpotLight,
  type PerspectiveCamera,
  SphereGeometry,
} from 'three';
import type { Timeline } from '../../shared/types';
import { EntityFigure } from '../entity/EntityFigure';
import { inkEdges, toonMaterial } from '../render/materials/toon';
import { PALETTES, type TimelinePalette } from '../render/palettes';
import { blotchTexture, childDrawingTexture, seeded, wallpaperTexture } from '../render/textures';
import { GrandfatherClock } from './props/GrandfatherClock';

const W = 2.4; // hallway width
const H = 2.7; // ceiling height
const Z_NEAR = 8;
const Z_FAR = -10;
const LEN = Z_NEAR - Z_FAR;

export interface HallwayOptions {
  photosensitive: boolean;
  shadows: boolean;
}

/**
 * M0 visual target: the upstairs hallway of the Hale house, built from primitives, in either
 * timeline. Not the real level (that is M1's greybox house); this exists to lock the art
 * direction and prove the render pipeline.
 */
export class TestHallway {
  readonly root = new Group();
  readonly palette: TimelinePalette;
  private readonly entity: EntityFigure;
  private readonly clock: GrandfatherClock;
  private readonly lamp?: PointLight;
  private readonly moon: DirectionalLight;
  private nextStrike = 4;
  private strike = -1;
  /** 0..1 brightness of the current lightning flash, read by the post pass. */
  flash = 0;

  constructor(
    readonly timeline: Timeline,
    camera: PerspectiveCamera,
    private readonly options: HallwayOptions,
  ) {
    const p = (this.palette = PALETTES[timeline]);
    const decayed = timeline === 'present';
    const rand = seeded(timeline === '1994' ? 11 : 12);

    // --- Shell -----------------------------------------------------------------------------
    const wallpaper = wallpaperTexture(p.wallpaperBase, p.wallpaperPattern, p.decay);
    wallpaper.repeat.set(LEN / 1.2, H / 1.2);
    const wallMat = toonMaterial({ map: wallpaper });
    for (const side of [-1, 1]) {
      const wall = new Mesh(new BoxGeometry(0.1, H, LEN), wallMat);
      wall.position.set(side * (W / 2 + 0.05), H / 2, (Z_NEAR + Z_FAR) / 2);
      this.add(wall);
      // Dado rail and skirting board: the strongest ink lines in the shot.
      for (const [y, h] of [
        [0.9, 0.05],
        [0.07, 0.14],
      ] as const) {
        const trim = new Mesh(new BoxGeometry(0.04, h, LEN), toonMaterial({ color: p.trim }));
        trim.position.set(side * (W / 2 - 0.01), y, wall.position.z);
        this.add(inkEdges(trim, p.ink));
      }
    }
    const ceiling = new Mesh(new BoxGeometry(W, 0.1, LEN), toonMaterial({ color: p.ceiling }));
    ceiling.position.set(0, H + 0.05, (Z_NEAR + Z_FAR) / 2);
    this.add(ceiling);
    const backWall = new Mesh(new BoxGeometry(W, H, 0.1), wallMat);
    backWall.position.set(0, H / 2, Z_NEAR);
    this.add(backWall);

    // End wall with a window: lightning and moonlight come through here.
    const endMat = toonMaterial({ color: p.trim });
    const endParts: [number, number, number, number][] = [
      [W, 0.9, 0, 0.45], // below sill
      [W, 0.6, 0, H - 0.3], // above window
      [0.6, 1.2, -0.9, 1.5],
      [0.6, 1.2, 0.9, 1.5],
    ];
    for (const [w, h, x, y] of endParts) {
      const m = new Mesh(new BoxGeometry(w, h, 0.1), endMat);
      m.position.set(x, y, Z_FAR);
      this.add(inkEdges(m, p.ink));
    }
    const glass = new Mesh(
      new PlaneGeometry(1.2, 1.2),
      new MeshBasicMaterial({ color: decayed ? '#7fa6a2' : '#3a3a5c', fog: false }),
    );
    glass.position.set(0, 1.5, Z_FAR - 0.06);
    this.add(glass);
    if (decayed) {
      // Boarded up, moonlight bleeding between the planks.
      for (const [y, rot] of [
        [1.2, 0.08],
        [1.55, -0.05],
        [1.85, 0.12],
      ] as const) {
        const board = new Mesh(new BoxGeometry(1.5, 0.16, 0.04), toonMaterial({ color: p.wood }));
        board.position.set(0, y, Z_FAR + 0.08);
        board.rotation.z = rot;
        this.add(inkEdges(board, p.ink));
      }
    } else {
      const mullion = new Mesh(new BoxGeometry(0.05, 1.2, 0.05), toonMaterial({ color: p.trim }));
      mullion.position.set(0, 1.5, Z_FAR + 0.02);
      const transom = mullion.clone();
      transom.rotation.z = Math.PI / 2;
      this.add(inkEdges(mullion, p.ink), inkEdges(transom, p.ink));
    }

    // --- Floorboards -----------------------------------------------------------------------
    const planks = 12;
    const segment = 3;
    const pw = W / planks;
    for (let i = 0; i < planks; i++) {
      for (let s = 0; s < LEN / segment; s++) {
        const z = Z_NEAR - segment / 2 - s * segment;
        // In the present a patch of floor has rotted through.
        const rotted = decayed && i >= 4 && i <= 7 && s === 2;
        if (rotted && i !== 7) continue;
        const shade = p.floor.clone().multiplyScalar(0.85 + rand() * 0.3);
        const plank = new Mesh(
          new BoxGeometry(pw - 0.008, 0.05, segment - 0.01),
          toonMaterial({ color: shade }),
        );
        plank.position.set(-W / 2 + pw * (i + 0.5), -0.025, z);
        if (rotted) {
          plank.rotation.x = 0.25;
          plank.position.y = -0.2;
        }
        this.add(inkEdges(plank, p.ink, 0.5));
      }
    }
    if (decayed) {
      const pit = new Mesh(
        new BoxGeometry(pw * 4, 0.02, segment),
        new MeshBasicMaterial({ color: p.ink }),
      );
      pit.position.set(-W / 2 + pw * 6, -0.5, Z_NEAR - segment * 2.5);
      this.add(pit);
      // Standing water toward the far end.
      const water = new Mesh(
        new PlaneGeometry(W, 7),
        new MeshStandardMaterial({
          color: '#0d2224',
          roughness: 0.08,
          metalness: 0.2,
          transparent: true,
          opacity: 0.8,
        }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.015, Z_FAR + 3.5);
      this.add(water);
    }

    // --- Doors ------------------------------------------------------------------------------
    const doors: [number, number, number][] = [
      [-1, 3, 0],
      [1, 0, 0],
      [-1, -3.5, 0],
      [1, -6, decayed ? 0.5 : 0], // ajar in the present
    ];
    for (const [side, z, ajar] of doors) {
      const frame = new Mesh(new BoxGeometry(0.06, 2.15, 1.05), toonMaterial({ color: p.trim }));
      frame.position.set(side * (W / 2 - 0.02), 1.075, z);
      this.add(inkEdges(frame, p.ink));
      const dark = new Mesh(
        new BoxGeometry(0.02, 2.0, 0.85),
        new MeshBasicMaterial({ color: p.ink }),
      );
      dark.position.set(side * (W / 2 - 0.045), 1.0, z);
      this.add(dark);
      const door = new Mesh(new BoxGeometry(0.04, 2.0, 0.85), toonMaterial({ color: p.wood }));
      door.geometry.translate(0, 0, 0.425);
      door.position.set(side * (W / 2 - 0.07), 1.0, z - 0.425);
      door.rotation.y = side * ajar;
      const knob = new Mesh(new SphereGeometry(0.035, 8, 6), toonMaterial({ color: '#7a6a3a' }));
      knob.position.set(-side * 0.04, 0, 0.75);
      door.add(knob);
      this.add(inkEdges(door, p.ink));
    }

    // --- Props ------------------------------------------------------------------------------
    this.clock = new GrandfatherClock(p, !decayed);
    this.clock.root.position.set(W / 2 - 0.2, 0, -2.2);
    this.clock.root.rotation.y = -Math.PI / 2;
    this.add(this.clock.root);

    const drawing = new Mesh(
      new PlaneGeometry(0.42, 0.42),
      toonMaterial({ map: childDrawingTexture(p.decay) }),
    );
    drawing.position.set(-W / 2 + 0.002, 1.4, 1.4);
    drawing.rotation.y = Math.PI / 2;
    drawing.rotation.z = decayed ? -0.12 : 0.03; // hanging crooked from one pin later
    this.add(drawing);

    // Side table with a lamp; lit in 1994, knocked over and dead in the present.
    const table = new Mesh(new BoxGeometry(0.4, 0.75, 0.6), toonMaterial({ color: p.wood }));
    table.position.set(-W / 2 + 0.25, 0.375, -1);
    this.add(inkEdges(table, p.ink));
    const shade = new Mesh(
      new BoxGeometry(0.3, 0.25, 0.3),
      decayed ? toonMaterial({ color: '#4a4a3a' }) : new MeshBasicMaterial({ color: '#ffc477' }),
    );
    shade.position.set(-W / 2 + 0.25, 1.05, -1);
    if (decayed) {
      shade.position.set(-W / 2 + 0.5, 0.15, -0.4);
      shade.rotation.set(1.2, 0.3, 0.2);
    }
    this.add(inkEdges(shade, p.ink));

    if (decayed) {
      for (let i = 0; i < 7; i++) {
        const blot = new Mesh(
          new PlaneGeometry(1.2, 1.2),
          new MeshBasicMaterial({ map: blotchTexture(i), transparent: true, depthWrite: false }),
        );
        const side = i % 2 ? 1 : -1;
        blot.position.set(side * (W / 2 - 0.005), 0.6 + rand() * 1.8, Z_NEAR - 1 - rand() * LEN);
        blot.rotation.y = -side * (Math.PI / 2);
        this.root.add(blot);
      }
    }

    // --- The entity ---------------------------------------------------------------------------
    this.entity = new EntityFigure(p.ink);
    this.entity.root.position.set(0.12, 0, Z_FAR + 1.6);
    this.entity.root.rotation.y = -0.15;
    this.root.add(this.entity.root);
    // In 1994 it is only there when the lightning shows it.
    this.entity.root.visible = decayed;

    // --- Light ------------------------------------------------------------------------------
    this.root.add(new AmbientLight(p.ambient, p.ambientIntensity));
    this.moon = new DirectionalLight(decayed ? '#8fd0d0' : '#a0a8ff', decayed ? 0.6 : 0.05);
    this.moon.position.set(0.5, 3, Z_FAR - 4);
    this.moon.target.position.set(0, 0, Z_FAR + 6);
    this.root.add(this.moon, this.moon.target);

    if (decayed) {
      // Sam carries a flashlight.
      const torch = new SpotLight('#d8f0e8', 40, 22, 0.55, 0.6, 1.5);
      torch.position.set(0.18, -0.15, 0);
      torch.target.position.set(0, -0.3, -4);
      torch.castShadow = options.shadows;
      torch.shadow.mapSize.set(1024, 1024);
      torch.shadow.bias = -0.002;
      camera.add(torch, torch.target);
      this.root.userData.cameraChildren = [torch, torch.target];
    } else {
      this.lamp = new PointLight('#ffc070', 6, 9, 1.4);
      this.lamp.position.set(-W / 2 + 0.25, 1.15, -1);
      this.lamp.castShadow = options.shadows;
      this.lamp.shadow.bias = -0.003;
      this.root.add(this.lamp);
      const hall = new PointLight('#ff9a50', 1.2, 7, 1.6);
      hall.position.set(0, H - 0.3, 5);
      this.root.add(hall);
    }

    if (options.shadows) {
      this.root.traverse((o) => {
        if ((o as Mesh).isMesh) o.castShadow = o.receiveShadow = true;
      });
      this.entity.root.traverse((o) => (o.castShadow = false));
    }
  }

  private add(...objects: Object3D[]): void {
    this.root.add(...objects);
  }

  update(dt: number, time: number): void {
    this.entity.update(dt, time);
    this.clock.update(dt, time);

    // Lamp flicker: mostly steady, with occasional dips. Tamed in photosensitive mode.
    if (this.lamp) {
      const dip = Math.sin(time * 13.1) * Math.sin(time * 7.7) > 0.86 ? 0.45 : 0;
      const amount = this.options.photosensitive ? 0.15 : 1;
      this.lamp.intensity = 6 * (1 - dip * amount) + Math.sin(time * 31) * 0.15 * amount;
    }

    // Lightning: a double strike every 8-20 s.
    this.nextStrike -= dt;
    if (this.nextStrike <= 0) {
      this.strike = 0;
      this.nextStrike = 8 + Math.random() * 12;
    }
    let f = 0;
    if (this.strike >= 0) {
      this.strike += dt;
      const t = this.strike;
      f = Math.max(0, 1 - t / 0.12) + (t > 0.22 ? Math.max(0, 0.7 - (t - 0.22) / 0.35) : 0);
      if (t > 0.9) this.strike = -1;
    }
    if (this.timeline === '1994') this.entity.root.visible = f > 0.3;
    if (this.options.photosensitive) f = Math.min(f, 0.15);
    this.flash = f;
    const base = this.timeline === 'present' ? 0.6 : 0.05;
    this.moon.intensity = base + f * 4;
  }

  dispose(camera: PerspectiveCamera): void {
    const extra = (this.root.userData.cameraChildren ?? []) as Object3D[];
    camera.remove(...extra);
    this.root.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }
}
