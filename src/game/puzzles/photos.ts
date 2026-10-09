import { type Mesh, type MeshToonMaterial, Vector3 } from 'three';
import { photoCanvas, toTexture } from '../../render/art';
import type { InspectText } from '../../data/inspectables';
import type { Lookable } from '../../world/house/House';
import type { GameState } from '../../../shared/game/types';
import type { Timeline } from '../../../shared/types';
import type { GameContext, Module } from '../context';
import { panel, placeItem } from '../items';

/** What each photograph is, as each sibling sees it. */
const PHOTO_TEXT: Record<Timeline, InspectText[]> = {
  '1994': [
    {
      name: 'Photograph',
      line: 'Mum and Dad, younger, laughing.',
      lore: 'The summer before Sam was born. Nobody looks tired yet.',
    },
    {
      name: 'Photograph',
      line: 'Nora and Sam at the lake.',
      lore: 'Nora taught him to float that day. He wouldn’t let go.',
    },
    {
      name: 'Photograph',
      line: 'All four of them on the porch.',
      lore: 'Dad set the timer and ran. He almost made it.',
    },
    {
      name: 'Photograph',
      line: 'Sam, grinning, with his walkie-talkie.',
      lore: 'He wouldn’t put the walkie-talkie down for a week.',
    },
  ],
  present: [
    {
      name: 'Photograph',
      line: 'Faded. Mum and Dad.',
      lore: 'In her last years, Mum kept this one facing the wall.',
    },
    {
      name: 'Photograph',
      line: 'The lake. Water got in. Only a boy is left in it.',
      lore: 'Of all things, it was water that got into it.',
    },
    {
      name: 'Photograph',
      line: 'Four on the porch. One face is scratched out.',
      lore: 'The scratches are careful. Someone took their time.',
    },
    {
      name: 'Photograph',
      line: 'You, with your walkie-talkie. Hanging crooked.',
      lore: 'Taken down and hung back crooked. More than once.',
    },
  ],
};

const SLOTS = ['photo-1', 'photo-2', 'photo-3', 'photo-4'];

/**
 * Puzzle 4, the photo wall. Decades later the family photos hang in a different order, faded,
 * one face scratched out, one sibling washed away. Sam describes his wall; Nora rehangs hers to
 * match. When they match, Sam's porch photo drops from its nail: a tape is taped behind it.
 */
export function photosModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const aged = !nora;
  const textures = [0, 1, 2, 3].map((i) => toTexture(photoCanvas(i, aged)));
  const thumbs = nora ? [0, 1, 2, 3].map((i) => photoCanvas(i, false).toDataURL()) : [];
  const slots = SLOTS.map((id) => ctx.house.lookable(id)).filter((l): l is Lookable => !!l);
  let tape: Lookable | null = null;
  let fallen = false;
  const secret = ctx.state().secrets.photos;

  const hang = (order: number[]) => {
    slots.forEach((look, slot) => {
      const index = order[slot]!;
      const plane = look.target.object.children[1] as Mesh | undefined;
      if (plane) {
        const m = plane.material as MeshToonMaterial;
        m.map = textures[index]!;
        m.color.set('#ffffff');
        m.needsUpdate = true;
      }
      look.target.text = PHOTO_TEXT[ctx.timeline][index]!;
    });
  };

  const arrange = (from: Lookable) => {
    const order = ctx.state().photoOrder.slice();
    let picked: number | null = null;
    const el = panel(`
      <div class="photos">${order
        .map(
          (_, slot) =>
            `<button type="button" class="photo" data-slot="${slot}"><img alt="photograph" /></button>`,
        )
        .join('')}</div>
      <div class="ctl-row"><button type="button" class="ctl primary" data-hang>hang them</button></div>`);
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.photo')];
    const draw = () =>
      buttons.forEach((b, slot) => {
        b.querySelector('img')!.src = thumbs[order[slot]!]!;
        b.classList.toggle('picked', picked === slot);
      });
    buttons.forEach((b, slot) =>
      b.addEventListener('click', () => {
        if (picked === null) picked = slot;
        else {
          [order[picked], order[slot]] = [order[slot]!, order[picked]!];
          picked = null;
          hang(order);
          ctx.sfx.play('creak', [-1.4, 1.5, 2.2]);
        }
        draw();
      }),
    );
    el.querySelector('[data-hang]')!.addEventListener('click', () => {
      ctx.act({ type: 'photos/hang', order: order.slice() });
    });
    draw();
    ctx.inspector.show(
      {
        ...from.target,
        def: { distance: 2.0, text: {} },
        object: slots[1]!.target.object,
        front: new Vector3(1, 0, 0),
      },
      el,
      () => hang(ctx.state().photoOrder),
    );
  };

  if (nora) {
    for (const look of slots) {
      look.override({
        prompt: () => {
          const s = ctx.state();
          return s.act >= 2 && !s.flags.photosHung ? 'rehang' : 'look';
        },
        interact: () => {
          const s = ctx.state();
          if (s.act >= 2 && !s.flags.photosHung) arrange(look);
          else look.look();
        },
      });
    }
  }

  const apply = (s: GameState, prev: GameState | null) => {
    hang(nora ? s.photoOrder : secret);
    if (nora) return;
    // Sam: when the walls match, the porch photo drops and the tape behind it shows.
    if (s.flags.photosHung) {
      const slot = secret.indexOf(2);
      const frame = slots[slot]!.target.object;
      if (!fallen) {
        fallen = true;
        const wall = frame.position.clone();
        if (prev && !prev.flags.photosHung) ctx.sfx.play('thud', [wall.x, 0.2, wall.z]);
        frame.position.y = 0.05;
        frame.position.x += 0.25;
        frame.rotation.z = Math.PI / 2 - 0.2;
        if (!s.inv.sam.includes('tape')) {
          tape = placeItem(
            ctx,
            'tape',
            'tape',
            [wall.x + 0.03, wall.y - 0.25, wall.z],
            {
              name: 'Videotape',
              line: 'Taped to the back of the frame. Dad’s handwriting on the label.',
              lore: 'Someone wanted it kept, and wanted it hidden.',
            },
            { rotY: Math.PI / 2 },
          );
          tape.target.object.rotation.z = Math.PI / 2;
        }
      }
      if (s.inv.sam.includes('tape') && tape) {
        tape.remove();
        tape = null;
      }
    }
  };

  return {
    onState: apply,
    onFx(f) {
      if (f.type === 'wrong' && f.what === 'photos' && nora)
        ctx.sfx.play('wrong', [-1.4, 1.5, 2.2]);
      if (f.type === 'solved' && f.what === 'photos' && nora) ctx.inspector.close();
    },
    dispose() {
      tape?.remove();
      textures.forEach((t) => t.dispose());
    },
  };
}
