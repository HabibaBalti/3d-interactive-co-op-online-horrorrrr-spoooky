import { CanvasTexture, SRGBColorSpace } from 'three';
import type { HideSpot, KeySpot, Member } from '../../shared/game/types';
import { seeded } from './textures';

/**
 * The family's pictures, drawn in code: four photographs (and how decades changed them),
 * portraits for the 3:17 board, kid Sam's drawing of the hiding place, and the frames of the
 * home video. No reading anywhere: everything is shapes, faces and colour.
 */

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export function toTexture(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

interface Figure {
  x: number;
  /** Feet. */
  y: number;
  h: number;
  hair: 'bun' | 'short' | 'long' | 'cap' | 'none';
  coat: string;
  glasses?: boolean;
}

const FAMILY: Record<Member, Omit<Figure, 'x' | 'y'>> = {
  walter: { h: 1, hair: 'short', coat: '#3a4a5a', glasses: true },
  ruth: { h: 0.92, hair: 'bun', coat: '#7a3a3a' },
  nora: { h: 0.86, hair: 'long', coat: '#a3141c' },
  sam: { h: 0.55, hair: 'cap', coat: '#c8a020' },
};

function person(c: Ctx, f: Figure, scale: number): { headX: number; headY: number; r: number } {
  const H = f.h * scale;
  const r = H * 0.11;
  const headY = f.y - H + r;
  // Body.
  c.fillStyle = f.coat;
  c.beginPath();
  c.moveTo(f.x - H * 0.13, f.y - H * 0.7);
  c.lineTo(f.x + H * 0.13, f.y - H * 0.7);
  c.lineTo(f.x + H * 0.17, f.y - H * 0.25);
  c.lineTo(f.x - H * 0.17, f.y - H * 0.25);
  c.fill();
  c.fillStyle = '#2a2420';
  c.fillRect(f.x - H * 0.12, f.y - H * 0.25, H * 0.09, H * 0.25);
  c.fillRect(f.x + H * 0.03, f.y - H * 0.25, H * 0.09, H * 0.25);
  // Head.
  c.fillStyle = '#e0b898';
  c.beginPath();
  c.arc(f.x, headY, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1a1210';
  if (f.hair === 'long') {
    c.fillRect(f.x - r * 1.1, headY - r, r * 2.2, r * 0.7);
    c.fillRect(f.x - r * 1.15, headY - r * 0.5, r * 0.45, r * 3.2);
    c.fillRect(f.x + r * 0.7, headY - r * 0.5, r * 0.45, r * 3.2);
  } else if (f.hair === 'bun') {
    c.beginPath();
    c.arc(f.x, headY - r * 0.4, r * 1.02, Math.PI, 0);
    c.fill();
    c.beginPath();
    c.arc(f.x, headY - r * 1.3, r * 0.45, 0, Math.PI * 2);
    c.fill();
  } else if (f.hair === 'short') {
    c.beginPath();
    c.arc(f.x, headY - r * 0.3, r * 1.02, Math.PI, 0);
    c.fill();
  } else if (f.hair === 'cap') {
    c.fillStyle = '#2a4aa8';
    c.beginPath();
    c.arc(f.x, headY - r * 0.3, r * 1.05, Math.PI, 0);
    c.fill();
    c.fillRect(f.x, headY - r * 0.45, r * 1.5, r * 0.3);
  }
  // Eyes and a mouth: a smile, for the camera.
  c.fillStyle = '#1a1210';
  c.fillRect(f.x - r * 0.4, headY - r * 0.05, r * 0.18, r * 0.18);
  c.fillRect(f.x + r * 0.22, headY - r * 0.05, r * 0.18, r * 0.18);
  c.strokeStyle = '#6a3a2a';
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.arc(f.x, headY + r * 0.25, r * 0.35, 0.2, Math.PI - 0.2);
  c.stroke();
  if (f.glasses) {
    c.strokeStyle = '#1a1210';
    c.strokeRect(f.x - r * 0.55, headY - r * 0.15, r * 0.45, r * 0.35);
    c.strokeRect(f.x + r * 0.1, headY - r * 0.15, r * 0.45, r * 0.35);
  }
  return { headX: f.x, headY, r };
}

function stain(c: Ctx, x: number, y: number, r: number, color: string): void {
  const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.75, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** Old print finishing: warm cast in 1994, faded and stained decades later. */
function finishPhoto(c: Ctx, w: number, h: number, aged: boolean, seed: number): void {
  const rand = seeded(seed);
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = aged ? 'rgba(150,170,150,0.55)' : 'rgba(255,225,180,0.35)';
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${rand() * 0.08})`;
    c.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
  if (aged) {
    c.fillStyle = 'rgba(220,220,200,0.25)';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++)
      stain(c, rand() * w, rand() * h, 20 + rand() * 40, 'rgba(90,80,40,0.25)');
  }
  // White border.
  c.strokeStyle = aged ? '#bab8a8' : '#efe8d8';
  c.lineWidth = 10;
  c.strokeRect(0, 0, w, h);
}

const PW = 200;
const PH = 240;

/**
 * Photo 0: Mum and Dad. 1: Nora and Sam at the lake. 2: all four on the porch. 3: Sam and his
 * walkie-talkie. `aged` is how they hang decades later: faded, water got into the lake photo
 * where Nora stood, and on the porch someone scratched out her face.
 */
export function photoCanvas(index: number, aged: boolean): HTMLCanvasElement {
  const [cv, c] = canvas(PW, PH);
  const ground = PH * 0.86;
  if (index === 0) {
    c.fillStyle = '#9ab8c8';
    c.fillRect(0, 0, PW, PH);
    c.fillStyle = '#5a7a4a';
    c.fillRect(0, PH * 0.6, PW, PH * 0.4);
    person(c, { x: 72, y: ground, ...FAMILY.walter }, 170);
    person(c, { x: 128, y: ground, ...FAMILY.ruth }, 170);
  } else if (index === 1) {
    c.fillStyle = '#b8c8d8';
    c.fillRect(0, 0, PW, PH);
    c.fillStyle = '#3a6a8a';
    c.fillRect(0, PH * 0.55, PW, PH * 0.45);
    c.fillStyle = '#c8b890';
    c.fillRect(0, PH * 0.8, PW, PH * 0.2);
    const nora = person(c, { x: 80, y: ground, ...FAMILY.nora }, 170);
    person(c, { x: 130, y: ground, ...FAMILY.sam }, 170);
    if (aged) {
      // Water took her: a bloom of damage exactly where she stood.
      stain(c, nora.headX, nora.headY + 50, 62, 'rgba(120,140,120,0.96)');
      stain(c, nora.headX + 5, nora.headY + 20, 40, 'rgba(160,170,150,0.9)');
    }
  } else if (index === 2) {
    c.fillStyle = '#c8b8a0';
    c.fillRect(0, 0, PW, PH);
    c.fillStyle = '#6a4a3a';
    c.fillRect(0, PH * 0.15, PW, PH * 0.06);
    c.fillStyle = '#8a6a50';
    c.fillRect(0, PH * 0.8, PW, PH * 0.2);
    for (const x of [20, 180]) c.fillRect(x - 6, PH * 0.2, 12, PH * 0.6);
    person(c, { x: 40, y: ground, ...FAMILY.walter }, 150);
    person(c, { x: 82, y: ground, ...FAMILY.ruth }, 150);
    const nora = person(c, { x: 122, y: ground, ...FAMILY.nora }, 150);
    person(c, { x: 160, y: ground, ...FAMILY.sam }, 150);
    if (aged) {
      // Careful, patient scratches over one face.
      const rand = seeded(317);
      c.strokeStyle = 'rgba(240,235,220,0.95)';
      c.lineWidth = 1.6;
      for (let i = 0; i < 40; i++) {
        c.beginPath();
        c.moveTo(nora.headX - nora.r * 1.3 + rand() * nora.r * 2.6, nora.headY - nora.r * 1.3);
        c.lineTo(nora.headX - nora.r * 1.3 + rand() * nora.r * 2.6, nora.headY + nora.r * 1.3);
        c.stroke();
      }
    }
  } else {
    c.fillStyle = '#8a7a6a';
    c.fillRect(0, 0, PW, PH);
    c.fillStyle = '#5a4a3a';
    c.fillRect(0, PH * 0.7, PW, PH * 0.3);
    person(c, { x: 100, y: ground, ...FAMILY.sam, h: 0.85 }, 200);
    // The walkie-talkie, held up proudly.
    c.fillStyle = '#d8b020';
    c.fillRect(118, 92, 16, 34);
    c.fillStyle = '#111';
    c.fillRect(130, 72, 3, 22);
  }
  finishPhoto(c, PW, PH, aged, index * 31 + (aged ? 7 : 0));
  return cv;
}

/** A head-and-shoulders portrait for the 3:17 board. */
export function portraitCanvas(member: Member): HTMLCanvasElement {
  const [cv, c] = canvas(120, 140);
  c.fillStyle = '#d8ccb0';
  c.fillRect(0, 0, 120, 140);
  const f = FAMILY[member];
  person(c, { x: 60, y: member === 'sam' ? 230 : 250, ...f, h: 1 }, member === 'sam' ? 200 : 230);
  finishPhoto(c, 120, 140, false, member.length);
  return cv;
}

// --- Kid Sam's drawing of the hiding place ---------------------------------------------------

function crayon(c: Ctx, rand: () => number, color: string, pts: [number, number][], w = 4): void {
  c.strokeStyle = color;
  c.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    c.globalAlpha = 0.5;
    c.lineWidth = w;
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (rand() - 0.5) * 3;
      const jy = y + (rand() - 0.5) * 3;
      if (i === 0) c.moveTo(jx, jy);
      else c.lineTo(jx, jy);
    });
    c.stroke();
  }
  c.globalAlpha = 1;
}

/**
 * The girl hidden in the one place the tall dark thing never looks, the thing walking away.
 * Drawn by a nine-year-old who knew the best hiding place in the house.
 */
export function hideDrawingCanvas(spot: HideSpot, aged: boolean): HTMLCanvasElement {
  const [cv, c] = canvas(256, 256);
  const rand = seeded(spot.length * 97);
  c.fillStyle = aged ? '#c9bd94' : '#f2ede0';
  c.fillRect(0, 0, 256, 256);
  const girl = (x: number, y: number) => {
    crayon(
      c,
      rand,
      '#b3121c',
      [
        [x, y],
        [x - 9, y + 22],
        [x + 9, y + 22],
        [x, y],
      ],
      5,
    );
    crayon(
      c,
      rand,
      '#111',
      [
        [x - 6, y - 10],
        [x - 8, y + 12],
      ],
      4,
    );
    crayon(
      c,
      rand,
      '#111',
      [
        [x + 6, y - 10],
        [x + 8, y + 12],
      ],
      4,
    );
    crayon(
      c,
      rand,
      '#e0b090',
      [
        [x, y - 8],
        [x, y - 4],
      ],
      8,
    );
  };
  if (spot === 'table') {
    crayon(
      c,
      rand,
      '#6a4020',
      [
        [40, 120],
        [190, 120],
      ],
      7,
    );
    crayon(
      c,
      rand,
      '#6a4020',
      [
        [50, 120],
        [50, 200],
      ],
      5,
    );
    crayon(
      c,
      rand,
      '#6a4020',
      [
        [180, 120],
        [180, 200],
      ],
      5,
    );
    // Four plates on top.
    for (const x of [70, 100, 130, 160])
      crayon(
        c,
        rand,
        '#ddd',
        [
          [x - 8, 112],
          [x + 8, 112],
        ],
        6,
      );
    girl(115, 165);
  } else if (spot === 'sofa') {
    crayon(
      c,
      rand,
      '#7a4a3a',
      [
        [40, 150],
        [40, 110],
        [180, 110],
        [180, 150],
        [40, 150],
      ],
      7,
    );
    crayon(
      c,
      rand,
      '#7a4a3a',
      [
        [40, 150],
        [40, 190],
        [180, 190],
        [180, 150],
      ],
      6,
    );
    girl(205, 160);
  } else {
    crayon(
      c,
      rand,
      '#3a2414',
      [
        [40, 125],
        [170, 125],
      ],
      7,
    );
    crayon(
      c,
      rand,
      '#3a2414',
      [
        [45, 125],
        [45, 200],
      ],
      5,
    );
    crayon(
      c,
      rand,
      '#3a2414',
      [
        [165, 125],
        [165, 200],
      ],
      5,
    );
    crayon(
      c,
      rand,
      '#ffd060',
      [
        [150, 95],
        [150, 120],
      ],
      4,
    );
    crayon(
      c,
      rand,
      '#ffd060',
      [
        [140, 95],
        [160, 95],
      ],
      8,
    );
    girl(105, 170);
  }
  // The tall thing, walking away: all black scribble, long hair, too long arms.
  for (let i = 0; i < 18; i++) {
    crayon(
      c,
      rand,
      '#0a0a0a',
      [
        [30 + rand() * 18, 40 + rand() * 10],
        [26 + rand() * 24, 230],
      ],
      3,
    );
  }
  crayon(
    c,
    rand,
    '#0a0a0a',
    [
      [28, 70],
      [10, 190],
    ],
    3,
  );
  crayon(
    c,
    rand,
    '#0a0a0a',
    [
      [46, 70],
      [62, 190],
    ],
    3,
  );
  // A heart beside the girl: "here".
  crayon(
    c,
    rand,
    '#b3121c',
    [
      [225, 60],
      [215, 50],
      [205, 60],
      [225, 82],
      [245, 60],
      [235, 50],
      [225, 60],
    ],
    4,
  );
  if (aged)
    for (let i = 0; i < 5; i++)
      stain(c, rand() * 256, rand() * 256, 25 + rand() * 35, 'rgba(90,70,30,0.3)');
  return cv;
}

// --- The home video ---------------------------------------------------------------------------

/** Where in the drawn kitchen each hiding place is (fraction of the frame width). */
const SPOT_X: Record<KeySpot, number> = { jar: 0.2, breadbin: 0.38, drawer: 0.56, fridge: 0.82 };

/**
 * One frame of the tape: the kitchen at 2:50 a.m., Dad hiding the basement keys while Mum
 * watches from the door. `t` runs 0..12 seconds and loops.
 */
export function drawTapeFrame(c: Ctx, w: number, h: number, t: number, spot: KeySpot): void {
  c.fillStyle = '#1a2230';
  c.fillRect(0, 0, w, h);
  // Counter along the left, the fridge on the right.
  c.fillStyle = '#3a3a40';
  c.fillRect(0, h * 0.58, w * 0.7, h * 0.42);
  c.fillStyle = '#4a4a52';
  c.fillRect(0, h * 0.55, w * 0.7, h * 0.04);
  c.fillStyle = '#5a5a60';
  c.fillRect(w * 0.74, h * 0.18, w * 0.18, h * 0.82);
  // The jar, the bread bin, the drawer.
  c.fillStyle = '#8a8478';
  c.fillRect(w * 0.17, h * 0.45, w * 0.06, h * 0.1);
  c.fillRect(w * 0.33, h * 0.47, w * 0.1, h * 0.08);
  c.fillStyle = '#2a2a2e';
  c.fillRect(w * 0.5, h * 0.62, w * 0.12, h * 0.07);
  c.fillStyle = '#6a6a6e';
  c.fillRect(w * 0.55, h * 0.645, w * 0.02, h * 0.015);
  // Mum in the doorway (right edge), still.
  c.fillStyle = '#0a0c10';
  c.fillRect(w * 0.94, h * 0.3, w * 0.05, h * 0.55);
  c.beginPath();
  c.arc(w * 0.965, h * 0.26, h * 0.05, 0, Math.PI * 2);
  c.fill();
  // Dad: walks in, crouches or reaches at the hiding place, walks out.
  const target = SPOT_X[spot];
  const k = t / 12;
  let x: number;
  if (k < 0.35) x = 0.9 + (target - 0.9) * (k / 0.35);
  else if (k < 0.65) x = target;
  else x = target + (0.9 - target) * ((k - 0.65) / 0.35);
  const reaching = k >= 0.35 && k < 0.65;
  const high = spot === 'fridge';
  const low = spot === 'drawer';
  const bodyH = h * (low && reaching ? 0.42 : 0.58);
  const fx = x * w;
  c.fillStyle = '#05060a';
  c.fillRect(fx - w * 0.035, h - bodyH, w * 0.07, bodyH);
  c.beginPath();
  c.arc(fx, h - bodyH - h * 0.05, h * 0.055, 0, Math.PI * 2);
  c.fill();
  if (reaching) {
    // The arm, and a glint of keys.
    const handY = high ? h * 0.16 : low ? h * 0.64 : h * 0.47;
    c.strokeStyle = '#05060a';
    c.lineWidth = w * 0.02;
    c.beginPath();
    c.moveTo(fx, h - bodyH + h * 0.06);
    c.lineTo(fx - w * 0.02, handY);
    c.stroke();
    if (Math.sin(t * 9) > 0) {
      c.fillStyle = '#e8e8d0';
      c.fillRect(fx - w * 0.03, handY - 3, 6, 6);
    }
  }
  // Tape: tracking band, noise, scanlines, the counter and timestamp.
  const band = ((t * 0.17) % 1.2) * h - h * 0.1;
  c.fillStyle = 'rgba(255,255,255,0.08)';
  c.fillRect(0, band, w, h * 0.05);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
    c.fillRect(Math.random() * w, Math.random() * h, 2, 1);
  }
  c.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
  c.fillStyle = '#e8e8e8';
  c.font = `bold ${Math.round(h * 0.07)}px monospace`;
  c.fillText('▶ PLAY', w * 0.05, h * 0.1);
  c.fillText('OCT 14 1994', w * 0.05, h * 0.92);
  const secs = 50 * 60 + Math.floor(t);
  c.fillText(`2:${String(Math.floor(secs / 60) % 60).padStart(2, '0')} AM`, w * 0.68, h * 0.92);
}
