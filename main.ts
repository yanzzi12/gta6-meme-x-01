// GTA 6 meme for the make.fun bounty gta6-meme-x-01 (Node 22, stdlib only).
// Draws the whole meme from scratch with a hand-written rasteriser, a 5x7
// bitmap font and a small PNG encoder: a Vice City sunset, palm trees, a
// sports car, a billboard that says make.fun, six gold wanted stars, and
// the make.fun ghost mascot as the player character with both hands up.
// It also copies POST.json into the output directory, because the bounty
// gate reads the X post address from /output/POST.json.
// Two runs write byte-identical files: no clock, no network, fixed seed.

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const W = 1200;
const H = 675;

type Rgb = [number, number, number];
const px = new Uint8Array(W * H * 3);

function put(x: number, y: number, c: Rgb): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rect(x0: number, y0: number, x1: number, y1: number, c: Rgb): void {
  for (let y = Math.floor(y0); y < y1; y++)
    for (let x = Math.floor(x0); x < x1; x++) put(x, y, c);
}

function disc(cx: number, cy: number, r: number, c: Rgb): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) put(x, y, c);
    }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, c: Rgb): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(x, y, c);
    }
}

// Thick segment: stamp discs along the line so joins stay round.
function stroke(
  x0: number, y0: number, x1: number, y1: number, wdt: number, c: Rgb,
): void {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, wdt / 2, c);
  }
}

// Scanline polygon fill with the even-odd rule.
function poly(pts: Array<[number, number]>, c: Rgb): void {
  let lo = H;
  let hi = 0;
  for (const p of pts) {
    lo = Math.min(lo, Math.floor(p[1]));
    hi = Math.max(hi, Math.ceil(p[1]));
  }
  for (let y = Math.max(0, lo); y <= Math.min(H - 1, hi); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.floor(xs[k]); x <= xs[k + 1]; x++) put(x, y, c);
  }
}

function star(cx: number, cy: number, r: number, c: Rgb): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.46;
    pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  poly(pts, c);
}

// Four-pointed sparkle, the shape of the ghost mascot's eyes.
function sparkle(cx: number, cy: number, r: number, c: Rgb): void {
  const pts: Array<[number, number]> = [
    [cx, cy - r], [cx + r * 0.24, cy - r * 0.24], [cx + r, cy],
    [cx + r * 0.24, cy + r * 0.24], [cx, cy + r],
    [cx - r * 0.24, cy + r * 0.24], [cx - r, cy],
    [cx - r * 0.24, cy - r * 0.24],
  ];
  poly(pts, c);
}

// ---- 5x7 bitmap font -------------------------------------------------
const GLYPHS: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  a: ['00000', '00000', '01110', '00001', '01111', '10001', '01111'],
  e: ['00000', '00000', '01110', '10001', '11111', '10000', '01110'],
  f: ['00110', '01001', '01000', '11110', '01000', '01000', '01000'],
  k: ['10000', '10000', '10010', '10100', '11000', '10100', '10010'],
  m: ['00000', '00000', '11010', '10101', '10101', '10101', '10101'],
  n: ['00000', '00000', '11110', '10001', '10001', '10001', '10001'],
  u: ['00000', '00000', '10001', '10001', '10001', '10011', '01101'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(
  text: string, cx: number, y: number, scale: number, c: Rgb,
): void {
  let x = cx - textWidth(text, scale) / 2;
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (g[row][col] === '1')
          rect(x + col * scale, y + row * scale,
            x + (col + 1) * scale, y + (row + 1) * scale, c);
    x += 6 * scale;
  }
}

// Caption lettering: black stamps offset around white letters.
function caption(text: string, y: number, scale: number): void {
  const cx = W / 2;
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-3, -3], [3, 3],
    [-3, 3], [3, -3]] as Array<[number, number]>) {
    const saved = cx;
    void saved;
    drawTextAt(text, cx + dx, y + dy, scale, [8, 6, 14]);
  }
  drawTextAt(text, cx, y, scale, [255, 255, 255]);
}

function drawTextAt(
  text: string, cx: number, y: number, scale: number, c: Rgb,
): void {
  drawText(text, cx, y, scale, c);
}

