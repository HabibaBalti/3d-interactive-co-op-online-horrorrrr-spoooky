import type { Timeline } from '../../shared/types';
import { events, type Surface } from '../core/events';
import type { HouseLayout, Vec3 } from '../world/house/types';
import type { AudioEngine, Spatial } from './AudioEngine';
import { hum } from './Hummer';
import {
  bolt,
  clockTick,
  creak,
  doorThud,
  drip,
  flashlightClick,
  footstep,
  heavyStep,
  noise,
  rattle,
  thunder,
} from './synth';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Timer {
  at: number;
  /** Plays something at `t` and returns the delay until the next time. */
  run: (t: number) => number;
}

/**
 * Everything you hear in one timeline's house: beds (rain or wind, room tone), positioned loops
 * (clock, TV, boiler), irregular events (creaks, steps overhead, humming, drips) and the sounds
 * of what the player does. Built per timeline, like the house.
 */
export class Soundscape {
  private readonly ctx: AudioContext;
  private readonly bus: GainNode;
  private readonly spatials: { s: Spatial; muffled?: number }[] = [];
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly timers: Timer[] = [];
  private readonly off: (() => void)[] = [];
  private rainFilter?: BiquadFilterNode;
  private rainGain?: GainNode;
  private roomTone!: GainNode;
  private nextTick = 0;
  private tock = false;
  private clock?: Spatial;
  private stepSide = 1;

  constructor(
    private readonly audio: AudioEngine,
    private readonly timeline: Timeline,
    private readonly layout: HouseLayout,
  ) {
    this.ctx = audio.ctx;
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.gain.setTargetAtTime(1, audio.now, 0.5);
    this.bus.connect(audio.input);

    this.buildBeds();
    this.buildEmitters();
    this.buildEvents();
    this.listen();
  }

  // --- Building ------------------------------------------------------------------------------

  private loop(color: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = noise(this.ctx, color);
    src.loop = true;
    src.start(this.audio.now, Math.random() * 2);
    this.sources.push(src);
    return src;
  }

