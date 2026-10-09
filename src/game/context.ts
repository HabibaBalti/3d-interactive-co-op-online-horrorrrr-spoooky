import type { PerspectiveCamera, Scene } from 'three';
import type { AudioEngine } from '../audio/AudioEngine';
import type { Engine } from '../core/Engine';
import type { Input } from '../core/Input';
import type { InteractionSystem } from '../interaction/InteractionSystem';
import type { Inspector } from '../interaction/Inspector';
import type { Link } from '../net/Link';
import type { PlayerController } from '../player/PlayerController';
import type { Settings } from '../settings/settings';
import type { House } from '../world/house/House';
import type { Action, Fx, GameState } from '../../shared/game/types';
import type { Presence } from '../../shared/protocol';
import type { Character, Timeline } from '../../shared/types';
import type { Voice } from './Voice';
import type { Sfx } from '../audio/Sfx';
import type { Hud } from './Hud';

/** Everything a puzzle or story module may touch. Rebuilt whenever the world is. */
export interface GameContext {
  readonly character: Character;
  readonly timeline: Timeline;
  readonly link: Link;
  state(): GameState;
  act(action: Action): void;
  partner(): Presence | null;
  readonly house: House;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly engine: Engine;
  readonly player: PlayerController;
  readonly interaction: InteractionSystem;
  readonly inspector: Inspector;
  readonly input: Input;
  readonly audio: AudioEngine | null;
  readonly voice: Voice;
  readonly sfx: Sfx;
  readonly hud: Hud;
  settings(): Settings;
  /** Hold the player still (hiding, cutscenes) or let them go. */
  freeze(on: boolean): void;
  /** Share where the entity is in this world (the other player's mirror shows it). */
  setEntity(e: [number, number, number, number] | null): void;
}

/**
 * A slice of the game (one puzzle, the echoes, the hunt...). Modules are built for the current
 * character's world and react to the authoritative state; they never change shared state
 * except by sending actions.
 */
export interface Module {
  /** Called with the full state on start (prev = null) and on every change. */
  onState?(s: GameState, prev: GameState | null): void;
  onFx?(fx: Fx): void;
  update?(dt: number, time: number): void;
  dispose?(): void;
}
