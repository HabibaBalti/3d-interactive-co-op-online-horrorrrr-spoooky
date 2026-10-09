import type { Character } from '../types';

/** Colours used for stickers, the music box drum and the basement valves. */
export type Color = 'red' | 'blue' | 'yellow' | 'green';
export const COLORS: Color[] = ['red', 'blue', 'yellow', 'green'];

/** Where Walter hid the basement keys at 2:50 a.m. (shown on the VHS tape). */
export type KeySpot = 'jar' | 'drawer' | 'fridge' | 'breadbin';
export const KEY_SPOTS: KeySpot[] = ['jar', 'drawer', 'fridge', 'breadbin'];

/** Hiding places during the hunt. Kid Sam's drawing shows the safe one. */
export type HideSpot = 'table' | 'sofa' | 'desk';
export const HIDE_SPOTS: HideSpot[] = ['table', 'sofa', 'desk'];

/** Where Nora can leave little Sam's rabbit for her brother to find decades later. */
export type RabbitSpot = 'clock' | 'table' | 'bench';
export const RABBIT_SPOTS: RabbitSpot[] = ['clock', 'table', 'bench'];

/** The 3:17 board. */
export type Member = 'ruth' | 'walter' | 'nora' | 'sam';
export const MEMBERS: Member[] = ['ruth', 'walter', 'nora', 'sam'];
export type Place = 'upstairs' | 'kitchen' | 'living' | 'hall' | 'basement';
export const PLACES: Place[] = ['upstairs', 'kitchen', 'living', 'hall', 'basement'];
export type What = 'bolt' | 'ranaway' | 'fell' | 'storm';
export const WHATS: What[] = ['bolt', 'ranaway', 'fell', 'storm'];
export type Why = 'protect' | 'ranaway' | 'shame' | 'money';
export const WHYS: Why[] = ['protect', 'ranaway', 'shame', 'money'];

export type Item = 'windKey' | 'rabbit' | 'pianoKey' | 'tape' | 'keys';

/** Per-session answers, generated from the room seed so every game differs. */
export interface Secrets {
  /** Index (0-9, west to east) of the loose hall floorboard. */
  board: number;
  /** The coloured marks on the music box drum, in order. */
  music: Color[];
  /** Present-day photo wall: slot i holds photo photos[i]. Never the 1994 order. */
  photos: number[];
  keys: KeySpot;
  hide: HideSpot;
  /** The order the valves must be closed (Walter's notches). */
  valves: Color[];
}

export interface BoardState {
  /** Nora's half: where each family member was at 3:17. */
  where: Partial<Record<Member, Place>>;
  /** Sam's half: what happened, who did it, why it was hidden. */
  what: What | null;
  who: Member | null;
  why: Why | null;
  locked: Record<Character, boolean>;
  /** Correct answers confirmed so far, in groups of three: 0, 3, 6 (7 = solved). */
  confirmed: number;
}

export type Act = 1 | 2 | 3 | 4;

export interface GameState {
  /** Bumped on every change; clients ignore older snapshots. */
  v: number;
  seed: number;
  act: Act;
  /** How many times the night has looped. The house gets worse each time. */
  loop: number;
  flags: Partial<Record<Flag, boolean>>;
  inv: Record<Character, Item[]>;
  rabbitAt: RabbitSpot | null;
  /** Nora's current photo wall arrangement (slot → photo). */
  photoOrder: number[];
  valvesClosed: Color[];
  board: BoardState;
  ending: 'truth' | 'lie' | null;
  online: Record<Character, boolean>;
  secrets: Secrets;
}

export type Flag =
  // Act 1
  | 'clockSet'
  | 'boardOpen'
  | 'pianoUncovered'
  | 'pianoOpen'
  | 'boxWound'
  | 'lullaby'
  // Act 2
  | 'photosHung'
  | 'tapeWatched'
  | 'keysFound'
  | 'huntSurvived'
  | 'mirrorDone'
  // Act 3
  | 'basementOpen'
  | 'floodStarted'
  | 'valvesDone'
  | 'climax'
  | 'unbolted';

export type Action =
  | { type: 'clock/set'; h: number; m: number }
  | { type: 'floor/pry'; index: number }
  | { type: 'item/take'; item: Item }
  | { type: 'rabbit/leave'; spot: RabbitSpot }
  | { type: 'musicbox/wind' }
  | { type: 'piano/uncover' }
  | { type: 'piano/unlock' }
  | { type: 'piano/play'; colors: Color[] }
  | { type: 'photos/hang'; order: number[] }
  | { type: 'vhs/watched' }
  | { type: 'keys/search'; spot: KeySpot }
  | { type: 'hunt/caught' }
  | { type: 'hunt/survived' }
  | { type: 'mirror/turned' }
  | { type: 'mirror/endured' }
  | { type: 'basement/unbolt' }
  | { type: 'flood/start' }
  | { type: 'valve/close'; color: Color }
  | { type: 'flood/drowned' }
  | { type: 'door/climax' }
  | { type: 'board/set'; slot: BoardSlot; value: string | null }
  | { type: 'board/lock'; locked: boolean }
  | { type: 'ending/unbolt' }
  | { type: 'game/restart' };

export type BoardSlot = `where.${Member}` | 'what' | 'who' | 'why';

/** One-shot moments both clients react to (sounds, scares, echoes). */
export type Fx =
  | { type: 'wrong'; actor: Character; what: string }
  | { type: 'solved'; what: string }
  | { type: 'scare'; actor: Character; kind: 'caught' | 'mirror' | 'board' }
  | { type: 'surge' }
  | { type: 'drowned' }
  | { type: 'boardResult'; correct: number; confirmed: number }
  | { type: 'act'; act: Act }
  | { type: 'loop'; loop: number };
