import { ECHOES, type Echo } from '../data/echoes';
import { hum } from '../audio/Hummer';
import type { GameState } from '../../shared/game/types';
import type { GameContext, Module } from './context';
import { Ghost } from './Ghost';

interface Playing {
  echo: Echo;
  ghosts: Ghost[];
  t: number;
}

/** Plays memory echoes as the story unlocks them. Each plays once, live, for one sibling. */
export function echoesModule(ctx: GameContext): Module {
  const tint = ctx.timeline === '1994' ? '#ffd8a8' : '#a8e8e0';
  const playing: Playing[] = [];

  const start = (echo: Echo) => {
    const ghosts = echo.figures.map((f) => {
      const g = new Ghost(f.kind, tint);
      g.root.position.set(...f.path[0]!);
      ctx.house.root.add(g.root);
      if (f.hums && ctx.audio) {
        const a = ctx.audio;
        const s = a.spatial(f.path[0]![0], 1.5, f.path[0]![2], { hrtf: true, ref: 1.5 });
        const end = hum(a.ctx, s.input, a.now + 1, { peak: 0.25 });
        window.setTimeout(() => s.dispose(), (end - a.now + 2) * 1000);
      }
      return g;
    });
    playing.push({ echo, ghosts, t: 0 });
    if (echo.lines.length) void ctx.voice.say(echo.lines);
  };

  return {
    onState(s: GameState, prev: GameState | null) {
      if (!prev) return; // echoes play live, not when rejoining
      for (const e of ECHOES) {
        if (e.timeline !== ctx.timeline) continue;
        const now = e.when === 'rabbitLeft' ? s.rabbitAt !== null : !!s.flags[e.when];
        const before = e.when === 'rabbitLeft' ? prev.rabbitAt !== null : !!prev.flags[e.when];
        if (now && !before) window.setTimeout(() => start(e), 1500);
      }
    },
    update(dt, time) {
      for (let i = playing.length - 1; i >= 0; i--) {
        const p = playing[i]!;
        p.t += dt;
        const k = Math.min(1, p.t / p.echo.duration);
        const fade = Math.min(1, p.t / 1.2, (p.echo.duration - p.t) / 1.5);
        p.echo.figures.forEach((f, j) => {
          const g = p.ghosts[j]!;
          // Walk along the path.
          const seg = k * (f.path.length - 1);
          const a = f.path[Math.floor(seg)]!;
          const b = f.path[Math.min(f.path.length - 1, Math.floor(seg) + 1)]!;
          const u = seg - Math.floor(seg);
          g.root.position.set(a[0] + (b[0] - a[0]) * u, a[1], a[2] + (b[2] - a[2]) * u);
          const dx = b[0] - a[0];
          const dz = b[2] - a[2];
          if (dx * dx + dz * dz > 1e-4) g.root.rotation.y = Math.atan2(dx, dz);
          g.opacity = Math.max(0, fade);
          g.update(time);
        });
        if (p.t >= p.echo.duration) {
          p.ghosts.forEach((g) => g.dispose());
          playing.splice(i, 1);
        }
      }
    },
    dispose() {
      playing.forEach((p) => p.ghosts.forEach((g) => g.dispose()));
    },
  };
}
