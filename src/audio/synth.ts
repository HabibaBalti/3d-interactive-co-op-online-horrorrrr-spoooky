/**
 * Procedural sound: every effect in the game is synthesised from noise and oscillators with the
 * Web Audio API, so there are no audio files to load or license. Each function schedules one
 * sound at time `t` into `out` and cleans up after itself.
 */

type Color = 'white' | 'pink' | 'brown';

const buffers = new WeakMap<BaseAudioContext, Partial<Record<Color, AudioBuffer>>>();

/** Two seconds of looping noise, normalised to ±1. */
export function noise(ctx: BaseAudioContext, color: Color): AudioBuffer {
  let cache = buffers.get(ctx);
  if (!cache) buffers.set(ctx, (cache = {}));
  const hit = cache[color];
  if (hit) return hit;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0,
    last = 0,
    peak = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    let v = w;
    if (color === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else if (color === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      v = last;
    }
    d[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < len; i++) d[i]! /= peak;
  cache[color] = buf;
  return buf;
}

/** A room's reverb tail: stereo decaying noise. */
export function impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function envelope(p: AudioParam, t: number, attack: number, peak: number, decay: number): void {
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + attack);
  p.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

interface NoiseShot {
  color?: Color;
  type: BiquadFilterType;
  freq: number;
  q?: number;
  attack?: number;
  peak: number;
  decay: number;
}

function noiseShot(ctx: BaseAudioContext, out: AudioNode, t: number, o: NoiseShot): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, o.color ?? 'white');
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.freq;
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const attack = o.attack ?? 0.002;
  envelope(g.gain, t, attack, o.peak, o.decay);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + o.decay + 0.05);
}

interface Tone {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  attack?: number;
  peak: number;
  decay: number;
}

function tone(ctx: BaseAudioContext, out: AudioNode, t: number, o: Tone): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  const attack = o.attack ?? 0.003;
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + attack + o.decay);
  const g = ctx.createGain();
  envelope(g.gain, t, attack, o.peak, o.decay);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + attack + o.decay + 0.05);
}

// --- Player -------------------------------------------------------------------------------------

export function footstep(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  surface: 'floor' | 'tile' | 'concrete' | 'water',
  intensity: number,
): void {
  const v = intensity * rnd(0.85, 1.15);
  switch (surface) {
    case 'floor': // old floorboards: a soft knock and the odd complaint
      noiseShot(ctx, out, t, {
        type: 'bandpass',
        freq: rnd(450, 800),
        q: 1.3,
        peak: 0.5 * v,
        decay: 0.09,
      });
      tone(ctx, out, t, { f0: rnd(85, 110), f1: 55, peak: 0.6 * v, decay: 0.08 });
      if (Math.random() < 0.12) creak(ctx, out, t + 0.03, rnd(0.18, 0.35), rnd(140, 220), 0.05 * v);
      break;
    case 'tile':
      noiseShot(ctx, out, t, {
        type: 'bandpass',
        freq: rnd(2500, 3500),
        q: 1.5,
        peak: 0.35 * v,
        decay: 0.04,
      });
      tone(ctx, out, t, { f0: 140, f1: 90, peak: 0.3 * v, decay: 0.05 });
      break;
    case 'concrete': // gritty: two scuffs
      noiseShot(ctx, out, t, {
        type: 'bandpass',
        freq: rnd(1000, 1500),
        q: 0.7,
        peak: 0.4 * v,
        decay: 0.05,
      });
      noiseShot(ctx, out, t + 0.012, { type: 'highpass', freq: 3000, peak: 0.12 * v, decay: 0.07 });
      tone(ctx, out, t, { f0: 90, f1: 50, peak: 0.4 * v, decay: 0.06 });
      break;
    case 'water':
      noiseShot(ctx, out, t, {
        type: 'lowpass',
        freq: rnd(1200, 1800),
        peak: 0.5 * v,
        attack: 0.01,
        decay: 0.22,
      });
      for (let i = 0; i < 3; i++) {
        tone(ctx, out, t + rnd(0.02, 0.15), {
          f0: rnd(250, 450),
          f1: rnd(700, 1100),
          peak: 0.06 * v,
          decay: 0.05,
        });
      }
      break;
  }
}

export function flashlightClick(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  for (const dt of [0, 0.06]) {
    noiseShot(ctx, out, t + dt, { type: 'highpass', freq: 4000, peak: 0.25, decay: 0.008 });
    tone(ctx, out, t + dt, { f0: 2800, peak: 0.05, decay: 0.012 });
  }
}

// --- House --------------------------------------------------------------------------------------

