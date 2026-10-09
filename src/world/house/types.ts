import type { Character, Timeline } from '../../../shared/types';

/** Every look a surface can have; resolved per timeline by the material library. */
export type SurfaceKey =
  | 'wallpaper'
  | 'floor'
  | 'tile'
  | 'concrete'
  | 'ceiling'
  | 'trim'
  | 'wood'
  | 'woodDark'
  | 'fabric'
  | 'fabricDark'
  | 'metal'
  | 'white'
  | 'sheet'
  | 'photo'
  | 'rug'
  | 'black'
  | 'lampOn'
  | 'screen'
  | 'valveRed'
  | 'valveBlue'
  | 'valveYellow'
  | 'valveGreen';

/** [minX, minZ, maxX, maxZ] in metres. */
export type Rect = [number, number, number, number];
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface DoorSpec {
  id: string;
  /** Which end of the opening the hinge is on, along the wall's from→to direction. */
  hinge: 'start' | 'end';
  /** +1 or -1: which way the door swings open. */
  swing: 1 | -1;
  locked?: boolean;
  /** A slide bolt on one face of the door (+1 = the +x/+z side of the wall). */
  bolt?: { side: 1 | -1; bolted: Partial<Record<Timeline, boolean>> };
  /** Initial open angle in radians, per timeline. */
  open?: Partial<Record<Timeline, number>>;
}

export interface Opening {
  /** Centre of the opening, as a distance from the wall's `from` point. */
  at: number;
  width: number;
  /** Bottom and top of the opening, relative to the wall's base. */
  y0: number;
  y1: number;
  kind: 'door' | 'arch' | 'window';
  door?: DoorSpec;
}

/** An axis-aligned wall from `from` to `to` (one coordinate must match). */
export interface WallSpec {
  from: Vec2;
  to: Vec2;
  y0: number;
  y1: number;
  surface: SurfaceKey;
  openings?: Opening[];
  skirting?: boolean;
}

/** A floor slab: walkable top at `y`, 0.3 m thick. */
export interface FloorSpec {
  room: string;
  rect: Rect;
  y: number;
  surface: SurfaceKey;
}

export interface RampSpec {
  room: string;
  rect: Rect;
  axis: 'x' | 'z';
  /** Height at the min edge of `axis`, then at the max edge. */
  y0: number;
  y1: number;
  steps: number;
}

export interface CeilingSpec {
  rect: Rect;
  /** Underside height. */
  y: number;
  surface: SurfaceKey;
}

export type PropKind =
  | 'clock'
  | 'drawing'
  | 'sideTable'
  | 'tableLamp'
  | 'floorLamp'
  | 'pendant'
  | 'bulb'
  | 'frame'
  | 'rug'
  | 'sofa'
  | 'armchair'
  | 'coffeeTable'
  | 'tv'
  | 'piano'
  | 'desk'
  | 'chair'
  | 'bookshelf'
  | 'diningTable'
  | 'plates'
  | 'sideboard'
  | 'counter'
  | 'fridge'
  | 'kitchenTable'
  | 'radio'
  | 'jar'
  | 'boiler'
  | 'pipes'
  | 'shelf'
  | 'washer'
  | 'boxes'
  | 'debris'
  | 'walkie'
  | 'musicBox'
  | 'answeringMachine';

export interface PropPlacement {
  pos: Vec3;
  /** Degrees about Y. 0 = the prop's front faces +z. */
  rotY?: number;
  /** Small tilt in degrees about X and Z, for knocked-over things. */
  tilt?: Vec2;
  /** Hide it under a dust sheet. */
  sheet?: boolean;
}

export interface PropSpec extends PropPlacement {
  kind: PropKind;
  /** Stable id for puzzles, flags and wrongness events. */
  id?: string;
  args?: Record<string, number>;
  /** Only exists in this timeline. */
  only?: Timeline;
  /** How decades changed it: gone, or moved/tilted/sheeted. */
  present?: 'missing' | Partial<PropPlacement>;
  /** Default true. */
  collide?: boolean;
}

export interface LightSpec {
  pos: Vec3;
  color: string;
  intensity: number;
  distance: number;
  timeline: Timeline;
  /** 0 = steady, 1 = old lamp, 2 = television. */
  flicker?: number;
  castShadow?: boolean;
}

export interface PuddleSpec {
  pos: Vec3;
  size: Vec2;
}

export interface Spawn {
  pos: Vec3;
  /** Degrees; 0 looks toward -z. */
  yaw: number;
}

/** Where off-screen sounds come from. */
export interface SoundSpots {
  /** Footsteps overhead walk between these two points (upstairs is not built yet). */
  upstairs: [Vec3, Vec3];
  /** Where the humming comes from in each timeline. */
  hum: Record<Timeline, Vec3>;
  /** House interior bounds for random creaks: [minX, minZ, maxX, maxZ]. */
  bounds: Rect;
}

export interface HouseLayout {
  walls: WallSpec[];
  floors: FloorSpec[];
  ramps: RampSpec[];
  ceilings: CeilingSpec[];
  props: PropSpec[];
  lights: LightSpec[];
  puddles: PuddleSpec[];
  spawns: Record<Character, Spawn>;
  sounds: SoundSpots;
}
