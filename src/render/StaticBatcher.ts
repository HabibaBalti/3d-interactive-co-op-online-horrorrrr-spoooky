import {
  type BufferGeometry,
  type Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  type Matrix4,
  Mesh,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SURFACE_TILE, type MaterialLibrary } from './materials/library';
import type { SurfaceKey } from '../world/house/types';

/**
 * Collects static geometry and merges it into one mesh per surface plus one ink-line mesh,
 * so a whole house costs a couple of dozen draw calls. Textured surfaces get world-space UVs
 * so patterns line up across separate boxes at a constant scale.
 */
export class StaticBatcher {
  private readonly bySurface = new Map<SurfaceKey, BufferGeometry[]>();
  private readonly edges: BufferGeometry[] = [];

  add(geometry: BufferGeometry, matrix: Matrix4, surface: SurfaceKey, ink = true): void {
    const g = geometry.clone().applyMatrix4(matrix);
    const tile = SURFACE_TILE[surface];
    if (tile) worldUVs(g, tile);
    let list = this.bySurface.get(surface);
    if (!list) this.bySurface.set(surface, (list = []));
    list.push(g);
    if (ink) this.edges.push(new EdgesGeometry(geometry, 28).applyMatrix4(matrix));
    geometry.dispose();
  }

  build(materials: MaterialLibrary, ink: Color, shadows: boolean): Group {
    const group = new Group();
    group.name = 'static';
    for (const [surface, geos] of this.bySurface) {
      const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
      geos.forEach((g) => g.dispose());
      const mesh = new Mesh(merged, materials[surface]);
      mesh.name = `static:${surface}`;
      mesh.castShadow = mesh.receiveShadow = shadows;
      group.add(mesh);
    }
    if (this.edges.length) {
      const lines = new LineSegments(
        mergeGeometries(this.edges),
        new LineBasicMaterial({ color: ink, transparent: true, opacity: 0.75 }),
      );
      lines.raycast = () => {};
      this.edges.forEach((g) => g.dispose());
      group.add(lines);
    }
    this.bySurface.clear();
    this.edges.length = 0;
    return group;
  }
}

/** Planar UVs from world position, picking the plane from each vertex normal. */
function worldUVs(g: BufferGeometry, tile: number): void {
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const uv = g.getAttribute('uv');
  if (!uv) return;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u: number;
    let v: number;
    if (ny >= nx && ny >= nz) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else if (nx >= nz) {
      u = pos.getZ(i);
      v = pos.getY(i);
    } else {
      u = pos.getX(i);
      v = pos.getY(i);
    }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
}
