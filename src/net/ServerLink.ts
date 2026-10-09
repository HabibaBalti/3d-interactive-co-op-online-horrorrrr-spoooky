import type { Action } from '../../shared/game/types';
import {
  decode,
  encode,
  PROTOCOL_VERSION,
  type ClientMessage,
  type Presence,
  type ServerMessage,
} from '../../shared/protocol';
import type { Character } from '../../shared/types';
import { LinkBase, saveSession, type Link } from './Link';
import { serverUrl } from './ServerProbe';

export type ServerIntent =
  { create: Character } | { join: string } | { rejoin: { code: string; token: string } };

/**
 * Plays through the Node server (self-hosted or `npm run dev`). Reconnects with backoff and
 * takes its seat back with the saved token.
 */
export class ServerLink extends LinkBase implements Link {
  readonly kind = 'server' as const;
  code = '';
  character: Character = 'nora';
  private ws: WebSocket | null = null;
  private token = '';
  private retry = 0;
  private closed = false;
  private presenceAt = 0;
  private keepAwake = 0;

  constructor(private intent: ServerIntent) {
    super();
    this.connect();
    // Free hosts put a server to sleep when no HTTP requests arrive, even with sockets open;
    // sleeping would drop the room mid-game.
    this.keepAwake = window.setInterval(
      () => void fetch('./health', { cache: 'no-store' }).catch(() => {}),
      4 * 60_000,
    );
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(encode(msg));
  }

  private connect(): void {
    this.emitStatus({ kind: 'connecting' });
    const ws = (this.ws = new WebSocket(serverUrl()));
    ws.onopen = () => {
      this.retry = 0;
      this.send({ t: 'hello', protocol: PROTOCOL_VERSION });
    };
    ws.onmessage = (ev) => {
      const msg = decode<ServerMessage>(String(ev.data));
      if (!msg) return;
      switch (msg.t) {
        case 'welcome': {
          const i = this.intent;
          if ('create' in i) this.send({ t: 'create', character: i.create });
          else if ('join' in i) this.send({ t: 'join', code: i.join });
          else this.send({ t: 'rejoin', code: i.rejoin.code, token: i.rejoin.token });
          break;
        }
        case 'joined':
          this.code = msg.code;
          this.character = msg.character;
          this.token = msg.token;
          // From now on, reconnecting means taking the same seat back.
          this.intent = { rejoin: { code: msg.code, token: msg.token } };
          saveSession({
            kind: 'server',
            code: msg.code,
            character: msg.character,
            token: msg.token,
            savedAt: Date.now(),
          });
          this.emitStatus({ kind: 'ready' });
          break;
        case 'state':
          this.emitState(msg.state);
          break;
        case 'fx':
          this.emitFx(msg.fx);
          break;
        case 'presence':
          this.emitPartner(msg.presence);
          break;
        case 'error':
          this.emitStatus({ kind: 'error', reason: msg.reason });
          if (msg.reason === 'no-such-game' || msg.reason === 'game-full') this.closed = true;
          break;
      }
    };
    ws.onclose = () => {
      if (this.closed) return;
      this.emitStatus({ kind: 'connecting' });
      const delay = Math.min(15_000, 500 * 2 ** this.retry++);
      window.setTimeout(() => this.connect(), delay);
    };
  }

  act(action: Action): void {
    this.send({ t: 'action', action });
  }

  setPresence(p: Presence): void {
    const now = performance.now();
    if (now - this.presenceAt < 90) return; // ~10 per second is plenty for a mirror
    this.presenceAt = now;
    this.send({ t: 'presence', presence: p });
  }

  close(): void {
    this.closed = true;
    window.clearInterval(this.keepAwake);
    this.ws?.close();
  }

  get savedToken(): string {
    return this.token;
  }
}
