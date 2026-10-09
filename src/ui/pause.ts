import type { Character } from '../../shared/types';
import type { Quality, Settings } from '../settings/settings';

const CONTROLS: [string, string][] = [
  ['W A S D', 'move'],
  ['mouse', 'look'],
  ['shift', 'run'],
  ['C', 'crouch'],
  ['E / click', 'use · look closer'],
  ['F', 'flashlight'],
  ['esc', 'pause'],
];

/**
 * Pause overlay: the controls, and every setting that matters for comfort. Shown whenever the
 * pointer is released mid-game.
 */
export class PauseMenu {
  private readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    character: Character,
    private settings: Settings,
    onChange: (next: Partial<Settings>) => void,
    onResume: () => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'pause';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="pause-panel">
        <h2>paused</h2>
        <div class="controls"></div>
        <form class="settings">
          <label>volume <input name="volume" type="range" min="0" max="1" step="0.05"></label>
          <label>mouse <input name="mouseSensitivity" type="range" min="0.2" max="3" step="0.05"></label>
          <label>invert look <input name="invertY" type="checkbox"></label>
          <label>head bob <input name="headBob" type="checkbox"></label>
          <label>hints <input name="hints" type="checkbox"></label>
          <label>quality
            <select name="quality">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>film effects <input name="postFx" type="checkbox"></label>
          <label>reduce flashing <input name="photosensitive" type="checkbox"></label>
        </form>
        <button type="button" class="resume">return</button>
      </div>`;
    parent.appendChild(this.el);

    const form = this.el.querySelector('form')!;
    form.addEventListener('input', () => {
      const data = new FormData(form);
      const next: Partial<Settings> = {
        volume: Number(data.get('volume')),
        mouseSensitivity: Number(data.get('mouseSensitivity')),
        invertY: data.has('invertY'),
        headBob: data.has('headBob'),
        hints: data.has('hints'),
        quality: data.get('quality') as Quality,
        postFx: data.has('postFx'),
        photosensitive: data.has('photosensitive'),
      };
      this.settings = { ...this.settings, ...next };
      onChange(next);
    });
    this.el.querySelector('.resume')!.addEventListener('click', onResume);
    this.sync();
    this.setCharacter(character);
  }

  /** Only Sam has a flashlight, so only Sam's controls list it. */
  setCharacter(character: Character): void {
    this.el.querySelector('.controls')!.innerHTML = CONTROLS.filter(
      ([, what]) => what !== 'flashlight' || character === 'sam',
    )
      .map(([key, what]) => `<div><kbd>${key}</kbd><span>${what}</span></div>`)
      .join('');
  }

  private sync(): void {
    const form = this.el.querySelector('form')!;
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
    field('volume').value = String(this.settings.volume);
    field('mouseSensitivity').value = String(this.settings.mouseSensitivity);
    field('invertY').checked = this.settings.invertY;
    field('headBob').checked = this.settings.headBob;
    field('hints').checked = this.settings.hints;
    (form.elements.namedItem('quality') as HTMLSelectElement).value = this.settings.quality;
    field('postFx').checked = this.settings.postFx;
    field('photosensitive').checked = this.settings.photosensitive;
  }

  show(visible: boolean): void {
    this.el.hidden = !visible;
  }
}
