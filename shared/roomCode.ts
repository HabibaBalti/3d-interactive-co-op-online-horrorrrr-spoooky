/**
 * Room codes are short, spoken aloud over a call, so the alphabet avoids characters that
 * sound or look alike (0/O, 1/I/L, 5/S, 2/Z, B/8, U/V).
 */
export const ROOM_CODE_ALPHABET = 'ACDEFGHJKMNPQRTWXY34679';
export const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/** Uppercases and strips spaces/dashes so "ab-cd e" and "ABCDE" match. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  for (const ch of code) {
    if (!ROOM_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
