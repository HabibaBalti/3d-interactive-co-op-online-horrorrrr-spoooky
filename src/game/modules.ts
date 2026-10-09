import type { GameContext, Module } from './context';
import { echoesModule } from './Echoes';
import { clockModule } from './puzzles/clock';
import { floorModule } from './puzzles/floor';
import { lullabyModule } from './puzzles/lullaby';

/** Every module that makes up the night, built for the current character's world. */
export function createModules(ctx: GameContext): Module[] {
  return [clockModule(ctx), floorModule(ctx), lullabyModule(ctx), echoesModule(ctx)];
}
