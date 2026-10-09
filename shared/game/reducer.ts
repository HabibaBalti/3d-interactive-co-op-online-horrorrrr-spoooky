import type { Character } from '../types';
import { boardComplete, choseTheLie, countCorrect } from './board';
import { COLORS, HIDE_SPOTS, KEY_SPOTS, MEMBERS, PLACES, WHATS, WHYS } from './types';
import type {
  Action,
  BoardState,
  Color,
  Fx,
  GameState,
  Item,
  Member,
  Place,
  Secrets,
  What,
  Why,
} from './types';
import { pick, rng, shuffle } from './rng';

export function makeSecrets(seed: number): Secrets {
  const r = rng(seed);
  const music = Array.from({ length: 6 }, () => pick(COLORS, r));
  // The present-day wall is always rearranged (never identical to 1994).
  let photos = [0, 1, 2, 3];
  while (photos.every((p, i) => p === i)) photos = shuffle(photos, r);
  return {
    board: Math.floor(r() * 10),
    music,
    photos,
    keys: pick(KEY_SPOTS, r),
    hide: pick(HIDE_SPOTS, r),
    valves: shuffle(COLORS, r),
  };
}

function emptyBoard(): BoardState {
  return {
    where: {},
    what: null,
    who: null,
    why: null,
    locked: { nora: false, sam: false },
    confirmed: 0,
  };
}

export function initialState(seed: number, loop = 0): GameState {
  return {
    v: 1,
    seed,
    act: 1,
    loop,
    flags: {},
    inv: { nora: [], sam: [] },
    rabbitAt: null,
    photoOrder: [0, 1, 2, 3],
    valvesClosed: [],
    board: emptyBoard(),
    ending: null,
    online: { nora: false, sam: false },
    secrets: makeSecrets(seed),
  };
}

export interface Result {
  state: GameState;
  fx: Fx[];
  /** Why an action was ignored (for debugging; players just see nothing happen). */
  rejected?: string;
}

const has = (s: GameState, who: Character, item: Item) => s.inv[who].includes(item);
const give = (s: GameState, who: Character, item: Item) => {
  if (!has(s, who, item)) s.inv[who].push(item);
};
const take = (s: GameState, who: Character, item: Item) => {
  s.inv[who] = s.inv[who].filter((i) => i !== item);
};

/** Who may perform each action. */
const ACTOR: Partial<Record<Action['type'], Character>> = {
  'clock/set': 'nora',
  'floor/pry': 'nora',
  'rabbit/leave': 'nora',
  'musicbox/wind': 'nora',
  'piano/uncover': 'sam',
  'piano/unlock': 'sam',
  'piano/play': 'sam',
  'photos/hang': 'nora',
  'vhs/watched': 'sam',
  'keys/search': 'nora',
  'hunt/caught': 'nora',
  'hunt/survived': 'nora',
  'mirror/turned': 'nora',
  'mirror/endured': 'nora',
  'basement/unbolt': 'sam',
  'flood/start': 'nora',
  'valve/close': 'nora',
  'flood/drowned': 'nora',
  'door/climax': 'nora',
  'ending/unbolt': 'sam',
};

/** Which half of the board each player may edit. */
function boardOwner(slot: string): Character {
  return slot.startsWith('where.') ? 'nora' : 'sam';
}

function validBoardValue(slot: string, value: string | null): boolean {
  if (value === null) return true;
  if (slot.startsWith('where.')) {
    return MEMBERS.includes(slot.slice(6) as Member) && PLACES.includes(value as Place);
  }
  if (slot === 'what') return WHATS.includes(value as What);
  if (slot === 'who') return MEMBERS.includes(value as Member);
  if (slot === 'why') return WHYS.includes(value as Why);
  return false;
}

/**
 * The rules of the game. Pure: returns a new state and the one-shot effects to broadcast.
 * Runs wherever the authority lives (the server, the game creator's page, or solo practice).
 */
