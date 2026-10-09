import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { inkEdges, toonMaterial } from '../render/materials/toon';
import type { Interactable } from '../interaction/InteractionSystem';
import type { InspectText } from '../data/inspectables';
import type { Lookable } from '../world/house/House';
import type { Item } from '../../shared/game/types';
import type { GameContext } from './context';
import { Vector3 } from 'three';

type V3 = [number, number, number];

/** Small hand-held things, built from primitives in the current timeline's colours. */
export function buildItem(ctx: GameContext, item: Item, aged = false): Object3D {
  const p = ctx.house.palette;
  const ink = p.ink;
  const mat = (c: string) => toonMaterial({ color: c });
  const g = new Group();
  const add = (m: Mesh, edges = true) => {
    if (edges) inkEdges(m, ink);
    g.add(m);
    return m;
  };
  switch (item) {
    case 'windKey': {
      const brass = mat(aged ? '#5a5030' : '#b8902a');
      const ring = add(new Mesh(new TorusGeometry(0.025, 0.007, 6, 14), brass), false);
      ring.position.y = 0.03;
      const stem = add(new Mesh(new CylinderGeometry(0.005, 0.005, 0.06, 6), brass), false);
      stem.rotation.z = Math.PI / 2;
      stem.position.set(0.05, 0.03, 0);
      break;
    }
    case 'rabbit': {
      const fur = mat(aged ? '#6a6a60' : '#d8d0c0');
      const body = add(new Mesh(new SphereGeometry(0.06, 10, 8), fur), false);
      body.scale.set(1, 0.85, 1.2);
      body.position.y = 0.05;
      const head = add(new Mesh(new SphereGeometry(0.04, 10, 8), fur), false);
      head.position.set(0, 0.11, 0.05);
      for (const s of [-1, 1]) {
        const ear = add(new Mesh(new BoxGeometry(0.014, 0.07, 0.008), fur), false);
        ear.position.set(s * 0.015, 0.17, 0.045);
        ear.rotation.z = s * 0.2;
      }
      const eye = new MeshBasicMaterial({ color: '#111' });
      for (const s of [-1, 1]) {
        const e = new Mesh(new SphereGeometry(0.006, 6, 4), eye);
        e.position.set(s * 0.016, 0.12, 0.085);
        g.add(e);
      }
      break;
    }
    case 'pianoKey': {
      const iron = mat('#4a4a44');
      const bow = add(new Mesh(new TorusGeometry(0.015, 0.005, 6, 12), iron), false);
      bow.position.y = 0.02;
      const bit = add(new Mesh(new BoxGeometry(0.05, 0.006, 0.006), iron), false);
      bit.position.set(0.035, 0.02, 0);
      break;
    }
    case 'tape': {
      const shell = add(new Mesh(new BoxGeometry(0.19, 0.025, 0.105), mat('#141414')));
      shell.position.y = 0.013;
      const label = new Mesh(new BoxGeometry(0.15, 0.002, 0.05), mat('#d8d0b8'));
      label.position.set(0, 0.027, -0.015);
      g.add(label);
      break;
    }
    case 'keys': {
      const metal = mat(aged ? '#4a4a40' : '#9a9a90');
      const ring = add(new Mesh(new TorusGeometry(0.03, 0.004, 6, 16), metal), false);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.005;
      for (let i = 0; i < 3; i++) {
        const k = add(new Mesh(new BoxGeometry(0.06, 0.004, 0.012), metal), false);
        k.position.set(0.05 * Math.cos(i * 0.8), 0.006, 0.05 * Math.sin(i * 0.8));
        k.rotation.y = -i * 0.8;
      }
      break;
    }
  }
  return g;
}

/**
 * A thing in the house you can pick up: glows when looked at, says "take", and sends the take
 * action. The authoritative state decides whether it's still there.
 */
export function placeItem(
  ctx: GameContext,
  id: string,
  item: Item,
  pos: V3,
  text: InspectText,
  opts: { aged?: boolean; rotY?: number; take?: () => void } = {},
): Lookable {
  const obj = buildItem(ctx, item, opts.aged);
  obj.position.set(...pos);
  obj.rotation.y = opts.rotY ?? 0;
  ctx.house.root.add(obj);
  const look = ctx.house.addLookable({
    id,
    object: obj,
    def: { distance: 0.45, view: 'top', text: {} },
    text,
    front: new Vector3(0, 0, 1),
  });
  look.override({
    priority: 1,
    prompt: () => (obj.visible ? 'take' : null),
    interact: () => {
      ctx.sfx.play('pickup');
      if (opts.take) opts.take();
      else ctx.act({ type: 'item/take', item });
    },
  });
  return look;
}

/** An invisible place you can act on (leave something, hide, search). */
export function actionSpot(
  ctx: GameContext,
  pos: V3,
  size: V3,
  interactable: Interactable,
): { mesh: Mesh; remove: () => void } {
  const mesh = new Mesh(new BoxGeometry(...size), new MeshBasicMaterial({ visible: false }));
  mesh.position.set(...pos);
  ctx.house.root.add(mesh);
  ctx.interaction.register(mesh, { priority: 1, ...interactable });
  return { mesh, remove: () => mesh.removeFromParent() };
}

/** Builds a close-up control panel from HTML. */
export function panel(html: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ctl-panel';
  el.innerHTML = html;
  return el;
}