  private osc(type: OscillatorType, freq: number): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start();
    this.sources.push(o);
    return o;
  }

  private filter(type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  private gain(value: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  private place(p: Vec3, ref = 1, hrtf = false, muffled?: number): Spatial {
    const s = this.audio.spatial(p[0], p[1], p[2], { ref, hrtf });
    this.spatials.push({ s, muffled });
    return s;
  }

  private buildBeds(): void {
    // Room tone: the low presence of a house at night.
    this.roomTone = this.gain(0.03);
    this.osc('sine', 49).connect(this.roomTone);
    this.osc('sine', 55.3).connect(this.roomTone);
    this.loop('brown')
      .connect(this.filter('lowpass', 110))
      .connect(this.gain(1.6))
      .connect(this.roomTone);
    this.roomTone.connect(this.bus);

    if (this.timeline === '1994') {
      // Rain on the roof and windows.
      this.rainFilter = this.filter('lowpass', 5500);
      this.rainGain = this.gain(0.14);
      this.loop('pink')
        .connect(this.filter('highpass', 450))
        .connect(this.rainFilter)
        .connect(this.rainGain)
        .connect(this.bus);
    } else {
      // Wind finding the gaps in the boards: a slowly wandering resonance.
      const band = this.filter('bandpass', 380, 4);
      const level = this.gain(0.05);
      const sweep = this.osc('sine', 0.07);
      sweep.connect(this.gain(180)).connect(band.frequency);
      const swell = this.osc('sine', 0.13);
      swell.connect(this.gain(0.035)).connect(level.gain);
      this.loop('brown').connect(band).connect(level).connect(this.bus);
      const whistle = this.filter('bandpass', 1400, 14);
      const whistleLevel = this.gain(0.012);
      this.osc('sine', 0.05).connect(this.gain(300)).connect(whistle.frequency);
      this.loop('pink').connect(whistle).connect(whistleLevel).connect(this.bus);
    }
  }

  private propPos(kind: string, lift = 1): Vec3 | null {
    const p = this.layout.props.find((x) => x.kind === kind);
    return p ? [p.pos[0], p.pos[1] + lift, p.pos[2]] : null;
  }

  private buildEmitters(): void {
    const clockPos = this.propPos('clock', 1.8);
    if (clockPos) this.clock = this.place(clockPos, 0.6);

    if (this.timeline === '1994') {
      // The television, murmuring in the living room.
      const tvPos = this.propPos('tv', 0.8);
      if (tvPos) {
        const tv = this.place(tvPos, 1);
        this.loop('white')
          .connect(this.filter('bandpass', 3000, 0.7))
          .connect(this.gain(0.012))
          .connect(tv.input);
        const voice = this.osc('sawtooth', 140);
        const gate = this.gain(0);
        const f1 = this.filter('bandpass', 650, 3);
        const f2 = this.filter('bandpass', 1500, 5);
        const out = this.filter('lowpass', 2200);
        voice.connect(f1).connect(out);
        voice.connect(f2).connect(this.gain(0.5)).connect(out);
        out.connect(gate).connect(tv.input);
        this.timers.push({
          at: this.audio.now,
          run: (t) => {
            const pause = Math.random() < 0.18;
            const dur = pause ? rnd(0.4, 1.1) : rnd(0.09, 0.22);
            if (!pause) {
              voice.frequency.setTargetAtTime(rnd(105, 190), t, 0.04);
              gate.gain.setTargetAtTime(rnd(0.05, 0.13), t, 0.015);
              gate.gain.setTargetAtTime(0, t + dur * 0.8, 0.03);
            }
            return dur;
          },
        });
      }
      // The boiler, breathing in the basement.
      const boilerPos = this.propPos('boiler', 1);
      if (boilerPos) {
        const boiler = this.place(boilerPos, 1.5);
        this.loop('brown')
          .connect(this.filter('lowpass', 120))
          .connect(this.gain(0.3))
          .connect(boiler.input);
        this.osc('sine', 42).connect(this.gain(0.05)).connect(boiler.input);
      }
    }
  }

  private every(first: number, run: (t: number) => number): void {
    this.timers.push({ at: this.audio.now + first, run });
  }

  private randomPoint(): Vec3 {
    const [x0, z0, x1, z1] = this.layout.sounds.bounds;
    const basement = Math.random() < 0.3;
    return [rnd(x0, x1), basement ? -0.6 : 2.4, rnd(z0, z1)];
  }

  private stepsOverhead(t: number, count: number, interval: number, peak: number): void {
    const [a, b] = this.layout.sounds.upstairs;
    const start = Math.random();
    for (let i = 0; i < count; i++) {
      const k = Math.min(1, Math.max(0, start + (i / count) * 0.5 * (start > 0.5 ? -1 : 1)));
      const p: Vec3 = [a[0] + (b[0] - a[0]) * k, a[1], a[2] + (b[2] - a[2]) * k];
      const s = this.place(p, 2, true, 420);
      heavyStep(this.ctx, s.input, t + i * interval * rnd(0.9, 1.1), peak);
      this.release(s, t + count * interval + 1);
    }
  }

  /** A one-shot spatial source, cleaned up after it has played. */
  private oneShot(p: Vec3, play: (out: AudioNode, t: number) => number, ref = 1): void {
    const s = this.place(p, ref, true);
    const end = play(s.input, this.audio.now);
    this.release(s, end + 2.5);
  }

  private release(s: Spatial, at: number): void {
    window.setTimeout(
      () => {
        s.dispose();
        const i = this.spatials.findIndex((x) => x.s === s);
        if (i >= 0) this.spatials.splice(i, 1);
      },
      Math.max(0, at - this.audio.now) * 1000,
    );
  }

  private buildEvents(): void {
    const present = this.timeline === 'present';

    // The house settling.
    this.every(rnd(6, 14), () => {
      const p = this.randomPoint();
      this.oneShot(
        p,
        (out, t) => {
          creak(this.ctx, out, t, rnd(0.4, 1.4), rnd(70, 160), rnd(0.06, 0.13));
          return t + 1.5;
        },
        1.5,
      );
      return present ? rnd(10, 25) : rnd(14, 35);
    });

    const humSpot = this.layout.sounds.hum[this.timeline];
    if (!present) {
      // Walter pacing upstairs.
      this.every(rnd(15, 30), (t) => {
        this.stepsOverhead(t, Math.round(rnd(4, 8)), 0.62, 0.6);
        return rnd(35, 80);
      });
      // Ruth humming the lullaby somewhere above.
      this.every(rnd(20, 35), (t) => {
        const s = this.place(humSpot, 2, true, 900);
        const end = hum(this.ctx, s.input, t, { peak: 0.22, notes: Math.random() < 0.5 ? 9 : 18 });
        this.release(s, end + 2);
        return rnd(70, 140);
      });
    } else {
      // Footsteps upstairs, where nobody is.
      this.every(rnd(60, 90), (t) => {
        this.stepsOverhead(t, Math.round(rnd(3, 5)), 0.95, 0.45);
        return rnd(120, 220);
      });
      // The same lullaby, slow and sinking, from the basement. It breaks off.
      this.every(rnd(75, 110), (t) => {
        const s = this.place(humSpot, 1.5, true);
        const end = hum(this.ctx, s.input, t, {
          rate: 0.78,
          sag: 70,
          vibrato: 5,
          peak: 0.2,
          notes: Math.round(rnd(5, 13)),
        });
        this.release(s, end + 2);
        return rnd(150, 260);
      });
      // Water finding its way down.
      for (const p of this.layout.puddles) {
        this.every(rnd(0.5, 4), () => {
          const pos: Vec3 = [p.pos[0] + rnd(-0.4, 0.4), p.pos[1] + 0.05, p.pos[2] + rnd(-0.4, 0.4)];
          this.oneShot(
            pos,
            (out, t) => {
              drip(this.ctx, out, t, rnd(0.12, 0.3));
              return t + 0.2;
            },
            0.7,
          );
          return p.pos[1] < -1 ? rnd(0.8, 3) : rnd(2, 6);
        });
      }
      // The clock that stopped at 3:17 ticks once. Only once.
      if (this.clock) {
        const clock = this.clock;
        this.every(rnd(40, 70), (t) => {
          clockTick(this.ctx, clock.input, t, false);
          return rnd(50, 110);
        });
      }
    }
  }

  private inPuddle(x: number, y: number, z: number): boolean {
    return this.layout.puddles.some(
      (p) =>
        Math.abs(y - p.pos[1]) < 0.5 &&
        Math.abs(x - p.pos[0]) < p.size[0] / 2 &&
        Math.abs(z - p.pos[2]) < p.size[1] / 2,
    );
  }

  private listen(): void {
    this.off.push(
      events.on('step', (e) => {
        let surface: Surface = e.surface;
        if (this.timeline === 'present' && this.inPuddle(e.x, e.y, e.z)) surface = 'water';
        const pan = new StereoPannerNode(this.ctx, { pan: (this.stepSide *= -1) * 0.12 });
        const g = this.gain(0.55);
        pan.connect(g).connect(this.bus);
        footstep(this.ctx, pan, this.audio.now, surface, e.intensity);
        window.setTimeout(() => g.disconnect(), 1500);
      }),
      events.on('door', (e) => {
        const p: Vec3 = [e.x, e.y, e.z];
        const present = this.timeline === 'present';
        this.oneShot(p, (out, t) => {
          switch (e.action) {
            case 'open':
              creak(
                this.ctx,
                out,
                t,
                rnd(0.8, 1.3) * (present ? 1.4 : 1),
                rnd(85, 130),
                present ? 0.35 : 0.2,
              );
              return t + 2;
            case 'close':
              doorThud(this.ctx, out, t);
              return t + 0.5;
            case 'rattle':
              rattle(this.ctx, out, t);
              return t + 0.6;
            case 'bolt':
            case 'unbolt':
              bolt(this.ctx, out, t, e.action === 'bolt');
              return t + 0.5;
          }
        });
      }),
      events.on('flashlight', () => flashlightClick(this.ctx, this.bus, this.audio.now)),
      events.on('strike', (e) => {
        const muffle = this.filter('lowpass', this.audio.inBasement ? 280 : 4000);
        muffle.connect(this.bus);
        const delay = 0.2 + (1 - e.power) * 2.5;
        thunder(this.ctx, muffle, this.audio.now + delay, e.power);
        window.setTimeout(() => muffle.disconnect(), (delay + 9) * 1000);
      }),
    );
  }

  // --- Runtime -------------------------------------------------------------------------------

  update(): void {
    const t = this.audio.now;
    const below = this.audio.inBasement;
    for (const { s, muffled } of this.spatials) this.audio.occlude(s, muffled);
    this.rainFilter?.frequency.setTargetAtTime(below ? 600 : 5500, t, 0.4);
    this.rainGain?.gain.setTargetAtTime(below ? 0.05 : 0.14, t, 0.4);
    this.roomTone.gain.setTargetAtTime(below ? 0.06 : 0.03, t, 0.5);

    // The grandfather clock (1994), scheduled slightly ahead so it never stutters.
    if (this.clock && this.timeline === '1994') {
      if (this.nextTick < t) this.nextTick = t + 0.05;
      while (this.nextTick < t + 0.2) {
        clockTick(this.ctx, this.clock.input, this.nextTick, (this.tock = !this.tock));
        this.nextTick += 1;
      }
    }

    for (const timer of this.timers) {
      if (timer.at > t + 0.1) continue;
      timer.at = Math.max(timer.at, t) + timer.run(Math.max(timer.at, t));
    }
  }

  dispose(): void {
    this.off.forEach((fn) => fn());
    const t = this.audio.now;
    this.bus.gain.setTargetAtTime(0, t, 0.1);
    for (const src of this.sources) {
      try {
        src.stop(t + 0.5);
      } catch {
        // already stopped
      }
    }
    const spatials = this.spatials.map((x) => x.s);
    window.setTimeout(() => {
      this.bus.disconnect();
      spatials.forEach((s) => s.dispose());
    }, 700);
  }
}
