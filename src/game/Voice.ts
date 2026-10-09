import type { Settings } from '../settings/settings';

/** Who is speaking decides how the placeholder voice sounds. */
export type Speaker = 'child' | 'ruth' | 'walter' | 'nora' | 'entity' | 'officer';

export interface Line {
  who: Speaker;
  text: string;
  /** Pause before this line, seconds. */
  pause?: number;
}

const PROFILE: Record<Speaker, { pitch: number; rate: number; volume: number }> = {
  child: { pitch: 1.9, rate: 1.05, volume: 0.9 },
  ruth: { pitch: 1.15, rate: 0.88, volume: 0.85 },
  walter: { pitch: 0.55, rate: 0.85, volume: 0.9 },
  nora: { pitch: 1.35, rate: 0.95, volume: 0.85 },
  entity: { pitch: 0.05, rate: 0.55, volume: 1 },
  officer: { pitch: 0.8, rate: 0.95, volume: 0.8 },
};

/**
 * Voiced lines for memory echoes, the radio and the climax. Uses the browser's speech
 * synthesis as a placeholder until real recordings exist (swap `speak` for audio files).
 * Subtitles show when turned on, or whenever speech isn't available.
 */
export class Voice {
  private readonly el: HTMLElement;
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private readonly synth: SpeechSynthesis | null =
    typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  constructor(
    parent: HTMLElement,
    private readonly settings: () => Settings,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'subtitle';
    parent.appendChild(this.el);
    // Some browsers load voices lazily.
    this.synth?.getVoices();
  }

  say(lines: Line | Line[]): Promise<void> {
    const list = Array.isArray(lines) ? lines : [lines];
    const gen = this.generation;
    this.queue = this.queue.then(async () => {
      for (const line of list) {
        if (gen !== this.generation) return;
        if (line.pause) await wait(line.pause * 1000);
        await this.speak(line);
      }
    });
    return this.queue;
  }

  private speak(line: Line): Promise<void> {
    const showSubs = this.settings().subtitles || !this.synth;
    if (showSubs) this.subtitle(line.text);
    const volume = this.settings().volume;
    return new Promise((resolve) => {
      const done = () => {
        if (showSubs) window.setTimeout(() => this.subtitle(''), 400);
        resolve();
      };
      if (!this.synth || volume <= 0) {
        window.setTimeout(done, 900 + line.text.length * 55);
        return;
      }
      const u = new SpeechSynthesisUtterance(line.text);
      const p = PROFILE[line.who];
      u.pitch = p.pitch;
      u.rate = p.rate;
      u.volume = p.volume * volume;
      const en = this.synth.getVoices().find((v) => v.lang.startsWith('en'));
      if (en) u.voice = en;
      // Never let a stuck speech engine hold the story up.
      const guard = window.setTimeout(done, 1500 + line.text.length * 120);
      u.onend = u.onerror = () => {
        window.clearTimeout(guard);
        done();
      };
      this.synth.speak(u);
    });
  }

  private subtitle(text: string): void {
    this.el.textContent = text;
    this.el.classList.toggle('on', !!text);
  }

  stop(): void {
    this.generation++;
    this.synth?.cancel();
    this.subtitle('');
    this.queue = Promise.resolve();
  }
}

export const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
