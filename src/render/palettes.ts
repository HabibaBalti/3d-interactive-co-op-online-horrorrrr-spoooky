import { Color } from 'three';
import type { Timeline } from '../../shared/types';
import type { SurfaceKey } from '../world/house/types';

/**
 * Every colour a timeline uses lives here, so the look of 1994 vs. the present can be tuned
 * in one place. The split-tone values drive the J-horror grade in the atmosphere pass.
 */
export interface TimelinePalette {
  background: Color;
  fog: Color;
  fogDensity: number;
  ambient: Color;
  ambientIntensity: number;
  /** Cold light through the windows (moon, or the storm sky). */
  moon: Color;
  moonIntensity: number;
  wallpaperBase: string;
  wallpaperPattern: string;
  plank: string;
  tileA: string;
  tileB: string;
  concrete: string;
  /** Night sky behind window glass. */
  sky: Color;
  /** Rain streaks on the glass (0 = none). */
  rain: number;
  ink: Color;
  /** Base colour per surface; textured surfaces use it as a tint. */
  surfaces: Record<SurfaceKey, string>;
  shadowTint: Color;
  highlightTint: Color;
  saturation: number;
  /** 0 = clean, 1 = fully rotten. */
  decay: number;
}

export const PALETTES: Record<Timeline, TimelinePalette> = {
  // A memory: warm amber lamps, slightly over-saturated, indigo creeping into the shadows.
  '1994': {
    background: new Color('#0b0710'),
    fog: new Color('#1a1018'),
    fogDensity: 0.06,
    ambient: new Color('#3a2a40'),
    ambientIntensity: 0.4,
    moon: new Color('#8088d0'),
    moonIntensity: 0.05,
    wallpaperBase: '#9c8462',
    wallpaperPattern: '#5e3f2c',
    plank: '#6a4428',
    tileA: '#c8bca0',
    tileB: '#5a4a3a',
    concrete: '#6a6258',
    sky: new Color('#1c1c34'),
    rain: 1,
    ink: new Color('#07040c'),
    surfaces: {
      wallpaper: '#ffffff',
      floor: '#ffffff',
      tile: '#ffffff',
      concrete: '#ffffff',
      ceiling: '#7a6a58',
      trim: '#3b2416',
      wood: '#6a4228',
      woodDark: '#3a2214',
      fabric: '#6a4a3a',
      fabricDark: '#3a2a30',
      metal: '#5a5a58',
      white: '#c8bca0',
      sheet: '#b8b0a0',
      photo: '#a08a6a',
      rug: '#5a2a28',
      black: '#08060a',
      lampOn: '#ffd49a',
      screen: '#9ab8ff',
      valveRed: '#a3141c',
      valveBlue: '#1f3fa8',
      valveYellow: '#c8a020',
      valveGreen: '#2a7a3a',
    },
    shadowTint: new Color(0.75, 0.78, 1.15),
    highlightTint: new Color(1.1, 1.0, 0.86),
    saturation: 1.08,
    decay: 0,
  },
  // Decades later: cold teal-green, drained of colour, mould and water.
  present: {
    background: new Color('#03080a'),
    fog: new Color('#14292a'),
    fogDensity: 0.07,
    ambient: new Color('#3a6060'),
    ambientIntensity: 0.4,
    moon: new Color('#8fd0d0'),
    moonIntensity: 0.25,
    wallpaperBase: '#5d6b5c',
    wallpaperPattern: '#3a4a40',
    plank: '#34362e',
    tileA: '#6a7068',
    tileB: '#2a302c',
    concrete: '#3a423e',
    sky: new Color('#4a6e6c'),
    rain: 0,
    ink: new Color('#010406'),
    surfaces: {
      wallpaper: '#ffffff',
      floor: '#ffffff',
      tile: '#ffffff',
      concrete: '#ffffff',
      ceiling: '#3a4440',
      trim: '#1e2624',
      wood: '#3a3a30',
      woodDark: '#1e1e1a',
      fabric: '#3a403a',
      fabricDark: '#22262a',
      metal: '#3a4040',
      white: '#7a8078',
      sheet: '#9aa49c',
      photo: '#5a5e50',
      rug: '#2a2422',
      black: '#010406',
      lampOn: '#3a3a32',
      screen: '#0a0e0e',
      valveRed: '#6a1a1a',
      valveBlue: '#1a2a5a',
      valveYellow: '#6a5a20',
      valveGreen: '#1a4a2a',
    },
    shadowTint: new Color(0.7, 1.0, 0.95),
    highlightTint: new Color(0.85, 1.05, 1.1),
    saturation: 0.55,
    decay: 1,
  },
};
