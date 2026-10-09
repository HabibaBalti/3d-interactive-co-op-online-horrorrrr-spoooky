import { Mesh, PlaneGeometry, Vector3 } from 'three';
import { portraitCanvas, toTexture } from '../../render/art';
import { toonMaterial } from '../../render/materials/toon';
import {
  MEMBERS,
  PLACES,
  WHATS,
  WHYS,
  type BoardSlot,
  type GameState,
  type Member,
} from '../../../shared/game/types';
import type { GameContext, Module } from '../context';
import { panel } from '../items';
import { scare } from '../Scare';

const ICON: Record<string, string> = {
  // Places
  upstairs:
    '<path d="M3 20h4v-4h4v-4h4V8h4V4" fill="none" stroke="currentColor" stroke-width="2"/>',
  kitchen:
    '<path d="M4 11h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z M2 11h20 M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4" fill="none" stroke="currentColor" stroke-width="2"/>',
  living:
    '<rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 21h6M8 2l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none"/>',
  hall: '<rect x="6" y="2" width="12" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 11h5" stroke="currentColor" stroke-width="3"/>',
  basement:
    '<path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 15c3-3 5 3 8 0s5 3 8 0 3 0 4 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  // What happened
  bolt: '<rect x="3" y="9" width="12" height="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h14" stroke="currentColor" stroke-width="3"/>',
  ranaway:
    '<circle cx="14" cy="4" r="2" fill="currentColor"/><path d="M13 7l-3 6 4 3-2 6M10 13l-5 1M13 9l5 2" fill="none" stroke="currentColor" stroke-width="2"/>',
  fell: '<path d="M3 21h6v-5h6v-5h6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="5" r="2" fill="currentColor"/><path d="M9 8l3 4" stroke="currentColor" stroke-width="2"/>',
  storm: '<path d="M13 2L5 14h6l-2 8 9-13h-6z" fill="currentColor"/>',
  // Why it was hidden
  protect:
    '<circle cx="9" cy="5" r="2.5" fill="currentColor"/><circle cx="15" cy="11" r="1.8" fill="currentColor"/><path d="M5 22v-9a4 4 0 0 1 8 0l3 2M13 22v-6" fill="none" stroke="currentColor" stroke-width="2"/>',
  shame:
    '<circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 6h12v4H6z" fill="currentColor"/><path d="M6 22c0-5 12-5 12 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  money:
    '<ellipse cx="12" cy="7" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 7v5c0 2 14 2 14 0V7M5 12v5c0 2 14 2 14 0v-5" fill="none" stroke="currentColor" stroke-width="2"/>',
};

