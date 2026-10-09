import { describe, expect, it } from 'vitest';
import { initialState, makeSecrets, reduce } from './reducer';
import { TRUTH } from './board';
import type { Action, GameState } from './types';
import type { Character } from '../types';

function play(steps: [Character, Action][], start = initialState(42)): GameState {
  let s = start;
  for (const [who, a] of steps) {
    const r = reduce(s, who, a);
    if (r.rejected) throw new Error(`${who} ${a.type}: ${r.rejected}`);
    s = r.state;
  }
  return s;
}

function act1(s0: GameState): [Character, Action][] {
  const sec = s0.secrets;
  return [
    ['nora', { type: 'clock/set', h: 3, m: 17 }],
    ['nora', { type: 'item/take', item: 'windKey' }],
    ['nora', { type: 'floor/pry', index: sec.board }],
    ['nora', { type: 'item/take', item: 'rabbit' }],
    ['nora', { type: 'rabbit/leave', spot: 'table' }],
    ['sam', { type: 'item/take', item: 'pianoKey' }],
    ['sam', { type: 'piano/unlock' }],
    ['nora', { type: 'musicbox/wind' }],
    ['sam', { type: 'piano/play', colors: sec.music }],
  ];
}

function act2(s0: GameState): [Character, Action][] {
  const sec = s0.secrets;
  return [
    ['nora', { type: 'photos/hang', order: sec.photos }],
    ['sam', { type: 'item/take', item: 'tape' }],
    ['sam', { type: 'vhs/watched' }],
    ['nora', { type: 'keys/search', spot: sec.keys }],
    ['nora', { type: 'hunt/survived' }],
    ['nora', { type: 'mirror/endured' }],
  ];
}

function act3(s0: GameState): [Character, Action][] {
  const sec = s0.secrets;
  return [
    ['sam', { type: 'basement/unbolt' }],
    ['nora', { type: 'flood/start' }],
    ...sec.valves.map((c) => ['nora', { type: 'valve/close', color: c }] as [Character, Action]),
    ['nora', { type: 'door/climax' }],
  ];
}

function truthBoard(): [Character, Action][] {
  return [
    ...(Object.entries(TRUTH.where).map(([m, p]) => [
      'nora',
      { type: 'board/set', slot: `where.${m}`, value: p },
    ]) as [Character, Action][]),
    ['sam', { type: 'board/set', slot: 'what', value: TRUTH.what }],
    ['sam', { type: 'board/set', slot: 'who', value: TRUTH.who }],
    ['sam', { type: 'board/set', slot: 'why', value: TRUTH.why }],
    ['nora', { type: 'board/lock', locked: true }],
    ['sam', { type: 'board/lock', locked: true }],
  ];
}

