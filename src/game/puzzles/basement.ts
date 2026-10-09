import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
} from 'three';
import { COLORS, type Color, type GameState } from '../../../shared/game/types';
import { noise } from '../../audio/synth';
import type { GameContext, Module } from '../context';
import { panel } from '../items';
import { scare } from '../Scare';

/** The four valve wheels on the boiler-room wall (see props.ts `pipes`). */
const PIPES = { x: -5.25, y: -3, z: -5.8, w: 3.2 };
const HEIGHTS = [0.6, 1.0, 1.4, 1.8];
function valveAt(i: number): [number, number, number] {
  const x = PIPES.x - PIPES.w / 2 + (PIPES.w / 5) * (i + 1);
  return [x, PIPES.y + HEIGHTS[(i * 3) % 4]!, PIPES.z + 0.12];
}

const FLOOR = -3;
/** Head height: when the water passes this, she can't breathe. */
const DROWN = 1.5;
/** Metres per second with no valve closed. */
const RATE = 1.6 / 95;
const SLOWER = [1, 0.62, 0.38, 0.18, 0];

const SWATCH: Record<Color, string> = {
  red: '#b3121c',
  blue: '#1f3fa8',
  yellow: '#d8b020',
  green: '#2a8a3a',
};

/**
 * Act 3, the basement. In 1994 it floods, now: Nora closes four valves while the water climbs
 * past her chest, in the order only Sam can see, painted as notches on the wall decades later
 * by a father who learned how to drain it. Then she climbs the stairs, and the door at the top
 * is bolted from the other side.
 */
