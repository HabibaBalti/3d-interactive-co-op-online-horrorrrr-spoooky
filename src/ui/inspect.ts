import type { InspectView } from '../interaction/Inspector';
import type { InspectTarget } from '../world/house/House';

/**
 * The card under a close-up: the object's name, one line, and (if hints are on) a faint hint
 * that fades in a few seconds later.
 */
export class InspectCard implements InspectView {
  private readonly el: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly hints: () => boolean,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'inspect';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="inspect-name"></div>
      <div class="inspect-line"></div>
      <div class="inspect-hint"></div>
      <div class="inspect-back"><kbd>E</kbd> back</div>`;
    parent.appendChild(this.el);
  }

  show(target: InspectTarget): void {
    const { name, line, hint } = target.text;
    this.el.querySelector('.inspect-name')!.textContent = name;
    this.el.querySelector('.inspect-line')!.textContent = line;
    const hintEl = this.el.querySelector<HTMLElement>('.inspect-hint')!;
    hintEl.textContent = this.hints() && hint ? hint : '';
    // Restart the fade-in animations.
    this.el.hidden = true;
    void this.el.offsetWidth;
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}
