// Terrain tiles in the 16-bit style, 32 x 32, drawn with code into one strip (frame order = FRAMES in world/map.js).
// Light comes from the top left. Each tile uses its own seeded dice, so the texture looks random but never changes.
import { FRAMES } from "../world/map.js";
import { seededRng } from "../rules/dice.js";
import { TILE } from "../config.js";

const T = TILE;

const C = {
  grass: "#5aa04a", grassDark: "#3f7d35", grassLight: "#7cc062",
  path: "#c9a26b", pathDark: "#a8824f", pathLight: "#ddbb88",
  water: "#3f7fc9", waterDark: "#2f64a6", waterLight: "#8cc0f0",
  wood: "#9a6a3e", woodDark: "#5e3b1c", woodLight: "#c08a55",
  leaf: "#2f7a3a", leafDark: "#1f5229", leafLight: "#4e9b4a", leafShine: "#7cc062", trunk: "#5a3b22", trunkLight: "#7d5532",
  rock: "#8a8a94", rockDark: "#5c5c66", rockLight: "#b2b2bc",
  roof: "#b04a36", roofDark: "#7d3024", roofLight: "#d0684e",
  wall: "#e2d4ae", wallDark: "#c4b48a", beam: "#6b4226", glass: "#3d5a73", glassLight: "#8fb4d0",
  flowerY: "#f4d03f", flowerW: "#f5f5f0", flowerR: "#e0645c", flowerB: "#8fa8ff",
  cave: "#0f0d14", caveEdge: "#2a2633", shadow: "rgba(0, 0, 0, 0.22)",
  floor: "#3a3440", floorDark: "#2e2934", floorLight: "#4a4352", stone: "#55505e", stoneDark: "#2a2633", stoneLight: "#6e6878",
  flame: "#f4a23f", flameLight: "#ffe28a", bottle: "#7bc96f", bottleLight: "#c8f0b8",
};

const box = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const speckle = (ctx, rng, c, n, w = 1, h = 1) => { for (let i = 0; i < n; i++) box(ctx, c, Math.floor(rng() * (T - w + 1)), Math.floor(rng() * (T - h + 1)), w, h); };

function grass(ctx, rng, blades = 26) {
  box(ctx, C.grass, 0, 0, T, T);
  speckle(ctx, rng, C.grassDark, blades, 1, 3);
  speckle(ctx, rng, C.grassLight, 10, 1, 2);
}

/* A filled ellipse at full resolution, coloured by where each pixel sits in it (for canopies and boulders). */
function blob(ctx, cx, cy, rx, ry, colourAt) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    if (d <= 1) { ctx.fillStyle = colourAt(dx, dy, d); ctx.fillRect(x, y, 1, 1); }
  }
}

const rocky = (dx, dy, d) => (d > 0.8 ? C.rockDark : dx + dy < -0.6 ? C.rockLight : dx + dy > 0.5 ? C.rockDark : C.rock);

