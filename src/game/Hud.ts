import type { Item } from '../../shared/game/types';

const ICONS: Record<Item, string> = {
  windKey:
    '<circle cx="8" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 12h9M19 12v4M22 12v3" stroke="currentColor" stroke-width="2" fill="none"/>',
  rabbit:
    '<ellipse cx="12" cy="16" rx="6" ry="5" fill="currentColor"/><ellipse cx="9" cy="6" rx="1.8" ry="5" fill="currentColor"/><ellipse cx="15" cy="6" rx="1.8" ry="5" fill="currentColor"/>',
  pianoKey:
    '<circle cx="7" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 12h11M18 12v3" stroke="currentColor" stroke-width="2"/>',
  tape: '<rect x="2" y="6" width="20" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="2.2" fill="currentColor"/><circle cx="16" cy="12" r="2.2" fill="currentColor"/>',
  keys: '<circle cx="9" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 12l8 8M17 17l2-2M15 15l2-2" stroke="currentColor" stroke-width="2"/>',
};

/**
 * The little that's on screen while playing: what you're carrying, whether your partner's
 * walkie-talkie is live, and a title card when an act begins.
 */
export class Hud {
  private readonly inventory: HTMLElement;
  private readonly partner: HTMLElement;
  private readonly card: HTMLElement;
  private readonly fade: HTMLElement;
  private shown = '';

  constructor(parent: HTMLElement) {
    this.inventory = document.createElement('div');
    this.inventory.className = 'inventory';
    this.partner = document.createElement('div');
    this.partner.className = 'partner';
    this.partner.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="10" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 5V1" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="8" width="5" height="4" fill="currentColor" opacity=".5"/></svg><span class="led"></span>';
    this.card = document.createElement('div');
    this.card.className = 'act-card';
    this.fade = document.createElement('div');
    this.fade.className = 'fade';
    parent.append(this.inventory, this.partner, this.card, this.fade);
  }

  setItems(items: Item[]): void {
    const key = items.join();
    if (key === this.shown) return;
    this.shown = key;
    this.inventory.innerHTML = items
      .map((i) => `<svg viewBox="0 0 24 24" class="item" aria-label="${i}">${ICONS[i]}</svg>`)
      .join('');
  }

  setPartner(online: boolean, solo: boolean): void {
    this.partner.hidden = solo;
    this.partner.classList.toggle('online', online);
    this.partner.title = online ? 'partner connected' : 'partner not connected';
  }

  showAct(numeral: string, title: string): void {
    this.card.innerHTML = `<div class="act-numeral">${numeral}</div><div class="act-title">${title}</div>`;
    this.card.classList.remove('show');
    void this.card.offsetWidth;
    this.card.classList.add('show');
  }

  /** Fade the screen to black (or another colour) and back. Resolves at full black. */
  fadeTo(color: string, seconds: number): Promise<void> {
    this.fade.style.background = color;
    this.fade.style.transitionDuration = `${seconds}s`;
    this.fade.classList.add('on');
    return new Promise((r) => window.setTimeout(r, seconds * 1000));
  }

  fadeFrom(seconds: number): void {
    this.fade.style.transitionDuration = `${seconds}s`;
    this.fade.classList.remove('on');
  }

  setVisible(visible: boolean): void {
    this.inventory.hidden = !visible;
  }
}
