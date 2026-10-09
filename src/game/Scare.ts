import { Vector3 } from 'three';
import { EntityFigure } from '../entity/EntityFigure';
import type { GameContext } from './context';

/**
 * The few real jump scares, always tied to a moment (caught in the hunt, turning around at the
 * mirror, the wrong night). Full: the thing is suddenly in your face with a shriek. Reduced:
 * a quieter sting and a fade, no face. Reduce-flashing removes the white flash either way.
 */
export async function scare(ctx: GameContext): Promise<void> {
  const full = ctx.settings().scares === 'full';
  ctx.sfx.play(full ? 'stingFull' : 'stingReduced');
  if (full) {
    const face = new EntityFigure(ctx.house.palette.ink);
    const cam = ctx.camera;
    const fwd = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const at = cam.position.clone().addScaledVector(fwd, 0.55);
    face.root.position.set(at.x, at.y - 2.15, at.z);
    face.root.lookAt(cam.position.x, at.y - 2.15, cam.position.z);
    ctx.house.root.add(face.root);
    if (!ctx.settings().photosensitive)
      void ctx.hud.fadeTo('#d8e0e8', 0.05).then(() => ctx.hud.fadeFrom(0.15));
    await new Promise((r) => window.setTimeout(r, 650));
    face.root.removeFromParent();
  }
  await ctx.hud.fadeTo('#000', full ? 0.2 : 0.8);
  await new Promise((r) => window.setTimeout(r, 1200));
}
