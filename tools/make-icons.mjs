// Draws the app icons (a sword over a red shield, in pixel art) and writes them as PNGs, with no dependencies.
// Run from the repo root: npm run icons
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { PALETTE } from "../src/art/sprites.js";

const ICON = [
  "................",
  ".......kk.......",
  "......kSSk......",
  "..yyyykSSkyyyy..",
  "..yrrrkSSkrrry..",
  "..yrrrkSSkrrry..",
  "..yrrrkSSkrrry..",
  "..yrkkkSSkkkry..",
  "..ykyyyyyyyyky..",
  "..yrkkkbbkkkry..",
  "...yrrkbbkrry...",
  "...yrrkbbkrry...",
  "....yrkyykry....",
  ".....yrrrry.....",
  "......yyyy......",
  "................",
];
const BG = "#1b1b2f";
const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* Nearest-pixel scaling keeps the art blocky. `k` is how much of the icon the art fills (maskable icons need room). */
function draw(size, k) {
  const px = Buffer.alloc(size * size * 4);
  const n = ICON.length;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = Math.floor((0.5 + ((i + 0.5) / size - 0.5) / k) * n);
    const y = Math.floor((0.5 + ((j + 0.5) / size - 0.5) / k) * n);
    const ch = x >= 0 && x < n && y >= 0 && y < n ? ICON[y][x] : ".";
    const [r, g, b] = rgb(ch === "." ? BG : PALETTE[ch]);
    px.set([r, g, b, 255], (j * size + i) * 4);
  }
  return png(size, size, px);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("icons", { recursive: true });
writeFileSync("icons/icon-192.png", draw(192, 1));
writeFileSync("icons/icon-512.png", draw(512, 1));
writeFileSync("icons/icon-maskable-512.png", draw(512, 0.75));
writeFileSync("icons/apple-touch-icon.png", draw(180, 0.9));
console.log("Wrote icons/");
