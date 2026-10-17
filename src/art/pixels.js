// Turns the text pixel art in sprites.js into Phaser textures.
import { PALETTE, SPRITES } from "./sprites.js";

export function makeTexture(scene, key, rows, palette = PALETTE) {
  const w = rows[0].length, h = rows.length;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Sprite ${key}: row ${y} is ${row.length} wide, expected ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  tex.refresh();
}

export function makeAllTextures(scene) {
  for (const [key, rows] of Object.entries(SPRITES)) makeTexture(scene, key, rows);
}
