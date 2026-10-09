import { LULLABY, noteFrequency } from '../data/lullaby';

export interface HumOptions {
  /** Tempo multiplier; < 1 is slower. */
  rate?: number;
  /** Total pitch sag across the melody, in cents (warped versions sink flat). */
  sag?: number;
  /** Vibrato depth in Hz. */
  vibrato?: number;
  peak?: number;
  /** Stop after this many notes (a phrase breaking off). */
  notes?: number;
}

/**
 * A closed-mouth hum: two oscillators through "mm/oo" formant filters, legato with small dips
 * between notes and a slow vibrato. Returns the time the hum ends.
 */
export function hum(ctx: BaseAudioContext, out: AudioNode, t: number, o: HumOptions = {}): number {
  const rate = o.rate ?? 1;
  const beat = 60 / (LULLABY.bpm * rate);
  const notes = LULLABY.notes.slice(0, o.notes ?? LULLABY.notes.length);
  const total = notes.reduce((s, [, b]) => s + b, 0) * beat;
  const peak = o.peak ?? 0.3;

  const tri = ctx.createOscillator();
  tri.type = 'triangle';
  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  const sawGain = ctx.createGain();
  sawGain.gain.value = 0.12;
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.2;
  const vibDepth = ctx.createGain();
  vibDepth.gain.value = o.vibrato ?? 3;
  vib.connect(vibDepth);
  vibDepth.connect(tri.frequency);
  vibDepth.connect(saw.frequency);

  const mix = ctx.createGain();
  tri.connect(mix);
  saw.connect(sawGain).connect(mix);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 380;
  f1.Q.value = 2;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 950;
  f2.Q.value = 5;
  const f2Gain = ctx.createGain();
  f2Gain.gain.value = 0.35;
  const sum = ctx.createGain();
  mix.connect(f1).connect(sum);
  mix.connect(f2).connect(f2Gain).connect(sum);
  const soft = ctx.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = 1400;
  const env = ctx.createGain();
  env.gain.value = 0;
  sum.connect(soft).connect(env).connect(out);

  let at = t;
  for (const [name, beats] of notes) {
    const f = noteFrequency(name);
    const d = beats * beat;
    tri.frequency.setTargetAtTime(f, at, 0.025);
    saw.frequency.setTargetAtTime(f, at, 0.025);
    env.gain.setTargetAtTime(peak, at, 0.05);
    env.gain.setTargetAtTime(peak * 0.55, at + d * 0.82, 0.05);
    at += d;
  }
  env.gain.setTargetAtTime(0, at, 0.15);
  if (o.sag) {
    for (const osc of [tri, saw]) {
      osc.detune.setValueAtTime(0, t);
      osc.detune.linearRampToValueAtTime(-o.sag, at);
    }
  }
  for (const osc of [tri, saw, vib]) {
    osc.start(t);
    osc.stop(at + 1);
  }
  return t + total;
}
