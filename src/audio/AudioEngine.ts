import { AudioListener, type Camera } from 'three';
import type { Timeline } from '../../shared/types';
import { impulse } from './synth';

/** Below this listener height we're in the basement. */
const BASEMENT_LEVEL = -1.5;

/** Room acoustics per timeline: the furnished 1994 house is dead; the empty one rings. */
const ROOM = {
  '1994': {
    house: { seconds: 1.1, decay: 3.2, wet: 0.14 },
    basement: { seconds: 2.6, decay: 2.2, wet: 0.3 },
  },
  present: {
    house: { seconds: 2.4, decay: 2.4, wet: 0.28 },
    basement: { seconds: 3.4, decay: 1.8, wet: 0.42 },
  },
} as const;

export interface SpatialOptions {
  /** Distance at which the sound is at full volume. */
  ref?: number;
  rolloff?: number;
  /** Cheap panning for constant loops; HRTF for one-shots that should be placeable. */
  hrtf?: boolean;
}

/** A positioned sound input: connect sources to `input`. */
export interface Spatial {
  input: AudioNode;
  /** Lowpass used to muffle the source when it's on another floor. */
  occlusion: BiquadFilterNode;
  y: number;
  dispose(): void;
}

/**
 * Owns the AudioContext and the mix: everything → [dry + room reverb] → master → compressor →
 * speakers. The listener rides on the camera.
 */
export class AudioEngine {
  readonly listener: AudioListener;
  readonly ctx: AudioContext;
  /** Where every sound goes. */
  readonly input: GainNode;
  private readonly master: GainNode;
  private readonly houseWet: GainNode;
  private readonly basementWet: GainNode;
  private readonly houseVerb: ConvolverNode;
  private readonly basementVerb: ConvolverNode;
  private room: (typeof ROOM)[Timeline] = ROOM['1994'];
  private volume = 0.8;
  private listenerY = 0;

  constructor(camera: Camera) {
    this.listener = new AudioListener();
    camera.add(this.listener);
    this.ctx = this.listener.context;
    this.input = this.listener.getInput() as GainNode;
    this.input.disconnect();

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(this.ctx.destination);
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    this.input.connect(this.master);
    this.houseVerb = this.ctx.createConvolver();
    this.basementVerb = this.ctx.createConvolver();
    this.houseWet = this.ctx.createGain();
    this.basementWet = this.ctx.createGain();
    this.input.connect(this.houseVerb).connect(this.houseWet).connect(this.master);
    this.input.connect(this.basementVerb).connect(this.basementWet).connect(this.master);
  }

  setTimeline(timeline: Timeline): void {
    this.room = ROOM[timeline];
    this.houseVerb.buffer = impulse(this.ctx, this.room.house.seconds, this.room.house.decay);
    this.basementVerb.buffer = impulse(
      this.ctx,
      this.room.basement.seconds,
      this.room.basement.decay,
    );
  }

  /** Must be called from a user gesture the first time (browser autoplay rules). */
  resume(): void {
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
  }

  suspend(): void {
    if (this.ctx.state === 'running') void this.ctx.suspend().catch(() => {});
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  get inBasement(): boolean {
    return this.listenerY < BASEMENT_LEVEL;
  }

  spatial(x: number, y: number, z: number, o: SpatialOptions = {}): Spatial {
    const occlusion = this.ctx.createBiquadFilter();
    occlusion.type = 'lowpass';
    occlusion.frequency.value = 20000;
    const panner = new PannerNode(this.ctx, {
      panningModel: o.hrtf ? 'HRTF' : 'equalpower',
      distanceModel: 'inverse',
      refDistance: o.ref ?? 1,
      rolloffFactor: o.rolloff ?? 1.4,
      maxDistance: 40,
      positionX: x,
      positionY: y,
      positionZ: z,
    });
    occlusion.connect(panner).connect(this.input);
    return {
      input: occlusion,
      occlusion,
      y,
      dispose: () => {
        occlusion.disconnect();
        panner.disconnect();
      },
    };
  }

  /** Muffles a spatial source when it's on a different floor from the listener. */
  occlude(s: Spatial, alwaysMuffled = 0): void {
    const apart = s.y < BASEMENT_LEVEL !== this.inBasement;
    const target = alwaysMuffled || (apart ? 450 : 18000);
    s.occlusion.frequency.setTargetAtTime(target, this.now, 0.3);
  }

  update(listenerY: number, paused: boolean): void {
    this.listenerY = listenerY;
    const t = this.now;
    const below = this.inBasement;
    this.houseWet.gain.setTargetAtTime(below ? 0 : this.room.house.wet, t, 0.4);
    this.basementWet.gain.setTargetAtTime(below ? this.room.basement.wet : 0, t, 0.4);
    this.master.gain.setTargetAtTime(this.volume * (paused ? 0.25 : 1), t, 0.3);
  }
}
