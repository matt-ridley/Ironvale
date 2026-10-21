// Terrain tiles in the 16-bit style, 32 x 32, drawn with code. terrain.js bakes them into one picture per map, giving
// every tile its own seeded dice (so the texture looks random but never changes) and adding the joins between tiles.
// Light comes from the top left. DRAW draws a tile's ground, clipped to its square; PROPS draws what stands on it
// (trees and boulders), which may spill a little over its neighbours.
import { TILES } from "../world/map.js";
import { seededRng } from "../rules/dice.js";
import { TILE } from "../config.js";

const T = TILE;

export const C = {
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
  board: "#b07e4c", boardDark: "#8a5e36", boardLight: "#c99a64", plaster: "#d8c8a0", plasterDark: "#b8a67c",
  book1: "#b04a36", book2: "#3f6fb0", book3: "#5a8f29", book4: "#e8b923",
  pine: "#2a6b45", pineDark: "#174a30", pineLight: "#3f8a58",
  oak: "#3b6e2c", oakDark: "#26501f", oakLight: "#5b8f3a",
  marsh: "#5d7a3e", marshDark: "#46602c", marshLight: "#7a9450",
  mud: "#6b5436", mudDark: "#4f3d26", mudLight: "#87704a",
  shallow: "#4f8a8a", shallowDark: "#3c6e70", shallowLight: "#8cc0b8",
  reed: "#b0a052", reedDark: "#7a6e32", reedHead: "#5a3b22",
  flag: "#8f8a80", flagDark: "#6a655c", flagLight: "#b0aa9e",
  deadwood: "#6e6458", deadwoodDark: "#4a4238",
  snow: "#e4ebf3", snowDark: "#b4c2d6", snowLight: "#ffffff", snowShadow: "#9fb0c8",
  ice: "#a9d6ee", iceDark: "#7db3d6", iceLight: "#e2f5ff",
  scree: "#8e8a92", screeDark: "#6a6670", screeLight: "#aeaab2",
  cliff: "#6f6a78", cliffDark: "#4a4652", cliffLight: "#8f8a98",
};

export const box = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const speckle = (ctx, rng, c, n, w = 1, h = 1) => { for (let i = 0; i < n; i++) box(ctx, c, Math.floor(rng() * (T - w + 1)), Math.floor(rng() * (T - h + 1)), w, h); };

export function grass(ctx, rng, blades = 26) {
  box(ctx, C.grass, 0, 0, T, T);
  speckle(ctx, rng, C.grassDark, blades, 1, 3);
  speckle(ctx, rng, C.grassLight, 10, 1, 2);
}

/* A filled ellipse at full resolution, coloured by where each pixel sits in it (for canopies and boulders). */
export function blob(ctx, cx, cy, rx, ry, colourAt) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    if (d <= 1) { ctx.fillStyle = colourAt(dx, dy, d); ctx.fillRect(x, y, 1, 1); }
  }
}

const rocky = (dx, dy, d) => (d > 0.8 ? C.rockDark : dx + dy < -0.6 ? C.rockLight : dx + dy > 0.5 ? C.rockDark : C.rock);