const DRAW = {
  grass: (ctx, rng) => grass(ctx, rng),
  grass2: (ctx, rng) => { grass(ctx, rng, 34); speckle(ctx, rng, C.grassDark, 6, 2, 1); },
  flowers(ctx, rng) {
    grass(ctx, rng);
    for (const col of [C.flowerY, C.flowerW, C.flowerR, C.flowerB, C.flowerY]) {
      const x = 3 + Math.floor(rng() * 25), y = 3 + Math.floor(rng() * 25);
      box(ctx, C.grassDark, x, y + 3, 1, 2);
      box(ctx, col, x - 1, y, 3, 3);
      box(ctx, C.flowerY, x, y + 1, 1, 1);
    }
  },
  path(ctx, rng) {
    box(ctx, C.path, 0, 0, T, T);
    speckle(ctx, rng, C.pathDark, 18);
    speckle(ctx, rng, C.pathLight, 10);
    for (let i = 0; i < 4; i++) { // pebbles
      const x = Math.floor(rng() * 28), y = Math.floor(rng() * 29);
      box(ctx, C.pathDark, x, y + 1, 3, 2); box(ctx, C.pathLight, x, y, 2, 1);
    }
  },
  bridge(ctx) {
    box(ctx, C.wood, 0, 0, T, T);
    for (let x = 0; x < T; x += 8) { box(ctx, C.woodDark, x + 7, 0, 1, T); box(ctx, C.woodLight, x, 0, 1, T); box(ctx, C.woodDark, x + 3, 6 + (x % 16), 1, 1); }
    box(ctx, C.woodDark, 0, 0, T, 3); box(ctx, C.woodLight, 0, 0, T, 1); // rails
    box(ctx, C.woodDark, 0, T - 3, T, 3); box(ctx, C.woodLight, 0, T - 3, T, 1);
  },
  rock(ctx, rng) {
    box(ctx, C.rockDark, 0, 0, T, T);
    blob(ctx, 10, 11, 11, 10, rocky);
    blob(ctx, 23, 20, 10, 11, rocky);
    speckle(ctx, rng, C.rockDark, 8, 2, 1);
  },
  cave(ctx, rng) {
    DRAW.rock(ctx, rng);
    blob(ctx, 16, 22, 11, 14, (dx, dy, d) => (d > 0.75 ? C.caveEdge : C.cave));
    box(ctx, C.cave, 5, 22, 22, 10);
  },
  tree(ctx, rng) {
    grass(ctx, rng);
    blob(ctx, 17, 29, 11, 3, () => C.shadow); // shadow on the grass
    box(ctx, C.trunk, 14, 21, 5, 9); box(ctx, C.trunkLight, 14, 21, 1, 9);
    blob(ctx, 16, 13, 15, 13, (dx, dy, d) => {
      if (d > 0.85 || dx + dy > 0.45) return C.leafDark;
      if (dx + dy < -0.7 && d < 0.6) return C.leafShine;
      if (dx + dy < -0.2) return C.leafLight;
      return C.leaf;
    });
    for (let i = 0; i < 14; i++) { // leaf clumps
      const a = rng() * Math.PI * 2, r = rng() * 10;
      const x = Math.round(16 + Math.cos(a) * r), y = Math.round(13 + Math.sin(a) * r * 0.85);
      box(ctx, y + x < 26 ? C.leafLight : C.leafDark, x, y, 2, 1);
    }
  },
  water(ctx, rng) {
    box(ctx, C.water, 0, 0, T, T);
    speckle(ctx, rng, C.waterDark, 10, 3, 1);
    for (const [x, y] of [[3, 6], [17, 13], [7, 22], [22, 27]]) { box(ctx, C.waterLight, x, y, 6, 1); box(ctx, C.waterDark, x + 1, y + 1, 6, 1); }
    speckle(ctx, rng, "#ffffff", 2);
  },
  roof(ctx) {
    box(ctx, C.roof, 0, 0, T, T);
    for (let y = 0; y < T; y += 8) {
      box(ctx, C.roofLight, 0, y, T, 1);
      box(ctx, C.roofDark, 0, y + 6, T, 2);
      for (let x = (y % 16 === 0 ? 0 : 4); x < T; x += 8) box(ctx, C.roofDark, x, y, 1, 6);
    }
  },
  wall(ctx) {
    box(ctx, C.wall, 0, 0, T, T);
    box(ctx, C.wallDark, 0, T - 6, T, 2);
    box(ctx, C.beam, 0, 0, T, 3); box(ctx, C.beam, 0, T - 3, T, 3);
    box(ctx, C.beam, 0, 0, 3, T); box(ctx, C.beam, T - 3, 0, 3, T);
    box(ctx, C.beam, 9, 8, 14, 13); // window
    box(ctx, C.glass, 11, 10, 10, 9); box(ctx, C.glassLight, 11, 10, 3, 2); box(ctx, C.beam, 15, 10, 2, 9);
  },
  door(ctx) {
    DRAW.wall(ctx);
    box(ctx, C.woodDark, 8, 5, 16, 27);
    box(ctx, C.wood, 10, 7, 12, 25);
    for (let x = 13; x < 22; x += 4) box(ctx, C.woodDark, x, 7, 1, 25);
    box(ctx, C.woodLight, 10, 7, 12, 1);
    box(ctx, C.flowerY, 19, 19, 2, 2);
  },
  smithy(ctx) {
    DRAW.door(ctx);
    box(ctx, C.beam, 5, 0, 22, 6); box(ctx, C.woodLight, 5, 0, 22, 1); // sign board
    box(ctx, "#2c2c3a", 10, 2, 12, 2); box(ctx, "#2c2c3a", 14, 4, 4, 1); box(ctx, "#5c5c6e", 10, 2, 12, 1); // anvil
  },
  apothecary(ctx) {
    DRAW.door(ctx);
    box(ctx, C.beam, 5, 0, 22, 6); box(ctx, C.woodLight, 5, 0, 22, 1); // sign board
    box(ctx, C.bottle, 13, 2, 6, 4); box(ctx, C.bottleLight, 14, 2, 2, 1); box(ctx, C.wallDark, 15, 0, 2, 2); // a green bottle
  },
  bank(ctx) {
    DRAW.door(ctx);
    box(ctx, C.beam, 5, 0, 22, 6); box(ctx, C.woodLight, 5, 0, 22, 1); // sign board
    box(ctx, C.flowerY, 13, 1, 6, 4); box(ctx, "#fff3b0", 14, 1, 2, 1); box(ctx, "#a8801a", 15, 2, 2, 2); // a gold coin
  },
  cavefloor(ctx, rng) {
    box(ctx, C.floor, 0, 0, T, T);
    speckle(ctx, rng, C.floorDark, 22, 2, 1);
    speckle(ctx, rng, C.floorLight, 10);
    for (let i = 0; i < 2; i++) { // pebbles
      const x = Math.floor(rng() * 28), y = Math.floor(rng() * 29);
      box(ctx, C.floorDark, x, y + 1, 3, 2); box(ctx, C.floorLight, x, y, 2, 1);
    }
  },
  cavewall(ctx, rng) {
    box(ctx, C.stoneDark, 0, 0, T, T);
    for (const [x, y, w, h] of [[1, 1, 14, 9], [17, 2, 14, 8], [0, 12, 9, 9], [11, 11, 13, 10], [26, 12, 6, 9], [2, 23, 12, 8], [16, 23, 15, 8]]) {
      box(ctx, C.stone, x, y, w, h); box(ctx, C.stoneLight, x, y, w, 1); box(ctx, C.stoneLight, x, y, 1, h);
    }
    speckle(ctx, rng, C.stoneDark, 6, 2, 1);
  },
  cavetorch(ctx, rng) {
    DRAW.cavewall(ctx, rng);
    box(ctx, C.woodDark, 14, 14, 4, 12); box(ctx, C.wood, 15, 14, 2, 12); // the handle
    box(ctx, C.flame, 12, 6, 8, 9); box(ctx, C.flameLight, 14, 8, 4, 6); box(ctx, C.flame, 15, 3, 2, 3);
  },
  caveexit(ctx, rng) {
    DRAW.cavefloor(ctx, rng);
    for (let i = 0; i < 6; i++) box(ctx, `rgba(255, 240, 200, ${0.08 + i * 0.05})`, 4 + i, 4 * i + 4, T - 8 - 2 * i, 4); // daylight
  },
  fence(ctx, rng) {
    grass(ctx, rng);
    for (const y of [10, 20]) { box(ctx, C.woodDark, 0, y + 1, T, 3); box(ctx, C.wood, 0, y, T, 2); }
    for (const x of [4, 22]) { box(ctx, C.woodDark, x, 5, 6, 23); box(ctx, C.wood, x, 5, 5, 22); box(ctx, C.woodLight, x, 5, 1, 22); }
  },
};

/* Draws every frame side by side into a 2D context that is FRAMES.length * TILE wide. */
export function drawTileset(ctx) {
  FRAMES.forEach((name, i) => {
    ctx.save();
    ctx.translate(i * T, 0);
    ctx.beginPath(); ctx.rect(0, 0, T, T); ctx.clip();
    DRAW[name](ctx, seededRng(1000 + i));
    ctx.restore();
  });
}

export const missingTileArt = () => FRAMES.filter(f => !DRAW[f]);
