import type { Action, Fx, GameState } from './game/types';
import type { Character } from './types';

/**
 * Wire protocol between a client and an authority (the Node server, or the game creator's page
 * when hosted). Every message is a JSON object with a `t` discriminator.
 */
export const PROTOCOL_VERSION = 2;

/** Where a player is, for the other player's mirror (x, y, z, yaw), plus the entity if seen. */
export interface Presence {
  p?: [number, number, number, number];
  e?: [number, number, number, number] | null;
}

export type ClientMessage =
  | { t: 'hello'; protocol: number }
  | { t: 'ping'; at: number }
  | { t: 'create'; character: Character }
  | { t: 'join'; code: string }
  | { t: 'rejoin'; code: string; token: string }
  | { t: 'action'; action: Action }
  | { t: 'presence'; presence: Presence };

export type ServerMessage =
  | { t: 'welcome'; protocol: number; serverTime: number }
  | { t: 'pong'; at: number }
  | { t: 'joined'; code: string; character: Character; token: string }
  | { t: 'state'; state: GameState }
  | { t: 'fx'; fx: Fx[] }
  | { t: 'presence'; presence: Presence }
  | { t: 'error'; reason: string };

export function encode(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

/** Parses a raw frame; returns null for anything that is not an object with a string `t`. */
export function decode<T extends { t: string }>(raw: string): T | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { t?: unknown }).t === 'string'
    ) {
      return value as T;
    }
  } catch {
    // fall through
  }
  return null;
}
