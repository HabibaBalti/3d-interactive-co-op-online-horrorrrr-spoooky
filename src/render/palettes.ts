import { Color } from 'three';
import type { Timeline } from '../../shared/types';

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
  wallpaperBase: string;
  wallpaperPattern: string;
  trim: Color;
  floor: Color;
  ceiling: Color;
  wood: Color;
  ink: Color;
  /** The single saturated accent colour allowed on screen (crayon red). */
  accent: Color;
  shadowTint: Color;
  highlightTint: Color;
  saturation: number;
  /** 0 = clean wallpaper, 1 = fully rotten. */
  decay: number;
}

export const PALETTES: Record<Timeline, TimelinePalette> = {
  // A memory: warm amber lamps, slightly over-saturated, indigo creeping into the shadows.
  '1994': {
    background: new Color('#0b0710'),
    fog: new Color('#1a1018'),
    fogDensity: 0.075,
    ambient: new Color('#3a2a40'),
    ambientIntensity: 0.35,
    wallpaperBase: '#9c8462',
    wallpaperPattern: '#5e3f2c',
    trim: new Color('#3b2416'),
    floor: new Color('#5a3a22'),
    ceiling: new Color('#4a3a30'),
    wood: new Color('#4a2a18'),
    ink: new Color('#07040c'),
    accent: new Color('#b3121c'),
    shadowTint: new Color(0.75, 0.78, 1.15),
    highlightTint: new Color(1.1, 1.0, 0.86),
    saturation: 1.08,
    decay: 0,
  },
  // Decades later: cold teal-green, drained of colour, mould and water.
  present: {
    background: new Color('#03080a'),
    fog: new Color('#1b3433'),
    fogDensity: 0.07,
    ambient: new Color('#3a6060'),
    ambientIntensity: 0.55,
    wallpaperBase: '#5d6b5c',
    wallpaperPattern: '#3a4a40',
    trim: new Color('#1e2624'),
    floor: new Color('#2c2e28'),
    ceiling: new Color('#2a3330'),
    wood: new Color('#2a2a24'),
    ink: new Color('#010406'),
    accent: new Color('#8a1a1a'),
    shadowTint: new Color(0.7, 1.0, 0.95),
    highlightTint: new Color(0.85, 1.05, 1.1),
    saturation: 0.55,
    decay: 1,
  },
};
