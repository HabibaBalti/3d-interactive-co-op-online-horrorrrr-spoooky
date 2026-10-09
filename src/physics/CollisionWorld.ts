/**
 * Minimal static-world collision: the player is a vertical cylinder, the world is axis-aligned
 * boxes (walls, furniture, closed doors) plus walkable floor zones (flat slabs and stair ramps).
 * The house is static and axis-aligned, so this is all a walker needs; no physics engine.
 */

export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /** Disabled boxes are skipped (e.g. an open door). */
  enabled: boolean;
}

export interface FloorZone {
  room: string;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  /** Height at the min edge of `axis`; equal to `y1` for a flat floor. */
  y0: number;
  /** Height at the max edge of `axis`. */
  y1: number;
  axis: 'x' | 'z';
}

export interface Ground {
  y: number;
  zone: FloorZone;
}

export interface Body {
  x: number;
  /** Feet height. */
  y: number;
  z: number;
}

export function zoneHeight(zone: FloorZone, x: number, z: number): number {
  if (zone.y0 === zone.y1) return zone.y0;
  const t =
    zone.axis === 'x'
      ? (x - zone.minX) / (zone.maxX - zone.minX)
      : (z - zone.minZ) / (zone.maxZ - zone.minZ);
  return zone.y0 + (zone.y1 - zone.y0) * Math.min(1, Math.max(0, t));
}

export class CollisionWorld {
  readonly boxes: AABB[] = [];
  readonly floors: FloorZone[] = [];

  addBox(box: Omit<AABB, 'enabled'> & { enabled?: boolean }): AABB {
    const b: AABB = { enabled: true, ...box };
    this.boxes.push(b);
    return b;
  }

  addFloor(zone: FloorZone): void {
    this.floors.push(zone);
  }

  /**
   * Highest floor under (x, z) that is at most `stepUp` above the feet. Stacked floors
   * (ground floor over basement) resolve to whichever one the body is standing on.
   */
  groundAt(x: number, z: number, feetY: number, stepUp = 0.45): Ground | null {
    let best: Ground | null = null;
    for (const zone of this.floors) {
      if (x < zone.minX || x > zone.maxX || z < zone.minZ || z > zone.maxZ) continue;
      const y = zoneHeight(zone, x, z);
      if (y > feetY + stepUp) continue;
      if (!best || y > best.y) best = { y, zone };
    }
    return best;
  }

  /**
   * Pushes a vertical cylinder out of every overlapping box, in the XZ plane. Boxes whose top
   * is within `stepUp` of the feet are ignored so rugs and thresholds don't block.
   */
  resolve(body: Body, radius: number, height: number, stepUp = 0.45): void {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes) {
        if (!b.enabled) continue;
        if (b.maxY <= body.y + stepUp || b.minY >= body.y + height) continue;
        const cx = Math.max(b.minX, Math.min(body.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(body.z, b.maxZ));
        const dx = body.x - cx;
        const dz = body.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          body.x += (dx / d) * (radius - d);
          body.z += (dz / d) * (radius - d);
        } else {
          // Centre is inside the box: leave along the shallowest side.
          const exits: [number, number][] = [
            [b.minX - radius - body.x, 0],
            [b.maxX + radius - body.x, 0],
            [0, b.minZ - radius - body.z],
            [0, b.maxZ + radius - body.z],
          ];
          let best = exits[0]!;
          for (const e of exits) {
            if (Math.abs(e[0]) + Math.abs(e[1]) < Math.abs(best[0]) + Math.abs(best[1])) best = e;
          }
          body.x += best[0];
          body.z += best[1];
        }
        moved = true;
      }
      if (!moved) return;
    }
  }
}
