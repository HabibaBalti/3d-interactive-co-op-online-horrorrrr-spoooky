import type { ProbeState } from '../net/ServerProbe';

/** Centre dot that swells over something usable and shows its one-word prompt. */
export class Reticle {
  private readonly el: HTMLElement;
  private readonly label: HTMLElement;
  private last: string | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'reticle';
    this.el.innerHTML = '<div class="reticle-dot"></div><div class="reticle-label"></div>';
    this.label = this.el.querySelector('.reticle-label')!;
    parent.appendChild(this.el);
  }

  show(visible: boolean): void {
    this.el.hidden = !visible;
  }

  setPrompt(prompt: string | null): void {
    if (prompt === this.last) return;
    this.last = prompt;
    this.el.classList.toggle('active', !!prompt);
    this.label.textContent = prompt ?? '';
  }
}

/** Developer readout (dev builds only): where you are and whether the server answers. */
export class DevHud {
  private readonly el: HTMLElement;
  private server: ProbeState = { status: 'connecting' };
  private frames = 0;
  private acc = 0;
  private fps = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    parent.appendChild(this.el);
  }

  setServer(state: ProbeState): void {
    this.server = state;
  }

  update(dt: number, lines: string[]): void {
    this.frames++;
    this.acc += dt;
    if (this.acc < 0.5) return;
    this.fps = Math.round(this.frames / this.acc);
    this.frames = 0;
    this.acc = 0;
    const s = this.server;
    const server =
      s.status === 'online'
        ? `online${s.rtt !== null ? ` · ${s.rtt}ms` : ''}`
        : s.status === 'connecting'
          ? 'connecting…'
          : 'offline';
    this.el.innerHTML = [
      ...lines.map((l) => `<div>${l}</div>`),
      `<div>${this.fps} fps</div>`,
      `<div class="server ${s.status}">server ${server}</div>`,
    ].join('');
  }
}

/** Title card. Calls `onStart` synchronously inside the click, so it can take pointer lock. */
export function showTitle(parent: HTMLElement, onStart: () => void): void {
  const el = document.createElement('div');
  el.className = 'title';
  el.innerHTML = `
    <div class="title-vertical" aria-hidden="true">まだ、ここにいる。</div>
    <h1>STILL HERE</h1>
    <p class="title-hint">click to enter</p>`;
  parent.appendChild(el);
  el.addEventListener('click', () => {
    el.classList.add('gone');
    window.setTimeout(() => el.remove(), 2500);
    onStart();
  });
}
