import { BoxGeometry, Group, Mesh, type MeshToonMaterial } from 'three';
import { COLOR_NOTE, LULLABY, noteFrequency, PIANO_KEYS } from '../../data/lullaby';
import { INSPECTABLES } from '../../data/inspectables';
import { inkEdges, toonMaterial } from '../../render/materials/toon';
import { buildPropParts } from '../../world/house/props';
import { HOUSE } from '../../world/house/layout';
import type { Color, GameState } from '../../../shared/game/types';
import type { SurfaceKey } from '../../world/house/types';
import type { GameContext, Module } from '../context';
import { panel } from '../items';

const SURFACE: Record<Color, SurfaceKey> = {
  red: 'valveRed',
  blue: 'valveBlue',
  yellow: 'valveYellow',
  green: 'valveGreen',
};
const NOTE_COLOR = Object.fromEntries(Object.entries(COLOR_NOTE).map(([c, n]) => [n, c])) as Record<
  string,
  Color
>;

/** Plays the whole lullaby on the music box or the piano. */
export function playLullaby(
  ctx: GameContext,
  kind: 'box' | 'piano',
  at: [number, number, number],
): void {
  const beat = 60 / LULLABY.bpm;
  let t = 0;
  for (const [note, beats] of LULLABY.notes) {
    window.setTimeout(() => ctx.sfx.note(kind, noteFrequency(note), at), t * 1000);
    t += beats * beat;
  }
}

/**
 * Puzzle 3, the lullaby. Nora winds her music box with the key from the clock: its drum turns
 * and coloured marks light one after another. Sam uncovers the family piano, unlocks it with
 * the key from the rabbit, and plays the colours on little Sam's stickered keys. The right
 * sequence plays the lullaby Nora hummed him to sleep with, in both houses, and Act 2 begins.
 */
