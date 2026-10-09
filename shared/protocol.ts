/**
 * Wire protocol between client and the realtime server.
 * M0 only carries a handshake and ping; rooms, flags and lock-ins arrive in M2.
 * Every message is a JSON object with a `t` (type) discriminator.
 */
export const PROTOCOL_VERSION = 1;

export type ClientMessage = { t: 'hello'; protocol: number } | { t: 'ping'; at: number };

export type ServerMessage =
  | { t: 'welcome'; protocol: number; serverTime: number }
  | { t: 'pong'; at: number }
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
