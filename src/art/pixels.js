// Turns the text pixel art into Phaser textures, in the 16-bit style: every art pixel becomes a 2 x 2 block
// (R), lit from the top left: edges facing up get a highlight, edges facing down get a shadow, and the right
// edge is a touch darker. Outlines stay flat.
import { PALETTE, SPRITES } from "./sprites.js";
import { MONSTER_ART } from "./monsters.js";
import { HERO_COLOURS, HERO_FRAMES, FACINGS, HERO_W, HERO_H } from "./hero.js";
import { MEGAN_COLOURS, MEGAN_FRAMES } from "./megan.js";
import { ROBYN_COLOURS, ROBYN_FRAMES } from "./robyn.js";
import { RACHEL_COLOURS, RACHEL_FRAMES } from "./rachel.js";
import { drawTerrain } from "./terrain.js";
import { TILE } from "../config.js";

export const R = 2;

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = a => "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
/* f < 1 darkens toward black, f > 1 lightens toward white. */
export const shade = (h, f) => hex(rgb(h).map(v => (f < 1 ? v * f : v + (255 - v) * (f - 1))));

/* Draws text art into a 2D context at (x, y), each art pixel R x R. */
export function drawPixels(ctx, rows, colours, { x = 0, y = 0, outline = "k", flip = false } = {}) {
  const h = rows.length, w = rows[0].length;
  const at = (i, j) => (j < 0 || j >= h || i < 0 || i >= w ? "." : rows[j][flip ? w - 1 - i : i]);
  const edge = ch => ch === "." || ch === outline;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = at(i, j);
    if (ch === ".") continue;
    const base = colours[ch];
    if (!base) throw new Error(`No colour for "${ch}"`);
    const X = x + i * R, Y = y + j * R;
    if (ch === outline) { ctx.fillStyle = base; ctx.fillRect(X, Y, R, R); continue; }
    for (let b = 0; b < R; b++) for (let a = 0; a < R; a++) {
      let f = 1;
      if (b === 0 && edge(at(i, j - 1))) f = 1.28;
      if (b === R - 1 && edge(at(i, j + 1))) f = 0.78;
      if (a === R - 1 && edge(at(i + 1, j))) f *= 0.88;
      if (a === 0 && edge(at(i - 1, j))) f *= 1.08;
      ctx.fillStyle = f === 1 ? base : shade(base, f);
      ctx.fillRect(X + a, Y + b, 1, 1);
    }
  }
}

export function makeTexture(scene, key, rows, colours = PALETTE, outline = "k") {
  const w = rows[0].length, h = rows.length;
  rows.forEach((row, y) => { if (row.length !== w) throw new Error(`Sprite ${key}: row ${y} is ${row.length} wide, expected ${w}`); });
  const tex = scene.textures.createCanvas(key, w * R, h * R);
  drawPixels(tex.getContext(), rows, colours, { outline });
  tex.refresh();
}

/* People drawn on the hero's grid: a sheet of 12 frames of 32 x 48 each (down 0-3, up 4-7, side 8-11), plus walk
   and idle animations (the hero's are "walk-side" and so on; anyone else's are prefixed, like "megan-walk-side"). */
const SHEETS = { hero: [HERO_FRAMES, HERO_COLOURS], megan: [MEGAN_FRAMES, MEGAN_COLOURS], robyn: [ROBYN_FRAMES, ROBYN_COLOURS], rachel: [RACHEL_FRAMES, RACHEL_COLOURS] };
export const heroFrame = (facing, i = 0) => FACINGS.indexOf(facing) * 4 + i;
export const animKey = (key, kind, facing) => `${key === "hero" ? "" : `${key}-`}${kind}-${facing}`;

function makeSheet(scene, key, frames, colours) {
  const fw = HERO_W * R, fh = HERO_H * R;
  const tex = scene.textures.createCanvas(key, fw * 12, fh);
  const ctx = tex.getContext();
  FACINGS.forEach((facing, f) => frames[facing].forEach((rows, i) => {
    const n = f * 4 + i;
    drawPixels(ctx, rows, colours, { x: n * fw, outline: "o" });
    tex.add(n, 0, n * fw, 0, fw, fh);
  }));
  tex.refresh();
  for (const facing of FACINGS) {
    const start = heroFrame(facing);
    scene.anims.create({ key: animKey(key, "walk", facing), frames: [0, 1, 2, 3].map(i => ({ key, frame: start + i })), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: animKey(key, "idle", facing), frames: [{ key, frame: start }], frameRate: 1 });
  }
}

/* The ground of a map as one picture (see terrain.js), made the first time you visit it and kept after that. */
export function groundTexture(scene, map) {
  const key = `ground-${map.name}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, map.width * TILE, map.height * TILE);
    drawTerrain(tex.getContext(), map);
    tex.refresh();
  }
  return key;
}

export function makeAllTextures(scene) {
  for (const [key, rows] of Object.entries(SPRITES)) makeTexture(scene, key, rows);
  for (const [key, { rows, colours }] of Object.entries(MONSTER_ART)) makeTexture(scene, key, rows, colours);
  for (const [key, [frames, colours]] of Object.entries(SHEETS)) makeSheet(scene, key, frames, colours);
}
