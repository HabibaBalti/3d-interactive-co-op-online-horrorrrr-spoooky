import { type Material, MeshBasicMaterial, type Texture } from 'three';
import type { TimelinePalette } from '../palettes';
import type { SurfaceKey } from '../../world/house/types';
import { concreteTexture, plankTexture, tileTexture, wallpaperTexture } from '../textures';
import { toonMaterial } from './toon';

/** World-space size (metres) of one texture repeat, for surfaces with a texture. */
export const SURFACE_TILE: Partial<Record<SurfaceKey, number>> = {
  wallpaper: 1.2,
  floor: 2,
  tile: 0.6,
  concrete: 2,
};

/** Surfaces that glow (lit lampshades, a running TV): unlit so lights never darken them. */
const EMISSIVE: SurfaceKey[] = ['lampOn', 'screen'];

export type MaterialLibrary = Record<SurfaceKey, Material>;

export function createMaterialLibrary(p: TimelinePalette): MaterialLibrary {
  const maps: Partial<Record<SurfaceKey, Texture>> = {
    wallpaper: wallpaperTexture(p.wallpaperBase, p.wallpaperPattern, p.decay),
    floor: plankTexture(p.plank, p.decay),
    tile: tileTexture(p.tileA, p.tileB, p.decay),
    concrete: concreteTexture(p.concrete, p.decay),
  };
  const lib = {} as MaterialLibrary;
  for (const key of Object.keys(p.surfaces) as SurfaceKey[]) {
    const color = p.surfaces[key];
    // In the present nothing is powered: emissive surfaces become ordinary dead ones.
    lib[key] =
      EMISSIVE.includes(key) && p.decay === 0
        ? new MeshBasicMaterial({ color })
        : toonMaterial({ color, map: maps[key] ?? null });
  }
  return lib;
}

export function disposeMaterialLibrary(lib: MaterialLibrary): void {
  for (const m of Object.values(lib)) {
    (m as MeshBasicMaterial).map?.dispose();
    m.dispose();
  }
}
