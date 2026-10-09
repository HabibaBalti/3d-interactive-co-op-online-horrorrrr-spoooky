import type { Action, Fx, GameState } from '../../shared/game/types';
import type { Presence } from '../../shared/protocol';
import type { Character } from '../../shared/types';

export type LinkKind = 'solo' | 'server' | 'room';

export type LinkStatus =
  { kind: 'connecting' } | { kind: 'ready' } | { kind: 'error'; reason: string };

/**
 * One player's connection to their game, however it is carried. The game only ever talks to
 * this: send actions, receive authoritative state and one-shot effects, exchange presence.
 */
export interface Link {
  readonly kind: LinkKind;
  readonly code: string;
  character: Character;
  act(action: Action): void;
  setPresence(p: Presence): void;
  onState(fn: (s: GameState) => void): void;
  onFx(fn: (fx: Fx[]) => void): void;
  onPartner(fn: (p: Presence) => void): void;
  onStatus(fn: (s: LinkStatus) => void): void;
  close(): void;
}

/** Shared plumbing for listeners and the latest state. */
export class LinkBase {
  protected stateFns: ((s: GameState) => void)[] = [];
  protected fxFns: ((fx: Fx[]) => void)[] = [];
  protected partnerFns: ((p: Presence) => void)[] = [];
  protected statusFns: ((s: LinkStatus) => void)[] = [];
  latest: GameState | null = null;

  onState(fn: (s: GameState) => void): void {
    this.stateFns.push(fn);
    if (this.latest) fn(this.latest);
  }
  onFx(fn: (fx: Fx[]) => void): void {
    this.fxFns.push(fn);
  }
  onPartner(fn: (p: Presence) => void): void {
    this.partnerFns.push(fn);
  }
  onStatus(fn: (s: LinkStatus) => void): void {
    this.statusFns.push(fn);
  }

  protected emitState(s: GameState): void {
    if (this.latest && s.v < this.latest.v && s.seed === this.latest.seed) return;
    this.latest = s;
    this.stateFns.forEach((fn) => fn(s));
  }
  protected emitFx(fx: Fx[]): void {
    if (fx.length) this.fxFns.forEach((fn) => fn(fx));
  }
  protected emitPartner(p: Presence): void {
    this.partnerFns.forEach((fn) => fn(p));
  }
  protected emitStatus(s: LinkStatus): void {
    this.statusFns.forEach((fn) => fn(s));
  }
}

// --- Remembering the game across reloads --------------------------------------------------------

export interface SavedSession {
  kind: LinkKind;
  code: string;
  character: Character;
  /** Server seat token, or 'host'/'guest' for hosted rooms. */
  token: string;
  savedAt: number;
}

const SESSION_KEY = 'still-here.session';

export function saveSession(s: SavedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable: the game still works, it just can't resume after a reload
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession;
    // A night is long, but not that long.
    return Date.now() - s.savedAt < 24 * 60 * 60 * 1000 ? s : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function saveGameState(code: string, state: GameState): void {
  try {
    localStorage.setItem(`still-here.game.${code}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadGameState(code: string): GameState | null {
  try {
    const raw = localStorage.getItem(`still-here.game.${code}`);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}
