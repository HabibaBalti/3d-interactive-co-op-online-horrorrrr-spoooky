/** The two playable characters. Each one lives in exactly one timeline. */
export type Character = 'nora' | 'sam';

/** Nora plays the stormy night of 1994; Sam plays the abandoned present day. */
export type Timeline = '1994' | 'present';

export const TIMELINE_OF: Record<Character, Timeline> = {
  nora: '1994',
  sam: 'present',
};

export function otherCharacter(c: Character): Character {
  return c === 'nora' ? 'sam' : 'nora';
}
