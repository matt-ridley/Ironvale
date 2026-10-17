// Placeholder 16x16 terrain tiles, drawn with code into one strip (frame order = FRAMES in world/map.js).
// Each tile uses its own seeded dice, so the speckles look random but are the same every time.
import { FRAMES } from "../world/map.js";
import { seededRng } from "../rules/dice.js";

export const TILE = 16;

const C = {
  grass: "#4a7a3a", grassDark: "#3e6a31", grassLight: "#5c8f45",
  path: "#a07d50", pathDark: "#86673f", pathLight: "#b8956a",
  water: "#2f6fa8", waterLight: "#5b97cf", waterDark: "#255a8a",
  wood: "#8a5a2e", woodDark: "#5e3b1c",
  leaf: "#2f5e25", leafLight: "#3f7a31", leafDark: "#21451a", trunk: "#5e3b1c",
  rock: "#7a7a82", rockLight: "#9c9ca4", rockDark: "#55555c",
  roof: "#a0402f", roofDark: "#7d3024",
  wall: "#d8c9a3", beam: "#6b4226",
  flowerY: "#f4d03f", flowerW: "#f5f5f0", flowerR: "#e0645c",
  cave: "#0f0f16",
};

function speckle(ctx, rng, color, n, w = 1, h = 1) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) ctx.fillRect(Math.floor(rng() * (TILE - w + 1)), Math.floor(rng() * (TILE - h + 1)), w, h);
}

function fill(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, TILE, TILE); }

function grass(ctx, rng) {
  fill(ctx, C.grass);
  speckle(ctx, rng, C.grassDark, 9, 1, 2);
  speckle(ctx, rng, C.grassLight, 4);
}

const DRAW = {
  grass,
  grass2(ctx, rng) {
    grass(ctx, rng);
    speckle(ctx, rng, C.grassDark, 6, 1, 2);
  },
  flowers(ctx, rng) {
    grass(ctx, rng);
    for (const col of [C.flowerY, C.flowerW, C.flowerR, C.flowerY]) {
      const x = 2 + Math.floor(rng() * 11), y = 2 + Math.floor(rng() * 11);
      ctx.fillStyle = col; ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = C.flowerY; ctx.fillRect(x, y, 1, 1);
    }
  },
  path(ctx, rng) {
    fill(ctx, C.path);
    speckle(ctx, rng, C.pathDark, 10);
    speckle(ctx, rng, C.pathLight, 6);
  },
  bridge(ctx) {
    fill(ctx, C.wood);
    ctx.fillStyle = C.woodDark;
    for (let x = 3; x < TILE; x += 4) ctx.fillRect(x, 0, 1, TILE); // planks run across the river
    ctx.fillRect(0, 0, TILE, 1); ctx.fillRect(0, TILE - 1, TILE, 1);  // rails
  },
  cave(ctx, rng) {
    DRAW.rock(ctx, rng);
    ctx.fillStyle = C.cave;
    ctx.fillRect(3, 4, 10, 12); ctx.fillRect(4, 3, 8, 1); ctx.fillRect(5, 2, 6, 1);
  },
  tree(ctx, rng) {
    grass(ctx, rng);
    ctx.fillStyle = C.trunk; ctx.fillRect(7, 11, 2, 4);
    ctx.fillStyle = C.leafDark;
    for (let y = 0; y < 13; y++) for (let x = 0; x < TILE; x++) if ((x - 7.5) ** 2 + ((y - 6) * 1.15) ** 2 <= 44) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = C.leaf;
    for (let y = 0; y < 12; y++) for (let x = 0; x < TILE; x++) if ((x - 7) ** 2 + ((y - 5.5) * 1.15) ** 2 <= 30) ctx.fillRect(x, y, 1, 1);
    speckle(ctx, rng, C.leafLight, 6);
    ctx.fillStyle = C.leafLight; ctx.fillRect(4, 3, 2, 1); ctx.fillRect(3, 4, 1, 2);
  },
  water(ctx, rng) {
    fill(ctx, C.water);
    speckle(ctx, rng, C.waterDark, 6, 2, 1);
    ctx.fillStyle = C.waterLight;
    ctx.fillRect(2, 4, 4, 1); ctx.fillRect(9, 9, 4, 1); ctx.fillRect(4, 13, 3, 1);
  },
  rock(ctx, rng) {
    fill(ctx, C.rock);
    speckle(ctx, rng, C.rockDark, 8, 2, 1);
    speckle(ctx, rng, C.rockLight, 6);
    ctx.fillStyle = C.rockDark; ctx.fillRect(0, TILE - 1, TILE, 1);
  },
  roof(ctx) {
    fill(ctx, C.roof);
    ctx.fillStyle = C.roofDark;
    for (let y = 3; y < TILE; y += 4) {
      ctx.fillRect(0, y, TILE, 1);
      for (let x = (y % 8 === 3 ? 0 : 2); x < TILE; x += 4) ctx.fillRect(x, y - 3, 1, 3);
    }
  },
  wall(ctx) {
    fill(ctx, C.wall);
    ctx.fillStyle = C.beam;
    ctx.fillRect(0, 0, TILE, 2); ctx.fillRect(0, TILE - 2, TILE, 2);
    ctx.fillRect(0, 0, 2, TILE); ctx.fillRect(TILE - 2, 0, 2, TILE);
    ctx.fillStyle = "#3d5a73"; ctx.fillRect(5, 5, 6, 5); // window
    ctx.fillStyle = C.beam; ctx.fillRect(7, 5, 2, 5);
  },
  door(ctx) {
    DRAW.wall(ctx);
    ctx.fillStyle = C.woodDark; ctx.fillRect(4, 3, 8, 13);
    ctx.fillStyle = C.wood; ctx.fillRect(5, 4, 6, 12);
    ctx.fillStyle = C.flowerY; ctx.fillRect(9, 10, 1, 1);
  },
  smithy(ctx) {
    DRAW.door(ctx);
    ctx.fillStyle = C.beam; ctx.fillRect(3, 0, 10, 3); // sign board
    ctx.fillStyle = "#2c2c3a"; ctx.fillRect(5, 1, 6, 1); ctx.fillRect(7, 2, 2, 1); // anvil
  },
  fence(ctx, rng) {
    grass(ctx, rng);
    ctx.fillStyle = C.woodDark; ctx.fillRect(0, 5, TILE, 2); ctx.fillRect(0, 10, TILE, 2);
    ctx.fillStyle = C.wood; ctx.fillRect(2, 3, 3, 11); ctx.fillRect(11, 3, 3, 11);
  },
};

/* Draws every frame side by side into a 2D canvas context that is FRAMES.length * 16 wide. */
export function drawTileset(ctx) {
  FRAMES.forEach((name, i) => {
    ctx.save();
    ctx.translate(i * TILE, 0);
    ctx.beginPath(); ctx.rect(0, 0, TILE, TILE); ctx.clip();
    DRAW[name](ctx, seededRng(1000 + i));
    ctx.restore();
  });
}

export const missingTileArt = () => FRAMES.filter(f => !DRAW[f]);
