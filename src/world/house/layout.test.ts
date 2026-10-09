import { describe, expect, it } from 'vitest';
import { CollisionWorld } from '../../physics/CollisionWorld';
import { HOUSE } from './layout';
import { splitWall } from './walls';

function collisionFromLayout(): CollisionWorld {
  const w = new CollisionWorld();
  for (const f of HOUSE.floors) {
    const [minX, minZ, maxX, maxZ] = f.rect;
    w.addFloor({ room: f.room, minX, minZ, maxX, maxZ, y0: f.y, y1: f.y, axis: 'z' });
  }
  for (const r of HOUSE.ramps) {
    const [minX, minZ, maxX, maxZ] = r.rect;
    w.addFloor({ room: r.room, minX, minZ, maxX, maxZ, y0: r.y0, y1: r.y1, axis: r.axis });
  }
  return w;
}

describe('house layout', () => {
  it('every wall is axis-aligned and its openings fit inside it without overlapping', () => {
    for (const wall of HOUSE.walls) expect(() => splitWall(wall)).not.toThrow();
  });

  it('door ids are unique', () => {
    const ids = HOUSE.walls.flatMap((w) => w.openings ?? []).flatMap((o) => o.door?.id ?? []);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prop ids are unique', () => {
    const ids = HOUSE.props.flatMap((p) => p.id ?? []);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('both spawns stand on the ground floor', () => {
    const w = collisionFromLayout();
    for (const s of Object.values(HOUSE.spawns)) {
      expect(w.groundAt(s.pos[0], s.pos[2], s.pos[1])?.y).toBe(0);
    }
  });

  it('the basement stairs connect the hall landing to the basement floor', () => {
    const w = collisionFromLayout();
    // Walk down the ramp centre line in small steps, following the ground.
    let y = 0;
    for (let z = -5.5; z <= 0; z += 0.05) {
      const g = w.groundAt(-1, z, y);
      expect(g).not.toBeNull();
      expect(Math.abs(g!.y - y)).toBeLessThan(0.1);
      y = g!.y;
    }
    expect(y).toBe(-3);
  });
});

describe('inspectables', () => {
  it('every inspectable names a prop that exists in the house', async () => {
    const { INSPECTABLES } = await import('../../data/inspectables');
    const ids = new Set(HOUSE.props.flatMap((p) => p.id ?? []));
    for (const id of Object.keys(INSPECTABLES)) expect(ids.has(id), id).toBe(true);
  });

  it('keeps descriptions short (no reading)', async () => {
    const { INSPECTABLES } = await import('../../data/inspectables');
    for (const item of Object.values(INSPECTABLES)) {
      for (const t of Object.values(item.text)) {
        expect(t.line.split(' ').length).toBeLessThanOrEqual(12);
        expect((t.hint ?? '').split(' ').length).toBeLessThanOrEqual(12);
      }
    }
  });
});