export const DRAW = {
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
  rock: (ctx, rng) => grass(ctx, rng, 18), // boulders: PROPS.rock
  cave(ctx, rng) {
    grass(ctx, rng, 18);
    blob(ctx, 16, 19, 17, 15, rocky); // a rocky mound with the way in at its foot
    blob(ctx, 16, 25, 9, 11, (dx, dy, d) => (d > 0.7 ? C.caveEdge : C.cave));
    box(ctx, C.cave, 7, 25, 18, 7);
    box(ctx, C.rockDark, 6, 31, 20, 1);
  },
  tree: (ctx, rng) => grass(ctx, rng), // the tree itself: PROPS.tree
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
  floorboards(ctx, rng) {
    box(ctx, C.board, 0, 0, T, T);
    for (let y = 0; y < T; y += 8) {
      box(ctx, C.boardLight, 0, y, T, 1);
      box(ctx, C.boardDark, 0, y + 7, T, 1);
      box(ctx, C.boardDark, (y * 5 + 6) % T, y, 1, 7); // where one board ends and the next begins
    }
    speckle(ctx, rng, C.boardDark, 6, 2, 1); // knots
  },
  backwall(ctx) {
    box(ctx, C.plaster, 0, 0, T, T);
    box(ctx, C.beam, 0, 0, T, 4); box(ctx, C.woodLight, 0, 0, T, 1); // the beam along the top
    box(ctx, C.plasterDark, 0, 4, T, 1);
    box(ctx, C.wood, 0, T - 10, T, 10); box(ctx, C.woodLight, 0, T - 10, T, 1); // wooden panelling
    for (let x = 3; x < T; x += 8) box(ctx, C.woodDark, x, T - 9, 1, 9);
    box(ctx, C.woodDark, 0, T - 2, T, 2);
  },
  dark(ctx) { box(ctx, C.cave, 0, 0, T, T); },
  doormat(ctx, rng) {
    DRAW.floorboards(ctx, rng);
    for (let i = 0; i < 5; i++) box(ctx, `rgba(255, 240, 200, ${0.06 + i * 0.05})`, 0, 22 + i * 2, T, 2); // daylight under the door
    box(ctx, C.roofDark, 4, 8, 24, 16);
    box(ctx, C.roof, 5, 9, 22, 14);
    for (let x = 7; x < 26; x += 4) box(ctx, C.roofLight, x, 11, 2, 10);
  },
  hearth(ctx) {
    DRAW.backwall(ctx);
    box(ctx, C.stoneDark, 3, 4, 26, 28);
    box(ctx, C.stone, 4, 5, 24, 26); box(ctx, C.stoneLight, 4, 5, 24, 1); box(ctx, C.stoneLight, 4, 5, 1, 26);
    for (const [x, y] of [[8, 9], [18, 9], [12, 14], [22, 15]]) box(ctx, C.stoneDark, x, y, 5, 1); // mortar
    box(ctx, C.cave, 9, 17, 14, 15); // the fire opening
    box(ctx, C.woodDark, 10, 28, 12, 3); // logs
    box(ctx, C.flame, 11, 21, 10, 7); box(ctx, C.flameLight, 13, 23, 6, 5); box(ctx, C.flame, 15, 19, 2, 2);
  },
  shelf(ctx) {
    DRAW.backwall(ctx);
    box(ctx, C.woodDark, 3, 5, 26, 27);
    box(ctx, C.wood, 4, 6, 24, 25);
    for (const y of [16, 27]) { box(ctx, C.woodLight, 4, y, 24, 2); box(ctx, C.woodDark, 4, y + 2, 24, 1); }
    const books = [C.book1, C.book2, C.book3, C.book4, C.book2, C.book1];
    books.forEach((c, i) => { box(ctx, c, 6 + i * 4, 8 + (i % 2), 3, 8 - (i % 2)); box(ctx, C.flameLight, 6 + i * 4, 10, 3, 1); });
    box(ctx, C.bottle, 7, 21, 4, 6); box(ctx, C.bottleLight, 8, 21, 1, 2); // a jar and a pot on the lower shelf
    box(ctx, C.roofDark, 17, 22, 7, 5); box(ctx, C.roof, 18, 22, 5, 1);
  },
  table(ctx, rng) {
    DRAW.floorboards(ctx, rng);
    box(ctx, C.shadow, 4, 24, 26, 5);
    box(ctx, C.woodDark, 5, 21, 3, 7); box(ctx, C.woodDark, 24, 21, 3, 7); // legs
    box(ctx, C.woodDark, 2, 7, 28, 15);
    box(ctx, C.woodLight, 3, 8, 26, 12); box(ctx, C.wood, 3, 16, 26, 4);
    box(ctx, C.wall, 8, 10, 5, 5); box(ctx, C.beam, 13, 11, 1, 3); // a mug
    box(ctx, C.wall, 18, 11, 8, 3); box(ctx, C.wallDark, 18, 13, 8, 1); // a plate
  },
  barrel(ctx, rng) {
    DRAW.floorboards(ctx, rng);
    blob(ctx, 16, 27, 11, 3, () => C.shadow);
    box(ctx, C.woodDark, 6, 4, 20, 24);
    box(ctx, C.wood, 7, 5, 18, 22); box(ctx, C.woodLight, 8, 5, 3, 22);
    for (const y of [8, 21]) box(ctx, C.stoneDark, 6, y, 20, 2); // iron hoops
    box(ctx, C.woodDark, 9, 4, 14, 2);
  },
  forge(ctx) { DRAW.smithy(ctx); }, // Brannoc's sign is an anvil too
  herbalist(ctx) {
    DRAW.door(ctx);
    box(ctx, C.beam, 5, 0, 22, 6); box(ctx, C.woodLight, 5, 0, 22, 1); // sign board
    box(ctx, C.leaf, 12, 1, 8, 4); box(ctx, C.leafShine, 13, 1, 3, 1); box(ctx, C.trunk, 15, 4, 2, 2); // a sprig of herbs
  },
  // Inside Ironvale Keep
  flagstone(ctx, rng) {
    box(ctx, C.stoneDark, 0, 0, T, T);
    for (const [x, y, w, h] of [[1, 1, 15, 14], [17, 1, 14, 9], [17, 11, 14, 11], [1, 16, 9, 15], [11, 16, 5, 6], [11, 23, 20, 8]]) {
      box(ctx, C.stone, x, y, w, h); box(ctx, C.stoneLight, x, y, w, 1);
    }
    speckle(ctx, rng, C.marshDark, 4, 2, 1); // moss in the cracks
  },
  rubble: (ctx, rng) => DRAW.flagstone(ctx, rng), // the heap itself: PROPS.rubble
  pew(ctx, rng) {
    DRAW.flagstone(ctx, rng);
    box(ctx, C.shadow, 0, 22, T, 6);
    box(ctx, C.woodDark, 0, 8, T, 14); box(ctx, C.wood, 0, 9, T, 6); box(ctx, C.woodLight, 0, 9, T, 1); // the back
    box(ctx, C.wood, 0, 16, T, 5); box(ctx, C.woodDark, 2, 21, 3, 6); box(ctx, C.woodDark, 27, 21, 3, 6); // the seat and legs
  },
  rack(ctx, rng) {
    DRAW.flagstone(ctx, rng);
    box(ctx, C.woodDark, 3, 4, 26, 3); box(ctx, C.woodDark, 3, 20, 26, 3); // two empty rails
    box(ctx, C.woodDark, 4, 4, 3, 26); box(ctx, C.woodDark, 25, 4, 3, 26);
    box(ctx, C.rockDark, 12, 7, 2, 13); box(ctx, C.rockLight, 12, 7, 1, 13); // one broken blade left behind
  },
  // Greywater Fen
  marsh(ctx, rng) {
    box(ctx, C.marsh, 0, 0, T, T);
    speckle(ctx, rng, C.marshDark, 24, 1, 3);
    speckle(ctx, rng, C.marshLight, 8, 1, 2);
    if (rng() < 0.3) { const x = 4 + Math.floor(rng() * 20), y = 4 + Math.floor(rng() * 20); box(ctx, C.shallowDark, x, y, 6, 2); box(ctx, C.shallow, x + 1, y, 4, 1); } // a puddle
  },
  reeds(ctx, rng) {
    DRAW.marsh(ctx, rng);
    for (let i = 0; i < 9; i++) {
      const x = 2 + Math.floor(rng() * 28), h = 10 + Math.floor(rng() * 10), y = T - 2 - h;
      box(ctx, C.reedDark, x + 1, y + 2, 1, h);
      box(ctx, C.reed, x, y + 2, 1, h);
      box(ctx, C.reedHead, x, y, 2, 4); // a bulrush head
    }
  },
  shallow(ctx, rng) {
    box(ctx, C.shallow, 0, 0, T, T);
    speckle(ctx, rng, C.shallowDark, 12, 3, 1);
    for (const [x, y] of [[4, 8], [16, 18], [8, 26]]) box(ctx, C.shallowLight, x + Math.floor(rng() * 6), y, 5, 1);
    speckle(ctx, rng, C.marshDark, 4, 1, 3); // weed under the water
  },
  mud(ctx, rng) {
    box(ctx, C.mud, 0, 0, T, T);
    speckle(ctx, rng, C.mudDark, 20, 2, 1);
    speckle(ctx, rng, C.mudLight, 8);
    for (let i = 0; i < 3; i++) { const x = Math.floor(rng() * 26), y = Math.floor(rng() * 28); box(ctx, C.mudDark, x, y + 1, 5, 2); box(ctx, C.shallow, x + 1, y + 1, 3, 1); } // footprints, filled with water
  },
  boardwalk(ctx, rng) {
    DRAW.shallow(ctx, rng);
    box(ctx, C.woodDark, 2, 0, 28, T);
    for (let y = 0; y < T; y += 6) { box(ctx, C.wood, 3, y, 26, 5); box(ctx, C.woodLight, 3, y, 26, 1); box(ctx, C.woodDark, 6 + ((y * 7) % 18), y + 2, 1, 1); }
  },
  deadtree: (ctx, rng) => DRAW.marsh(ctx, rng), // the tree itself: PROPS.deadtree
  causeway(ctx, rng) {
    box(ctx, C.flagDark, 0, 0, T, T);
    for (const [x, y, w, h] of [[1, 1, 14, 9], [16, 1, 15, 9], [1, 11, 9, 9], [11, 11, 20, 9], [1, 21, 18, 10], [20, 21, 11, 10]]) {
      box(ctx, C.flag, x, y, w, h); box(ctx, C.flagLight, x, y, w, 1);
    }
    speckle(ctx, rng, C.marshDark, 6, 2, 1); // moss between the stones
  },
  keepwall(ctx, rng) {
    box(ctx, C.flagDark, 0, 0, T, T);
    for (let y = 0; y < T; y += 8) for (let x = (y % 16 ? -8 : 0); x < T; x += 16) { box(ctx, C.flag, x + 1, y + 1, 14, 6); box(ctx, C.flagLight, x + 1, y + 1, 14, 1); }
    speckle(ctx, rng, C.marshDark, 5, 2, 2); // creeping moss
  },
  palisade(ctx, rng) {
    DRAW.marsh(ctx, rng);
    for (let x = 0; x < T; x += 8) {
      box(ctx, C.woodDark, x, 2, 8, 30); box(ctx, C.wood, x + 1, 4, 6, 28); box(ctx, C.woodLight, x + 1, 4, 1, 28);
      box(ctx, C.woodDark, x + 2, 0, 4, 3); // sharpened tops
    }
    box(ctx, C.woodDark, 0, 14, T, 2); // the rope that binds them
  },
  passage(ctx, rng) {
    DRAW.marsh(ctx, rng);
    blob(ctx, 16, 19, 17, 15, rocky); // a rocky mound with the way down at its foot
    blob(ctx, 16, 25, 9, 11, (dx, dy, d) => (d > 0.7 ? C.caveEdge : C.cave));
    box(ctx, C.cave, 7, 25, 18, 7);
  },
  // The Mountain Pass
  snow(ctx, rng) {
    box(ctx, C.snow, 0, 0, T, T);
    speckle(ctx, rng, C.snowDark, 10, 2, 1);
    speckle(ctx, rng, C.snowLight, 14);
    if (rng() < 0.3) { const x = 3 + Math.floor(rng() * 22), y = 4 + Math.floor(rng() * 22); box(ctx, C.snowDark, x, y + 2, 7, 1); box(ctx, C.snowLight, x + 1, y, 5, 2); } // a little drift
  },
  deepsnow(ctx, rng) {
    box(ctx, C.snow, 0, 0, T, T);
    for (let y = 2; y < T; y += 8) { // rolling drifts
      const x = Math.floor(rng() * 10) - 4;
      blob(ctx, x + 10, y + 4, 9, 3, (dx, dy) => (dy < -0.2 ? C.snowLight : dy > 0.4 ? C.snowShadow : C.snow));
      blob(ctx, x + 26, y + 3, 8, 3, (dx, dy) => (dy < -0.2 ? C.snowLight : dy > 0.4 ? C.snowShadow : C.snow));
    }
  },
  ice(ctx, rng) {
    box(ctx, C.ice, 0, 0, T, T);
    speckle(ctx, rng, C.iceDark, 6, 4, 1);
    for (let i = 0; i < 3; i++) { // glints and cracks
      const x = Math.floor(rng() * 24), y = Math.floor(rng() * 28);
      box(ctx, C.iceLight, x, y, 6, 1); box(ctx, C.iceLight, x + 1, y + 1, 3, 1);
    }
    box(ctx, C.iceDark, Math.floor(rng() * 28), Math.floor(rng() * 20), 1, 6);
  },
  scree(ctx, rng) {
    box(ctx, C.scree, 0, 0, T, T);
    for (let i = 0; i < 14; i++) { // loose stones
      const x = Math.floor(rng() * 29), y = Math.floor(rng() * 30);
      box(ctx, C.screeDark, x, y + 1, 3, 2); box(ctx, C.screeLight, x, y, 2, 1);
    }
    speckle(ctx, rng, C.snowLight, 6); // a dusting of snow
  },
  cliff(ctx, rng) {
    box(ctx, C.cliffDark, 0, 0, T, T);
    for (const [x, y, w, h] of [[0, 3, 15, 12], [16, 1, 16, 11], [2, 16, 12, 9], [15, 13, 17, 12], [0, 26, 31, 6]]) {
      box(ctx, C.cliff, x, y, w, h); box(ctx, C.cliffLight, x, y, w, 1); box(ctx, C.cliffLight, x, y, 1, h);
    }
    box(ctx, C.snow, 0, 0, T, 3); box(ctx, C.snowLight, 0, 0, T, 1); // snow on top
    for (let x = 0; x < T; x += 4 + Math.floor(rng() * 4)) box(ctx, C.snow, x, 3, 2, 1 + Math.floor(rng() * 3));
  },
  chasm(ctx, rng) {
    box(ctx, C.cave, 0, 0, T, T);
    speckle(ctx, rng, "#1c2030", 10, 3, 2);
    for (let i = 0; i < 3; i++) box(ctx, "rgba(200, 220, 255, 0.08)", Math.floor(rng() * 24), Math.floor(rng() * 28), 8, 2); // mist far below
  },
  ropebridge(ctx, rng) {
    DRAW.chasm(ctx, rng);
    box(ctx, C.woodDark, 5, 0, 22, T);
    for (let y = 1; y < T; y += 5) { box(ctx, C.wood, 6, y, 20, 3); box(ctx, C.woodLight, 6, y, 20, 1); }
    for (const x of [3, 27]) { box(ctx, C.reed, x, 0, 2, T); box(ctx, C.reedDark, x + 1, 0, 1, T); } // the ropes
  },
  snowpine: (ctx, rng) => DRAW.snow(ctx, rng), // the tree itself: PROPS.snowpine
  snowrock: (ctx, rng) => DRAW.snow(ctx, rng), // the boulders: PROPS.snowrock
  fence(ctx, rng) {
    grass(ctx, rng);
    for (const y of [10, 20]) { box(ctx, C.woodDark, 0, y + 1, T, 3); box(ctx, C.wood, 0, y, T, 2); }
    for (const x of [4, 22]) { box(ctx, C.woodDark, x, 5, 6, 23); box(ctx, C.wood, x, 5, 5, 22); box(ctx, C.woodLight, x, 5, 1, 22); }
  },
};

