import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { seeded } from '../../render/textures';
import type { PropKind, SurfaceKey } from './types';

/** One piece of a prop, in the prop's local space (origin on the floor, front facing +z). */
export interface Part {
  geometry: BufferGeometry;
  surface: SurfaceKey;
  matrix: Matrix4;
  ink?: boolean;
}

type Args = Record<string, number>;

const m = new Matrix4();
const q = new Quaternion();
const e = new Euler();

function at(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Matrix4 {
  return m
    .clone()
    .compose(new Vector3(x, y, z), q.clone().setFromEuler(e.set(rx, ry, rz)), new Vector3(1, 1, 1));
}

/** Box by size, standing on `y` (its bottom), centred on x/z. */
function box(
  s: SurfaceKey,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
  ink = true,
): Part {
  return { geometry: new BoxGeometry(w, h, d), surface: s, matrix: at(x, y + h / 2, z), ink };
}

function cyl(s: SurfaceKey, r: number, h: number, x = 0, y = 0, z = 0, seg = 10, rTop = r): Part {
  return {
    geometry: new CylinderGeometry(rTop, r, h, seg),
    surface: s,
    matrix: at(x, y + h / 2, z),
  };
}

function legs(s: SurfaceKey, w: number, d: number, h: number, t = 0.05): Part[] {
  const out: Part[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) out.push(box(s, t, h, t, sx * (w / 2 - t), 0, sz * (d / 2 - t)));
  }
  return out;
}

function table(w: number, d: number, h: number, s: SurfaceKey = 'wood'): Part[] {
  return [box(s, w, 0.05, d, 0, h - 0.05), ...legs(s, w, d, h - 0.05)];
}

