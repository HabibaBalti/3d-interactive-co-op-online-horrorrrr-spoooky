import type { Character } from '../types';
import { initialState, reduce, type Result } from './reducer';
import type { Action, GameState } from './types';

/**
 * The authority for one game: holds the state, applies actions through the rules, and tells
 * listeners. The Node server runs one per room; in a hosted page the game's creator runs it;
 * in solo practice it runs in the same page.
 */
export class GameHost {
  state: GameState;
  private readonly listeners = new Set<(r: Result) => void>();

  constructor(seed: number, saved?: GameState) {
    this.state = saved ?? initialState(seed);
  }

  onChange(fn: (r: Result) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  apply(actor: Character, action: Action): Result {
    const r = reduce(this.state, actor, action);
    if (r.state !== this.state) {
      this.state = r.state;
      this.listeners.forEach((fn) => fn(r));
    }
    return r;
  }

  setOnline(who: Character, online: boolean): void {
    if (this.state.online[who] === online) return;
    this.state = {
      ...this.state,
      v: this.state.v + 1,
      online: { ...this.state.online, [who]: online },
    };
    this.listeners.forEach((fn) => fn({ state: this.state, fx: [] }));
  }
}