describe('game rules', () => {
  it('secrets are deterministic per seed and the photo wall is never already right', () => {
    expect(makeSecrets(7)).toEqual(makeSecrets(7));
    for (let seed = 0; seed < 200; seed++) {
      const p = makeSecrets(seed).photos;
      expect(p.every((v, i) => v === i)).toBe(false);
      expect([...p].sort().join()).toBe('0,1,2,3');
    }
  });

  it('plays the whole night through to the truth', () => {
    const s0 = initialState(42);
    let s = play(act1(s0), s0);
    expect(s.act).toBe(2);
    s = play(act2(s0), s);
    expect(s.act).toBe(3);
    s = play(act3(s0), s);
    expect(s.flags.climax).toBe(true);
    s = play(truthBoard(), s);
    expect(s.board.confirmed).toBe(7);
    s = play([['sam', { type: 'ending/unbolt' }]], s);
    expect(s.ending).toBe('truth');
  });

  it('rejects actions from the wrong player', () => {
    const r = reduce(initialState(1), 'sam', { type: 'clock/set', h: 3, m: 17 });
    expect(r.rejected).toBeTruthy();
  });

  it('a wrong clock time does nothing but report wrong', () => {
    const r = reduce(initialState(1), 'nora', { type: 'clock/set', h: 2, m: 41 });
    expect(r.state.flags.clockSet).toBeFalsy();
    expect(r.fx[0]).toMatchObject({ type: 'wrong', what: 'clock' });
  });

  it('the piano needs the wound music box and the exact sequence', () => {
    const s0 = initialState(3);
    let s = play(act1(s0).slice(0, 7), s0);
    let r = reduce(s, 'sam', { type: 'piano/play', colors: s0.secrets.music });
    expect(r.state.flags.lullaby).toBeFalsy(); // box not wound yet
    s = play([['nora', { type: 'musicbox/wind' }]], s);
    r = reduce(s, 'sam', { type: 'piano/play', colors: [...s0.secrets.music].reverse() });
    if (s0.secrets.music.join() !== [...s0.secrets.music].reverse().join()) {
      expect(r.state.flags.lullaby).toBeFalsy();
    }
  });

  it('keys stay hidden until Sam has watched the tape', () => {
    const s0 = initialState(9);
    let s = play(act1(s0), s0);
    s = play([['nora', { type: 'photos/hang', order: s0.secrets.photos }]], s);
    const r = reduce(s, 'nora', { type: 'keys/search', spot: s0.secrets.keys });
    expect(r.state.flags.keysFound).toBeFalsy();
  });

  it('closing a valve out of order resets the sequence; drowning loops the act', () => {
    const s0 = initialState(11);
    let s = play(
      [
        ...act1(s0),
        ...act2(s0),
        ['sam', { type: 'basement/unbolt' }],
        ['nora', { type: 'flood/start' }],
      ],
      s0,
    );
    const wrong = s0.secrets.valves[1]!;
    s = play([['nora', { type: 'valve/close', color: s0.secrets.valves[0]! }]], s);
    const r = reduce(s, 'nora', {
      type: 'valve/close',
      color: wrong === s0.secrets.valves[1] ? s0.secrets.valves[2]! : wrong,
    });
    expect(r.state.valvesClosed).toEqual([]);
    expect(r.fx).toContainEqual({ type: 'surge' });
    const d = reduce(r.state, 'nora', { type: 'flood/drowned' });
    expect(d.state.loop).toBe(1);
    expect(d.state.flags.floodStarted).toBe(false);
  });

  it('confirms the board only in groups of three, and loops on a wrong night', () => {
    const s0 = initialState(5);
    let s = play([...act1(s0), ...act2(s0), ...act3(s0)], s0);
    // Everything right except two of Sam's answers: 5 correct → 3 confirmed.
    const steps = truthBoard();
    steps.splice(5, 1, ['sam', { type: 'board/set', slot: 'who', value: 'walter' }]);
    steps.splice(6, 1, ['sam', { type: 'board/set', slot: 'why', value: 'shame' }]);
    s = play(steps, s);
    expect(s.board.confirmed).toBe(3);
    expect(s.loop).toBe(1);
    expect(s.board.locked).toEqual({ nora: false, sam: false });
  });

  it('choosing "she ran away" is the lie ending, and restarting loops the night', () => {
    const s0 = initialState(8);
    let s = play([...act1(s0), ...act2(s0), ...act3(s0)], s0);
    const steps = truthBoard();
    steps.splice(4, 1, ['sam', { type: 'board/set', slot: 'what', value: 'ranaway' }]);
    s = play(steps, s);
    expect(s.ending).toBe('lie');
    const r = reduce(s, 'sam', { type: 'game/restart' });
    expect(r.state.act).toBe(1);
    expect(r.state.loop).toBe(s.loop + 1);
  });

  it('players can only edit their own half of the board', () => {
    const s0 = initialState(4);
    const s = play([...act1(s0), ...act2(s0), ...act3(s0)], s0);
    expect(
      reduce(s, 'sam', { type: 'board/set', slot: 'where.ruth', value: 'kitchen' }).rejected,
    ).toBeTruthy();
    expect(
      reduce(s, 'nora', { type: 'board/set', slot: 'what', value: 'bolt' }).rejected,
    ).toBeTruthy();
  });
});
