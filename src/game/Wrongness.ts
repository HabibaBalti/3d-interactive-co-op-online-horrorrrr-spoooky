import { Frustum, Matrix4, Vector3 } from 'three';
import { WRONGNESS } from '../data/wrongness';
import type { GameContext, Module } from './context';

/** Applies the house's small, silent changes when nobody is watching. */
export function wrongnessModule(ctx: GameContext): Module {
  const pending = WRONGNESS.filter((w) => w.timeline === ctx.timeline);
  const done = new Set<string>();
  const frustum = new Frustum();
  const m = new Matrix4();
  const at = new Vector3();
  let timer = 0;

  const targetPos = (target: string): Vector3 | null => {
    const door = ctx.house.doors.get(target);
    if (door) return door.root.children[0]!.getWorldPosition(at);
    const look = ctx.house.lookable(target);
    return look ? look.target.object.getWorldPosition(at) : null;
  };

  return {
    onState(s, prev) {
      // Rejoining or rebuilding: what already changed stays changed.
      if (!prev) for (const w of pending) if (w.when(s)) apply(w.id);
    },
    update(dt) {
      timer -= dt;
      if (timer > 0) return;
      timer = 0.5;
      const s = ctx.state();
      m.multiplyMatrices(ctx.camera.projectionMatrix, ctx.camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(m);
      for (const w of pending) {
        if (done.has(w.id) || !w.when(s)) continue;
        const p = targetPos(w.change.target);
        if (!p) continue;
        if (frustum.containsPoint(p) || p.distanceTo(ctx.camera.position) < 2.5) continue;
        apply(w.id);
      }
    },
  };

  function apply(id: string): void {
    const w = pending.find((x) => x.id === id);
    if (!w || done.has(id)) return;
    done.add(id);
    const c = w.change;
    if (c.kind === 'door') {
      const door = ctx.house.doors.get(c.target);
      if (door) door.setOpen(c.open);
    } else {
      const look = ctx.house.lookable(c.target);
      if (!look) return;
      if (c.kind === 'hideChild') {
        const child = look.target.object.children[c.index];
        if (child) child.visible = false;
      } else {
        look.target.object.rotateY(c.radians);
      }
    }
  }
}