/** Wood under stress: a sawtooth with a stick-slip pitch and amplitude, through a resonance. */
export function creak(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  dur = 1.1,
  base = 110,
  peak = 0.25,
): void {
  const n = 96;
  const freq = new Float32Array(n);
  const gain = new Float32Array(n);
  let f = base;
  let stick = 0;
  for (let i = 0; i < n; i++) {
    f = Math.max(45, f + (Math.random() - 0.42) * base * 0.06);
    freq[i] = f;
    stick = Math.random() < 0.3 ? Math.random() : stick * 0.8;
    // ×3 makes up for what the narrow resonance filters away.
    gain[i] = Math.sin((Math.PI * i) / (n - 1)) * (0.35 + 0.65 * stick) * peak * 3;
  }
  gain[0] = gain[n - 1] = 0;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueCurveAtTime(freq, t, dur);
  const body = ctx.createBiquadFilter();
  body.type = 'bandpass';
  body.frequency.value = rnd(700, 1100);
  body.Q.value = 5;
  const air = ctx.createBiquadFilter();
  air.type = 'lowpass';
  air.frequency.value = 2500;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueCurveAtTime(gain, t, dur);
  osc.connect(body).connect(air).connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function doorThud(ctx: BaseAudioContext, out: AudioNode, t: number, peak = 0.7): void {
  tone(ctx, out, t, { f0: 75, f1: 45, peak, decay: 0.3 });
  noiseShot(ctx, out, t, { type: 'lowpass', freq: 400, peak: peak * 0.6, decay: 0.15 });
  noiseShot(ctx, out, t + 0.01, {
    type: 'bandpass',
    freq: 2500,
    q: 3,
    peak: peak * 0.25,
    decay: 0.03,
  });
}

/** A locked door: the handle and the frame, rattled. */
export function rattle(ctx: BaseAudioContext, out: AudioNode, t: number): void {
  let at = t;
  for (let i = 0; i < 5; i++) {
    noiseShot(ctx, out, at, {
      type: 'bandpass',
      freq: rnd(2000, 3200),
      q: 4,
      peak: 0.35,
      decay: 0.03,
    });
    tone(ctx, out, at, { f0: rnd(1600, 2100), peak: 0.05, decay: 0.04 });
    tone(ctx, out, at, { f0: 90, f1: 60, peak: 0.25, decay: 0.06 });
    at += rnd(0.06, 0.1);
  }
}

/** A slide bolt: scrape, then the clack as it seats. */
export function bolt(ctx: BaseAudioContext, out: AudioNode, t: number, closing: boolean): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 'white');
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(closing ? 1400 : 2800, t);
  f.frequency.linearRampToValueAtTime(closing ? 2800 : 1400, t + 0.22);
  const g = ctx.createGain();
  envelope(g.gain, t, 0.03, 0.3, 0.2);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + 0.3);
  noiseShot(ctx, out, t + 0.24, { type: 'bandpass', freq: 3000, q: 2, peak: 0.5, decay: 0.03 });
  tone(ctx, out, t + 0.24, { f0: 1250, peak: 0.12, decay: 0.15 });
  tone(ctx, out, t + 0.24, { f0: 110, f1: 70, peak: 0.3, decay: 0.08 });
}

export function clockTick(ctx: BaseAudioContext, out: AudioNode, t: number, tock: boolean): void {
  noiseShot(ctx, out, t, {
    type: 'bandpass',
    freq: tock ? 2200 : 3000,
    q: 6,
    peak: 0.9,
    decay: 0.012,
  });
  tone(ctx, out, t, { f0: tock ? 1500 : 1900, peak: 0.06, decay: 0.03 });
}

export function drip(ctx: BaseAudioContext, out: AudioNode, t: number, peak = 0.3): void {
  const f = rnd(900, 1600);
  tone(ctx, out, t, { f0: f, f1: f * 0.45, peak, attack: 0.001, decay: 0.09 });
  noiseShot(ctx, out, t, { type: 'highpass', freq: 5000, peak: peak * 0.2, decay: 0.006 });
}

/** A heavy step overhead, heard through the floor. */
export function heavyStep(ctx: BaseAudioContext, out: AudioNode, t: number, peak = 0.5): void {
  tone(ctx, out, t, { f0: rnd(60, 75), f1: 40, peak, decay: 0.16 });
  noiseShot(ctx, out, t, {
    type: 'lowpass',
    freq: 250,
    peak: peak * 0.7,
    decay: 0.12,
    color: 'brown',
  });
}

/** Thunder: a crack if close, then a long rolling rumble. */
export function thunder(ctx: BaseAudioContext, out: AudioNode, t: number, power: number): void {
  const dur = 4 + power * 3;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 'brown');
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 160 + power * 420;
  const n = 160;
  const curve = new Float32Array(n);
  let wobble = 1;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * dur;
    wobble = wobble * 0.85 + Math.random() * 0.3;
    const shape = x < 0.25 ? x / 0.25 : Math.exp(-(x - 0.25) * (1.1 - power * 0.4));
    curve[i] = shape * Math.min(1, wobble) * (0.35 + power * 0.65);
  }
  curve[n - 1] = 0;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueCurveAtTime(curve, t, dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.1);
  if (power > 0.55) {
    noiseShot(ctx, out, t, {
      type: 'highpass',
      freq: 1200,
      peak: 0.4 * power,
      attack: 0.004,
      decay: 0.35,
    });
  }
}
