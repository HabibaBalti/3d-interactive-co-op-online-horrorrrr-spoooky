import type { AudioEngine } from './AudioEngine';
import * as synth from './synth';

export type SfxName =
  | 'chime3'
  | 'chime1'
  | 'wrong'
  | 'solved'
  | 'pry'
  | 'pickup'
  | 'windup'
  | 'surge'
  | 'stingFull'
  | 'stingReduced'
  | 'thud'
  | 'creak'
  | 'rattle'
  | 'static';

/** Puzzle and story sounds, optionally placed in the house. */
export class Sfx {
  constructor(private readonly audio: AudioEngine | null) {}

  play(name: SfxName, at?: [number, number, number]): void {
    const a = this.audio;
    if (!a) return;
    const s = at ? a.spatial(at[0], at[1], at[2], { hrtf: true, ref: 1.2 }) : null;
    const out = s ? s.input : a.input;
    const t = a.now + 0.02;
    let end = t + 2;
    switch (name) {
      case 'chime3':
        end = synth.chime(a.ctx, out, t, 3);
        break;
      case 'chime1':
        end = synth.chime(a.ctx, out, t, 1);
        break;
      case 'wrong':
        synth.discord(a.ctx, out, t);
        break;
      case 'solved':
        synth.solvedCue(a.ctx, out, t);
        break;
      case 'pry':
        synth.pry(a.ctx, out, t);
        break;
      case 'pickup':
        synth.pickup(a.ctx, out, t);
        break;
      case 'windup':
        end = synth.windup(a.ctx, out, t);
        break;
      case 'surge':
        synth.surge(a.ctx, out, t);
        break;
      case 'stingFull':
      case 'stingReduced':
        synth.sting(a.ctx, out, t, name === 'stingFull');
        break;
      case 'thud':
        synth.doorThud(a.ctx, out, t);
        break;
      case 'creak':
        synth.creak(a.ctx, out, t, 1, 100, 0.2);
        break;
      case 'rattle':
        synth.rattle(a.ctx, out, t);
        break;
      case 'static':
        end = synth.walkieStatic(a.ctx, out, t);
        break;
    }
    if (s) window.setTimeout(() => s.dispose(), (end - a.now + 2) * 1000);
  }

  /** A note on the music box or piano, by frequency. */
  note(kind: 'box' | 'piano', freq: number, at?: [number, number, number]): void {
    const a = this.audio;
    if (!a) return;
    const s = at ? a.spatial(at[0], at[1], at[2], { ref: 1 }) : null;
    const out = s ? s.input : a.input;
    if (kind === 'box') synth.musicBoxNote(a.ctx, out, a.now + 0.01, freq);
    else synth.pianoNote(a.ctx, out, a.now + 0.01, freq);
    if (s) window.setTimeout(() => s.dispose(), 3000);
  }
}