export function basementModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const door = ctx.house.doors.get('basement');
  const order = ctx.state().secrets.valves;
  const root = new Group();
  ctx.house.root.add(root);
  let level = 0;
  let underFor = 0;
  let drowned = false;
  let rush: { gain: GainNode; stop: () => void } | null = null;

  // --- Doors ---------------------------------------------------------------------------------
  if (door && nora) {
    door.lockedPrompt = () => (ctx.state().inv.nora.includes('keys') ? 'unlock' : 'locked');
    door.onLockedUse = () => {
      if (!ctx.state().inv.nora.includes('keys') || ctx.state().act < 3) return false;
      door.forceLocked = false;
      door.setOpen(true);
      return true;
    };
  }
  if (door && !nora) {
    door.onBolt = (bolted) => {
      const s = ctx.state();
      if (bolted) return;
      if (s.board.confirmed === 7 && !s.ending) ctx.act({ type: 'ending/unbolt' });
      else ctx.act({ type: 'basement/unbolt' });
    };
  }

  // --- Water (Nora) ----------------------------------------------------------------------------
  const water = new Mesh(
    new PlaneGeometry(10.2, 9.2, 24, 24),
    new MeshStandardMaterial({
      color: '#0d2224',
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.86,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-2, FLOOR, -1.5);
  water.visible = false;
  if (nora) root.add(water);
  // A bare bulb by the boiler: she has no torch, and she has to see the wheels.
  const bulb = new PointLight('#ffcf8a', 0, 7, 1.4);
  bulb.position.set(-4.6, -1.0, -4.4);
  if (nora) root.add(bulb);
  const underwater = document.createElement('div');
  underwater.className = 'underwater';
  document.getElementById('app')?.appendChild(underwater);

  // --- Notches (Sam) --------------------------------------------------------------------------
  if (!nora) {
    const paint = new MeshBasicMaterial({ color: '#d8d4c4' });
    order.forEach((color, rank) => {
      const [x, y] = valveAt(COLORS.indexOf(color));
      for (let n = 0; n <= rank; n++) {
        const notch = new Mesh(new BoxGeometry(0.018, 0.12, 0.005), paint);
        notch.position.set(x - (0.05 * rank) / 2 + n * 0.05, y + 0.24, -5.918);
        root.add(notch);
      }
    });
  }

  // --- Valve panel (Nora) ---------------------------------------------------------------------
  const valves = ctx.house.lookable('valves');
  const openPanel = () => {
    if (!valves) return;
    const el = panel(`
      <div class="ctl-row valves">${COLORS.map(
        (c) =>
          `<button type="button" class="wheel" data-color="${c}" aria-label="${c} valve" style="--c:${SWATCH[c]}"></button>`,
      ).join('')}</div>`);
    const sync = () => {
      const closed = ctx.state().valvesClosed;
      el.querySelectorAll<HTMLButtonElement>('.wheel').forEach((b) => {
        const shut = closed.includes(b.dataset.color as Color);
        b.classList.toggle('shut', shut);
        b.disabled = shut;
      });
    };
    el.querySelectorAll<HTMLButtonElement>('.wheel').forEach((b) =>
      b.addEventListener('click', () => {
        ctx.sfx.play('creak', valveAt(COLORS.indexOf(b.dataset.color as Color)));
        ctx.act({ type: 'valve/close', color: b.dataset.color as Color });
      }),
    );
    sync();
    panelSync = sync;
    ctx.inspector.show(
      { ...valves.target, def: { ...valves.target.def, distance: 2.4 } },
      el,
      () => (panelSync = null),
    );
  };
  let panelSync: (() => void) | null = null;
  if (nora && valves) {
    valves.override({
      prompt: () => {
        const s = ctx.state();
        return s.flags.floodStarted && !s.flags.valvesDone ? 'turn' : 'look';
      },
      interact: () => {
        const s = ctx.state();
        if (s.flags.floodStarted && !s.flags.valvesDone) openPanel();
        else valves.look();
      },
    });
  }

  const startRush = () => {
    const a = ctx.audio;
    if (!a || rush) return;
    const src = a.ctx.createBufferSource();
    src.buffer = noise(a.ctx, 'brown');
    src.loop = true;
    const f = a.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const gain = a.ctx.createGain();
    gain.gain.value = 0;
    const s = a.spatial(PIPES.x, -2, PIPES.z, { ref: 2 });
    src.connect(f).connect(gain).connect(s.input);
    src.start();
    rush = {
      gain,
      stop: () => {
        gain.gain.setTargetAtTime(0, a.now, 0.5);
        window.setTimeout(() => {
          src.stop();
          s.dispose();
        }, 2000);
      },
    };
  };

  const apply = (s: GameState, prev: GameState | null) => {
    if (door) {
      if (nora) {
        if (s.ending === 'truth') {
          door.setBolted(false);
          door.setOpen(true);
        } else if (s.flags.valvesDone) {
          // The house shuts the door on her and slides the bolt. From below, she hears it.
          door.forceLocked = false;
          door.setOpen(false);
          door.setBolted(true);
        } else if (s.act < 3 || door.forceLocked === null) {
          // Dad keeps it locked. In Act 3 her keys open it (see onLockedUse).
          door.forceLocked = true;
        }
      } else {
        door.boltStuck = s.act < 3;
      }
    }
    if (!nora) return;
    if (s.flags.floodStarted || s.flags.valvesDone) {
      water.visible = true;
      bulb.intensity = s.flags.valvesDone ? 2.5 : 4;
      if (s.flags.valvesDone && level < 0.4) level = 1.15;
      if (!s.flags.valvesDone) startRush();
    } else {
      water.visible = false;
      bulb.intensity = s.act >= 3 ? 4 : 0;
      level = 0;
    }
    if (s.flags.valvesDone && prev && !prev.flags.valvesDone) {
      rush?.stop();
      rush = null;
      ctx.inspector.close();
      ctx.house.power = 0.5;
    }
    panelSync?.();
  };

  return {
    onState: apply,
    onFx(f) {
      if (!nora) return;
      if (f.type === 'surge') {
        level += 0.14;
        ctx.sfx.play('surge', [PIPES.x, -2, PIPES.z]);
        ctx.sfx.play('wrong');
      }
    },
    update(dt, time) {
      if (!nora) return;
      const s = ctx.state();
      const feet = ctx.player.feet;
      // Going down in Act 3 starts the flood.
      if (s.act === 3 && !s.flags.floodStarted && !s.flags.valvesDone && feet.y < -1.5) {
        ctx.act({ type: 'flood/start' });
      }
      if (s.flags.valvesDone) {
        ctx.house.power = Math.min(ctx.house.power, 0.5);
        // At the top of the stairs: the door is bolted from the other side.
        if (!s.flags.climax && feet.x < -0.5 && feet.z < -4.6 && feet.y > -0.6) {
          ctx.act({ type: 'door/climax' });
        }
      }
      if (!water.visible) return;
      if (s.flags.floodStarted && !s.flags.valvesDone) {
        level += RATE * SLOWER[s.valvesClosed.length]! * dt;
        if (rush) rush.gain.gain.value = 0.35 * SLOWER[s.valvesClosed.length]!;
      }
      water.position.y = FLOOR + level + Math.sin(time * 1.3) * 0.01;
      const under = ctx.camera.position.y < water.position.y;
      underwater.classList.toggle('on', under);
      // Breath held too long under the water: the night starts the act again.
      underFor = under ? underFor + dt : 0;
      if (!drowned && level > DROWN && underFor > 3) {
        drowned = true;
        void scare(ctx).then(() => {
          ctx.act({ type: 'flood/drowned' });
          ctx.hud.fadeFrom(2);
        });
      }
    },
    dispose() {
      rush?.stop();
      root.removeFromParent();
      underwater.remove();
      if (door) {
        door.onBolt = null;
        door.onLockedUse = null;
        door.lockedPrompt = null;
      }
    },
  };
}