export function reduce(prev: GameState, actor: Character, action: Action): Result {
  const s: GameState = structuredClone(prev);
  const fx: Fx[] = [];
  const f = s.flags;
  const no = (why: string): Result => ({ state: prev, fx: [], rejected: why });

  const required = ACTOR[action.type];
  if (required && required !== actor) return no(`only ${required} can ${action.type}`);
  if (s.ending && action.type !== 'game/restart' && action.type !== 'ending/unbolt') {
    return no('the night is over');
  }

  switch (action.type) {
    // --- Act 1 -------------------------------------------------------------------------------
    case 'clock/set': {
      if (s.act !== 1 || f.clockSet) return no('clock already set');
      if (action.h % 12 === 3 && action.m === 17) {
        f.clockSet = true;
        fx.push({ type: 'solved', what: 'clock' });
      } else {
        fx.push({ type: 'wrong', actor, what: 'clock' });
      }
      break;
    }
    case 'floor/pry': {
      if (f.boardOpen) return no('already open');
      if (action.index === s.secrets.board) {
        f.boardOpen = true;
        fx.push({ type: 'solved', what: 'floor' });
      } else {
        fx.push({ type: 'wrong', actor, what: 'floor' });
      }
      break;
    }
    case 'item/take': {
      const item = action.item;
      const ok =
        (item === 'windKey' && actor === 'nora' && f.clockSet) ||
        (item === 'rabbit' && actor === 'nora' && f.boardOpen && s.rabbitAt === null) ||
        (item === 'pianoKey' && actor === 'sam' && s.rabbitAt !== null) ||
        (item === 'tape' && actor === 'sam' && f.photosHung);
      if (!ok || has(s, actor, item)) return no(`cannot take ${item}`);
      give(s, actor, item);
      break;
    }
    case 'rabbit/leave': {
      if (!has(s, 'nora', 'rabbit')) return no('no rabbit');
      if (action.spot === 'clock' && !f.clockSet) return no('clock is shut');
      take(s, 'nora', 'rabbit');
      s.rabbitAt = action.spot;
      break;
    }
    case 'musicbox/wind': {
      if (!has(s, 'nora', 'windKey')) return no('no key');
      f.boxWound = true;
      break;
    }
    case 'piano/uncover':
      f.pianoUncovered = true;
      break;
    case 'piano/unlock': {
      if (!has(s, 'sam', 'pianoKey')) return no('no key');
      f.pianoUncovered = true;
      f.pianoOpen = true;
      break;
    }
    case 'piano/play': {
      if (!f.pianoOpen || f.lullaby) return no('piano closed');
      const right =
        action.colors.length === s.secrets.music.length &&
        action.colors.every((c, i) => c === s.secrets.music[i]);
      if (right && f.boxWound) {
        f.lullaby = true;
        s.act = 2;
        fx.push({ type: 'solved', what: 'lullaby' }, { type: 'act', act: 2 });
      } else {
        fx.push({ type: 'wrong', actor, what: 'piano' });
      }
      break;
    }

    // --- Act 2 -------------------------------------------------------------------------------
    case 'photos/hang': {
      if (s.act < 2 || f.photosHung) return no('not now');
      const order = action.order;
      if (order.length !== 4 || [...order].sort().join() !== '0,1,2,3') return no('bad order');
      s.photoOrder = order.slice();
      if (order.every((p, i) => p === s.secrets.photos[i])) {
        f.photosHung = true;
        fx.push({ type: 'solved', what: 'photos' });
      } else {
        fx.push({ type: 'wrong', actor, what: 'photos' });
      }
      break;
    }
    case 'vhs/watched': {
      if (!has(s, 'sam', 'tape')) return no('no tape');
      f.tapeWatched = true;
      break;
    }
    case 'keys/search': {
      if (s.act < 2 || f.keysFound) return no('not now');
      // The keys only settle where they were hidden once the tape has been seen.
      if (f.tapeWatched && action.spot === s.secrets.keys) {
        f.keysFound = true;
        give(s, 'nora', 'keys');
        fx.push({ type: 'solved', what: 'keys' });
      } else {
        fx.push({ type: 'wrong', actor, what: 'keys' });
      }
      break;
    }
    case 'hunt/caught': {
      if (!f.keysFound || f.huntSurvived) return no('no hunt');
      fx.push({ type: 'scare', actor, kind: 'caught' });
      break;
    }
    case 'hunt/survived': {
      if (!f.keysFound) return no('no hunt');
      f.huntSurvived = true;
      fx.push({ type: 'solved', what: 'hunt' });
      break;
    }
    case 'mirror/turned': {
      if (!f.huntSurvived || f.mirrorDone) return no('no mirror');
      fx.push({ type: 'scare', actor, kind: 'mirror' });
      break;
    }
    case 'mirror/endured': {
      if (!f.huntSurvived || f.mirrorDone) return no('no mirror');
      f.mirrorDone = true;
      s.act = 3;
      fx.push({ type: 'solved', what: 'mirror' }, { type: 'act', act: 3 });
      break;
    }

    // --- Act 3 -------------------------------------------------------------------------------
    case 'basement/unbolt': {
      if (s.act < 3) return no('rusted shut');
      f.basementOpen = true;
      break;
    }
    case 'flood/start': {
      if (s.act < 3 || f.floodStarted || f.valvesDone) return no('not now');
      f.floodStarted = true;
      s.valvesClosed = [];
      break;
    }
    case 'valve/close': {
      if (!f.floodStarted || f.valvesDone) return no('no flood');
      if (s.valvesClosed.includes(action.color)) return no('already closed');
      if (action.color === s.secrets.valves[s.valvesClosed.length]) {
        s.valvesClosed.push(action.color);
        if (s.valvesClosed.length === 4) {
          f.valvesDone = true;
          fx.push({ type: 'solved', what: 'valves' });
        }
      } else {
        s.valvesClosed = [];
        fx.push({ type: 'surge' });
      }
      break;
    }
    case 'flood/drowned': {
      if (!f.floodStarted || f.valvesDone) return no('no flood');
      // The night loops back to the start of the act.
      f.floodStarted = false;
      s.valvesClosed = [];
      s.loop++;
      fx.push({ type: 'drowned' }, { type: 'loop', loop: s.loop });
      break;
    }
    case 'door/climax': {
      if (!f.valvesDone || f.climax) return no('not yet');
      f.climax = true;
      break;
    }
    case 'board/set': {
      if (!f.climax || s.ending) return no('no board');
      if (boardOwner(action.slot) !== actor) return no('not your half');
      if (s.board.locked[actor]) return no('locked in');
      if (!validBoardValue(action.slot, action.value)) return no('bad value');
      if (action.slot.startsWith('where.')) {
        const m = action.slot.slice(6) as Member;
        if (action.value === null) delete s.board.where[m];
        else s.board.where[m] = action.value as Place;
      } else if (action.slot === 'what') s.board.what = action.value as What | null;
      else if (action.slot === 'who') s.board.who = action.value as Member | null;
      else s.board.why = action.value as Why | null;
      break;
    }
    case 'board/lock': {
      if (!f.climax || s.ending) return no('no board');
      s.board.locked[actor] = action.locked;
      if (s.board.locked.nora && s.board.locked.sam) {
        if (!boardComplete(s.board)) {
          s.board.locked = { nora: false, sam: false };
          fx.push({ type: 'wrong', actor, what: 'board' });
          break;
        }
        if (choseTheLie(s.board)) {
          s.ending = 'lie';
          s.act = 4;
          fx.push({ type: 'act', act: 4 });
          break;
        }
        const correct = countCorrect(s.board);
        if (correct === 7) {
          s.board.confirmed = 7;
          fx.push({ type: 'boardResult', correct, confirmed: 7 });
          fx.push({ type: 'solved', what: 'board' });
        } else {
          // Confirmed only in groups of three; a wrong night loops and the house gets worse.
          s.board.confirmed = Math.max(s.board.confirmed, Math.floor(correct / 3) * 3);
          s.board.locked = { nora: false, sam: false };
          s.loop++;
          fx.push(
            { type: 'boardResult', correct, confirmed: s.board.confirmed },
            { type: 'scare', actor, kind: 'board' },
            { type: 'loop', loop: s.loop },
          );
        }
      }
      break;
    }
    case 'ending/unbolt': {
      if (s.board.confirmed !== 7 || s.ending) return no('not yet');
      f.unbolted = true;
      s.ending = 'truth';
      s.act = 4;
      fx.push({ type: 'act', act: 4 });
      break;
    }
    case 'game/restart': {
      // The truth ends the night. The lie starts it again, worse.
      const loop = s.ending === 'lie' ? s.loop + 1 : 0;
      const next = initialState(s.seed + 1, loop);
      next.v = s.v + 1;
      next.online = s.online;
      return {
        state: next,
        fx: [
          { type: 'act', act: 1 },
          { type: 'loop', loop },
        ],
      };
    }
  }

  s.v = prev.v + 1;
  return { state: s, fx };
}

/** The colours a valve close-up needs, in a stable order. */
export const VALVE_COLORS: Color[] = COLORS;
