import {
  type BufferGeometry,
  type Color,
  DataTexture,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  MeshToonMaterial,
  type MeshToonMaterialParameters,
  type Mesh,
  NearestFilter,
  RedFormat,
} from 'three';

let gradient: DataTexture | null = null;

/** Three hard light bands: the flat, cel-shaded look of a woodblock print. */
function toonGradient(): DataTexture {
  if (!gradient) {
    gradient = new DataTexture(new Uint8Array([28, 96, 190, 255]), 4, 1, RedFormat);
    gradient.minFilter = NearestFilter;
    gradient.magFilter = NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export function toonMaterial(params: MeshToonMaterialParameters): MeshToonMaterial {
  return new MeshToonMaterial({ gradientMap: toonGradient(), ...params });
}

const edgeCache = new WeakMap<BufferGeometry, EdgesGeometry>();
const lineMaterials = new Map<string, LineBasicMaterial>();

/**
 * Adds ink contour lines along a mesh's hard edges. Cheap stand-in for a full outline pass
 * that reads like brush/pen linework on greybox geometry.
 */
export function inkEdges<T extends Mesh>(mesh: T, ink: Color, opacity = 0.85): T {
  let edges = edgeCache.get(mesh.geometry);
  if (!edges) {
    edges = new EdgesGeometry(mesh.geometry, 28);
    edgeCache.set(mesh.geometry, edges);
  }
  const key = `${ink.getHexString()}:${opacity}`;
  let mat = lineMaterials.get(key);
  if (!mat) {
    mat = new LineBasicMaterial({ color: ink, transparent: opacity < 1, opacity });
    lineMaterials.set(key, mat);
  }
  const lines = new LineSegments(edges, mat);
  lines.raycast = () => {};
  mesh.add(lines);
  return mesh;
}
