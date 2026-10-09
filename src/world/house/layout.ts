import type { HouseLayout, Opening, DoorSpec } from './types';

/**
 * The Hale house: ground floor and basement (upstairs comes later).
 * x runs west → east, z runs north → south, y is up. The front door is on the south wall.
 *
 *  z=-6 ┌──────────────┬──┬──┬──────────────┐
 *       │   KITCHEN    │▼ │  │    STUDY     │   ▼ basement stairs (enclosed, bolted door)
 *       │              │▼ │  ├┐             │   ▲ stairs up (enclosed, locked door)
 *  z=-1 │            ──┴──┘  ├┘─────  ──────┤
 *  z= 1 ├─────  ─────    HALL▲│  LIVING     │
 *       │   DINING           ▲│             │
 *       │                     │             │
 *  z=6  └──────────────┴─[front]─┴──────────┘
 *     x=-7          -1.5     1.5            7
 *
 * Basement: x -7..3, z -6..3, floor y = -3, split into a boiler room (west) and storage (east).
 */

const GROUND = 0;
const CEIL = 2.7;
const BASEMENT = -3;

const window_ = (at: number, width = 1.2): Opening => ({
  at,
  width,
  y0: 0.9,
  y1: 2.1,
  kind: 'window',
});
const door = (at: number, spec: DoorSpec, width = 0.9): Opening => ({
  at,
  width,
  y0: 0,
  y1: 2.1,
  kind: 'door',
  door: spec,
});
const arch = (at: number, width = 1.6): Opening => ({ at, width, y0: 0, y1: 2.2, kind: 'arch' });
const basementWindow = (at: number): Opening => ({
  at,
  width: 0.8,
  y0: 2.1,
  y1: 2.6,
  kind: 'window',
});

const wall = { y0: GROUND, y1: CEIL, surface: 'wallpaper', skirting: true } as const;
const cellar = { y0: BASEMENT, y1: GROUND, surface: 'concrete' } as const;

