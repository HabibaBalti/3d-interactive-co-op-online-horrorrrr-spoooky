import type { Character } from '../../shared/types';
import type { Quality, Settings } from '../settings/settings';

const CONTROLS: [string, string][] = [
  ['W A S D', 'move'],
  ['mouse', 'look'],
  ['shift', 'run'],
  ['C', 'crouch'],
  ['E / click', 'use · look closer'],
  ['F', 'flashlight'],
  ['Tab', 'switch sibling'],
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
    onLeave: () => void,
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
          <label>lore <input name="lore" type="checkbox"></label>
          <label>quality
            <select name="quality">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>film effects <input name="postFx" type="checkbox"></label>
          <label>reduce flashing <input name="photosensitive" type="checkbox"></label>
          <label>subtitles <input name="subtitles" type="checkbox"></label>
          <label>jump scares
            <select name="scares">
              <option value="full">full</option>
              <option value="reduced">reduced</option>
            </select>
          </label>
        </form>
        <div class="pause-actions">
          <button type="button" class="resume">return</button>
          <button type="button" class="leave">leave the house</button>
        </div>
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
        lore: data.has('lore'),
        quality: data.get('quality') as Quality,
        postFx: data.has('postFx'),
        photosensitive: data.has('photosensitive'),
        subtitles: data.has('subtitles'),
        scares: data.get('scares') as Settings['scares'],
      };
      this.settings = { ...this.settings, ...next };
      onChange(next);
    });
    this.el.querySelector('.resume')!.addEventListener('click', onResume);
    this.el.querySelector('.leave')!.addEventListener('click', onLeave);
    this.sync();
    this.setCharacter(character);
  }

  /** Practice alone shows the Tab key. */
  solo = false;

  /** Only Sam has a flashlight, so only Sam's controls list it. */
  setCharacter(character: Character): void {
    this.el.querySelector('.controls')!.innerHTML = CONTROLS.filter(
      ([, what]) =>
        (what !== 'flashlight' || character === 'sam') && (what !== 'switch sibling' || this.solo),
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
    field('lore').checked = this.settings.lore;
    (form.elements.namedItem('quality') as HTMLSelectElement).value = this.settings.quality;
    field('postFx').checked = this.settings.postFx;
    field('photosensitive').checked = this.settings.photosensitive;
    field('subtitles').checked = this.settings.subtitles;
    (form.elements.namedItem('scares') as HTMLSelectElement).value = this.settings.scares;
  }

  show(visible: boolean): void {
    this.el.hidden = !visible;
  }
}
