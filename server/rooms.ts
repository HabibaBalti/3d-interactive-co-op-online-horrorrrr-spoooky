import { randomBytes, randomInt } from 'node:crypto';
import { GameHost } from '../shared/game/host';
import type { Action, Fx, GameState } from '../shared/game/types';
import type { Presence } from '../shared/protocol';
import { generateRoomCode } from '../shared/roomCode';
import { otherCharacter, type Character } from '../shared/types';

export interface Seat {
  token: string;
  send: ((msg: SeatMessage) => void) | null;
}

export type SeatMessage =
  { t: 'state'; state: GameState } | { t: 'fx'; fx: Fx[] } | { t: 'presence'; presence: Presence };

/** One game: the authority plus the two seats. Seats survive disconnects so players can rejoin. */
export class Room {
  readonly host: GameHost;
  readonly seats: Partial<Record<Character, Seat>> = {};
  lastActive = Date.now();

  constructor(readonly code: string) {
    this.host = new GameHost(randomInt(2 ** 31));
    this.host.onChange((r) => {
      this.broadcast({ t: 'state', state: r.state });
      if (r.fx.length) this.broadcast({ t: 'fx', fx: r.fx });
    });
  }

  private broadcast(msg: SeatMessage): void {
    for (const seat of Object.values(this.seats)) seat?.send?.(msg);
  }

  /** Takes a seat; returns the token that lets this player back in later. */
  sit(character: Character): string | null {
    if (this.seats[character]) return null;
    const token = randomBytes(16).toString('hex');
    this.seats[character] = { token, send: null };
    return token;
  }

  freeSeat(): Character | null {
    if (!this.seats.nora) return 'nora';
    if (!this.seats.sam) return 'sam';
    return null;
  }

  byToken(token: string): Character | null {
    for (const c of ['nora', 'sam'] as Character[]) if (this.seats[c]?.token === token) return c;
    return null;
  }

  connect(character: Character, send: (msg: SeatMessage) => void): void {
    this.seats[character]!.send = send;
    this.host.setOnline(character, true);
    send({ t: 'state', state: this.host.state });
    this.lastActive = Date.now();
  }

  disconnect(character: Character): void {
    const seat = this.seats[character];
    if (seat) seat.send = null;
    this.host.setOnline(character, false);
    this.lastActive = Date.now();
  }

  act(character: Character, action: Action): void {
    this.host.apply(character, action);
    this.lastActive = Date.now();
  }

  relayPresence(from: Character, presence: Presence): void {
    this.seats[otherCharacter(from)]?.send?.({ t: 'presence', presence });
  }
}

export class Rooms {
  private readonly rooms = new Map<string, Room>();

  create(): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /** Forget games nobody has touched for a few hours. */
  sweep(maxIdleMs = 6 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const anyone = Object.values(room.seats).some((s) => s?.send);
      if (!anyone && now - room.lastActive > maxIdleMs) this.rooms.delete(code);
    }
  }
}