export function lullabyModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const p = ctx.house.palette;
  const piano = HOUSE.props.find((x) => x.id === 'piano')!;
  const pianoAt: [number, number, number] = [piano.pos[0], 1, piano.pos[2]];
  const boxSpec = HOUSE.props.find((x) => x.id === 'music-box')!;
  const boxAt: [number, number, number] = [boxSpec.pos[0], boxSpec.pos[1] + 0.1, boxSpec.pos[2]];
  const music = ctx.state().secrets.music;
  const added = new Group();
  ctx.house.root.add(added);

  // Little Sam's stickers on the keys (both timelines; faded in the present).
  const stickers = new Group();
  PIANO_KEYS.forEach((note, i) => {
    const color = NOTE_COLOR[note];
    if (!color) return;
    const m = new Mesh(
      new BoxGeometry(0.03, 0.004, 0.03),
      toonMaterial({ color: p.surfaces[SURFACE[color]] }),
    );
    m.position.set(piano.pos[0] - 0.6 + i * 0.13, 0.81, piano.pos[2] + 0.4);
    stickers.add(m);
  });
  added.add(stickers);

  // --- Nora's music box ------------------------------------------------------------------------
  const box = ctx.house.lookable('music-box');
  const marks: Mesh[] = box ? (box.target.object.children.slice(3, 9) as Mesh[]) : [];
  marks.forEach((m, i) => {
    const mat = m.material as MeshToonMaterial;
    mat.color.set(p.surfaces[SURFACE[music[i]!]]);
    mat.emissive.set(p.surfaces[SURFACE[music[i]!]]);
  });
  let playing = false;
  let step = -1;
  let stepTimer = 0;

  if (nora && box) {
    box.override({
      prompt: () => {
        const s = ctx.state();
        if (!s.flags.boxWound) return s.inv.nora.includes('windKey') ? 'wind' : 'look';
        return 'look';
      },
      interact: () => {
        const s = ctx.state();
        if (!s.flags.boxWound && s.inv.nora.includes('windKey')) {
          ctx.sfx.play('windup', boxAt);
          ctx.act({ type: 'musicbox/wind' });
          return;
        }
        box.look();
      },
    });
  }

  // --- Sam's piano -----------------------------------------------------------------------------
  const sheet = ctx.house.lookable('piano');
  let open: Group | null = null;
  if (!nora && sheet) {
    // The piano under the sheet, revealed when Sam pulls it off.
    open = new Group();
    for (const part of buildPropParts('piano')) {
      const m = new Mesh(part.geometry, toonMaterial({ color: p.surfaces[part.surface] }));
      m.applyMatrix4(part.matrix);
      if (part.ink ?? true) inkEdges(m, p.ink);
      open.add(m);
    }
    open.position.set(piano.pos[0], piano.pos[1], piano.pos[2]);
    open.visible = false;
    added.add(open);
    sheet.override({
      prompt: () => {
        const s = ctx.state();
        if (!s.flags.pianoUncovered) return 'uncover';
        if (!s.flags.pianoOpen) return s.inv.sam.includes('pianoKey') ? 'unlock' : 'locked';
        return s.flags.lullaby ? 'look' : 'play';
      },
      interact: () => {
        const s = ctx.state();
        if (!s.flags.pianoUncovered) {
          ctx.sfx.play('creak', pianoAt);
          ctx.act({ type: 'piano/uncover' });
        } else if (!s.flags.pianoOpen) {
          if (s.inv.sam.includes('pianoKey')) ctx.act({ type: 'piano/unlock' });
          else ctx.sfx.play('rattle', pianoAt);
        } else if (!s.flags.lullaby) keyboard();
        else sheet.look();
      },
    });
  }

  const keyboard = () => {
    if (!sheet) return;
    const pressed: Color[] = [];
    const el = panel(`
      <div class="keys">${PIANO_KEYS.map(
        (n) =>
          `<button type="button" class="key" data-note="${n}" aria-label="key">${
            NOTE_COLOR[n] ? `<span class="sticker ${NOTE_COLOR[n]}"></span>` : ''
          }</button>`,
      ).join('')}</div>
      <div class="progress">${music.map(() => '<span></span>').join('')}</div>`);
    const dots = [...el.querySelectorAll<HTMLElement>('.progress span')];
    const show = () => dots.forEach((d, i) => d.classList.toggle('on', i < pressed.length));
    el.querySelectorAll<HTMLButtonElement>('.key').forEach((b) =>
      b.addEventListener('pointerdown', () => {
        const note = b.dataset.note!;
        ctx.sfx.note('piano', noteFrequency(note), pianoAt);
        const color = NOTE_COLOR[note];
        if (!color) pressed.length = 0;
        else pressed.push(color);
        if (pressed.length === music.length) {
          ctx.act({ type: 'piano/play', colors: pressed.slice() });
          pressed.length = 0;
        }
        show();
      }),
    );
    ctx.inspector.show(
      {
        ...sheet.target,
        object: open ?? sheet.target.object,
        def: { ...INSPECTABLES.piano!, focusY: 0.85, distance: 1.3 },
      },
      el,
    );
  };

  const apply = (s: GameState, prev: GameState | null) => {
    marks.forEach((m) => (m.visible = s.flags.boxWound === true));
    if (!nora && sheet && open) {
      sheet.target.object.visible = !s.flags.pianoUncovered;
      open.visible = !!s.flags.pianoUncovered;
    }
    stickers.visible = nora || !!s.flags.pianoUncovered;
    if (prev && s.flags.boxWound && !prev.flags.boxWound) playing = true;
  };

  return {
    onState: apply,
    onFx(f) {
      if (f.type === 'wrong' && f.what === 'piano' && !nora) ctx.sfx.play('wrong', pianoAt);
      if (f.type === 'solved' && f.what === 'lullaby') {
        ctx.inspector.close();
        // The lullaby, whole, in both houses.
        if (nora) playLullaby(ctx, 'box', boxAt);
        else playLullaby(ctx, 'piano', pianoAt);
      }
    },
    update(dt) {
      // While Nora looks at the wound box, the drum turns: one mark lights per note.
      const looking = ctx.inspector.busy && ctx.inspector.open;
      if (!nora || !ctx.state().flags.boxWound || (!looking && !playing)) {
        marks.forEach((m) => ((m.material as MeshToonMaterial).emissiveIntensity = 0));
        return;
      }
      stepTimer -= dt;
      if (stepTimer > 0) return;
      step = (step + 1) % (music.length + 2);
      if (step >= music.length) {
        stepTimer = 0.7;
        marks.forEach((m) => ((m.material as MeshToonMaterial).emissiveIntensity = 0));
        if (step === music.length + 1) playing = false;
        return;
      }
      const color = music[step]!;
      marks.forEach(
        (m, i) => ((m.material as MeshToonMaterial).emissiveIntensity = i === step ? 0.9 : 0),
      );
      ctx.sfx.note('box', noteFrequency(COLOR_NOTE[color]), boxAt);
      stepTimer = 0.62;
    },
    dispose() {
      added.removeFromParent();
    },
  };
}
