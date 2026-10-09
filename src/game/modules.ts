import type { GameContext, Module } from './context';
import { echoesModule } from './Echoes';
import { radioModule } from './Radio';
import { wrongnessModule } from './Wrongness';
import { clockModule } from './puzzles/clock';
import { floorModule } from './puzzles/floor';
import { huntModule } from './puzzles/hunt';
import { lullabyModule } from './puzzles/lullaby';
import { mirrorModule } from './puzzles/mirror';
import { photosModule } from './puzzles/photos';
import { tapeModule } from './puzzles/tape';

/** Every module that makes up the night, built for the current character's world. */
export function createModules(ctx: GameContext): Module[] {
  return [
    clockModule(ctx),
    floorModule(ctx),
    lullabyModule(ctx),
    photosModule(ctx),
    tapeModule(ctx),
    huntModule(ctx),
    mirrorModule(ctx),
    radioModule(ctx),
    wrongnessModule(ctx),
    echoesModule(ctx),
  ];
}
