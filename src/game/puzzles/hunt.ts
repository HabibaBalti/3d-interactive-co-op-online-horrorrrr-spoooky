import { Mesh, PlaneGeometry, Vector3 } from 'three';
import { EntityFigure } from '../../entity/EntityFigure';
import { hideDrawingCanvas, toTexture } from '../../render/art';
import { toonMaterial } from '../../render/materials/toon';
import { events } from '../../core/events';
import type { Lookable } from '../../world/house/House';
import { HIDE_SPOTS, type GameState, type HideSpot } from '../../../shared/game/types';
import type { GameContext, Module } from '../context';
import { actionSpot } from '../items';
import { scare } from '../Scare';

type V2 = [number, number];

/** Where Nora can hide, and how the world looks from there. */
const HIDES: Record<
  HideSpot,
  {
    at: [number, number, number];
    size: [number, number, number];
    eye: [number, number, number];
    yaw: number;
    check: V2;
  }
> = {
  table: {
    at: [-4.25, 0.4, 3.6],
    size: [1.0, 0.7, 1.9],
    eye: [-4.25, 0.42, 3.4],
    yaw: -90,
    check: [-3.35, 3.4],
  },
  sofa: {
    at: [2.55, 0.4, 2.2],
    size: [0.5, 0.8, 1.8],
    eye: [2.5, 0.62, 2.3],
    yaw: -90,
    check: [2.55, 3.45],
  },
  desk: {
    at: [6.5, 0.35, -3.0],
    size: [0.6, 0.7, 1.2],
    eye: [6.55, 0.42, -3.0],
    yaw: 90,
    check: [5.75, -3.65],
  },
};

/** The ground floor as a few connected points the thing walks between. */
const DOOR: V2 = [0.5, -5.0];
const NODES: Record<string, V2> = {
  door: DOOR,
  hallN: [0.5, -2.5],
  hallC: [-0.6, 0.5],
  hallS: [-0.6, 4.3],
  studyDoor: [1.3, -4.0],
  study: [3.6, -3.4],
  kitchenDoor: [-1.7, 0.0],
  kitchen: [-3.6, -1.0],
  arch: [-4.25, 1.2],
  dining: [-3.4, 2.4],
  diningDoor: [-1.7, 4.2],
  livingArch: [1.7, 4.5],
  living: [2.6, 4.6],
  table: HIDES.table.check,
  sofa: HIDES.sofa.check,
  desk: HIDES.desk.check,
};
const EDGES: [string, string][] = [
  ['door', 'hallN'],
  ['hallN', 'hallC'],
  ['hallC', 'hallS'],
  ['hallN', 'studyDoor'],
  ['studyDoor', 'study'],
  ['study', 'desk'],
  ['hallC', 'kitchenDoor'],
  ['kitchenDoor', 'kitchen'],
  ['kitchen', 'arch'],
  ['arch', 'dining'],
  ['dining', 'table'],
  ['hallS', 'diningDoor'],
  ['diningDoor', 'table'],
  ['hallS', 'livingArch'],
  ['livingArch', 'living'],
  ['living', 'sofa'],
];

function route(from: string, to: string): V2[] {
  const prev = new Map<string, string>([[from, from]]);
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    if (n === to) break;
    for (const [a, b] of EDGES) {
      const m = a === n ? b : b === n ? a : null;
      if (m && !prev.has(m)) {
        prev.set(m, n);
        queue.push(m);
      }
    }
  }
  const path: V2[] = [];
  for (let n = to; n !== from; n = prev.get(n)!) path.unshift(NODES[n]!);
  return path;
}

function nearestNode(x: number, z: number): string {
  let best = 'door';
  let d = Infinity;
  for (const [k, [nx, nz]] of Object.entries(NODES)) {
    const dd = (nx - x) ** 2 + (nz - z) ** 2;
    if (dd < d) {
      d = dd;
      best = k;
    }
  }
  return best;
}

const WALK = 1.15;
const CHASE = 2.3;

/**
 * Puzzle 6, hide-and-seek. Taking Dad's keys wakes the thing in the basement. The lights die and
 * it comes up the stairs to look for Nora, checking the hiding places one by one. Only one is
 * safe, and only Sam knows which: as a boy he drew it, the girl hidden and the tall thing
 * walking past. It hears running.
 */
