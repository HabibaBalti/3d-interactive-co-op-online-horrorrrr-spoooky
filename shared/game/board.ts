import type { BoardState, Member, Place, What, Why } from './types';

/** What really happened at 3:17. */
export const TRUTH = {
  where: { ruth: 'upstairs', walter: 'living', nora: 'basement', sam: 'hall' } as Record<
    Member,
    Place
  >,
  what: 'bolt' as What,
  who: 'sam' as Member,
  why: 'protect' as Why,
};

export const BOARD_SLOTS = 7;

export function countCorrect(b: BoardState): number {
  let n = 0;
  for (const m of Object.keys(TRUTH.where) as Member[]) {
    if (b.where[m] === TRUTH.where[m]) n++;
  }
  if (b.what === TRUTH.what) n++;
  if (b.who === TRUTH.who) n++;
  if (b.why === TRUTH.why) n++;
  return n;
}

/** Choosing the family's story instead of the truth. */
export function choseTheLie(b: BoardState): boolean {
  return b.what === 'ranaway' || b.why === 'ranaway';
}

export function boardComplete(b: BoardState): boolean {
  return Object.keys(b.where).length === 4 && b.what !== null && b.who !== null && b.why !== null;
}
