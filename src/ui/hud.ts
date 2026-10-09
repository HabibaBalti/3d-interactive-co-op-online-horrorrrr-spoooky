import type { ProbeState } from '../net/ServerProbe';
import type { Settings } from '../settings/settings';
import type { Timeline } from '../../shared/types';

/** Dev HUD for M0: hotkeys, current toggles and server status. Deliberately tiny. */
export class Hud {
  private readonly el: HTMLElement;
  private server: ProbeState = { status: 'connecting' };

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    parent.appendChild(this.el);
  }

  setServer(state: ProbeState): void {
    this.server = state;
  }

  render(settings: Settings, timeline: Timeline): void {
    const s = this.server;
    const server =
      s.status === 'online'
        ? `online${s.rtt !== null ? ` · ${s.rtt}ms` : ''}`
        : s.status === 'connecting'
          ? 'connecting…'
          : 'offline';
    this.el.innerHTML = `
      <div><kbd>T</kbd> ${timeline === '1994' ? 'nora · 1994' : 'sam · present'}</div>
      <div><kbd>Q</kbd> ${settings.quality}</div>
      <div><kbd>P</kbd> post-fx ${settings.postFx ? 'on' : 'off'}</div>
      <div><kbd>F</kbd> photosensitive ${settings.photosensitive ? 'on' : 'off'}</div>
      <div class="server ${s.status}">server ${server}</div>`;
  }
}

/** Title card. Resolves once the player clicks or presses a key. */
export function showTitle(parent: HTMLElement): Promise<void> {
  const el = document.createElement('div');
  el.className = 'title';
  el.innerHTML = `
    <div class="title-vertical" aria-hidden="true">まだ、ここにいる。</div>
    <h1>STILL HERE</h1>
    <p class="title-hint">click to listen</p>`;
  parent.appendChild(el);
  return new Promise((resolve) => {
    const go = () => {
      el.classList.add('gone');
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      window.setTimeout(() => el.remove(), 2500);
      resolve();
    };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
  });
}
