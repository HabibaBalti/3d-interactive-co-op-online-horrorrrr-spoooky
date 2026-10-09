import { GameHost } from '../../shared/game/host';
import type { Action, Fx, GameState } from '../../shared/game/types';
import type { Presence } from '../../shared/protocol';
import { otherCharacter, type Character } from '../../shared/types';
import type { NamedRoom, RoomApi, RoomPeer } from './claude-room';
import { LinkBase, loadGameState, saveGameState, saveSession, type Link } from './Link';

/** Topics this game sends on; the page declares them open to its players. */
export const ROOM_TOPICS = ['hello', 'act', 'state', 'fx'] as const;

/** The hosted page's room capability, or null when not running inside a viewer that has it. */
export async function roomApi(): Promise<RoomApi | null> {
  const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } })
    .claude;
  if (!claude?.use) return null;
  try {
    return (await claude.use('room')) as RoomApi | null;
  } catch {
    return null;
  }
}

/**
 * Plays through the hosted page's rooms. The player who created the game runs the rules in
 * their page and keeps the state (saved locally, so a reload resumes); the other player sends
 * actions to them. Both see each other through presence.
 */
export class RoomLink extends LinkBase implements Link {
  readonly kind = 'room' as const;
  private room: NamedRoom | null = null;
  private host: GameHost | null = null;
  private presenceAt = 0;
  private timers: number[] = [];
  private offs: (() => void)[] = [];

  constructor(
    private readonly api: RoomApi,
    readonly code: string,
    readonly role: 'host' | 'guest',
    public character: Character,
  ) {
    super();
    void this.start();
  }

  private async start(): Promise<void> {
    this.emitStatus({ kind: 'connecting' });
    try {
      this.room = await this.api.join(`sh-${this.code.toLowerCase()}`);
    } catch (e) {
      this.emitStatus({ kind: 'error', reason: (e as { code?: string })?.code ?? 'room' });
      return;
    }
    const room = this.room;
    void room.presence({ r: this.role, c: this.role === 'host' ? this.character : null });
    this.offs.push(room.onPeers(() => this.peersChanged()));

    if (this.role === 'host') {
      const saved = loadGameState(this.code);
      const host = (this.host = new GameHost(
        Math.floor(Math.random() * 2 ** 31),
        saved ?? undefined,
      ));
      host.setOnline(this.character, true);
      host.setOnline(otherCharacter(this.character), false);
      host.onChange((r) => {
        saveGameState(this.code, r.state);
        this.emitState(r.state);
        this.emitFx(r.fx);
        void room.emit('state', { s: r.state }).catch(() => {});
        if (r.fx.length) void room.emit('fx', { fx: r.fx }).catch(() => {});
      });
      this.latest = host.state;
      this.offs.push(
        room.on('act', (m) => {
          if (m.isMe) return;
          const a = (m.data as { a?: Action } | undefined)?.a;
          if (a && typeof a.type === 'string') host.apply(otherCharacter(this.character), a);
        }),
        room.on('hello', (m) => {
          if (!m.isMe) void room.emit('state', { s: host.state }).catch(() => {});
        }),
      );
      // Events are never replayed: re-send the state now and then in case one was dropped.
      this.timers.push(
        window.setInterval(() => void room.emit('state', { s: host.state }).catch(() => {}), 4000),
      );
      saveSession({
        kind: 'room',
        code: this.code,
        character: this.character,
        token: 'host',
        savedAt: Date.now(),
      });
      this.emitStatus({ kind: 'ready' });
      this.emitState(host.state);
    } else {
      this.offs.push(
        room.on('state', (m) => {
          if (m.isMe) return;
          const s = (m.data as { s?: GameState } | undefined)?.s;
          if (s && typeof s.v === 'number') this.emitState(s);
        }),
        room.on('fx', (m) => {
          if (m.isMe) return;
          const fx = (m.data as { fx?: Fx[] } | undefined)?.fx;
          if (Array.isArray(fx)) this.emitFx(fx);
        }),
      );
      const hello = () => void room.emit('hello', {}).catch(() => {});
      hello();
      this.timers.push(window.setInterval(() => !this.latest && hello(), 2500));
    }
  }

  private hostPeer(peers: readonly RoomPeer[]): RoomPeer | undefined {
    return peers.find((p) => !p.isMe && p.presence.r === 'host');
  }

  private peersChanged(): void {
    const peers = this.room?.peers() ?? [];
    const partner = peers.find(
      (p) => !p.isMe && (p.presence.r === 'host' || p.presence.r === 'guest'),
    );
    if (this.role === 'host') {
      this.host?.setOnline(otherCharacter(this.character), !!partner);
    } else {
      const host = this.hostPeer(peers);
      const hostChar = host?.presence.c;
      if (hostChar === 'nora' || hostChar === 'sam') {
        const mine = otherCharacter(hostChar);
        const first = this.character !== mine || !this.readyOnce;
        this.character = mine;
        if (first) {
          this.readyOnce = true;
          saveSession({
            kind: 'room',
            code: this.code,
            character: mine,
            token: 'guest',
            savedAt: Date.now(),
          });
          this.emitStatus({ kind: 'ready' });
        }
      }
    }
    const p = partner?.presence as { p?: Presence['p']; e?: Presence['e'] } | undefined;
    if (p?.p) this.emitPartner({ p: p.p, e: p.e ?? null });
  }

  private readyOnce = false;

  act(action: Action): void {
    if (this.host) this.host.apply(this.character, action);
    else void this.room?.emit('act', { a: action }).catch(() => {});
  }

  setPresence(p: Presence): void {
    const now = performance.now();
    if (!this.room || now - this.presenceAt < 90) return;
    this.presenceAt = now;
    void this.room
      .presence({
        r: this.role,
        c: this.role === 'host' ? this.character : null,
        p: p.p ?? null,
        e: p.e ?? null,
      })
      .catch(() => {});
  }

  close(): void {
    this.timers.forEach((t) => window.clearInterval(t));
    this.offs.forEach((off) => off());
    void this.room?.leave().catch(() => {});
  }
}
