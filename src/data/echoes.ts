import type { Flag } from '../../shared/game/types';
import type { Timeline } from '../../shared/types';
import type { Line } from '../game/Voice';

type V3 = [number, number, number];

export interface EchoFigure {
  kind: 'adult' | 'child' | 'tall';
  /** Walks from the first point to the last over the echo. */
  path: V3[];
  /** Hums the lullaby while visible. */
  hums?: boolean;
}

/**
 * Memory echoes: short replays of family moments, seen by one sibling. They are how the story
 * is told without words on screen. Nora (1994) sometimes sees moments that haven't happened
 * yet; Sam sees the night itself.
 */
export interface Echo {
  id: string;
  timeline: Timeline;
  /** Plays when this flag first becomes true. */
  when: Flag | 'rabbitLeft';
  figures: EchoFigure[];
  lines: Line[];
  /** Seconds the figures stay. */
  duration: number;
}

export const ECHOES: Echo[] = [
  // --- Act 1 ---
  {
    id: 'counting',
    timeline: '1994',
    when: 'clockSet',
    figures: [
      {
        kind: 'child',
        path: [
          [1.0, 0, 3.5],
          [1.0, 0, 3.4],
          [-0.6, 0, 1.5],
          [-0.3, 0, -4.8],
        ],
      },
    ],
    lines: [
      { who: 'child', text: 'Eight… nine… ten.', pause: 0.8 },
      { who: 'child', text: 'Ready or not, here I come!' },
    ],
    duration: 9,
  },
  {
    id: 'stop-the-clock',
    timeline: 'present',
    when: 'clockSet',
    figures: [
      {
        kind: 'tall',
        path: [
          [0.7, 0, -2.3],
          [0.85, 0, -2.3],
        ],
      },
      {
        kind: 'adult',
        path: [
          [-0.6, 0, -1.2],
          [-0.4, 0, -1.6],
        ],
      },
    ],
    lines: [
      { who: 'ruth', text: 'Make it stop, Walter.', pause: 1 },
      { who: 'walter', text: 'There. It’s stopped. It’s over.' },
    ],
    duration: 8,
  },
  {
    id: 'at-the-door',
    timeline: '1994',
    when: 'boardOpen',
    figures: [
      {
        kind: 'tall',
        path: [
          [0.2, 0, 5.2],
          [0.1, 0, 5.4],
        ],
      },
      {
        kind: 'adult',
        path: [
          [0.1, 0, 5.85],
          [0.1, 0, 5.85],
        ],
      },
    ],
    lines: [
      { who: 'officer', text: 'Kids run off in storms. She’ll turn up.', pause: 1 },
      { who: 'walter', text: 'She’ll turn up.' },
    ],
    duration: 8,
  },
  {
    id: 'secrets',
    timeline: 'present',
    when: 'rabbitLeft',
    figures: [
      {
        kind: 'child',
        path: [
          [-1.0, 0, 4.9],
          [-1.1, 0, 5.1],
        ],
      },
    ],
    lines: [{ who: 'child', text: 'Nora says I can keep my secrets in here.', pause: 0.6 }],
    duration: 6,
  },
  {
    id: 'stranger-at-the-piano',
    timeline: '1994',
    when: 'lullaby',
    figures: [
      {
        kind: 'adult',
        path: [
          [3.2, 0, -4.6],
          [3.2, 0, -4.6],
        ],
      },
    ],
    lines: [],
    duration: 10,
  },
  {
    id: 'humming-on-the-stairs',
    timeline: 'present',
    when: 'lullaby',
    figures: [
      {
        kind: 'adult',
        path: [
          [0.9, 0, 3.4],
          [0.9, 0, 3.4],
        ],
        hums: true,
      },
      {
        kind: 'child',
        path: [
          [0.6, 0, 3.6],
          [0.6, 0, 3.6],
        ],
      },
    ],
    lines: [],
    duration: 14,
  },
];
