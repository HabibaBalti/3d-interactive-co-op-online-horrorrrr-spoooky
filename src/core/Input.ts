/** Minimal input for M0: normalized pointer position and single-key callbacks. */
export class Input {
  /** Pointer position in [-1, 1] on both axes, (0,0) at screen centre. */
  readonly pointer = { x: 0, y: 0 };
  private readonly keyHandlers = new Map<string, () => void>();

  constructor() {
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keyHandlers.get(e.code)?.();
    });
  }

  onKey(code: string, fn: () => void): void {
    this.keyHandlers.set(code, fn);
  }
}
