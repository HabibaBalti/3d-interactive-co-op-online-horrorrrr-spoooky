import { describe, expect, it } from 'vitest';
import { CollisionWorld, zoneHeight, type FloorZone } from './CollisionWorld';

const flat = (y: number, room = 'r'): FloorZone => ({
  room,
  minX: -5,
  minZ: -5,
  maxX: 5,
  maxZ: 5,
  y0: y,
  y1: y,
  axis: 'z',
});

describe('CollisionWorld', () => {
  it('interpolates ramps along their axis', () => {
    const ramp: FloorZone = { ...flat(0), minZ: 0, maxZ: 4, y0: 0, y1: -3 };
    expect(zoneHeight(ramp, 0, 0)).toBe(0);
    expect(zoneHeight(ramp, 0, 2)).toBeCloseTo(-1.5);
    expect(zoneHeight(ramp, 0, 9)).toBe(-3);
  });

  it('picks the floor the body is standing on when floors are stacked', () => {
    const w = new CollisionWorld();
    w.addFloor(flat(0, 'ground'));
    w.addFloor(flat(-3, 'basement'));
    expect(w.groundAt(0, 0, 0)?.zone.room).toBe('ground');
    expect(w.groundAt(0, 0, -3)?.zone.room).toBe('basement');
    expect(w.groundAt(9, 9, 0)).toBeNull();
  });

  it('pushes a body out of a wall', () => {
    const w = new CollisionWorld();
    w.addBox({ minX: 1, maxX: 2, minY: 0, maxY: 3, minZ: -5, maxZ: 5 });
    const body = { x: 0.9, y: 0, z: 0 };
    w.resolve(body, 0.3, 1.7);
    expect(body.x).toBeCloseTo(0.7);
  });

  it('ignores disabled boxes, boxes below step height and boxes above the head', () => {
    const w = new CollisionWorld();
    w.addBox({ minX: -1, maxX: 1, minY: 0, maxY: 3, minZ: -1, maxZ: 1, enabled: false });
    w.addBox({ minX: -1, maxX: 1, minY: 0, maxY: 0.1, minZ: -1, maxZ: 1 });
    w.addBox({ minX: -1, maxX: 1, minY: 2.2, maxY: 3, minZ: -1, maxZ: 1 });
    const body = { x: 0, y: 0, z: 0 };
    w.resolve(body, 0.3, 1.7);
    expect(body).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('ejects a body whose centre is inside a box along the shallowest side', () => {
    const w = new CollisionWorld();
    w.addBox({ minX: -1, maxX: 1, minY: 0, maxY: 3, minZ: -0.2, maxZ: 0.2 });
    const body = { x: 0.1, y: 0, z: 0.1 };
    w.resolve(body, 0.3, 1.7);
    expect(body.z).toBeCloseTo(0.5);
    expect(body.x).toBeCloseTo(0.1);
  });
});
