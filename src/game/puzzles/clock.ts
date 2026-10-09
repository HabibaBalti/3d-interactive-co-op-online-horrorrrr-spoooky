import { Vector3 } from 'three';
import { GrandfatherClock } from '../../world/props/GrandfatherClock';
import type { Lookable } from '../../world/house/House';
import type { GameState } from '../../../shared/game/types';
import type { GameContext, Module } from '../context';
import { panel, placeItem } from '../items';

/**
 * Puzzle 1, the grandfather clock. Sam's clock stopped at 3:17 decades ago; Nora's still runs.
 * Sam describes the hands; Nora sets hers to match. It strikes, the case opens, and inside is
 * the key that winds her music box. From then on both clocks say 3:17.
 */
export function clockModule(ctx: GameContext): Module {
  const clock = ctx.house.clock;
  const look = ctx.house.lookable('clock');
  if (!clock || !look) return {};
  const at = clock.root.getWorldPosition(new Vector3());
  const pos: [number, number, number] = [at.x, 1.8, at.z];
  const nora = ctx.timeline === '1994';
  let key: Lookable | null = null;

  const setPanel = () => {
    clock.setRunning(false);
    const el = panel(`
      <div class="ctl-row">
        <span class="ctl-label">hour</span>
        <button type="button" class="ctl" data-h="-1" aria-label="hour back">◀</button>
        <button type="button" class="ctl" data-h="1" aria-label="hour forward">▶</button>
        <span class="ctl-gap"></span>
        <span class="ctl-label">minute</span>
        <button type="button" class="ctl" data-m="-1" aria-label="minute back">◀</button>
        <button type="button" class="ctl" data-m="1" aria-label="minute forward">▶</button>
      </div>
      <div class="ctl-row"><button type="button" class="ctl primary" data-set>pull the chain</button></div>`);
    const nudge = (dh: number, dm: number) => {
      const t = clock.time;
      let total = ((t.h % 12) * 60 + t.m + dh * 60 + dm + 720) % 720;
      total = Math.round(total);
      clock.setTime(Math.floor(total / 60), total % 60);
      ctx.sfx.play('creak');
    };
    el.querySelectorAll<HTMLButtonElement>('[data-h],[data-m]').forEach((b) => {
      const dh = Number(b.dataset.h ?? 0);
      const dm = Number(b.dataset.m ?? 0);
      let timer = 0;
      const stop = () => window.clearInterval(timer);
      b.addEventListener('pointerdown', () => {
        nudge(dh, dm);
        stop();
        // Hold to keep turning.
        timer = window.setInterval(() => nudge(dh, dm), 140);
      });
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointerleave', stop);
    });
    el.querySelector('[data-set]')!.addEventListener('click', () => {
      const t = clock.time;
      ctx.act({ type: 'clock/set', h: t.h, m: t.m });
    });
    ctx.inspector.show(look.target, el, () => {
      if (!ctx.state().flags.clockSet) clock.setRunning(true);
    });
  };

  if (nora) {
    look.override({
      prompt: () => (ctx.state().flags.clockSet ? 'look' : 'set'),
      interact: () => (ctx.state().flags.clockSet ? look.look() : setPanel()),
    });
  }

  const apply = (s: GameState) => {
    if (!s.flags.clockSet) return;
    clock.setRunning(false);
    clock.setTime(3, 17);
    clock.openDoor(true);
    if (nora) {
      const holding = s.inv.nora.includes('windKey');
      if (!holding && !key) {
        const c = GrandfatherClock.COMPARTMENT;
        const p = clock.root.localToWorld(new Vector3(c.x + 0.05, c.y + 0.02, c.z));
        key = placeItem(ctx, 'wind-key', 'windKey', [p.x, p.y, p.z], {
          name: 'Small brass key',
          line: 'A winding key, tucked inside the clock.',
          lore: 'Dad keeps spare keys in places only he would think of.',
        });
      }
      if (holding && key) {
        key.remove();
        key = null;
      }
    }
  };

  return {
    onState(s, prev) {
      apply(s);
      if (prev && s.flags.clockSet && !prev.flags.clockSet) {
        if (nora) ctx.inspector.close();
        // Both clocks strike: Nora's three times, Sam's dead one once.
        ctx.sfx.play(nora ? 'chime3' : 'chime1', pos);
      }
    },
    onFx(f) {
      if (f.type === 'wrong' && f.what === 'clock' && nora) ctx.sfx.play('wrong', pos);
    },
    dispose() {
      key?.remove();
    },
  };
}
