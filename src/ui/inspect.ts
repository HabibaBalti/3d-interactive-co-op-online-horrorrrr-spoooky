import type { InspectView } from '../interaction/Inspector';
import type { InspectTarget } from '../world/house/House';

/**
 * The card under a close-up: the object's name, one line, and (if lore is on) a faint line of family history
 * that fades in a few seconds later.
 */
export class InspectCard implements InspectView {
  private readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly lore: () => boolean,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'inspect';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="inspect-name"></div>
      <div class="inspect-line"></div>
      <div class="inspect-lore"></div>
      <div class="inspect-panel"></div>
      <div class="inspect-back"><kbd>E</kbd> back</div>`;
    parent.appendChild(this.el);
  }

  show(target: InspectTarget, panel?: HTMLElement): void {
    const { name, line, lore } = target.text;
    const slot = this.el.querySelector<HTMLElement>('.inspect-panel')!;
    slot.replaceChildren(...(panel ? [panel] : []));
    this.el.classList.toggle('with-panel', !!panel);
    const back = this.el.querySelector<HTMLElement>('.inspect-back')!;
    back.innerHTML = panel
      ? '<button type="button" class="panel-back"><kbd>E</kbd> back</button>'
      : '<kbd>E</kbd> back';
    back.querySelector('button')?.addEventListener('click', () => this.onBack?.());
    this.el.querySelector('.inspect-name')!.textContent = name;
    this.el.querySelector('.inspect-line')!.textContent = line;
    const loreEl = this.el.querySelector<HTMLElement>('.inspect-lore')!;
    loreEl.textContent = this.lore() && lore ? lore : '';
    // Restart the fade-in animations.
    this.el.hidden = true;
    void this.el.offsetWidth;
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
    this.el.querySelector('.inspect-panel')!.replaceChildren();
  }

  /** The on-screen back button (close-ups with controls, where the mouse is free). */
  onBack: (() => void) | null = null;
}
