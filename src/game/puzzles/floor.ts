import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { inkEdges, toonMaterial } from '../../render/materials/toon';
import { plankTexture } from '../../render/textures';
import type { Lookable } from '../../world/house/House';
import type { GameState, RabbitSpot } from '../../../shared/game/types';
import { RABBIT_SPOTS } from '../../../shared/game/types';
import type { GameContext, Module } from '../context';
import { actionSpot, buildItem, placeItem } from '../items';
import { GrandfatherClock } from '../../world/props/GrandfatherClock';

/** The row of hall floorboards, west (dining-room side) to east. */
export const STRIP = { x0: -1.5, x1: 1.5, z: 4.0, depth: 0.6, count: 10 };
const W = (STRIP.x1 - STRIP.x0) / STRIP.count;
const boardX = (i: number) => STRIP.x0 + W * (i + 0.5);

/** Where Nora can leave little Sam's rabbit, and where Sam will find it decades later. */
function rabbitSpot(ctx: GameContext, spot: RabbitSpot): [number, number, number] {
  if (spot === 'clock' && ctx.house.clock) {
    const c = GrandfatherClock.COMPARTMENT;
    const p = ctx.house.clock.root.localToWorld(new Vector3(c.x - 0.05, c.y - 0.12, c.z));
    return [p.x, p.y, p.z];
  }
  if (spot === 'table') return [-1.15, 0.76, 5.45];
  return [3.2, 0.49, -4.7]; // the piano bench
}

/**
 * Puzzle 2, the floorboards, and the first thing handed across time. In 1994 the hall boards
 * are identical; decades later the floor has rotted through, and the joist under one of them
 * has a symbol carved by a child. Sam counts; Nora prises up that board and finds her brother's
 * toy rabbit. Wherever she leaves it, Sam finds it, aged, with the piano key in its battery
 * hatch.
 */