export function huntModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const safe = ctx.state().secrets.hide;
  const removers: (() => void)[] = [];

  // --- Sam: the drawing ------------------------------------------------------------------------
  let drawing: Lookable | null = null;
  if (!nora) {
    const plane = new Mesh(
      new PlaneGeometry(0.42, 0.42),
      toonMaterial({ map: toTexture(hideDrawingCanvas(safe, true)) }),
    );
    plane.position.set(1.585, 1.35, -2.9);
    plane.rotation.y = Math.PI / 2;
    plane.rotation.z = 0.06;
    ctx.house.root.add(plane);
    drawing = ctx.house.addLookable({
      id: 'drawing-hide',
      object: plane,
      def: { distance: 0.6, text: {} },
      text: {
        name: 'Your drawing',
        line: 'A girl hiding. Something tall walking past her.',
        lore: 'You always knew the best hiding place in the house.',
      },
      front: new Vector3(1, 0, 0),
    });
  }

  // --- Nora: the hunt --------------------------------------------------------------------------
  let entity: EntityFigure | null = null;
  let phase: 'idle' | 'waiting' | 'emerging' | 'searching' | 'chasing' | 'leaving' | 'caught' =
    'idle';
  let timer = 0;
  let path: V2[] = [];
  let plan: HideSpot[] = [];
  let checking: HideSpot | null = null;
  let hidden: HideSpot | null = null;
  let heardAt: V2 | null = null;
  let stepTimer = 0;
  let looking = false;
  let hiddenAt = 0;
  const pos = new Vector3();

  const hideSpots: { remove: () => void }[] = [];
  const offE = nora
    ? ctx.input.onKey('KeyE', () => {
        // The same key press that hid you must not also bring you out.
        if (hidden && performance.now() - hiddenAt > 400) leaveHiding();
      })
    : () => {};
  const offStep = events.on('step', (e) => {
    if (phase !== 'idle' && e.intensity >= 1) heardAt = [e.x, e.z];
  });

  const leaveHiding = () => {
    const h = HIDES[hidden!];
    hidden = null;
    ctx.freeze(false);
    ctx.player.spawn([h.check[0], 0, h.check[1]], 0);
  };

  const setupHides = (on: boolean) => {
    hideSpots.forEach((h) => h.remove());
    hideSpots.length = 0;
    if (!on) return;
    for (const spot of HIDE_SPOTS) {
      const h = HIDES[spot];
      hideSpots.push(
        actionSpot(ctx, h.at, h.size, {
          prompt: () => (hidden ? null : 'hide'),
          interact: () => {
            hidden = spot;
            hiddenAt = performance.now();
            ctx.freeze(true);
            ctx.sfx.play('creak', h.at);
          },
        }),
      );
    }
  };

  const begin = () => {
    looking = false;
    phase = 'waiting';
    timer = 2.5;
    plan = HIDE_SPOTS.filter((s) => s !== safe).sort(() => Math.random() - 0.5);
    setupHides(true);
  };

  const end = (survived: boolean) => {
    entity?.root.removeFromParent();
    entity = null;
    ctx.setEntity(null);
    ctx.house.power = 1;
    ctx.house.doors.get('basement')?.setOpen(false);
    if (survived) {
      phase = 'idle';
      setupHides(false);
      if (hidden) leaveHiding();
      ctx.act({ type: 'hunt/survived' });
    }
  };

  const caught = async () => {
    phase = 'caught';
    ctx.freeze(true);
    ctx.act({ type: 'hunt/caught' });
    await scare(ctx);
    end(false);
    hidden = null;
    const spawn: [number, number, number] = [-0.5, 0, 5.2];
    ctx.player.spawn(spawn, 0);
    ctx.freeze(false);
    ctx.hud.fadeFrom(1.5);
    // It comes again.
    window.setTimeout(() => {
      if (!ctx.state().flags.huntSurvived) begin();
    }, 4000);
  };

  const goTo = (target: string) => {
    path = route(nearestNode(pos.x, pos.z), target);
  };

  const step = (dt: number, speed: number): boolean => {
    const next = path[0];
    if (!next) return true;
    const dx = next[0] - pos.x;
    const dz = next[1] - pos.z;
    const d = Math.hypot(dx, dz);
    const move = Math.min(d, speed * dt);
    if (d > 1e-3) {
      pos.x += (dx / d) * move;
      pos.z += (dz / d) * move;
      entity!.root.rotation.y = Math.atan2(dx, dz);
    }
    if (d < 0.05) path.shift();
    return path.length === 0;
  };

  return {
    onState(s: GameState, prev: GameState | null) {
      if (!nora) return;
      const hunting = !!s.flags.keysFound && !s.flags.huntSurvived;
      if (hunting && phase === 'idle' && (!prev || !prev.flags.keysFound || prev.loop !== s.loop))
        begin();
      if (!hunting && phase !== 'idle' && s.flags.huntSurvived) {
        phase = 'idle';
        setupHides(false);
      }
    },
    update(dt, time) {
      if (!nora || phase === 'idle' || phase === 'caught') return;
      // Hidden: the camera stays in the hiding place.
      if (hidden) {
        const h = HIDES[hidden];
        ctx.camera.position.set(...h.eye);
        ctx.camera.rotation.set(0, (h.yaw * Math.PI) / 180, 0, 'YXZ');
      }
      const me = ctx.player.feet;
      timer -= dt;
      if (phase === 'waiting') {
        ctx.house.power = Math.max(0.25, ctx.house.power - dt * 0.6);
        if (timer > 0) return;
        entity = new EntityFigure(ctx.house.palette.ink);
        ctx.house.root.add(entity.root);
        pos.set(DOOR[0], 0, DOOR[1]);
        ctx.house.doors.get('basement')?.setOpen(true);
        ctx.sfx.play('breath', [pos.x, 1.8, pos.z]);
        phase = 'emerging';
        timer = 6;
      }
      if (!entity) return;
      entity.update(dt, time);
      entity.root.position.copy(pos);
      ctx.setEntity([pos.x, pos.y, pos.z, entity.root.rotation.y]);
      // Heavy, wet steps.
      stepTimer -= dt;
      if (phase !== 'emerging' && stepTimer <= 0) {
        stepTimer = phase === 'chasing' ? 0.45 : 0.8;
        ctx.sfx.play('entityStep', [pos.x, 0.2, pos.z]);
      }

      const dist = Math.hypot(me.x - pos.x, me.z - pos.z);
      // Out in the open and close, or running anywhere it can hear: it comes for you.
      if (!hidden && phase !== 'leaving' && (dist < 3.5 || heardAt)) {
        if (phase !== 'chasing') ctx.sfx.play('breath', [pos.x, 1.8, pos.z]);
        phase = 'chasing';
      }
      heardAt = null;

      if (phase === 'emerging') {
        if (timer <= 0) {
          phase = 'searching';
          checking = plan.shift() ?? null;
          if (checking) goTo(checking);
        }
      } else if (phase === 'searching') {
        if (step(dt, WALK)) {
          // At a hiding place: it leans in and looks for three seconds.
          if (!looking) {
            looking = true;
            timer = 3;
          }
          if (hidden === checking && timer < 2) {
            void caught();
            return;
          }
          if (timer <= 0) {
            looking = false;
            checking = plan.shift() ?? null;
            if (checking) goTo(checking);
            else {
              phase = 'leaving';
              goTo('door');
            }
          }
        }
      } else if (phase === 'chasing') {
        if (hidden) {
          // Lost you. Back to looking.
          phase = 'searching';
          looking = false;
          if (checking) goTo(checking);
          return;
        }
        if (dist < 2.5) path = [[me.x, me.z]];
        else if (path.length === 0 || Math.random() < dt)
          path = [...route(nearestNode(pos.x, pos.z), nearestNode(me.x, me.z)), [me.x, me.z]];
        step(dt, CHASE);
        if (dist < 0.85) void caught();
      } else if (phase === 'leaving') {
        if (step(dt, WALK)) end(true);
      }
    },
    dispose() {
      offE();
      offStep();
      setupHides(false);
      removers.forEach((r) => r());
      entity?.root.removeFromParent();
      drawing?.remove();
      if (hidden) ctx.freeze(false);
      ctx.setEntity(null);
      ctx.house.power = 1;
    },
  };
}