const svg = (key: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[key] ?? ''}</svg>`;

/** Where the board hangs: the basement's east wall, both timelines. */
const AT = new Vector3(2.9, -1.55, -0.75);

/**
 * The 3:17 board. It appears in the basement after the door at the top of the stairs is found
 * bolted. Nora holds where everyone was at 3:17; Sam holds what happened, who did it, and why
 * it was hidden. Both lock in. The house confirms only in groups of three, so it can't be
 * guessed. Answering "she ran away" is the family's story, and the house keeps it.
 */
export function boardModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const portraits: Record<Member, string> = Object.fromEntries(
    MEMBERS.map((m) => [m, portraitCanvas(m).toDataURL()]),
  ) as Record<Member, string>;

  // The board in the room: cork, four pinned faces.
  const cork = document.createElement('canvas');
  cork.width = 512;
  cork.height = 320;
  const c = cork.getContext('2d')!;
  c.fillStyle = '#6a4a2a';
  c.fillRect(0, 0, 512, 320);
  for (let i = 0; i < 2500; i++) {
    c.fillStyle = `rgba(${Math.random() > 0.5 ? '30,15,5' : '160,120,70'},0.25)`;
    c.fillRect(Math.random() * 512, Math.random() * 320, 2, 2);
  }
  MEMBERS.forEach((m, i) => c.drawImage(portraitCanvas(m), 30 + i * 120, 40, 90, 105));
  c.strokeStyle = '#a3141c';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(75, 150);
  c.lineTo(256, 270);
  c.lineTo(435, 150);
  c.stroke();
  const mesh = new Mesh(new PlaneGeometry(1.2, 0.75), toonMaterial({ map: toTexture(cork) }));
  mesh.position.copy(AT);
  mesh.rotation.y = -Math.PI / 2;
  mesh.visible = false;
  ctx.house.root.add(mesh);
  const look = ctx.house.addLookable({
    id: 'board',
    object: mesh,
    def: { distance: 1.4, text: {} },
    text: { name: 'The night', line: 'Where were they at 3:17? What happened? Why?' },
    front: new Vector3(-1, 0, 0),
  });

  let sync: (() => void) | null = null;

  const open = () => {
    const el = panel(`
      <div class="board-head">
        <div class="candles"><span></span><span></span><span></span></div>
        <div class="locks"><span class="lock me" title="you"></span><span class="lock them" title="your partner"></span></div>
      </div>
      <div class="board-half"></div>
      <div class="partner-half"></div>
      <div class="ctl-row"><button type="button" class="ctl primary" data-lock>lock in</button></div>`);
    const half = el.querySelector<HTMLElement>('.board-half')!;
    const set = (slot: BoardSlot, value: string | null) =>
      ctx.act({ type: 'board/set', slot, value });

    if (nora) {
      half.innerHTML = MEMBERS.map(
        (m) =>
          `<div class="board-row"><img class="face" src="${portraits[m]}" alt="${m}" />${PLACES.map(
            (p) =>
              `<button type="button" class="pick" data-slot="where.${m}" data-value="${p}" aria-label="${p}">${svg(p)}</button>`,
          ).join('')}</div>`,
      ).join('');
    } else {
      half.innerHTML = `
        <div class="board-row">${WHATS.map((w) => `<button type="button" class="pick" data-slot="what" data-value="${w}" aria-label="${w}">${svg(w)}</button>`).join('')}</div>
        <div class="board-row">${MEMBERS.map((m) => `<button type="button" class="pick face-pick" data-slot="who" data-value="${m}" aria-label="${m}"><img class="face" src="${portraits[m]}" alt="" /></button>`).join('')}</div>
        <div class="board-row">${WHYS.map((w) => `<button type="button" class="pick" data-slot="why" data-value="${w}" aria-label="${w}">${svg(w)}</button>`).join('')}</div>`;
    }
    half.querySelectorAll<HTMLButtonElement>('.pick').forEach((b) =>
      b.addEventListener('click', () => {
        const slot = b.dataset.slot as BoardSlot;
        const current = currentValue(ctx.state(), slot);
        set(slot, current === b.dataset.value ? null : b.dataset.value!);
      }),
    );
    el.querySelector('[data-lock]')!.addEventListener('click', () => {
      const s = ctx.state();
      ctx.act({ type: 'board/lock', locked: !s.board.locked[ctx.character] });
    });

    sync = () => {
      const s = ctx.state();
      const mineLocked = s.board.locked[ctx.character];
      half.querySelectorAll<HTMLButtonElement>('.pick').forEach((b) => {
        b.classList.toggle('on', currentValue(s, b.dataset.slot as BoardSlot) === b.dataset.value);
        b.disabled = mineLocked;
      });
      const groups = s.board.confirmed === 7 ? 3 : Math.floor(s.board.confirmed / 3);
      el.querySelectorAll('.candles span').forEach((sp, i) =>
        sp.classList.toggle('lit', i < groups),
      );
      el.querySelector('.lock.me')!.classList.toggle('on', mineLocked);
      el.querySelector('.lock.them')!.classList.toggle(
        'on',
        s.board.locked[ctx.character === 'nora' ? 'sam' : 'nora'],
      );
      el.querySelector<HTMLButtonElement>('[data-lock]')!.textContent = mineLocked
        ? 'unlock'
        : 'lock in';
      // The other half is theirs: only how much of it is filled.
      const theirs =
        ctx.character === 'nora'
          ? [s.board.what, s.board.who, s.board.why]
          : MEMBERS.map((m) => s.board.where[m] ?? null);
      el.querySelector('.partner-half')!.innerHTML = theirs
        .map((v) => `<span class="${v ? 'on' : ''}"></span>`)
        .join('');
    };
    sync();
    ctx.inspector.show(
      { ...look.target, def: { distance: 1.6, text: {} } },
      el,
      () => (sync = null),
    );
  };

  look.override({
    prompt: () => (mesh.visible ? (ctx.state().ending ? 'look' : 'reconstruct') : null),
    interact: () => (ctx.state().ending ? look.look() : open()),
  });

  return {
    onState(s: GameState, prev) {
      mesh.visible = !!s.flags.climax;
      look.setEnabled(mesh.visible);
      sync?.();
      if (prev && s.board.confirmed > prev.board.confirmed) {
        for (
          let i = 0;
          i < Math.max(1, Math.floor((s.board.confirmed - prev.board.confirmed) / 3));
          i++
        ) {
          window.setTimeout(() => ctx.sfx.play('chime1', [AT.x, AT.y, AT.z]), i * 1700);
        }
      }
      if (prev && s.ending && !prev.ending) ctx.inspector.close();
    },
    onFx(f) {
      if (f.type === 'scare' && f.kind === 'board') {
        // A wrong night: both of them feel it.
        ctx.inspector.close();
        void scare(ctx).then(() => ctx.hud.fadeFrom(2));
      }
      if (f.type === 'wrong' && f.what === 'board') ctx.sfx.play('wrong', [AT.x, AT.y, AT.z]);
    },
    dispose() {
      look.remove();
    },
  };
}

function currentValue(s: GameState, slot: BoardSlot): string | null {
  if (slot.startsWith('where.')) return s.board.where[slot.slice(6) as Member] ?? null;
  if (slot === 'what') return s.board.what;
  if (slot === 'who') return s.board.who;
  return s.board.why;
}