export const HOUSE: HouseLayout = {
  walls: [
    // Exterior
    { ...wall, from: [-7, -6], to: [7, -6], openings: [window_(2.75), window_(12.75, 1.0)] },
    {
      ...wall,
      from: [-7, 6],
      to: [7, 6],
      openings: [
        window_(2.75),
        door(7, { id: 'front', hinge: 'start', swing: -1, locked: true }, 1.0),
        window_(11.25),
      ],
    },
    { ...wall, from: [-7, -6], to: [-7, 6], openings: [window_(3), window_(9.5)] },
    { ...wall, from: [7, -6], to: [7, 6], openings: [window_(2.5), window_(10.5)] },
    // Hall
    {
      ...wall,
      from: [-1.5, -6],
      to: [-1.5, 6],
      openings: [
        door(6, { id: 'kitchen', hinge: 'start', swing: -1 }),
        door(10.2, { id: 'dining', hinge: 'end', swing: 1, open: { present: 1.2 } }),
      ],
    },
    {
      ...wall,
      from: [1.5, -6],
      to: [1.5, 6],
      openings: [door(2, { id: 'study', hinge: 'start', swing: 1 }), arch(10.5, 1.2)],
    },
    // Kitchen / dining and study / living
    { ...wall, from: [-7, 1], to: [-1.5, 1], openings: [arch(2.75)] },
    { ...wall, from: [1.5, -1], to: [7, -1], openings: [arch(2.75)] },
    // Enclosed stairs up (out of scope for now: locked)
    { ...wall, from: [0.5, -1], to: [0.5, 3] },
    {
      ...wall,
      from: [0.5, 3],
      to: [1.5, 3],
      openings: [door(0.5, { id: 'upstairs', hinge: 'start', swing: 1, locked: true }, 0.8)],
    },
    { ...wall, from: [0.5, -1], to: [1.5, -1] },
    // Enclosed basement stairs. The bolt is on the hall side, so it can only be slid from there.
    {
      ...wall,
      from: [-0.5, -6],
      to: [-0.5, -1],
      openings: [
        door(0.5, {
          id: 'basement',
          hinge: 'start',
          swing: 1,
          bolt: { side: 1, bolted: { present: true } },
        }),
      ],
    },
    { ...cellar, from: [-0.5, -6], to: [-0.5, -1] },
    { ...wall, from: [-1.5, -1], to: [-0.5, -1] },
    // Basement
    { ...cellar, from: [-7, -6], to: [3, -6], openings: [basementWindow(2), basementWindow(7)] },
    { ...cellar, from: [-7, 3], to: [3, 3] },
    { ...cellar, from: [-7, -6], to: [-7, 3], openings: [basementWindow(4)] },
    { ...cellar, from: [3, -6], to: [3, 3] },
    { ...cellar, from: [-1.5, -6], to: [-1.5, -1] },
    { ...cellar, from: [-3.5, -6], to: [-3.5, 3], openings: [{ ...arch(6.5, 1.2), y1: 2.1 }] },
  ],

  floors: [
    { room: 'kitchen', rect: [-7, -6, -1.5, 1], y: GROUND, surface: 'tile' },
    { room: 'dining', rect: [-7, 1, -1.5, 6], y: GROUND, surface: 'floor' },
    { room: 'living', rect: [1.5, -1, 7, 6], y: GROUND, surface: 'floor' },
    { room: 'study', rect: [1.5, -6, 7, -1], y: GROUND, surface: 'floor' },
    { room: 'hall', rect: [-0.5, -6, 1.5, 6], y: GROUND, surface: 'floor' },
    { room: 'hall', rect: [-1.5, -1, -0.5, 6], y: GROUND, surface: 'floor' },
    { room: 'basementStairs', rect: [-1.5, -6, -0.5, -5], y: GROUND, surface: 'floor' },
    { room: 'boiler', rect: [-7, -6, -3.5, 3], y: BASEMENT, surface: 'concrete' },
    { room: 'storage', rect: [-3.5, -6, 3, 3], y: BASEMENT, surface: 'concrete' },
  ],

  ramps: [
    {
      room: 'basementStairs',
      rect: [-1.5, -5, -0.5, -1],
      axis: 'z',
      y0: GROUND,
      y1: BASEMENT,
      steps: 14,
    },
  ],

  ceilings: [
    { rect: [-7, -6, 7, 6], y: CEIL, surface: 'ceiling' },
    // Basement ceiling, around the stairwell opening.
    { rect: [-7, -6, -1.5, 3], y: -0.32, surface: 'woodDark' },
    { rect: [-0.5, -6, 3, 3], y: -0.32, surface: 'woodDark' },
    { rect: [-1.5, -1, -0.5, 3], y: -0.32, surface: 'woodDark' },
  ],

  props: [
    // Hall
    { kind: 'clock', id: 'clock', pos: [1.25, 0, -2.3], rotY: 270 },
    { kind: 'sideTable', pos: [-1.2, 0, 5.3], rotY: 90 },
    {
      kind: 'tableLamp',
      pos: [-1.2, 0.75, 5.3],
      collide: false,
      present: { pos: [-0.9, 0, 4.9], tilt: [80, 20] },
    },
    {
      kind: 'rug',
      pos: [-0.5, 0, 2.2],
      args: { w: 0.9, d: 5 },
      collide: false,
      present: 'missing',
    },
    { kind: 'frame', id: 'photo-1', pos: [-1.42, 1.55, 1.3], rotY: 90, collide: false },
    {
      kind: 'frame',
      id: 'photo-2',
      pos: [-1.42, 1.35, 1.9],
      rotY: 90,
      args: { w: 0.4, h: 0.3 },
      collide: false,
    },
    { kind: 'frame', id: 'photo-3', pos: [-1.42, 1.65, 2.5], rotY: 90, collide: false },
    {
      kind: 'frame',
      id: 'photo-4',
      pos: [-1.42, 1.4, 3.1],
      rotY: 90,
      args: { w: 0.25, h: 0.3 },
      collide: false,
      present: { tilt: [0, 14] },
    },
    { kind: 'drawing', id: 'drawing-stairs', pos: [0.42, 1.2, 1.2], rotY: 270, collide: false },
    // Living room
    { kind: 'rug', pos: [4.6, 0, 2.2], args: { w: 2.4, d: 3 }, collide: false },
    { kind: 'sofa', pos: [3.3, 0, 2.2], rotY: 90, present: { sheet: true } },
    { kind: 'coffeeTable', pos: [4.6, 0, 2.2], present: { pos: [4.9, 0, 1.6], rotY: 20 } },
    { kind: 'tv', id: 'tv', pos: [6.6, 0, 1.5], rotY: 270 },
    {
      kind: 'armchair',
      pos: [4.6, 0, 4.9],
      rotY: 180,
      present: { pos: [5.2, 0, 5.0], rotY: 140, tilt: [-80, 0] },
    },
    { kind: 'floorLamp', pos: [6.4, 0, 5.4], collide: false, present: 'missing' },
    { kind: 'debris', pos: [3.6, 0, 0.3], only: 'present' },
    // Study
    { kind: 'piano', id: 'piano', pos: [3.2, 0, -5.55], present: { sheet: true } },
    { kind: 'desk', pos: [6.55, 0, -3.0], rotY: 270 },
    { kind: 'tableLamp', pos: [6.6, 0.75, -2.5], collide: false, present: 'missing' },
    {
      kind: 'chair',
      pos: [5.95, 0, -3.0],
      rotY: 90,
      present: { pos: [5.6, 0, -2.4], rotY: 50, tilt: [0, -85] },
    },
    { kind: 'bookshelf', pos: [1.75, 0, -2.0], rotY: 90 },
    // Dining room: four places for four people
    { kind: 'diningTable', id: 'dining-table', pos: [-4.25, 0, 3.6], present: { sheet: true } },
    {
      kind: 'plates',
      id: 'plates',
      pos: [-4.25, 0.76, 3.6],
      args: { count: 4 },
      collide: false,
      present: 'missing',
    },
    { kind: 'chair', pos: [-4.25, 0, 2.35], rotY: 0 },
    { kind: 'chair', pos: [-4.25, 0, 4.85], rotY: 180, present: 'missing' },
    {
      kind: 'chair',
      pos: [-5.15, 0, 3.6],
      rotY: 90,
      present: { pos: [-5.6, 0, 4.4], rotY: 30, tilt: [85, 0] },
    },
    { kind: 'chair', pos: [-3.35, 0, 3.6], rotY: 270 },
    { kind: 'sideboard', pos: [-6.7, 0, 3.6], rotY: 90, present: { sheet: true } },
    { kind: 'pendant', pos: [-4.25, 2.7, 3.6], collide: false },
    // Kitchen
    { kind: 'counter', pos: [-4.25, 0, -5.6], args: { w: 4 } },
    { kind: 'counter', pos: [-6.6, 0, -3.0], rotY: 90, args: { w: 2 } },
    { kind: 'fridge', pos: [-6.55, 0, -5.55], present: { rotY: 10 } },
    { kind: 'kitchenTable', pos: [-3.9, 0, -2.0] },
    { kind: 'chair', pos: [-3.9, 0, -1.2], rotY: 180 },
    { kind: 'chair', pos: [-3.0, 0, -2.0], rotY: 270, present: 'missing' },
    { kind: 'radio', id: 'radio', pos: [-2.7, 0.9, -5.6], collide: false },
    { kind: 'jar', id: 'cookie-jar', pos: [-3.2, 0.9, -5.65], collide: false },
    // Basement
    { kind: 'boiler', pos: [-6.2, -3, -5.2] },
    { kind: 'pipes', id: 'valves', pos: [-5.25, -3, -5.8], args: { w: 3.2 } },
    { kind: 'shelf', pos: [2.65, -3, -2.5], rotY: 270 },
    { kind: 'shelf', pos: [2.65, -3, 1.0], rotY: 270, present: { tilt: [0, 8] } },
    { kind: 'washer', pos: [-3.0, -3, 2.55], rotY: 180 },
    { kind: 'boxes', pos: [1.2, -3, 2.4] },
    { kind: 'boxes', pos: [-6.2, -3, 2.2], rotY: 90 },
    { kind: 'bulb', pos: [-0.5, -0.3, 1.0], collide: false },
    { kind: 'bulb', pos: [-5.25, -0.3, -2.0], collide: false },
  ],

  lights: [
    {
      timeline: '1994',
      pos: [-1.2, 1.15, 5.3],
      color: '#ffc070',
      intensity: 5,
      distance: 7,
      flicker: 1,
      castShadow: true,
    },
    { timeline: '1994', pos: [0.5, 2.4, -3], color: '#ffb060', intensity: 2.5, distance: 7 },
    { timeline: '1994', pos: [6.4, 1.6, 5.4], color: '#ffc070', intensity: 4, distance: 8 },
    {
      timeline: '1994',
      pos: [6.0, 0.9, 1.5],
      color: '#7a9cff',
      intensity: 2.5,
      distance: 5,
      flicker: 2,
    },
    { timeline: '1994', pos: [6.6, 1.1, -2.5], color: '#ffc070', intensity: 3, distance: 6 },
    { timeline: '1994', pos: [-4.25, 2.0, 3.6], color: '#ffb868', intensity: 4, distance: 7 },
    { timeline: '1994', pos: [-4.25, 2.4, -2.5], color: '#fff0c8', intensity: 3, distance: 8 },
    {
      timeline: '1994',
      pos: [-1.5, -0.7, 0.5],
      color: '#ffd090',
      intensity: 3,
      distance: 8,
      flicker: 1,
    },
    { timeline: '1994', pos: [-5.25, -0.7, -2], color: '#ffd090', intensity: 2.5, distance: 7 },
  ],

  puddles: [
    { pos: [0.4, 0, -3.6], size: [1.6, 2.4] },
    { pos: [4.0, 0, 0.6], size: [2.2, 1.6] },
    { pos: [-3.2, 0, -4.0], size: [1.6, 1.2] },
    { pos: [-2.0, -3, -0.5], size: [7, 5] },
  ],

  spawns: {
    nora: { pos: [-0.5, 0, 5.2], yaw: 0 },
    sam: { pos: [-0.5, 0, 5.2], yaw: 0 },
  },

  sounds: {
    upstairs: [
      [-4, 3.6, -3],
      [4, 3.6, 3],
    ],
    // 1994: Ruth humming upstairs. Present: the same song, from the basement.
    hum: { '1994': [2, 3.8, -2], present: [-2.5, -2.2, -2] },
    bounds: [-6.5, -5.5, 6.5, 5.5],
  },
};