const BUILDERS: Record<Exclude<PropKind, 'clock' | 'drawing'>, (a: Args) => Part[]> = {
  sideTable: () => table(0.5, 0.4, 0.75),
  tableLamp: () => [
    cyl('metal', 0.07, 0.3, 0, 0, 0, 8, 0.03),
    cyl('lampOn', 0.16, 0.2, 0, 0.28, 0, 8, 0.1),
  ],
  floorLamp: () => [
    cyl('metal', 0.15, 0.03),
    cyl('metal', 0.02, 1.45),
    cyl('lampOn', 0.22, 0.28, 0, 1.45, 0, 10, 0.14),
  ],
  pendant: () => [
    {
      geometry: new CylinderGeometry(0.005, 0.005, 0.5),
      surface: 'black',
      matrix: at(0, -0.25, 0),
      ink: false,
    },
    {
      geometry: new CylinderGeometry(0.08, 0.3, 0.2, 12),
      surface: 'lampOn',
      matrix: at(0, -0.6, 0),
    },
  ],
  bulb: () => [
    {
      geometry: new CylinderGeometry(0.005, 0.005, 0.3),
      surface: 'black',
      matrix: at(0, -0.15, 0),
      ink: false,
    },
    {
      geometry: new SphereGeometry(0.05, 8, 6),
      surface: 'lampOn',
      matrix: at(0, -0.33, 0),
      ink: false,
    },
  ],
  frame: (a) => {
    const w = a.w ?? 0.3;
    const h = a.h ?? 0.4;
    return [
      box('woodDark', w, h, 0.03, 0, -h / 2),
      box('photo', w - 0.06, h - 0.06, 0.005, 0, -h / 2 + 0.03, 0.016, false),
    ];
  },
  rug: (a) => [box('rug', a.w ?? 2, 0.01, a.d ?? 3, 0, 0, 0, false)],
  sofa: () => [
    box('fabric', 2.0, 0.42, 0.85),
    box('fabric', 2.0, 0.45, 0.2, 0, 0.42, -0.33),
    box('fabric', 0.18, 0.25, 0.85, -0.91, 0.42),
    box('fabric', 0.18, 0.25, 0.85, 0.91, 0.42),
  ],
  armchair: () => [
    box('fabricDark', 0.85, 0.42, 0.8),
    box('fabricDark', 0.85, 0.5, 0.18, 0, 0.42, -0.31),
    box('fabricDark', 0.15, 0.22, 0.8, -0.35, 0.42),
    box('fabricDark', 0.15, 0.22, 0.8, 0.35, 0.42),
  ],
  coffeeTable: () => table(1.1, 0.6, 0.42, 'woodDark'),
  tv: () => [
    box('woodDark', 1.0, 0.5, 0.5),
    box('black', 0.7, 0.55, 0.5, 0, 0.5, -0.02),
    box('screen', 0.56, 0.42, 0.01, 0, 0.56, 0.235, false),
  ],
  piano: () => [
    box('woodDark', 1.5, 1.25, 0.55, 0, 0, -0.03),
    box('woodDark', 1.5, 0.08, 0.3, 0, 0.7, 0.38),
    box('white', 1.36, 0.03, 0.16, 0, 0.78, 0.36, false),
    box('woodDark', 0.9, 0.48, 0.38, 0, 0, 0.85),
  ],
  desk: () => [...table(1.2, 0.6, 0.75, 'woodDark'), box('woodDark', 0.4, 0.68, 0.55, 0.38, 0)],
  chair: () => [
    box('wood', 0.45, 0.04, 0.45, 0, 0.44),
    ...legs('wood', 0.45, 0.45, 0.44, 0.04),
    box('wood', 0.45, 0.5, 0.04, 0, 0.48, -0.2),
  ],
  bookshelf: () => {
    const rand = seeded(3);
    const parts: Part[] = [box('woodDark', 1.2, 2.0, 0.35)];
    for (let shelf = 0; shelf < 4; shelf++) {
      let x = -0.55;
      while (x < 0.5) {
        const w = 0.03 + rand() * 0.05;
        const h = 0.22 + rand() * 0.12;
        parts.push(
          box(
            rand() > 0.5 ? 'fabricDark' : 'wood',
            w,
            h,
            0.24,
            x + w / 2,
            0.08 + shelf * 0.48,
            0.07,
            false,
          ),
        );
        x += w + 0.005;
      }
    }
    return parts;
  },
  diningTable: () => table(1.0, 1.9, 0.76),
  plates: (a) => {
    const n = a.count ?? 4;
    const spots: [number, number][] = [
      [0, -0.75],
      [0, 0.75],
      [-0.35, 0],
      [0.35, 0],
    ];
    return spots.slice(0, n).map(([x, z]) => cyl('white', 0.12, 0.015, x, 0, z, 16));
  },
  sideboard: () => [box('woodDark', 1.6, 0.85, 0.45), box('wood', 1.64, 0.04, 0.49, 0, 0.85)],
  counter: (a) => {
    const w = a.w ?? 2;
    return [
      box('wood', w, 0.86, 0.6),
      box('white', w + 0.02, 0.04, 0.64, 0, 0.86),
      box('black', w - 0.1, 0.06, 0.02, 0, 0.1, 0.3, false),
    ];
  },
  fridge: () => [
    box('white', 0.75, 1.75, 0.7),
    box('metal', 0.04, 0.4, 0.04, 0.3, 1.1, 0.37, false),
  ],
  kitchenTable: () => table(1.0, 0.8, 0.76),
  radio: () => [
    box('woodDark', 0.36, 0.22, 0.16),
    box('black', 0.18, 0.14, 0.005, -0.06, 0.04, 0.081, false),
    cyl('lampOn', 0.025, 0.01, 0.11, 0.1, 0.085, 10),
    box('metal', 0.005, 0.25, 0.005, 0.15, 0.22, -0.04, false),
  ],
  jar: () => [
    cyl('white', 0.09, 0.22, 0, 0, 0, 12),
    cyl('white', 0.06, 0.04, 0, 0.22, 0, 12, 0.04),
  ],
  boiler: () => [cyl('metal', 0.45, 1.8, 0, 0, 0, 14), cyl('metal', 0.08, 1.0, 0, 1.8, 0, 8)],
  pipes: (a) => {
    const w = a.w ?? 3;
    const parts: Part[] = [];
    const heights = [0.6, 1.0, 1.4, 1.8];
    for (const y of heights) {
      parts.push({
        geometry: new CylinderGeometry(0.04, 0.04, w, 8),
        surface: 'metal',
        matrix: at(0, y, 0, 0, 0, Math.PI / 2),
      });
    }
    const valves: SurfaceKey[] = ['valveRed', 'valveBlue', 'valveYellow', 'valveGreen'];
    valves.forEach((s, i) => {
      const x = -w / 2 + (w / (valves.length + 1)) * (i + 1);
      const y = heights[(i * 3) % heights.length]!;
      parts.push({
        geometry: new TorusGeometry(0.11, 0.022, 6, 14),
        surface: s,
        matrix: at(x, y, 0.12),
      });
      parts.push({
        geometry: new CylinderGeometry(0.02, 0.02, 0.12, 6),
        surface: 'metal',
        matrix: at(x, y, 0.06, Math.PI / 2),
      });
    });
    return parts;
  },
  shelf: () => {
    const parts: Part[] = [
      box('woodDark', 0.04, 1.8, 0.4, -0.58),
      box('woodDark', 0.04, 1.8, 0.4, 0.58),
    ];
    for (let i = 0; i < 4; i++) parts.push(box('woodDark', 1.2, 0.03, 0.4, 0, 0.1 + i * 0.5));
    parts.push(
      box('wood', 0.4, 0.3, 0.3, -0.3, 0.13),
      box('wood', 0.3, 0.25, 0.3, 0.25, 0.63),
      box('white', 0.15, 0.25, 0.15, 0.3, 1.13),
    );
    return parts;
  },
  washer: () => [box('white', 0.65, 0.85, 0.6), cyl('black', 0.18, 0.02, 0, 0.45, 0.3, 14)],
  boxes: () => [
    box('wood', 0.6, 0.45, 0.5),
    box('wood', 0.5, 0.4, 0.45, 0.05, 0.45),
    box('wood', 0.45, 0.35, 0.4, 0.55, 0, 0.1),
  ],
  debris: () => {
    const rand = seeded(77);
    const parts: Part[] = [box('ceiling', 1.0, 0.08, 0.7, 0, 0, 0)];
    for (let i = 0; i < 5; i++) {
      parts.push({
        geometry: new BoxGeometry(0.08, 0.04, 0.6 + rand() * 0.8),
        surface: 'woodDark',
        matrix: at(
          (rand() - 0.5) * 1.2,
          0.1 + rand() * 0.15,
          (rand() - 0.5) * 0.8,
          rand() * 0.4,
          rand() * 3,
          rand() * 0.4,
        ),
      });
    }
    return parts;
  },
};

export function buildPropParts(kind: PropKind, args: Args = {}): Part[] {
  if (kind === 'clock' || kind === 'drawing') return [];
  return BUILDERS[kind](args);
}

/**
 * A dust sheet: a square frustum covering the prop's footprint, slightly taller than it,
 * flaring at the floor like cloth.
 */
export function sheetOver(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height: number,
): Part {
  const w = maxX - minX + 0.1;
  const d = maxZ - minZ + 0.1;
  const h = height + 0.04;
  const geo = new CylinderGeometry(Math.SQRT1_2 * 0.92, Math.SQRT1_2 * 1.05, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(w, h, d);
  return {
    geometry: geo,
    surface: 'sheet',
    matrix: at((minX + maxX) / 2, h / 2, (minZ + maxZ) / 2),
  };
}