// ---- scene -----------------------------------------------------------
const INK: Rgb = [16, 10, 24];
const WHITE: Rgb = [250, 250, 252];
const MAGENTA: Rgb = [232, 38, 168];
const GOLD: Rgb = [255, 196, 32];

// Sky: purple up top melting into pink and orange at the horizon.
const skyStops: Array<[number, Rgb]> = [
  [0, [43, 16, 85]], [0.34, [122, 44, 138]], [0.55, [219, 78, 128]],
  [0.68, [255, 138, 76]], [0.74, [255, 183, 94]],
];
for (let y = 0; y < 500; y++) {
  const t = y / 500;
  let c = skyStops[skyStops.length - 1][1];
  for (let s = 0; s + 1 < skyStops.length; s++) {
    if (t >= skyStops[s][0] && t <= skyStops[s + 1][0]) {
      c = mix(skyStops[s][1], skyStops[s + 1][1],
        (t - skyStops[s][0]) / (skyStops[s + 1][0] - skyStops[s][0]));
      break;
    }
  }
  rect(0, y, W, y + 1, c);
}

// Fixed-seed sky sparkles in the dark upper band.
let seed = 987654321;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
for (let i = 0; i < 70; i++) {
  const sx = rnd() * W;
  const sy = rnd() * 150;
  put(sx, sy, [255, 240, 210]);
  put(sx + 1, sy, [230, 200, 220]);
}

// Striped retro sun sitting on the horizon.
const sunCx = 600;
const sunCy = 428;
const sunR = 148;
for (let y = Math.floor(sunCy - sunR); y <= sunCy + 30; y++) {
  const dy = y - sunCy;
  const half = Math.sqrt(Math.max(0, sunR * sunR - dy * dy));
  const tt = (y - (sunCy - sunR)) / (sunR * 2);
  const c = mix([255, 214, 92], [255, 92, 138], tt);
  if (y > sunCy - 6 && ((y - sunCy) % 16) < 5) continue;
  rect(sunCx - half, y, sunCx + half, y + 1, c);
}

// Sea band with a bright sun path, then the street in front.
rect(0, 470, W, 520, [64, 32, 92]);
for (let i = 0; i < 46; i++) {
  const lx = sunCx + (rnd() - 0.5) * 300;
  const ly = 474 + rnd() * 42;
  rect(lx, ly, lx + 14 + rnd() * 30, ly + 2, [255, 170, 120]);
}
rect(0, 520, W, H, [26, 18, 38]);
rect(0, 520, W, 526, [255, 120, 170]);
// Lane dashes on the street.
for (let x = 26; x < W; x += 92) rect(x, 560, x + 48, 567, [240, 205, 92]);

// Distant Vice City skyline silhouettes along the horizon.
const towers: Array<[number, number, number]> = [
  [18, 356, 54], [84, 392, 40], [138, 330, 62], [214, 402, 44],
  [966, 344, 58], [1036, 398, 42], [1090, 322, 66], [1160, 386, 38],
];
for (const [tx, ty, tw] of towers) {
  rect(tx, ty, tx + tw, 472, [38, 20, 62]);
  for (let wy = ty + 14; wy < 462; wy += 18)
    for (let wx = tx + 7; wx < tx + tw - 8; wx += 13)
      if ((wx * 7 + wy * 13) % 5 !== 0) rect(wx, wy, wx + 5, wy + 7, [255, 205, 110]);
}

// Palm tree: bent trunk of stamped discs and arcing fronds.
function palm(bx: number, by: number, hgt: number, lean: number): void {
  let tx = bx;
  let ty = by;
  const steps = 26;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    tx = bx + lean * t * t;
    ty = by - hgt * t;
    disc(tx, ty, 9 - t * 3.4, [52, 34, 30]);
  }
  const fronds: Array<[number, number]> = [
    [-96, 30], [-78, -6], [-48, -30], [0, -44], [48, -30], [78, -6], [96, 30],
  ];
  for (const [fdx, fdy] of fronds) {
    const mx = tx + fdx * 0.55;
    const my = ty - 34;
    stroke(tx, ty, mx, my, 7, [26, 98, 54]);
    stroke(mx, my, tx + fdx, ty + fdy, 6, [26, 98, 54]);
  }
  disc(tx, ty + 4, 7, [90, 62, 36]);
  disc(tx + 11, ty + 8, 6, [90, 62, 36]);
}
palm(96, 560, 235, 44);
palm(1116, 566, 252, -50);

