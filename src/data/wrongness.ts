import type { GameState } from '../../shared/game/types';
import type { Timeline } from '../../shared/types';

/**
 * Small changes the house makes while you aren't looking: a plate gone, a door open that was
 * shut, a photo turned to the wall. Each happens once, only when its target is out of view.
 */
export type WrongChange =
  | { kind: 'hideChild'; target: string; index: number }
  | { kind: 'door'; target: string; open: boolean }
  | { kind: 'turn'; target: string; radians: number };

export interface Wrongness {
  id: string;
  timeline: Timeline;
  when: (s: GameState) => boolean;
  change: WrongChange;
}

export const WRONGNESS: Wrongness[] = [
  // Four places at dinner become three.
  {
    id: 'plate-gone',
    timeline: '1994',
    when: (s) => s.act >= 2,
    change: { kind: 'hideChild', target: 'plates', index: 3 },
  },
  {
    id: 'study-door',
    timeline: '1994',
    when: (s) => s.act >= 2,
    change: { kind: 'door', target: 'study', open: true },
  },
  {
    id: 'kitchen-door',
    timeline: '1994',
    when: (s) => !!s.flags.keysFound,
    change: { kind: 'door', target: 'kitchen', open: true },
  },
  {
    id: 'dining-shut',
    timeline: 'present',
    when: (s) => s.act >= 2,
    change: { kind: 'door', target: 'dining', open: false },
  },
  // Mum kept this one facing the wall.
  {
    id: 'photo-turned',
    timeline: 'present',
    when: (s) => s.act >= 2,
    change: { kind: 'turn', target: 'photo-1', radians: Math.PI },
  },
  {
    id: 'clock-turned',
    timeline: 'present',
    when: (s) => s.act >= 3,
    change: { kind: 'turn', target: 'drawing-stairs', radians: 0.6 },
  },
];
