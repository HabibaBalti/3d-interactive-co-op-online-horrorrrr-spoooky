import {
  AmbientLight,
  Color,
  type MeshToonMaterial,
  Box3,
  BoxGeometry,
  type BufferGeometry,
  DirectionalLight,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  PointLight,
  Quaternion,
  type ShaderMaterial,
  Vector3,
} from 'three';
import type { Timeline } from '../../../shared/types';
import { CollisionWorld } from '../../physics/CollisionWorld';
import type { InteractionSystem } from '../../interaction/InteractionSystem';
import { StaticBatcher } from '../../render/StaticBatcher';
import { createGlassMaterial } from '../../render/materials/glass';
import {
  createMaterialLibrary,
  disposeMaterialLibrary,
  type MaterialLibrary,
} from '../../render/materials/library';
import { inkEdges, toonMaterial } from '../../render/materials/toon';
import { INSPECTABLES, type Inspectable, type InspectText } from '../../data/inspectables';
import { PALETTES, type TimelinePalette } from '../../render/palettes';
import { blotchTexture, childDrawingTexture, seeded } from '../../render/textures';
import { GrandfatherClock } from '../props/GrandfatherClock';
import { Storm } from '../Storm';
import { Door } from './Door';
import { buildPropParts, sheetOver, type Part } from './props';
import type { HouseLayout, LightSpec, PropPlacement, PropSpec, SurfaceKey } from './types';
import { frameBox, splitWall, WALL_THICKNESS, type Box3D, type SplitWall } from './walls';

export interface HouseOptions {
  shadows: boolean;
  photosensitive: () => boolean;
  /** The player chose to look closely at something. */
  onInspect?: (target: InspectTarget) => void;
}

/** Something the player can lean in and look at. */
export interface InspectTarget {
  id: string;
  object: Object3D;
  def: Inspectable;
  text: InspectText;
  /** Horizontal direction the object faces (where to stand to look at it). */
  front: Vector3;
}

const GLOW = new Color('#e8d9b0');

/** Below this feet height the player is in the basement. */
const BASEMENT_LEVEL = -1.5;
const SLAB = 0.3;

const tmpM = new Matrix4();

function boxMatrix(b: Box3D): Matrix4 {
  return new Matrix4().makeTranslation(
    (b.minX + b.maxX) / 2,
    (b.minY + b.maxY) / 2,
    (b.minZ + b.maxZ) / 2,
  );
}

