import { describe, expect, it } from 'vitest';
import { splitWall } from './walls';

describe('splitWall', () => {
  it('cuts a door and a window out of a wall', () => {
    const s = splitWall({
      from: [0, 0],
      to: [10, 0],
      y0: 0,
      y1: 3,
      surface: 'wallpaper',
      openings: [
        { at: 2, width: 1, y0: 0, y1: 2, kind: 'door' },
        { at: 6, width: 2, y0: 1, y1: 2, kind: 'window' },
      ],
    });
    expect(s.spans).toEqual([
      [0, 1.5],
      [2.5, 5],
      [7, 10],
    ]);
    // 3 full-height spans + door lintel + window sill + window lintel.
    expect(s.solids).toHaveLength(6);
  });

  it('measures openings from `from` even when the wall runs backwards', () => {
    const s = splitWall({
      from: [0, 10],
      to: [0, 0],
      y0: 0,
      y1: 3,
      surface: 'wallpaper',
      openings: [{ at: 1, width: 1, y0: 0, y1: 2, kind: 'door' }],
    });
    expect(s.openings[0]!.a0).toBeCloseTo(8.5);
  });

  it('rejects diagonal walls', () => {
    expect(() =>
      splitWall({ from: [0, 0], to: [1, 1], y0: 0, y1: 3, surface: 'wallpaper' }),
    ).toThrow();
  });
});
