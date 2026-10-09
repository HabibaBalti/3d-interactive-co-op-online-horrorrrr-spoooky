import { BoxGeometry, FogExp2, Mesh, PointLight, Scene, Vector3 } from 'three';
import { EntityFigure } from '../../entity/EntityFigure';
import { InteractionSystem } from '../../interaction/InteractionSystem';
import { inkEdges, toonMaterial } from '../../render/materials/toon';
import { House } from '../../world/house/House';
import { HOUSE } from '../../world/house/layout';
import { Mirror } from '../../world/Mirror';
import type { GameState } from '../../../shared/game/types';
import type { GameContext, Module } from '../context';
import { Ghost } from '../Ghost';
import { scare } from '../Scare';

/** The hall mirror, on the stair cupboard's west face. */
const AT = new Vector3(0.392, 1.55, 2.3);
const EVENT_SECONDS = 12;

/**
 * Puzzle 7, the mirror. The hall mirror shows the other timeline: Nora sees the rotten present
 * and, if he's standing there, a faint Sam; Sam sees 1994 and a faint Nora. After the hunt,
 * when both stand at their mirrors, Sam sees something standing right behind his sister that
 * isn't on her screen. He has to tell her not to turn around. Twelve seconds. If she turns, it's
 * there.
 */
export function mirrorModule(ctx: GameContext): Module {
  const nora = ctx.timeline === '1994';
  const otherTimeline = nora ? 'present' : '1994';
  const s0 = ctx.state();

  // The other house, for the reflection only (no sound, no interaction).
  const other = new Scene();
  const otherHouse = new House(otherTimeline, HOUSE, new InteractionSystem(ctx.camera), {
    shadows: false,
    photosensitive: () => ctx.settings().photosensitive,
    loop: s0.loop,
  });
  other.add(otherHouse.root);
  if (otherTimeline === 'present') {
    // Seen from 1994, the dead house glows faintly cold, as if lit from the glass itself.
    const glow = new PointLight('#9fd8d0', 3.5, 8, 1.2);
    glow.position.set(-0.6, 1.9, 2.3);
    other.add(glow);
  }
  other.background = otherHouse.palette.background;
  other.fog = new FogExp2(otherHouse.palette.fog, otherHouse.palette.fogDensity);
  const partner = new Ghost('adult', nora ? '#a8e8e0' : '#ffd8a8');
  other.add(partner.root);
  const reflectedEntity = new EntityFigure(otherHouse.palette.ink);
  reflectedEntity.root.visible = false;
  other.add(reflectedEntity.root);

  const mirror = new Mirror(0.55, 0.95, !nora);
  mirror.mesh.position.copy(AT);
  mirror.mesh.rotation.y = -Math.PI / 2;
  ctx.house.root.add(mirror.mesh);
  const frame = new Mesh(
    new BoxGeometry(0.03, 1.05, 0.65),
    toonMaterial({ color: ctx.house.palette.surfaces.woodDark }),
  );
  frame.position.set(0.41, AT.y, AT.z);
  inkEdges(frame, ctx.house.palette.ink);
  ctx.house.root.add(frame);
  const look = ctx.house.addLookable({
    id: 'mirror',
    object: mirror.mesh,
    def: { distance: 1.2, text: {} },
    text: nora
      ? {
          name: 'Mirror',
          line: 'The hall in it is rotten. Dark. Someone else’s night.',
          lore: 'Mum covers it with a towel during storms. She won’t say why.',
        }
      : {
          name: 'Mirror',
          line: 'The hall in it is lit. Warm. Like before.',
          lore: 'You used to make faces at yourself here. You don’t now.',
        },
    front: new Vector3(-1, 0, 0),
  });

  // --- The event (Nora's side runs it) ----------------------------------------------------------
  let event: { t: number; breath: number } | null = null;
  let cooldown = 0;
  const fwd = new Vector3();
  const toEntity = new Vector3();

  const near = (x: number, z: number, r: number) => Math.hypot(x - AT.x, z - AT.z) < r && x < AT.x;

  const module: Module & { mirror?: Mirror; other?: Scene } = {
    onState(s: GameState) {
      mirror.crack = s.flags.mirrorDone ? 1 : 0;
    },
    update(dt, time) {
      const cam = ctx.camera;
      // Your partner, where they really are in their night.
      const p = ctx.partner();
      partner.root.visible = !!p?.p;
      if (p?.p) {
        partner.root.position.set(p.p[0], p.p[1], p.p[2]);
        partner.root.rotation.y = p.p[3];
        partner.opacity = 0.7;
        partner.update(time);
      }
      const e = p?.e;
      reflectedEntity.root.visible = !!e;
      if (e) {
        reflectedEntity.root.position.set(e[0], e[1], e[2]);
        reflectedEntity.root.rotation.y = e[3];
        reflectedEntity.update(dt, time);
      }
      // Render the reflection when it could be seen.
      if (cam.position.distanceTo(AT) < 8) {
        otherHouse.update(dt, time, p?.p?.[1] ?? 0);
        mirror.render(ctx.engine.renderer, cam, other, time);
      }

      if (!nora) return;
      const s = ctx.state();
      cooldown -= dt;
      const me = ctx.player.feet;
      if (!event) {
        if (!s.flags.huntSurvived || s.flags.mirrorDone || cooldown > 0) return;
        cam.getWorldDirection(fwd);
        const facing = fwd.x > 0.6;
        const samThere = ctx.link.kind === 'solo' || (!!p?.p && near(p.p[0], p.p[2], 2.6));
        if (near(me.x, me.z, 2.2) && facing && samThere) event = { t: 0, breath: 0 };
        return;
      }
      // Something stands right behind her. Only the mirror on the other side shows it.
      event.t += dt;
      const yaw = ctx.player.yaw;
      const behind: [number, number, number, number] = [
        me.x + Math.sin(yaw) * 0.8,
        me.y,
        me.z + Math.cos(yaw) * 0.8,
        yaw,
      ];
      ctx.setEntity(behind);
      event.breath -= dt;
      if (event.breath <= 0) {
        event.breath = 6.5;
        ctx.sfx.play('breath', [behind[0], 1.8, behind[2]]);
      }
      cam.getWorldDirection(fwd);
      toEntity.set(behind[0] - cam.position.x, 0, behind[2] - cam.position.z).normalize();
      const turned = fwd.x * toEntity.x + fwd.z * toEntity.z > 0.3;
      if (turned) {
        event = null;
        cooldown = 10;
        ctx.setEntity(null);
        ctx.act({ type: 'mirror/turned' });
        void scare(ctx).then(() => ctx.hud.fadeFrom(1.5));
        return;
      }
      if (!near(me.x, me.z, 3.2)) {
        event = null;
        ctx.setEntity(null);
        return;
      }
      if (event.t >= EVENT_SECONDS) {
        event = null;
        ctx.setEntity(null);
        ctx.sfx.play('thud', [AT.x, AT.y, AT.z]);
        ctx.act({ type: 'mirror/endured' });
      }
    },
    dispose() {
      look.remove();
      mirror.dispose();
      frame.removeFromParent();
      otherHouse.dispose();
      partner.dispose();
      if (event) ctx.setEntity(null);
    },
  };
  module.mirror = mirror;
  module.other = other;
  return module;
}
