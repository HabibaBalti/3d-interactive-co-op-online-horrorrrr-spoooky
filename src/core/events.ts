/**
 * Game-wide events. Systems that make noise emit here; listeners (the soundscape now, the
 * entity's hearing in M5) subscribe without the emitters knowing about them.
 */
export type Surface = 'floor' | 'tile' | 'concrete' | 'water';
export type DoorAction = 'open' | 'close' | 'rattle' | 'bolt' | 'unbolt';

export interface GameEvents {
  /** A footstep. `intensity` 0..1: crouch ≈ 0.2, walk ≈ 0.55, run = 1. */
  step: { surface: Surface; intensity: number; x: number; y: number; z: number };
  door: { action: DoorAction; x: number; y: number; z: number };
  flashlight: { on: boolean };
  /** Lightning; `power` 0..1, higher means closer. */
  strike: { power: number };
}

type Handler<T> = (payload: T) => void;

class Events<T> {
  private readonly handlers = new Map<keyof T, Set<Handler<never>>>();

  on<K extends keyof T>(type: K, fn: Handler<T[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof T>(type: K, payload: T[K]): void {
    this.handlers.get(type)?.forEach((fn) => (fn as Handler<T[K]>)(payload));
  }
}

export const events = new Events<GameEvents>();
