import type { GameContext, Module } from './context';

/** What comes through the walkie-talkies once something else is listening. Never the partner. */
const LINES = {
  '1994': [
    'Don’t trust him.',
    'He did this to you.',
    'Stay down there. It’s warm.',
    'She ran away. She ran away.',
  ],
  present: [
    'She’s lying to you.',
    'You know what you did.',
    'Leave the bolt.',
    'She ran away. Say it.',
  ],
};

/**
 * From Act 2 the walkie-talkie crackles on its own and a voice comes through: almost your
 * partner's, saying things they never said. More often each time the night loops.
 */
export function radioModule(ctx: GameContext): Module {
  const walkie = ctx.house.lookable('walkie');
  let timer = 40 + Math.random() * 30;
  let i = Math.floor(Math.random() * 4);
  return {
    update(dt) {
      const s = ctx.state();
      if (s.act < 2 || s.ending) return;
      timer -= dt;
      if (timer > 0) return;
      timer = Math.max(25, 55 + Math.random() * 35 - s.loop * 8);
      const p = walkie?.target.object.getWorldPosition(walkie.target.object.position.clone());
      ctx.sfx.play('static', p ? [p.x, p.y, p.z] : undefined);
      const lines = LINES[ctx.timeline];
      window.setTimeout(
        () => void ctx.voice.say({ who: 'entity', text: lines[i++ % lines.length]! }),
        600,
      );
    },
  };
}