// Billboard on two posts, left of the ghost, carrying the make.fun name.
rect(120, 300, 132, 470, [30, 22, 44]);
rect(316, 300, 328, 470, [30, 22, 44]);
rect(86, 196, 362, 306, MAGENTA);
rect(94, 204, 354, 298, [24, 14, 40]);
drawText('make.fun', 224, 234, 5, [255, 255, 255]);

// Sports car, low and wide, parked right of the ghost.
poly([[742, 542], [790, 494], [902, 482], [986, 494], [1036, 534],
  [1044, 570], [748, 572]], [198, 32, 92]);
poly([[806, 496], [842, 468], [928, 466], [962, 494]], [30, 20, 48]);
poly([[818, 492], [848, 474], [884, 473], [884, 492]], [150, 220, 240]);
poly([[894, 473], [924, 474], [950, 492], [894, 492]], [150, 220, 240]);
rect(742, 538, 1044, 546, [255, 120, 190]);
disc(806, 572, 27, [12, 10, 16]);
disc(806, 572, 14, [196, 200, 210]);
disc(982, 572, 27, [12, 10, 16]);
disc(982, 572, 14, [196, 200, 210]);
rect(748, 548, 776, 556, [255, 64, 64]);
rect(1012, 548, 1040, 556, [255, 214, 92]);

// ---- the ghost mascot as the player character ------------------------
// Raised arms first, so the body overlaps their roots.
stroke(512, 356, 448, 262, 34, INK);
stroke(512, 356, 448, 262, 23, WHITE);
stroke(688, 356, 752, 262, 34, INK);
stroke(688, 356, 752, 262, 23, WHITE);
disc(448, 258, 19, INK);
disc(448, 258, 12, WHITE);
disc(752, 258, 19, INK);
disc(752, 258, 12, WHITE);

// Body outline pass, then the white body a touch smaller on top of it.
function ghostBody(scalePad: number, c: Rgb): void {
  const cx = 600;
  const top = 218 - scalePad;
  const bottom = 512 + scalePad;
  const halfW = 86 + scalePad;
  ellipse(cx, top + halfW * 0.72, halfW, halfW * 0.78, c);
  rect(cx - halfW, top + halfW * 0.66, cx + halfW, bottom - 16, c);
  const waves = 4;
  for (let i = 0; i < waves; i++) {
    const wx = cx - halfW + ((i + 0.5) * (2 * halfW)) / waves;
    disc(wx, bottom - 16, halfW / waves, c);
  }
}
ghostBody(10, INK);
ghostBody(0, WHITE);

// Sparkle eyes and a small round mouth.
sparkle(566, 330, 27, INK);
sparkle(636, 330, 27, INK);
ellipse(601, 386, 11, 15, INK);

// The magenta coin with a white star, held at the ghost's side.
disc(706, 452, 37, INK);
disc(706, 452, 31, MAGENTA);
star(706, 452, 17, WHITE);
// And the ghost's own little round hand over the coin's edge.
disc(676, 442, 13, INK);
disc(676, 442, 9, WHITE);

// Six gold wanted stars in a row at the top right, under the top caption.
for (let i = 0; i < 6; i++) {
  const sx = 846 + i * 58;
  star(sx, 126, 26, INK);
  star(sx, 126, 21, GOLD);
}

// Captions: the joke, top and bottom, in big meme lettering.
caption('WAITED 12 YEARS FOR GTA 6', 20, 7);
rect(0, 600, W, H, [10, 6, 18]);
caption('DAY ONE: 6 STARS ALREADY!', 614, 7);

// ---- PNG encoder ------------------------------------------------------
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable.push(c >>> 0);
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'meme.png'), encodePng());
const postSrc = join(BOT_DIR, 'POST.json');
if (existsSync(postSrc)) copyFileSync(postSrc, join(OUTPUT_DIR, 'POST.json'));
