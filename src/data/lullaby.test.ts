import { describe, expect, it } from 'vitest';
import { LULLABY, noteFrequency } from './lullaby';

describe('lullaby', () => {
  it('converts note names to frequencies', () => {
    expect(noteFrequency('A4')).toBeCloseTo(440);
    expect(noteFrequency('A3')).toBeCloseTo(220);
    expect(noteFrequency('C5')).toBeCloseTo(523.25, 1);
    expect(noteFrequency('F#4')).toBeCloseTo(369.99, 1);
  });

  it('every note is valid and the melody fills whole 3/4 bars', () => {
    for (const [n] of LULLABY.notes) expect(() => noteFrequency(n)).not.toThrow();
    const beats = LULLABY.notes.reduce((s, [, b]) => s + b, 0);
    expect(beats % 3).toBe(0);
  });
});
