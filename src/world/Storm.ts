import { events } from '../core/events';

/**
 * The 1994 storm: irregular double-strike lightning. Produces a 0..1 flash level that drives
 * the window glass, the light through the windows and the post-processing flash.
 */
export class Storm {
  private nextStrike = 5;
  private strike = -1;
  /** Raw flash, before photosensitivity limiting (gameplay may read this). */
  raw = 0;
  /** Flash to display, limited in photosensitive mode. */
  flash = 0;

  constructor(private readonly photosensitive: () => boolean) {}

  update(dt: number): void {
    this.nextStrike -= dt;
    if (this.nextStrike <= 0) {
      this.strike = 0;
      this.nextStrike = 9 + Math.random() * 16;
      events.emit('strike', { power: 0.3 + Math.random() * 0.7 });
    }
    let f = 0;
    if (this.strike >= 0) {
      this.strike += dt;
      const t = this.strike;
      f = Math.max(0, 1 - t / 0.12) + (t > 0.22 ? Math.max(0, 0.7 - (t - 0.22) / 0.35) : 0);
      if (t > 0.9) this.strike = -1;
    }
    this.raw = f;
    // Reduced mode: a dim, slow swell instead of a strobe.
    this.flash = this.photosensitive() ? Math.min(f, 1) * 0.12 : f;
  }
}
