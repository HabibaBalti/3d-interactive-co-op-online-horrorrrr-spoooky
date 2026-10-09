import { type Camera, type Object3D, Raycaster, Vector2 } from 'three';

/** Anything the player can look at and use. Prompts are single words (no reading). */
export interface Interactable {
  /** The word shown under the reticle, or null when it can't be used right now. */
  prompt(): string | null;
  interact(): void;
  /** Called when the player starts or stops looking at it. */
  hover?(on: boolean): void;
}

const CENTRE = new Vector2(0, 0);

/** Visible itself and all the way up (a hidden group hides its children). */
function shown(o: Object3D | null): boolean {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * Look-at interaction: a ray from the centre of the screen picks the nearest object within
 * reach. Walls and furniture are occluders, so you can't use things through them.
 */
export class InteractionSystem {
  private readonly raycaster = new Raycaster();
  private readonly targets: Object3D[] = [];
  private occluders: Object3D[] = [];
  private current: Interactable | null = null;
  reach = 2.2;

  constructor(private readonly camera: Camera) {
    this.raycaster.far = this.reach;
  }

  register(object: Object3D, interactable: Interactable): void {
    object.traverse((o) => (o.userData.interactable = interactable));
    this.targets.push(object);
  }

  setOccluders(objects: Object3D[]): void {
    this.occluders = objects;
  }

  clear(): void {
    this.targets.length = 0;
    this.occluders = [];
    this.setCurrent(null);
  }

  /** Re-picks the target; returns the prompt to show, if any. */
  update(): string | null {
    this.raycaster.far = this.reach;
    this.raycaster.setFromCamera(CENTRE, this.camera);
    const hits = this.raycaster.intersectObjects([...this.occluders, ...this.targets], true);
    const first = hits.find((h) => shown(h.object));
    this.setCurrent((first?.object.userData.interactable as Interactable | undefined) ?? null);
    return this.current?.prompt() ?? null;
  }

  private setCurrent(next: Interactable | null): void {
    if (next === this.current) return;
    this.current?.hover?.(false);
    this.current = next;
    next?.hover?.(true);
  }

  /** Forget the current target (e.g. while a close-up view is open). */
  release(): void {
    this.setCurrent(null);
  }

  use(): void {
    if (this.current?.prompt()) this.current.interact();
  }
}
