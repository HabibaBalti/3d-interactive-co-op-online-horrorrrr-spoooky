/**
 * Keyboard and mouse state. Mouse look uses pointer lock; movement deltas accumulate between
 * frames and are consumed by the player controller.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly keyHandlers = new Map<string, (() => void)[]>();
  private readonly clickHandlers: (() => void)[] = [];
  private readonly lockHandlers: ((locked: boolean) => void)[] = [];
  private dx = 0;
  private dy = 0;
  locked = false;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      this.down.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat) this.keyHandlers.get(e.code)?.forEach((fn) => fn());
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    element.addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) this.clickHandlers.forEach((fn) => fn());
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.element;
      this.dx = this.dy = 0;
      if (!this.locked) this.down.clear();
      this.lockHandlers.forEach((fn) => fn(this.locked));
    });
  }

  isDown(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  /** Mouse movement since the last call, in pixels. */
  consumeMouse(): [number, number] {
    const d: [number, number] = [this.dx, this.dy];
    this.dx = this.dy = 0;
    return d;
  }

  requestLock(): void {
    // Returns a promise in modern browsers (rejects if called too soon after an exit).
    const result = this.element.requestPointerLock() as unknown as Promise<void> | undefined;
    result?.catch?.(() => {});
  }

  onKey(code: string, fn: () => void): () => void {
    const list = this.keyHandlers.get(code) ?? [];
    list.push(fn);
    this.keyHandlers.set(code, list);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  /** Left click while the pointer is locked. */
  onClick(fn: () => void): void {
    this.clickHandlers.push(fn);
  }

  onLockChange(fn: (locked: boolean) => void): void {
    this.lockHandlers.push(fn);
  }
}