/* A small picture drawn once and then copied wherever it's needed (drawing trees and boulders pixel by pixel every
   time would make baking a big map slow on a phone). draw(ctx) paints it. */
const stamps = new Map();
function stamp(key, w, h, draw) {
  if (!stamps.has(key)) {
    const c = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
    draw(c.getContext("2d"));
    stamps.set(key, c);
  }
  return stamps.get(key);
}

const TREE_LOOKS = 12; // a dozen trees, in three kinds, picked at random
const SPILL = 8; // how far a tree may reach past its tile

function drawTree(ctx, rng, kind) {
  blob(ctx, 17, 31, 12, 3, () => C.shadow); // shadow on the grass
  if (kind === "pine") {
    box(ctx, C.trunk, 14, 24, 5, 7); box(ctx, C.trunkLight, 14, 24, 1, 7);
    for (let tier = 0; tier < 3; tier++) { // three tiers of branches, each wider than the last
      const top = -4 + tier * 8, h = 13, w = 8 + tier * 4;
      for (let row = 0; row < h; row++) {
        const half = Math.round(((row + 1) / h) * w);
        box(ctx, C.pineDark, 16 - half, top + row, half * 2 + 1, 1);
        box(ctx, C.pine, 16 - half + 1, top + row, half * 2 - 1, 1);
        box(ctx, C.pineLight, 16 - half + 1, top + row, Math.max(1, Math.floor(half * 0.6)), 1);
      }
      box(ctx, C.pineDark, 16 - w, top + h - 1, w * 2 + 1, 1);
    }
    return;
  }
  box(ctx, C.trunk, 14, 21, 5, 10); box(ctx, C.trunkLight, 14, 21, 1, 10);
  const [main, dark, light] = kind === "oak" ? [C.oak, C.oakDark, C.oakLight] : [C.leaf, C.leafDark, C.leafLight];
  const leafy = (dx, dy, d) => (d > 0.85 || dx + dy > 0.45 ? dark : dx + dy < -0.7 && d < 0.6 ? C.leafShine : dx + dy < -0.2 ? light : main);
  if (kind === "oak") { // a lumpier crown out of three overlapping clumps
    blob(ctx, 9, 14, 10, 9, leafy); blob(ctx, 23, 13, 10, 10, leafy); blob(ctx, 16, 6, 11, 9, leafy);
  } else blob(ctx, 16, 11, 16, 14, leafy);
  for (let i = 0; i < 16; i++) { // leaf clumps
    const a = rng() * Math.PI * 2, rad = rng() * 11;
    const x = Math.round(16 + Math.cos(a) * rad), y = Math.round(11 + Math.sin(a) * rad * 0.8);
    box(ctx, y + x < 24 ? light : dark, x, y, 2, 1);
  }
}

