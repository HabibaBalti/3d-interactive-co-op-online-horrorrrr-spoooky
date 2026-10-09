import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/**
 * Procedural greybox textures drawn on canvases. They stand in for painted textures until the
 * asset pass, and are seeded so both timelines get the "same" object with different wear.
 */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, repeat = false): CanvasTexture {
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function stain(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.7, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Striped floral wallpaper; `decay` adds water stains, mould and peeled patches. */
export function wallpaperTexture(base: string, pattern: string, decay: number): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size);
  const rand = seeded(7);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = pattern;
  for (let x = 0; x < size; x += 32) ctx.fillRect(x, 0, 3, size);
  for (let y = 16; y < size; y += 48) {
    for (let x = 16; x < size; x += 32) {
      // small four-petal motif
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 1.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  if (decay > 0) {
    // Tide lines from water rising up the walls.
    ctx.fillStyle = 'rgba(40,50,35,0.55)';
    ctx.fillRect(0, size * 0.78, size, size * 0.22);
    ctx.strokeStyle = 'rgba(30,25,15,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 8) ctx.lineTo(x, size * 0.78 + Math.sin(x * 0.15) * 3);
    ctx.stroke();
    for (let i = 0; i < 14 * decay; i++) {
      stain(ctx, rand() * size, rand() * size, 10 + rand() * 30, 'rgba(25,40,25,0.35)');
    }
    // Peeled patches showing bare plaster.
    ctx.fillStyle = 'rgba(150,150,130,0.5)';
    for (let i = 0; i < 4 * decay; i++) {
      ctx.beginPath();
      const x = rand() * size;
      const y = rand() * size;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) ctx.lineTo(x + rand() * 30 - 5, y + rand() * 24 - 5);
      ctx.fill();
    }
  }
  return finish(c, true);
}

/**
 * Kid Sam's crayon drawing: a long-haired girl going down stairs toward a door,
 * blue scribbles rising over everything. `age` yellows and water-damages the paper.
 */
export function childDrawingTexture(age: number): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size);
  const rand = seeded(1994);
  ctx.fillStyle = age > 0 ? '#c9bd94' : '#f2ede0';
  ctx.fillRect(0, 0, size, size);

  const crayon = (color: string, pts: [number, number][], width = 3) => {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 3; pass++) {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = x + (rand() - 0.5) * 3;
        const jy = y + (rand() - 0.5) * 3;
        if (i === 0) ctx.moveTo(jx, jy);
        else ctx.lineTo(jx, jy);
      });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // Stairs going down to the right.
  const stairs: [number, number][] = [[30, 70]];
  for (let i = 0; i < 6; i++) {
    const [x, y] = stairs[stairs.length - 1]!;
    stairs.push([x + 24, y], [x + 24, y + 22]);
  }
  crayon('#4a3020', stairs, 4);
  // The door at the bottom, with a bolt.
  crayon(
    '#3a2a1a',
    [
      [185, 200],
      [185, 120],
      [228, 120],
      [228, 200],
    ],
    4,
  );
  crayon(
    '#222',
    [
      [178, 160],
      [196, 160],
    ],
    5,
  );
  // The girl: red dress, long black hair.
  crayon(
    '#b3121c',
    [
      [70, 86],
      [60, 120],
      [84, 120],
      [70, 86],
    ],
    5,
  );
  crayon(
    '#111',
    [
      [64, 72],
      [60, 100],
    ],
    4,
  );
  crayon(
    '#111',
    [
      [76, 72],
      [80, 100],
    ],
    4,
  );
  crayon(
    '#e0b090',
    [
      [70, 70],
      [70, 76],
    ],
    9,
  );
  crayon(
    '#111',
    [
      [66, 120],
      [64, 136],
    ],
    3,
  );
  crayon(
    '#111',
    [
      [76, 120],
      [78, 136],
    ],
    3,
  );
  // Blue water scribbles covering the bottom.
  for (let i = 0; i < 26; i++) {
    const y = 255 - rand() * (90 + age * 50);
    crayon(
      '#1f3fa8',
      [
        [rand() * 30, y],
        [128 + rand() * 128, y + (rand() - 0.5) * 30],
      ],
      6,
    );
  }
  if (age > 0) {
    for (let i = 0; i < 6; i++) {
      stain(ctx, rand() * size, rand() * size, 20 + rand() * 40, 'rgba(90,70,30,0.3)');
    }
  }
  return finish(c);
}

/** Clock dial with plain tick marks; the hands are separate meshes. */
export function clockFaceTexture(aged: boolean): CanvasTexture {
  const size = 256;
  const [c, ctx] = canvas(size);
  ctx.fillStyle = aged ? '#8f8a70' : '#e8dcc0';
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a120c';
  ctx.lineWidth = 6;
  ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = i % 5 === 0 ? 96 : 108;
    ctx.lineWidth = i % 5 === 0 ? 6 : 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0);
    ctx.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116);
    ctx.stroke();
  }
  if (aged) {
    // A crack across the glass.
    ctx.strokeStyle = 'rgba(20,20,20,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 60);
    ctx.lineTo(110, 130);
    ctx.lineTo(150, 128);
    ctx.lineTo(220, 200);
    ctx.stroke();
  }
  return finish(c);
}

/** Soft mould/water blotch with alpha, for decals on walls and ceilings. */
export function blotchTexture(seed: number): CanvasTexture {
  const size = 128;
  const [c, ctx] = canvas(size);
  const rand = seeded(seed);
  for (let i = 0; i < 18; i++) {
    stain(ctx, 30 + rand() * 68, 30 + rand() * 68, 10 + rand() * 28, 'rgba(10,22,14,0.35)');
  }
  return finish(c);
}
