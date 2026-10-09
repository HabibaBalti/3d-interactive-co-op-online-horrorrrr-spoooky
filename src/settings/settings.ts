export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  quality: Quality;
  postFx: boolean;
  /** Reduces lightning flashes and lamp flicker. */
  photosensitive: boolean;
  /** Multiplier on mouse look speed. */
  mouseSensitivity: number;
  invertY: boolean;
  headBob: boolean;
  /** Master volume, 0..1. */
  volume: number;
}

export interface QualityPreset {
  /** Upper bound on devicePixelRatio. */
  pixelRatioCap: number;
  /** Multiplier on the final pixel ratio; < 1 renders below native resolution. */
  renderScale: number;
  shadows: boolean;
  postFx: boolean;
}

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  low: { pixelRatioCap: 1, renderScale: 0.75, shadows: false, postFx: false },
  medium: { pixelRatioCap: 1.5, renderScale: 1, shadows: false, postFx: true },
  high: { pixelRatioCap: 2, renderScale: 1, shadows: true, postFx: true },
};

const STORAGE_KEY = 'still-here.settings';

export const DEFAULT_SETTINGS: Settings = {
  quality: 'medium',
  postFx: true,
  photosensitive: false,
  mouseSensitivity: 1,
  invertY: false,
  headBob: true,
  volume: 0.8,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    // storage unavailable (private mode, blocked): fall back to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
