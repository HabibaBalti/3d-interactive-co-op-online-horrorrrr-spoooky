import type { Opening, WallSpec } from './types';

export const WALL_THICKNESS = 0.15;

export interface Box3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** A wall expressed along its own axis: `a` runs along it, `c` is the fixed cross coordinate. */
export interface WallFrame {
  axis: 'x' | 'z';
  a0: number;
  a1: number;
  c: number;
}

export interface PlacedOpening {
  spec: Opening;
  /** Along-wall extent. */
  a0: number;
  a1: number;
  /** Absolute heights. */
  y0: number;
  y1: number;
}

export interface SplitWall {
  frame: WallFrame;
  /** Solid pieces, as world-space boxes. */
  solids: Box3D[];
  /** Along-wall spans of full-height solid wall (where skirting runs). */
  spans: [number, number][];
  openings: PlacedOpening[];
}

export function wallFrame(w: WallSpec): WallFrame {
  const [x0, z0] = w.from;
  const [x1, z1] = w.to;
  if (z0 === z1) return { axis: 'x', a0: Math.min(x0, x1), a1: Math.max(x0, x1), c: z0 };
  if (x0 === x1) return { axis: 'z', a0: Math.min(z0, z1), a1: Math.max(z0, z1), c: x0 };
  throw new Error(`Wall ${JSON.stringify(w.from)}→${JSON.stringify(w.to)} is not axis-aligned`);
}

/** Converts along-wall/height ranges into a world box of the wall's thickness. */
export function frameBox(
  f: WallFrame,
  a0: number,
  a1: number,
  y0: number,
  y1: number,
  thickness = WALL_THICKNESS,
): Box3D {
  const t = thickness / 2;
  return f.axis === 'x'
    ? { minX: a0, maxX: a1, minY: y0, maxY: y1, minZ: f.c - t, maxZ: f.c + t }
    : { minX: f.c - t, maxX: f.c + t, minY: y0, maxY: y1, minZ: a0, maxZ: a1 };
}

/** Splits a wall around its openings into solid boxes. */
export function splitWall(w: WallSpec): SplitWall {
  const f = wallFrame(w);
  // Openings are measured from `from`, which may be either end.
  const fromA = f.axis === 'x' ? w.from[0] : w.from[1];
  const dir = fromA === f.a0 ? 1 : -1;
  const openings: PlacedOpening[] = (w.openings ?? [])
    .map((o) => {
      const centre = fromA + dir * o.at;
      return {
        spec: o,
        a0: centre - o.width / 2,
        a1: centre + o.width / 2,
        y0: w.y0 + o.y0,
        y1: w.y0 + o.y1,
      };
    })
    .sort((p, q) => p.a0 - q.a0);

  const solids: Box3D[] = [];
  const spans: [number, number][] = [];
  let cursor = f.a0;
  for (const o of openings) {
    if (o.a0 < cursor - 1e-6 || o.a1 > f.a1 + 1e-6) {
      throw new Error(`Opening at ${o.spec.at} overlaps or leaves its wall`);
    }
    if (o.a0 > cursor) {
      solids.push(frameBox(f, cursor, o.a0, w.y0, w.y1));
      spans.push([cursor, o.a0]);
    }
    if (o.y0 > w.y0) solids.push(frameBox(f, o.a0, o.a1, w.y0, o.y0));
    if (o.y1 < w.y1) solids.push(frameBox(f, o.a0, o.a1, o.y1, w.y1));
    cursor = o.a1;
  }
  if (cursor < f.a1) {
    solids.push(frameBox(f, cursor, f.a1, w.y0, w.y1));
    spans.push([cursor, f.a1]);
  }
  return { frame: f, solids, spans, openings };
}