function boxGeometry(b: Box3D): BoxGeometry {
  return new BoxGeometry(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
}

/**
 * One timeline's version of the Hale house, built from layout data: merged static geometry,
 * colliders and floor zones, doors, props, lights and the storm. Each client only ever builds
 * its own timeline.
 */
export class House {
  readonly root = new Group();
  readonly collision = new CollisionWorld();
  readonly palette: TimelinePalette;
  readonly doors = new Map<string, Door>();
  /** Things the interaction ray can't see through. */
  readonly occluders: Object3D[] = [];
  private readonly materials: MaterialLibrary;
  private readonly glass: ShaderMaterial;
  private readonly batcher = new StaticBatcher();
  private readonly lamps: { light: PointLight; spec: LightSpec; seed: number }[] = [];
  private readonly ambient: AmbientLight;
  private readonly moon: DirectionalLight;
  private readonly storm: Storm | null;
  private clock?: GrandfatherClock;
  private readonly rand: () => number;
  private readonly inspectables: {
    mats: MeshToonMaterial[];
    hovered: boolean;
    glow: number;
  }[] = [];
  /** 0..1 lightning flash for the post pass. */
  flash = 0;

  constructor(
    readonly timeline: Timeline,
    private readonly layout: HouseLayout,
    private readonly interaction: InteractionSystem,
    private readonly options: HouseOptions,
  ) {
    const p = (this.palette = PALETTES[timeline]);
    this.rand = seeded(timeline === '1994' ? 1994 : 2026);
    this.materials = createMaterialLibrary(p);
    this.glass = createGlassMaterial(p.sky, p.rain);

    for (const w of layout.walls) this.buildWall(splitWall(w), w.surface, !!w.skirting);
    this.buildFloors();
    for (const prop of layout.props) this.buildProp(prop);

    const statics = this.batcher.build(this.materials, p.ink, options.shadows);
    this.root.add(statics);
    this.occluders.push(statics);

    if (timeline === 'present') {
      this.buildPuddles();
    }

    this.ambient = new AmbientLight(p.ambient, p.ambientIntensity);
    this.moon = new DirectionalLight(p.moon, p.moonIntensity);
    this.moon.position.set(-10, 8, -14);
    this.moon.target.position.set(0, 0, 0);
    this.moon.shadow.camera.left = this.moon.shadow.camera.bottom = -12;
    this.moon.shadow.camera.right = this.moon.shadow.camera.top = 12;
    this.moon.shadow.camera.far = 40;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias = -0.0015;
    this.root.add(this.ambient, this.moon, this.moon.target);

    for (const spec of layout.lights) {
      if (spec.timeline !== timeline) continue;
      const light = new PointLight(spec.color, spec.intensity, spec.distance, 1.5);
      light.position.set(...spec.pos);
      light.shadow.bias = -0.004;
      light.shadow.mapSize.set(512, 512);
      this.root.add(light);
      this.lamps.push({ light, spec, seed: this.rand() * 100 });
    }
    this.setShadows(options.shadows);

    this.storm = timeline === '1994' ? new Storm(options.photosensitive) : null;
  }

  // --- Building ------------------------------------------------------------------------------

  private addSolid(b: Box3D, surface: SurfaceKey, collide = true, ink = true): void {
    this.batcher.add(boxGeometry(b), boxMatrix(b), surface, ink);
    if (collide) this.collision.addBox(b);
  }

  private buildWall(w: SplitWall, surface: SurfaceKey, skirting: boolean): void {
    const f = w.frame;
    const base = w.solids[0]?.minY ?? 0;
    for (const s of w.solids) this.addSolid(s, surface);
    if (skirting) {
      for (const [a0, a1] of w.spans) {
        this.addSolid(frameBox(f, a0, a1, base, base + 0.12, WALL_THICKNESS + 0.03), 'trim', false);
      }
    }
    for (const o of w.openings) {
      const { spec } = o;
      if (spec.kind === 'window') {
        this.buildWindow(w, o.a0, o.a1, o.y0, o.y1);
        continue;
      }
      // Door frame: two jambs and a header, proud of the wall on both faces.
      const t = WALL_THICKNESS + 0.05;
      this.addSolid(frameBox(f, o.a0 - 0.07, o.a0, o.y0, o.y1 + 0.07, t), 'trim', false);
      this.addSolid(frameBox(f, o.a1, o.a1 + 0.07, o.y0, o.y1 + 0.07, t), 'trim', false);
      this.addSolid(frameBox(f, o.a0 - 0.07, o.a1 + 0.07, o.y1, o.y1 + 0.07, t), 'trim', false);
      if (spec.kind === 'door' && spec.door) {
        const door = new Door(
          spec.door,
          f,
          o,
          this.timeline,
          this.materials,
          this.palette.ink,
          this.collision,
          this.interaction,
        );
        this.doors.set(spec.door.id, door);
        this.root.add(door.root);
        this.occluders.push(door.root);
      }
    }
  }

  private buildWindow(w: SplitWall, a0: number, a1: number, y0: number, y1: number): void {
    const f = w.frame;
    const glass = new Mesh(new PlaneGeometry(a1 - a0, y1 - y0), this.glass);
    const mid = (a0 + a1) / 2;
    glass.position.set(f.axis === 'x' ? mid : f.c, (y0 + y1) / 2, f.axis === 'x' ? f.c : mid);
    if (f.axis === 'z') glass.rotation.y = Math.PI / 2;
    this.root.add(glass);

    this.addSolid(
      frameBox(f, a0 - 0.06, a1 + 0.06, y0 - 0.05, y0, WALL_THICKNESS + 0.1),
      'trim',
      false,
    );
    if (this.timeline === '1994') {
      const t = 0.05;
      this.addSolid(frameBox(f, mid - 0.025, mid + 0.025, y0, y1, t), 'trim', false);
      this.addSolid(
        frameBox(f, a0, a1, (y0 + y1) / 2 - 0.025, (y0 + y1) / 2 + 0.025, t),
        'trim',
        false,
      );
    } else {
      // Boarded up from inside, crooked, with gaps for the moonlight.
      const boards = Math.max(2, Math.round((y1 - y0) / 0.3));
      for (let i = 0; i < boards; i++) {
        const y = y0 + ((i + 0.5) / boards) * (y1 - y0);
        const board = new BoxGeometry(a1 - a0 + 0.3, 0.14, 0.03);
        const rot = (this.rand() - 0.5) * 0.25;
        const pos = new Vector3(f.axis === 'x' ? mid : f.c, y, f.axis === 'x' ? f.c : mid);
        const q = new Quaternion().setFromEuler(
          new Euler(0, f.axis === 'z' ? Math.PI / 2 : 0, rot, 'YXZ'),
        );
        this.batcher.add(board, new Matrix4().compose(pos, q, new Vector3(1, 1, 1)), 'wood');
      }
    }
  }

  private buildFloors(): void {
    for (const fl of this.layout.floors) {
      const [minX, minZ, maxX, maxZ] = fl.rect;
      this.addSolid({ minX, minZ, maxX, maxZ, minY: fl.y - SLAB, maxY: fl.y }, fl.surface, false);
      this.collision.addFloor({
        room: fl.room,
        minX,
        minZ,
        maxX,
        maxZ,
        y0: fl.y,
        y1: fl.y,
        axis: 'z',
        surface: fl.surface === 'tile' || fl.surface === 'concrete' ? fl.surface : 'floor',
      });
    }
    for (const c of this.layout.ceilings) {
      const [minX, minZ, maxX, maxZ] = c.rect;
      this.addSolid(
        { minX, minZ, maxX, maxZ, minY: c.y, maxY: c.y + 0.02 },
        c.surface,
        false,
        false,
      );
    }
    for (const r of this.layout.ramps) {
      const [minX, minZ, maxX, maxZ] = r.rect;
      this.collision.addFloor({
        room: r.room,
        minX,
        minZ,
        maxX,
        maxZ,
        y0: r.y0,
        y1: r.y1,
        axis: r.axis,
      });
      const low = Math.min(r.y0, r.y1);
      for (let i = 0; i < r.steps; i++) {
        const top = r.y0 + ((r.y1 - r.y0) * (i + 0.5)) / r.steps;
        const along = r.axis === 'z' ? [minZ, maxZ] : [minX, maxX];
        const s0 = along[0]! + ((along[1]! - along[0]!) * i) / r.steps;
        const s1 = along[0]! + ((along[1]! - along[0]!) * (i + 1)) / r.steps;
        const b: Box3D =
          r.axis === 'z'
            ? { minX, maxX, minZ: s0, maxZ: s1, minY: low - 0.01, maxY: top }
            : { minX: s0, maxX: s1, minZ, maxZ, minY: low - 0.01, maxY: top };
        this.addSolid(b, 'woodDark', false);
      }
    }
  }

  private placement(prop: PropSpec): PropPlacement | null {
    if (prop.only && prop.only !== this.timeline) return null;
    if (this.timeline === 'present' && prop.present) {
      if (prop.present === 'missing') return null;
      return { ...prop, ...prop.present };
    }
    return prop;
  }

  private buildProp(prop: PropSpec): void {
    const place = this.placement(prop);
    if (!place) return;
    const deg = Math.PI / 180;
    const matrix = new Matrix4().compose(
      new Vector3(...place.pos),
      new Quaternion().setFromEuler(
        new Euler(
          (place.tilt?.[0] ?? 0) * deg,
          (place.rotY ?? 0) * deg,
          (place.tilt?.[1] ?? 0) * deg,
          'YXZ',
        ),
      ),
      new Vector3(1, 1, 1),
    );

    if (prop.kind === 'clock') {
      this.clock = new GrandfatherClock(this.palette, this.timeline === '1994');
      this.clock.root.applyMatrix4(matrix);
      this.root.add(this.clock.root);
      this.collideWorldBox(new Box3().setFromObject(this.clock.root));
      this.makeInspectable(prop, this.clock.root, place);
      return;
    }
    if (prop.kind === 'drawing') {
      const drawing = new Mesh(
        new PlaneGeometry(0.42, 0.42),
        toonMaterial({ map: childDrawingTexture(this.palette.decay) }),
      );
      drawing.applyMatrix4(matrix);
      if (this.timeline === 'present') drawing.rotateZ(-0.12);
      this.root.add(drawing);
      this.makeInspectable(prop, drawing, place);
      return;
    }

    let parts: Part[] = buildPropParts(prop.kind, prop.args);
    const local = new Box3();
    for (const part of parts) local.union(partBounds(part.geometry, part.matrix));
    if (place.sheet) {
      parts.forEach((part) => part.geometry.dispose());
      parts = [sheetOver(local.min.x, local.max.x, local.min.z, local.max.z, local.max.y)];
    }
    const world = new Box3();
    // Things worth a closer look stay separate meshes (with their own materials) so they can
    // glow when looked at; everything else is merged into the static batch.
    const inspectable = prop.id ? INSPECTABLES[prop.id]?.text[this.timeline] : undefined;
    const group = inspectable ? new Group() : null;
    for (const part of parts) {
      const m = tmpM.multiplyMatrices(matrix, part.matrix);
      world.union(partBounds(part.geometry, m));
      if (group) {
        const mesh = new Mesh(part.geometry, this.materials[part.surface].clone());
        mesh.applyMatrix4(m);
        if (part.ink ?? true) inkEdges(mesh, this.palette.ink);
        group.add(mesh);
      } else {
        this.batcher.add(part.geometry, m.clone(), part.surface, part.ink ?? true);
      }
    }
    if (group) {
      this.root.add(group);
      this.makeInspectable(prop, group, place);
    }
    if (prop.collide !== false) this.collideWorldBox(world);
  }

  private makeInspectable(prop: PropSpec, object: Object3D, place: PropPlacement): void {
    const def = prop.id ? INSPECTABLES[prop.id] : undefined;
    const text = def?.text[this.timeline];
    if (!def || !text) return;
    const mats: MeshToonMaterial[] = [];
    object.traverse((o) => {
      const m = (o as Mesh).material;
      if (m && (m as MeshToonMaterial).isMeshToonMaterial) {
        const toon = m as MeshToonMaterial;
        toon.emissive.copy(GLOW);
        toon.emissiveIntensity = 0;
        mats.push(toon);
      }
    });
    const entry = { mats, hovered: false, glow: 0 };
    this.inspectables.push(entry);
    const front = new Vector3(0, 0, 1).applyAxisAngle(
      new Vector3(0, 1, 0),
      ((place.rotY ?? 0) * Math.PI) / 180,
    );
    const target: InspectTarget = { id: prop.id!, object, def, text, front };
    this.interaction.register(object, {
      prompt: () => 'look',
      interact: () => this.options.onInspect?.(target),
      hover: (on) => (entry.hovered = on),
    });
  }

  private collideWorldBox(b: Box3): void {
    this.collision.addBox({
      minX: b.min.x,
      minY: b.min.y,
      minZ: b.min.z,
      maxX: b.max.x,
      maxY: b.max.y,
      maxZ: b.max.z,
    });
  }

  private buildPuddles(): void {
    const water = new MeshStandardMaterial({
      color: '#0b1e20',
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    for (const p of this.layout.puddles) {
      const mesh = new Mesh(new PlaneGeometry(...p.size), water);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(p.pos[0], p.pos[1] + 0.012, p.pos[2]);
      this.root.add(mesh);
    }
    // Mould creeping up the walls.
    const blotches = [0, 1, 2, 3].map(
      (i) => new MeshBasicMaterial({ map: blotchTexture(i), transparent: true, depthWrite: false }),
    );
    for (const w of this.layout.walls) {
      if (w.surface !== 'wallpaper') continue;
      const split = splitWall(w);
      for (const [a0, a1] of split.spans) {
        if (a1 - a0 < 1 || this.rand() > 0.7) continue;
        const f = split.frame;
        const face = this.rand() > 0.5 ? 1 : -1;
        const a = a0 + 0.5 + this.rand() * (a1 - a0 - 1);
        const size = 0.8 + this.rand() * 1.4;
        const mesh = new Mesh(new PlaneGeometry(size, size), blotches[(this.rand() * 4) | 0]!);
        const off = face * (WALL_THICKNESS / 2 + 0.004);
        mesh.position.set(
          f.axis === 'x' ? a : f.c + off,
          w.y0 + 0.4 + this.rand() * 1.8,
          f.axis === 'x' ? f.c + off : a,
        );
        mesh.rotation.y =
          f.axis === 'x' ? (face > 0 ? 0 : Math.PI) : face > 0 ? Math.PI / 2 : -Math.PI / 2;
        this.root.add(mesh);
      }
    }
  }

  // --- Runtime -------------------------------------------------------------------------------

  setShadows(enabled: boolean): void {
    this.moon.castShadow = enabled;
    for (const { light, spec } of this.lamps) light.castShadow = enabled && !!spec.castShadow;
    this.root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      if (o.parent?.name === 'static') mesh.castShadow = mesh.receiveShadow = enabled;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) m.needsUpdate = true;
    });
  }

  update(dt: number, time: number, feetY: number): void {
    // Things you can look at glow softly while you look at them.
    for (const it of this.inspectables) {
      const target = it.hovered ? 0.2 + Math.sin(time * 4) * 0.08 : 0;
      it.glow += (target - it.glow) * (1 - Math.exp(-dt * 10));
      for (const m of it.mats) m.emissiveIntensity = it.glow;
    }
    for (const door of this.doors.values()) door.update(dt);
    this.clock?.update(dt, time);
    this.storm?.update(dt);

    const below = feetY < BASEMENT_LEVEL;
    const calm = this.options.photosensitive();
    for (const { light, spec, seed } of this.lamps) {
      let k = 1;
      if (spec.flicker === 1) {
        const dip = Math.sin(time * 13.1 + seed) * Math.sin(time * 7.7 + seed) > 0.86 ? 0.45 : 0;
        k = 1 - dip * (calm ? 0.15 : 1) + Math.sin(time * 31 + seed) * 0.03;
      } else if (spec.flicker === 2) {
        // Television: scene cuts and brightness shifts.
        const cut = Math.floor(time * 1.7 + seed);
        k =
          0.6 +
          0.4 * Math.abs(Math.sin(cut * 12.9898)) +
          Math.sin(time * 23) * (calm ? 0.01 : 0.06);
      }
      light.intensity = spec.intensity * k;
    }

    const flash = this.storm?.flash ?? 0;
    // The basement only gets what leaks through two small windows.
    this.flash = below ? flash * 0.25 : flash;
    this.ambient.intensity = this.palette.ambientIntensity * (below ? 0.45 : 1);
    this.moon.intensity = (this.palette.moonIntensity + flash * 3) * (below ? 0.2 : 1);
    this.glass.uniforms.uFlash!.value = flash;
    this.glass.uniforms.uTime!.value = time;
  }

  dispose(): void {
    this.root.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    disposeMaterialLibrary(this.materials);
    for (const it of this.inspectables) it.mats.forEach((m) => m.dispose());
    this.glass.dispose();
  }
}

function partBounds(geometry: BufferGeometry, matrix: Matrix4): Box3 {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  return geometry.boundingBox!.clone().applyMatrix4(matrix);
}