/* A boulder of radius rad centred on x, y, with its shadow and a crack. */
function boulder(ctx, x, y, rad) {
  const r = Math.round(rad), pad = 3, size = 2 * r + 2 * pad;
  const img = stamp(`boulder${r}`, size + 2, size, c => {
    blob(c, r + pad + 2, r + pad + r * 0.65, r, r * 0.35, () => C.shadow);
    blob(c, r + pad, r + pad, r, r * 0.85, rocky);
    box(c, C.rockDark, Math.round(r + pad - r * 0.2), Math.round(r + pad + r * 0.1), Math.round(r * 0.5), 1); // a crack
  });
  ctx.drawImage(img, Math.round(x) - r - pad, Math.round(y) - r - pad);
}

/* Things standing on a tile, drawn after every tile's ground so they can overlap their neighbours a little: a tree's
   canopy reaches over the tile above, and boulders spill into the next rock tile, so forests and rocky hills read as
   one mass. `next(dx, dy)` names the tile that far away. */
export const PROPS = {
  snowpine(ctx, rng) {
    const look = Math.floor(rng() * 4);
    const img = stamp(`snowpine${look}`, T + 2 * SPILL, T + 2 * SPILL, c => {
      c.translate(SPILL, SPILL);
      drawTree(c, seededRng(look * 13 + 5), "pine");
      const r = seededRng(look * 7 + 1);
      for (let tier = 0; tier < 3; tier++) { // snow along each tier's branches
        const top = -4 + tier * 8, w = 8 + tier * 4;
        for (let i = 0; i < 4 + tier; i++) box(c, i % 2 ? C.snow : C.snowLight, 16 - w + Math.floor(r() * w * 2), top + 6 + Math.floor(r() * 6), 3, 1);
      }
      box(c, C.snowLight, 15, -4, 3, 2);
    });
    ctx.drawImage(img, -SPILL, -SPILL);
  },
  snowrock(ctx, rng, next) {
    PROPS.rock(ctx, rng, (dx, dy) => (next(dx, dy) === "snowrock" ? "rock" : null));
    for (let i = 0; i < 3; i++) box(ctx, C.snowLight, 6 + Math.floor(rng() * 18), 2 + Math.floor(rng() * 14), 5, 2); // snow on the tops
  },
  rubble(ctx, rng) {
    for (const [x, y, rad] of [[9 + rng() * 4, 14 + rng() * 4, 7], [21 + rng() * 4, 12 + rng() * 6, 8], [15 + rng() * 4, 22 + rng() * 3, 7]]) boulder(ctx, x, y, rad);
  },
  deadtree(ctx, rng) {
    const look = Math.floor(rng() * 4);
    const img = stamp(`deadtree${look}`, T + 2 * SPILL, T + 2 * SPILL, c => {
      c.translate(SPILL, SPILL);
      const r = seededRng(look * 17 + 3);
      blob(c, 16, 31, 9, 2, () => C.shadow);
      box(c, C.deadwoodDark, 14, 6, 5, 25); box(c, C.deadwood, 14, 6, 3, 25); // the trunk
      for (let i = 0; i < 4; i++) { // bare branches, reaching up and out
        const y = 6 + i * 5, left = i % 2 === 0, len = 6 + Math.floor(r() * 6);
        for (let k = 0; k < len; k++) box(c, k % 3 ? C.deadwood : C.deadwoodDark, left ? 14 - k : 18 + k, y - Math.floor(k / 2), 2, 2);
      }
    });
    ctx.drawImage(img, -SPILL, -SPILL);
  },
  tree(ctx, rng) {
    const look = Math.floor(rng() * TREE_LOOKS);
    const kind = ["oak", "round", "oak", "round", "pine"][look % 5];
    const img = stamp(`tree${look}`, T + 2 * SPILL, T + 2 * SPILL, c => { c.translate(SPILL, SPILL); drawTree(c, seededRng(look * 31 + 7), kind); });
    ctx.drawImage(img, -SPILL, -SPILL);
  },
  rock(ctx, rng, next) {
    // A heap of big boulders that fills the tile, so rocky ground reads as a wall you can't walk through.
    const stones = [[8 + rng() * 4, 8 + rng() * 4, 10 + rng() * 2], [23 + rng() * 4, 10 + rng() * 5, 9 + rng() * 2], [14 + rng() * 6, 22 + rng() * 3, 10 + rng() * 2]];
    // Neighbouring rock: a boulder over the join, so a rocky hill doesn't fall apart into squares.
    if (next(1, 0) === "rock") stones.push([31 + rng() * 2, 8 + rng() * 16, 8 + rng() * 2]);
    if (next(0, 1) === "rock") stones.push([6 + rng() * 20, 31 + rng() * 2, 8 + rng() * 2]);
    for (const [x, y, rad] of stones.sort((a, b) => a[1] - b[1])) boulder(ctx, x, y, rad);
  },
};

/* One colour per tile, for the world map. */
export const MAP_COLOURS = {
  grass: C.grass, flowers: "#6aa84f", path: C.path, bridge: C.wood, cave: C.cave, tree: C.leafDark, water: C.water,
  rock: C.rock, roof: C.roof, wall: C.wall, door: C.beam, smithy: C.beam, apothecary: C.beam, bank: C.beam, fence: C.wood,
  marsh: C.marsh, reeds: C.reed, shallow: C.shallow, mud: C.mud, boardwalk: C.wood, deadtree: C.deadwoodDark, causeway: C.flag,
  keepwall: C.flagDark, palisade: C.woodDark, passage: C.cave, forge: C.beam, herbalist: C.beam,
  flagstone: C.stone, rubble: C.rock, pew: C.wood, rack: C.woodDark,
  snow: C.snow, deepsnow: C.snowDark, ice: C.ice, scree: C.scree, cliff: C.cliffDark, chasm: C.cave, ropebridge: C.wood,
  snowpine: C.pineDark, snowrock: C.cliff,
};

export const missingTileArt = () => [...new Set(Object.values(TILES).map(t => t.name))].filter(n => !DRAW[n]);
