// GTA 6 meme generator for make.fun bounty gta6-meme-x-01.
// Draws a Vice-City-style sunset scene in pure code (own rasteriser + PNG
// encoder, Node stdlib only, no network): the make.fun ghost as the player
// character, six wanted stars, a billboard carrying the make.fun name.
// Output: /output/meme.png (1200x675), byte-identical on every run.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1200, H = 675;
const px = new Uint8Array(W * H * 4);

function setP(x: number, y: number, r: number, g: number, b: number) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
}
type RGB = [number, number, number];
function rect(x0: number, y0: number, x1: number, y1: number, c: RGB) {
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) setP(x, y, c[0], c[1], c[2]);
}
function circle(cx: number, cy: number, r: number, c: RGB) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setP(x, y, c[0], c[1], c[2]);
}
function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (x1 - x0) * s / steps), y = Math.round(y0 + (y1 - y0) * s / steps);
    circle(x, y, t, c);
  }
}
function poly(pts: [number, number][], c: RGB) {
  let minY = H, maxY = 0;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.round(xs[k]); x <= xs[k + 1]; x++) setP(x, y, c[0], c[1], c[2]);
  }
}

// ---- sky: sunset gradient + sun ----
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(255 - 130 * t), g = Math.round(140 - 60 * t), b = Math.round(90 + 130 * t);
  for (let x = 0; x < W; x++) setP(x, y, r, g, b);
}
circle(600, 330, 120, [255, 214, 120]);
circle(600, 330, 96, [255, 232, 160]);

// ---- skyline ----
const dark: RGB = [38, 24, 64];
const buildings: [number, number, number][] = [
  [0, 210, 90], [95, 160, 80], [180, 240, 110], [295, 185, 70], [370, 225, 95],
  [720, 200, 85], [810, 150, 75], [890, 235, 105], [1000, 175, 80], [1085, 215, 115],
];
for (const [bx, bt, bw] of buildings) {
  rect(bx, bt, bx + bw, 470, dark);
  for (let wy = bt + 14; wy < 455; wy += 22)
    for (let wx = bx + 8; wx < bx + bw - 8; wx += 16)
      if ((wx * 7 + wy * 13) % 5 < 2) rect(wx, wy, wx + 7, wy + 10, [255, 196, 90]);
}
// billboard with the make.fun name, worked into the skyline
rect(468, 205, 712, 292, [16, 16, 28]);
rect(474, 211, 706, 286, [245, 245, 250]);

// ---- sea + beach + road ----
rect(0, 470, W, 520, [64, 120, 190]);
rect(0, 520, W, 560, [232, 205, 160]);
rect(0, 560, W, H, [44, 40, 58]);
for (let x = 20; x < W; x += 90) rect(x, 612, x + 48, 620, [250, 220, 90]);

// ---- palms ----
function palm(x: number, y: number, s: number) {
  line(x, y, x + 8 * s, y - 95 * s, 5, [30, 60, 40]);
  const tx = x + 8 * s, ty = y - 95 * s;
  for (const a of [-2.6, -1.9, -1.2, -0.5, 0.15]) {
    line(tx, ty, tx + Math.cos(a) * 62 * s, ty + Math.sin(a) * 34 * s + 16 * s, 4, [34, 120, 62]);
  }
}
palm(90, 545, 1.0); palm(150, 552, 0.8); palm(1065, 548, 1.05); palm(1120, 555, 0.85);

// ---- sports car silhouette ----
const car: RGB = [18, 18, 30];
poly([[330, 575], [368, 531], [470, 515], [560, 515], [618, 541], [648, 575]], car);
rect(322, 571, 656, 597, car);
circle(392, 597, 27, [8, 8, 12]); circle(392, 597, 13, [170, 170, 185]);
circle(588, 597, 27, [8, 8, 12]); circle(588, 597, 13, [170, 170, 185]);
poly([[392, 531], [468, 520], [548, 520], [592, 537], [560, 541], [420, 541]], [120, 200, 235]);

// ---- the make.fun ghost, big, as the player character ----
function ghost(cx: number, top: number, s: number) {
  const white: RGB = [250, 250, 252], ink: RGB = [20, 20, 30];
  const halfW = 86 * s, bodyH = 150 * s;
  // dome + body via per-row spans, wavy skirt
  for (let y = 0; y < bodyH + 60 * s; y++) {
    const yy = top + y;
    let hw = halfW;
    if (y < halfW) hw = Math.sqrt(Math.max(0, halfW * halfW - (halfW - y) * (halfW - y)));
    if (y > bodyH) {
      const ph = (y - bodyH) / (60 * s);
      hw = halfW * (1 - 0.12 * Math.abs(Math.sin(ph * Math.PI * 3)));
      if (ph > 0.999) continue;
    }
    for (let x = cx - hw; x <= cx + hw; x++) setP(Math.round(x), Math.round(yy), white[0], white[1], white[2]);
  }
  // arms
  line(cx - halfW, top + 105 * s, cx - halfW - 34 * s, top + 78 * s, Math.round(13 * s), white);
  line(cx + halfW, top + 105 * s, cx + halfW + 34 * s, top + 78 * s, Math.round(13 * s), white);
  // eyes + smile
  circle(cx - 32 * s, top + 78 * s, 11 * s, ink);
  circle(cx + 32 * s, top + 78 * s, 11 * s, ink);
  for (let a = 0.15; a < Math.PI - 0.15; a += 0.05)
    circle(cx + Math.cos(a) * 26 * s, top + 96 * s + Math.sin(a) * 16 * s, 4 * s, ink);
}
ghost(905, 300, 1.15);

// ---- wanted stars (six, top right) ----
function star(cx: number, cy: number, r: number, c: RGB) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  poly(pts, c);
}
for (let i = 0; i < 6; i++) star(838 + i * 58, 52, 24, [255, 205, 40]);

// ---- 5x7 bitmap font ----
const F: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100", "00100", "00100"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};
function text(str: string, cx: number, y: number, scale: number, c: RGB, outline?: RGB) {
  const wdt = str.length * 6 * scale - scale;
  const x0 = Math.round(cx - wdt / 2);
  for (const pass of [0, 1]) {
    let x = x0;
    for (const ch of str.toUpperCase()) {
      const gl = F[ch] ?? F[" "];
      for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++)
        if (gl[r][col] === "1") {
          if (pass === 0 && outline) rect(x + col * scale - scale, y + r * scale - scale, x + col * scale + 2 * scale, y + r * scale + 2 * scale, outline);
          if (pass === 1) rect(x + col * scale, y + r * scale, x + col * scale + scale, y + r * scale + scale, c);
        }
      x += 6 * scale;
    }
  }
  return wdt;
}
// billboard wordmark
text("make.fun", 590, 232, 4, [20, 20, 30]);
// captions with outline
text("WAITED 12 YEARS FOR GTA 6", 600, 96, 6, [255, 255, 255], [10, 10, 16]);
rect(0, 626, W, H, [8, 8, 12]);
text("DAY ONE: 6 STARS ALREADY!", 600, 634, 5, [255, 224, 84]);

// ---- PNG encode ----
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
]);
mkdirSync("/output", { recursive: true });
writeFileSync("/output/meme.png", png);
console.log("wrote /output/meme.png", png.length, "bytes");
