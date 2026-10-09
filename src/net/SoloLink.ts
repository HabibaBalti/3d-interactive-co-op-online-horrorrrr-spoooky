import { GameHost } from '../../shared/game/host';
import type { Action } from '../../shared/game/types';
import type { Presence } from '../../shared/protocol';
import type { Character } from '../../shared/types';
import { LinkBase, loadGameState, saveGameState, type Link } from './Link';

/**
 * Practice alone: the rules run in this page and you play both characters, swapping with Tab.
 * Useful for learning the house, and for testing that every puzzle works.
 */
export class SoloLink extends LinkBase implements Link {
  readonly kind = 'solo' as const;
  readonly code = 'SOLO';
  private readonly host: GameHost;

  constructor(
    public character: Character,
    fresh = false,
  ) {
    super();
    const saved = fresh ? null : loadGameState(this.code);
    this.host = new GameHost(Math.floor(Math.random() * 2 ** 31), saved ?? undefined);
    this.host.setOnline('nora', true);
    this.host.setOnline('sam', true);
    this.host.onChange((r) => {
      saveGameState(this.code, r.state);
      this.emitState(r.state);
      this.emitFx(r.fx);
    });
    this.latest = this.host.state;
    queueMicrotask(() => this.emitStatus({ kind: 'ready' }));
  }

  act(action: Action): void {
    this.host.apply(this.character, action);
  }

  setPresence(_p: Presence): void {
    // Only one body in solo practice.
  }

  close(): void {}
}
