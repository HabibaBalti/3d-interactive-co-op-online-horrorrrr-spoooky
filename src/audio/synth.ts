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

/**
 * A voice heard through a small speaker: a buzzing source shaped by formant filters, cut into
 * syllables and phrases. Not words, just the shape and tone of someone talking.
 * Returns the time the voice stops.
 */
function murmur(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  o: { pitch: [number, number]; phrases: number; cutOff?: boolean; peak: number },
): number {
  const voice = ctx.createOscillator();
  voice.type = 'sawtooth';
  const wow = ctx.createOscillator();
  wow.frequency.value = 0.6;
  const wowDepth = ctx.createGain();
  wowDepth.gain.value = 3;
  wow.connect(wowDepth).connect(voice.frequency);
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 800;
  f1.Q.value = 3;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 1700;
  f2.Q.value = 5;
  const sum = ctx.createGain();
  voice.connect(f1).connect(sum);
  voice.connect(f2).connect(sum);
  // Telephone band.
  const lo = ctx.createBiquadFilter();
  lo.type = 'highpass';
  lo.frequency.value = 320;
  const hi = ctx.createBiquadFilter();
  hi.type = 'lowpass';
  hi.frequency.value = 2800;
  const gate = ctx.createGain();
  gate.gain.value = 0;
  sum.connect(lo).connect(hi).connect(gate).connect(out);

  let at = t;
  for (let p = 0; p < o.phrases; p++) {
    const last = p === o.phrases - 1;
    const syllables = Math.round(rnd(4, 9));
    const count = last && o.cutOff ? Math.ceil(syllables / 2) : syllables;
    for (let s = 0; s < count; s++) {
      const d = rnd(0.11, 0.24);
      // Pitch falls toward the end of each phrase: tired, apologetic.
      const fall = 1 - (s / syllables) * 0.18;
      voice.frequency.setTargetAtTime(rnd(o.pitch[0], o.pitch[1]) * fall, at, 0.03);
      f1.frequency.setTargetAtTime(rnd(600, 950), at, 0.03);
      gate.gain.setTargetAtTime(o.peak * rnd(0.6, 1), at, 0.015);
      gate.gain.setTargetAtTime(o.peak * 0.15, at + d * 0.75, 0.025);
      at += d;
    }
    if (!(last && o.cutOff)) {
      gate.gain.setTargetAtTime(0, at, 0.04);
      at += rnd(0.35, 0.8);
    }
  }
  // An abrupt stop if cut off, a soft one otherwise.
  if (o.cutOff) gate.gain.setValueAtTime(0, at);
  else gate.gain.setTargetAtTime(0, at, 0.05);
  voice.start(t);
  wow.start(t);
  voice.stop(at + 0.3);
  wow.stop(at + 0.3);
  return at;
}

/** Mum's last message: the beep, tape hiss, her voice, and the tape cutting off. */
export function answeringMessage(ctx: BaseAudioContext, out: AudioNode, t: number): number {
  tone(ctx, out, t, { f0: 1000, peak: 0.12, attack: 0.01, decay: 0.5 });
  const start = t + 0.8;
  const end = murmur(ctx, out, start, { pitch: [175, 225], phrases: 5, cutOff: true, peak: 0.5 });
  // Tape hiss under the whole message.
  const hiss = ctx.createBufferSource();
  hiss.buffer = noise(ctx, 'white');
  hiss.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3500;
  band.Q.value = 0.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start - 0.2);
  g.gain.linearRampToValueAtTime(0.025, start);
  g.gain.setValueAtTime(0.025, end + 0.9);
  g.gain.linearRampToValueAtTime(0, end + 1);
  hiss.connect(band).connect(g).connect(out);
  hiss.start(start - 0.2);
  hiss.stop(end + 1.1);
  // The machine clunks to a stop.
  noiseShot(ctx, out, end + 1, { type: 'bandpass', freq: 1800, q: 2, peak: 0.4, decay: 0.04 });
  tone(ctx, out, end + 1, { f0: 120, f1: 70, peak: 0.3, decay: 0.08 });
  return end + 1.2;
}

/** A walkie-talkie keying up: squelch, crackling static, the click as it drops. */
export function walkieStatic(ctx: BaseAudioContext, out: AudioNode, t: number): number {
  const dur = rnd(1.2, 2);
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, 'white');
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1900;
  band.Q.value = 0.8;
  const n = 64;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const edge = Math.min(1, i / 3, (n - 1 - i) / 3);
    curve[i] = edge * (0.12 + Math.random() * 0.18);
  }
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setValueCurveAtTime(curve, t + 0.05, dur);
  src.connect(band).connect(g).connect(out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.2);
  noiseShot(ctx, out, t, { type: 'highpass', freq: 3000, peak: 0.25, decay: 0.02 });
  tone(ctx, out, t + dur + 0.06, { f0: 1300, peak: 0.08, decay: 0.07 });
  return t + dur + 0.2;
}
