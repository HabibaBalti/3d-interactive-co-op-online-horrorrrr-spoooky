/**
 * Nora's lullaby: the melody she hummed to Sam. It recurs through the whole game (humming,
 * the music box and piano puzzle, the endings), so it lives here as data.
 * 3/4 time, A minor. Each entry is [note, beats].
 */
export const LULLABY = {
  bpm: 66,
  notes: [
    ['E4', 1],
    ['A4', 1],
    ['B4', 1],
    ['C5', 2],
    ['B4', 1],
    ['A4', 1],
    ['G4', 1],
    ['E4', 1],
    ['A4', 3],
    ['A4', 1],
    ['C5', 1],
    ['D5', 1],
    ['E5', 2],
    ['D5', 1],
    ['C5', 1],
    ['B4', 1],
    ['G4', 1],
    ['A4', 3],
  ] as [string, number][],
};

const SEMITONE: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** 'A4' → 440 Hz. Accepts sharps and flats ('F#4', 'Bb3'). */
export function noteFrequency(name: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) throw new Error(`Bad note ${name}`);
  const semis =
    SEMITONE[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

/**
 * The colour stickers little Sam put on the piano, and the same colours on the music box drum:
 * each colour is one note, so the box and the piano play the same tune.
 */
export const COLOR_NOTE = { red: 'A4', blue: 'B4', yellow: 'C5', green: 'E5' } as const;

/** The piano's white keys in the close-up, left to right. */
export const PIANO_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'] as const;