export function floorModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const p = ctx.house.palette;
  const root = new Group();
  ctx.house.root.add(root);
  const k = ctx.state().secrets.board;
  const boards: Mesh[] = [];
  const looks: Lookable[] = [];
  let rabbitInFloor: Lookable | null = null;
  let rabbitPlaced: Lookable | null = null;
  let placedAt: RabbitSpot | null = null;
  const spots: { remove: () => void }[] = [];

  const plank = plankTexture(p.plank, p.decay);
  const mat = () => toonMaterial({ color: '#ffffff', map: plank });
  const hole = new MeshBasicMaterial({ color: '#050304' });

  if (nora) {
    for (let i = 0; i < STRIP.count; i++) {
      const b = new Mesh(new BoxGeometry(W - 0.012, 0.02, STRIP.depth), mat());
      b.position.set(boardX(i), 0.011, STRIP.z);
      inkEdges(b, p.ink, 0.6);
      root.add(b);
      boards.push(b);
      const look = ctx.house.addLookable({
        id: `board-${i}`,
        object: b,
        def: { view: 'top', distance: 1.1, text: {} },
        text: {
          name: 'Floorboard',
          line: 'One of a row. They all look the same.',
          lore: 'Sam swears the floor talks at night.',
        },
        front: new Vector3(0, 0, 1),
      });
      look.override({
        prompt: () => (ctx.state().flags.boardOpen ? null : 'pry'),
        interact: () => {
          ctx.act({ type: 'floor/pry', index: i });
        },
      });
      looks.push(look);
    }
    // The cavity under the loose board.
    const cavity = new Mesh(new BoxGeometry(W - 0.03, 0.004, STRIP.depth - 0.04), hole);
    cavity.position.set(boardX(k), 0.003, STRIP.z);
    cavity.visible = false;
    cavity.name = 'cavity';
    root.add(cavity);
  } else {
    // Decades of damp: three boards gone, a dark gap, a joist, and the carving.
    for (let i = 0; i < STRIP.count; i++) {
      if (Math.abs(i - k) <= 1) continue;
      const b = new Mesh(new BoxGeometry(W - 0.012, 0.02, STRIP.depth), mat());
      b.position.set(boardX(i), 0.011, STRIP.z);
      b.rotation.z = (Math.random() - 0.5) * 0.04;
      inkEdges(b, p.ink, 0.6);
      root.add(b);
    }
    const lo = Math.max(0, k - 1);
    const hi = Math.min(STRIP.count - 1, k + 1);
    const gapW = (hi - lo + 1) * W;
    const gap = new Mesh(new BoxGeometry(gapW, 0.004, STRIP.depth - 0.02), hole);
    gap.position.set(STRIP.x0 + W * lo + gapW / 2, 0.003, STRIP.z);
    root.add(gap);
    const joist = new Mesh(
      new BoxGeometry(gapW, 0.012, 0.09),
      toonMaterial({ color: p.surfaces.woodDark }),
    );
    joist.position.set(gap.position.x, 0.008, STRIP.z);
    root.add(joist);
    // The symbol: a small pale diamond scratched into the joist under board k.
    const carving = new Mesh(
      new BoxGeometry(0.06, 0.004, 0.06),
      new MeshBasicMaterial({ color: '#c8c0a0' }),
    );
    carving.rotation.y = Math.PI / 4;
    carving.position.set(boardX(k), 0.016, STRIP.z);
    root.add(carving);
    const holeLook = new Group();
    holeLook.add(gap.clone());
    holeLook.visible = true;
    const look = ctx.house.addLookable({
      id: 'floor-hole',
      object: joist,
      def: { view: 'top', distance: 1.6, text: {} },
      text: {
        name: 'Rotten floor',
        line: 'Boards gone. Something is carved into the joist below.',
        lore: 'You remember the knife. You don’t remember the reason.',
      },
      front: new Vector3(0, 0, 1),
    });
    looks.push(look);
  }

  const apply = (s: GameState, prev: GameState | null) => {
    if (nora) {
      if (s.flags.boardOpen) {
        const b = boards[k]!;
        b.position.set(boardX(k) + 0.02, 0.09, STRIP.z + STRIP.depth / 2 - 0.05);
        b.rotation.x = -1.1;
        root.getObjectByName('cavity')!.visible = true;
        if (prev && !prev.flags.boardOpen) ctx.sfx.play('pry', [boardX(k), 0.1, STRIP.z]);
      }
      // The rabbit waits in the floor until Nora takes it.
      const inFloor = s.flags.boardOpen && s.rabbitAt === null && !s.inv.nora.includes('rabbit');
      if (inFloor && !rabbitInFloor) {
        rabbitInFloor = placeItem(ctx, 'rabbit-floor', 'rabbit', [boardX(k), 0.0, STRIP.z], {
          name: 'Toy rabbit',
          line: 'Sam’s. He hides it when he doesn’t want to share.',
          lore: 'He says it keeps secrets better than people do.',
        });
      } else if (!inFloor && rabbitInFloor) {
        rabbitInFloor.remove();
        rabbitInFloor = null;
      }
      // Holding the rabbit: places to leave it for him.
      spots.forEach((sp) => sp.remove());
      spots.length = 0;
      if (s.inv.nora.includes('rabbit')) {
        for (const spot of RABBIT_SPOTS) {
          if (spot === 'clock' && !s.flags.clockSet) continue;
          const at = rabbitSpot(ctx, spot);
          spots.push(
            actionSpot(ctx, [at[0], at[1] + 0.08, at[2]], [0.35, 0.25, 0.35], {
              prompt: () => 'leave',
              interact: () => ctx.act({ type: 'rabbit/leave', spot }),
            }),
          );
        }
      }
    }
    // Wherever it was left: in 1994 as it was, decades later grey with dust.
    if (s.rabbitAt !== placedAt) {
      rabbitPlaced?.remove();
      rabbitPlaced = null;
      placedAt = s.rabbitAt;
      if (s.rabbitAt) {
        const at = rabbitSpot(ctx, s.rabbitAt);
        if (nora) {
          const r = buildItem(ctx, 'rabbit');
          r.position.set(...at);
          root.add(r);
          rabbitPlaced = { remove: () => r.removeFromParent() } as unknown as Lookable;
        } else {
          rabbitPlaced = placeItem(
            ctx,
            'rabbit-aged',
            'rabbit',
            at,
            {
              name: 'Toy rabbit',
              line: 'Yours. Grey with dust. Its battery hatch is taped shut.',
              lore: 'You hid things in here. You can’t remember what.',
            },
            // Taking it means opening the hatch: inside is the piano key.
            { aged: true, take: () => ctx.act({ type: 'item/take', item: 'pianoKey' }) },
          );
        }
      }
    }
    if (!nora && rabbitPlaced && s.inv.sam.includes('pianoKey')) {
      rabbitPlaced.override({ prompt: () => 'look', interact: () => rabbitPlaced?.look() });
    }
  };

  return {
    onState: apply,
    onFx(f) {
      if (f.type === 'wrong' && f.what === 'floor' && nora) {
        ctx.sfx.play('rattle', [0, 0.1, STRIP.z]);
      }
    },
    dispose() {
      root.removeFromParent();
      spots.forEach((sp) => sp.remove());
      rabbitInFloor?.remove();
      rabbitPlaced?.remove();
    },
  };
}
