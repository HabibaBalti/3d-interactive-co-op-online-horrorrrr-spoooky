import { type Mesh, MeshBasicMaterial, type Material } from 'three';
import { drawTapeFrame } from '../../render/art';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { KeySpot } from '../../../shared/game/types';
import type { GameContext, Module } from '../context';
import { actionSpot } from '../items';

const WATCH_SECONDS = 12;

/** Nora's kitchen hiding places, and where to stand your hand. */
const SEARCH: Record<
  Exclude<KeySpot, 'jar' | 'breadbin'>,
  { pos: [number, number, number]; size: [number, number, number] }
> = {
  drawer: { pos: [-4.6, 0.62, -5.27], size: [0.6, 0.25, 0.12] },
  fridge: { pos: [-6.55, 1.82, -5.55], size: [0.75, 0.2, 0.7] },
};

/**
 * Puzzle 5, the home video. Behind the photo Sam finds a tape; on the dead TV it plays the
 * kitchen at 2:50 a.m.: Dad hiding something while Mum watches from the door. Sam tells Nora
 * where. Only after he has watched it do the keys settle where the tape says they are, and
 * Nora can find them. Taking them wakes something.
 */
export function tapeModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const spot = ctx.state().secrets.keys;
  const removers: (() => void)[] = [];

  // --- Sam: the TV ---------------------------------------------------------------------------
  const tv = ctx.house.lookable('tv');
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const g = canvas.getContext('2d')!;
  const video = new CanvasTexture(canvas);
  video.colorSpace = SRGBColorSpace;
  const screen = tv?.target.object.children[2] as Mesh | undefined;
  const screenMat = screen?.material as Material | undefined;
  const playingMat = new MeshBasicMaterial({ map: video });
  let watching = -1;

  const play = () => {
    if (!tv || !screen) return;
    watching = 0;
    screen.material = playingMat;
    ctx.sfx.play('tape', [tv.target.object.position.x, 1, tv.target.object.position.z]);
    ctx.inspector.show(
      { ...tv.target, def: { ...tv.target.def, distance: 0.75, focusY: 0.78 } },
      undefined,
      () => {
        watching = -1;
        if (screenMat) screen.material = screenMat;
      },
    );
  };

  if (!nora && tv) {
    tv.override({
      prompt: () => (ctx.state().inv.sam.includes('tape') ? 'play' : 'look'),
      interact: () => (ctx.state().inv.sam.includes('tape') ? play() : tv.look()),
    });
  }

  // --- Nora: the kitchen ---------------------------------------------------------------------
  const searching = () => {
    const s = ctx.state();
    return s.act >= 2 && !s.flags.keysFound;
  };
  const search = (where: KeySpot, at: [number, number, number]) => {
    ctx.sfx.play('creak', at);
    ctx.act({ type: 'keys/search', spot: where });
  };
  if (nora) {
    for (const [where, id] of [
      ['jar', 'cookie-jar'],
      ['breadbin', 'breadbin'],
    ] as const) {
      const look = ctx.house.lookable(id);
      if (!look) continue;
      const p = look.target.object.position;
      look.override({
        prompt: () => (searching() ? 'search' : 'look'),
        interact: () => (searching() ? search(where, [p.x, p.y, p.z]) : look.look()),
      });
    }
    for (const [where, s] of Object.entries(SEARCH) as [KeySpot, (typeof SEARCH)['drawer']][]) {
      const a = actionSpot(ctx, s.pos, s.size, {
        prompt: () => (searching() ? 'search' : null),
        interact: () => search(where, s.pos),
      });
      removers.push(a.remove);
    }
  }

  return {
    onFx(f) {
      if (!nora) return;
      if (f.type === 'wrong' && f.what === 'keys') ctx.sfx.play('rattle');
      if (f.type === 'solved' && f.what === 'keys') ctx.sfx.play('pickup');
    },
    update(dt) {
      if (watching < 0) return;
      watching += dt;
      drawTapeFrame(g, canvas.width, canvas.height, watching % WATCH_SECONDS, spot);
      video.needsUpdate = true;
      if (watching >= WATCH_SECONDS && !ctx.state().flags.tapeWatched) {
        ctx.act({ type: 'vhs/watched' });
      }
    },
    dispose() {
      removers.forEach((r) => r());
      video.dispose();
      playingMat.dispose();
    },
  };
}
