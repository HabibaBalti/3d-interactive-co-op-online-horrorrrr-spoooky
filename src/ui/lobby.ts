import type { GameState } from '../../shared/game/types';
import { isValidRoomCode, normalizeRoomCode, ROOM_CODE_LENGTH } from '../../shared/roomCode';
import type { Character } from '../../shared/types';
import type { Link, SavedSession } from '../net/Link';

export type Together = 'room' | 'server' | null;

export type LobbyChoice =
  | { mode: 'solo'; character: Character }
  | { mode: 'create'; character: Character }
  | { mode: 'join'; code: string }
  | { mode: 'continue'; session: SavedSession };

const ERRORS: Record<string, string> = {
  'no-such-game': 'There is no game with that code.',
  'game-full': 'That game already has two players.',
  not_permitted:
    'This page needs to be shared with both of you (Contributor access) to play together.',
  not_granted:
    'This page needs to be shared with both of you (Contributor access) to play together.',
};

/**
 * Everything before the house: the title, creating or joining a game (a five-letter code read
 * out over the call), practising alone, and the waiting room.
 */
export class Lobby {
  private readonly el: HTMLElement;
  private readonly screen: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly together: Together,
    private readonly saved: SavedSession | null,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'title lobby';
    this.el.innerHTML = `
      <div class="title-vertical" aria-hidden="true">まだ、ここにいる。</div>
      <div class="title-main">
        <h1>STILL HERE</h1>
        <div class="lobby-screen"></div>
      </div>`;
    this.screen = this.el.querySelector('.lobby-screen')!;
    parent.appendChild(this.el);
  }

  private render(html: string): void {
    this.screen.innerHTML = html;
  }

  private on(selector: string, fn: (el: HTMLElement) => void): void {
    this.screen
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => el.addEventListener('click', () => fn(el)));
  }

  /** The title screen and its menus. Resolves with what the player chose. */
  choose(message = ''): Promise<LobbyChoice> {
    return new Promise((resolve) => this.home(resolve, message));
  }

  private home(resolve: (c: LobbyChoice) => void, message = ''): void {
    const can = this.together !== null;
    const saved = this.saved;
    this.render(`
      ${
        saved
          ? `<button type="button" class="menu-btn continue" data-go="continue">Continue ${
              saved.kind === 'solo' ? 'practice' : `game ${saved.code}`
            }</button>`
          : ''
      }
      <div class="menu">
        <button type="button" class="menu-btn" data-go="create" ${can ? '' : 'disabled'}>Create game</button>
        <button type="button" class="menu-btn" data-go="join" ${can ? '' : 'disabled'}>Join game</button>
        <button type="button" class="menu-btn quiet" data-go="solo">Practice alone</button>
      </div>
      ${message ? `<p class="lobby-error" role="alert">${message}</p>` : ''}
      ${
        can
          ? ''
          : '<p class="lobby-note">Playing together needs this page shared with your partner, or the game server.</p>'
      }
      <p class="warning">Headphones recommended. Psychological horror, the implied death of a teenager, and flashing lights (can be reduced in the pause menu).</p>`);
    this.on('[data-go="continue"]', () => saved && resolve({ mode: 'continue', session: saved }));
    this.on('[data-go="create"]', () =>
      this.pickCharacter(
        'Who will you be?',
        (c) => resolve({ mode: 'create', character: c }),
        () => this.home(resolve),
      ),
    );
    this.on('[data-go="join"]', () => this.joinCode(resolve));
    this.on('[data-go="solo"]', () =>
      this.pickCharacter(
        'Start as',
        (c) => resolve({ mode: 'solo', character: c }),
        () => this.home(resolve),
        'You play both. Press Tab to become the other one.',
      ),
    );
  }

  private pickCharacter(
    heading: string,
    done: (c: Character) => void,
    back: () => void,
    note = '',
  ): void {
    this.render(`
      <h2 class="lobby-heading">${heading}</h2>
      <div class="title-choices">
        <button type="button" data-character="nora"><span>Nora</span><small>1994</small></button>
        <button type="button" data-character="sam"><span>Sam</span><small>today</small></button>
      </div>
      ${note ? `<p class="lobby-note">${note}</p>` : ''}
      <button type="button" class="link-btn" data-back>back</button>`);
    this.on('[data-character]', (el) => done(el.dataset.character as Character));
    this.on('[data-back]', back);
  }

  private joinCode(resolve: (c: LobbyChoice) => void, message = ''): void {
    this.render(`
      <h2 class="lobby-heading">Your partner's code</h2>
      <form class="join-form">
        <input id="join-code" name="code" maxlength="${ROOM_CODE_LENGTH + 2}" autocomplete="off"
          spellcheck="false" autocapitalize="characters" aria-label="Game code" />
        <button type="submit" class="menu-btn">Join</button>
      </form>
      ${message ? `<p class="lobby-error" role="alert">${message}</p>` : ''}
      <button type="button" class="link-btn" data-back>back</button>`);
    const form = this.screen.querySelector('form')!;
    const input = form.querySelector('input')!;
    input.focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = normalizeRoomCode(input.value);
      if (!isValidRoomCode(code)) {
        this.joinCode(
          resolve,
          'Codes are five letters and numbers, like the one on your partner’s screen.',
        );
        return;
      }
      resolve({ mode: 'join', code });
    });
    this.on('[data-back]', () => this.home(resolve));
  }

  /** Connecting… then the waiting room. `onEnter` runs inside the click (pointer lock). */
  waiting(link: Link, onEnter: () => void, onFail: (msg: string) => void): void {
    this.render(`<p class="lobby-note">Connecting…</p>`);
    let shown = false;
    const show = (state: GameState | null) => {
      const me = link.character;
      const partner = me === 'nora' ? 'sam' : 'nora';
      const here = !!state?.online[partner];
      if (!shown) {
        shown = true;
        this.render(`
          <div class="waiting">
            <div class="code-label">game code</div>
            <div class="code">${link.code
              .split('')
              .map((c) => `<span>${c}</span>`)
              .join('')}</div>
            <p class="lobby-note">Your partner chooses <b>Join game</b> and types this code.</p>
            <div class="you-are">You are <b>${me === 'nora' ? 'Nora · 1994' : 'Sam · today'}</b></div>
            <div class="partner-status"><span class="led"></span><span class="status-text"></span></div>
            <ol class="rules">
              <li>Get on a call with your partner.</li>
              <li>Never show them your screen.</li>
              <li>Describe everything.</li>
            </ol>
            <button type="button" class="menu-btn enter">Enter the house</button>
          </div>`);
        this.on('.enter', () => onEnter());
      }
      const status = this.screen.querySelector('.partner-status');
      status?.classList.toggle('online', here);
      const text = this.screen.querySelector('.status-text');
      if (text) text.textContent = here ? 'Your partner is here.' : 'Waiting for your partner…';
    };
    link.onStatus((s) => {
      if (s.kind === 'ready') show((link as { latest?: GameState }).latest ?? null);
      if (s.kind === 'error') onFail(ERRORS[s.reason] ?? 'Could not reach the game. Try again.');
    });
    link.onState((s) => {
      if (shown || link.code) show(s);
    });
  }

  close(): void {
    this.el.classList.add('gone');
    window.setTimeout(() => this.el.remove(), 2500);
  }
}
