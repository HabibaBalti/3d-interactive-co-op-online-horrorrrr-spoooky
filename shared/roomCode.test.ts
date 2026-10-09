import { describe, expect, it } from 'vitest';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from './roomCode';

describe('room codes', () => {
  it('generates valid codes of the configured length', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it('normalizes spoken/typed variants', () => {
    expect(normalizeRoomCode(' ac-de f')).toBe('ACDEF');
  });

  it('rejects ambiguous characters', () => {
    expect(isValidRoomCode('A0CDE')).toBe(false);
    expect(isValidRoomCode('AICDE')).toBe(false);
  });
});
