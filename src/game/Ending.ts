import { PointLight } from 'three';
import { hum } from '../audio/Hummer';
import { EntityFigure } from '../entity/EntityFigure';
import type { GameState } from '../../shared/game/types';
import type { GameContext, Module } from './context';
import { playLullaby } from './puzzles/lullaby';

function credits(ctx: GameContext, kind: 'truth' | 'lie'): void {
  const el = document.createElement('div');
  el.className = `credits ${kind}`;
  el.innerHTML =
    kind === 'truth'
      ? `<h1>STILL HERE</h1>
         <p>The bolt slid back. The door opened. She walked up into the light.</p>
         <p>Thank you for playing.</p>
         <div class="ctl-row"><button type="button" class="menu-btn" data-again>play again</button></div>`
      : `<h1>STILL HERE</h1>
         <p>She ran away. That’s the story. That’s always been the story.</p>
         <div class="ctl-row"><button type="button" class="menu-btn" data-again>begin the night again</button></div>`;
  document.getElementById('app')!.appendChild(el);
  if (document.pointerLockElement) document.exitPointerLock();
  requestAnimationFrame(() => el.classList.add('on'));
  el.querySelector('[data-again]')!.addEventListener('click', () => {
    el.remove();
    ctx.hud.fadeFrom(2);
    ctx.act({ type: 'game/restart' });
  });
}

/**
 * How the night ends.
 * Truth: Sam slides the bolt back; Nora's door opens onto light and she walks up the stairs;
 * Sam's house is warm for a moment and the front door opens. The lullaby, clean.
 * Lie: the comfortable story wins. The lights go, the thing walks toward you saying it, and the
 * night begins again, worse.
 */
export function endingModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  let slammed = false;
  let ending: 'truth' | 'lie' | null = null;
  let t = 0;
  let done = false;
  let light: PointLight | null = null;
  let entity: EntityFigure | null = null;

  const begin = (kind: 'truth' | 'lie') => {
    ending = kind;
    t = 0;
    ctx.inspector.close();
    if (kind === 'truth') {
      ctx.house.power = 1;
      light = new PointLight('#fff4e0', 0, 14, 1.2);
      light.position.set(nora ? -1 : 0.5, nora ? 1.8 : 1.8, nora ? -5.5 : 5.6);
      ctx.house.root.add(light);
      if (nora) playLullaby(ctx, 'box', [-1, 0.5, -5.5]);
      else {
        const front = ctx.house.doors.get('front');
        if (front) {
          front.forceLocked = false;
          front.setOpen(true);
        }
        if (ctx.audio) hum(ctx.audio.ctx, ctx.audio.input, ctx.audio.now + 1, { peak: 0.22 });
      }
    } else {
      ctx.house.power = 0;
      entity = new EntityFigure(ctx.house.palette.ink);
      const f = ctx.player.feet;
      const yaw = ctx.player.yaw;
      entity.root.position.set(f.x - Math.sin(yaw) * 4, f.y, f.z - Math.cos(yaw) * 4);
      entity.root.lookAt(f.x, f.y, f.z);
      ctx.house.root.add(entity.root);
      void ctx.voice.say([
        { who: 'entity', text: 'She ran away.', pause: 1 },
        { who: 'entity', text: 'She ran away.', pause: 1.5 },
        { who: 'entity', text: 'Say it with me.', pause: 1.5 },
      ]);
      if (ctx.audio)
        hum(ctx.audio.ctx, ctx.audio.input, ctx.audio.now + 0.5, {
          rate: 0.6,
          sag: 160,
          vibrato: 9,
          peak: 0.25,
          notes: 9,
        });
    }
  };

  const finish = async () => {
    if (done || !ending) return;
    done = true;
    await ctx.hud.fadeTo(ending === 'truth' ? '#efe8d8' : '#000', 3);
    credits(ctx, ending);
  };

  return {
    onState(s: GameState, prev) {
      if (s.ending && !ending && prev) begin(s.ending);
      if (!s.ending) {
        ending = null;
        done = false;
        // The other player started the night again: clear the credits here too.
        const shown = document.querySelector('.credits');
        if (shown) {
          shown.remove();
          ctx.hud.fadeFrom(2);
        }
      }
    },
    update(dt) {
      const s = ctx.state();
      if (!nora && s.board.confirmed === 7 && !s.ending && !slammed && ctx.player.feet.y > -0.4) {
        // The house puts it back the way it was that night. It's his to undo.
        const door = ctx.house.doors.get('basement');
        if (door) {
          slammed = true;
          door.setOpen(false);
          window.setTimeout(() => door.setBolted(true), 700);
        }
      }
      if (!ending) return;
      t += dt;
      if (ending === 'truth') {
        if (light) light.intensity = Math.min(30, t * 4);
        const f = ctx.player.feet;
        const out = nora ? f.y > -0.2 && t > 4 : f.z > 5.9;
        if (out || t > 45) void finish();
      } else {
        if (entity) {
          entity.update(dt, t);
          const f = ctx.player.feet;
          const p = entity.root.position;
          const dx = f.x - p.x;
          const dz = f.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.6) {
            p.x += (dx / d) * dt * 0.5;
            p.z += (dz / d) * dt * 0.5;
          }
        }
        if (t > 11) void finish();
      }
    },
    dispose() {
      light?.removeFromParent();
      entity?.root.removeFromParent();
    },
  };
}
