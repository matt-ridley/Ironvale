// The ground under the world, baked into one picture per map. Every tile's art (tiles.js) is drawn with dice seeded by
// where it is, so no two patches of grass look alike; then the joins between tiles (river banks, the ragged edges of
// paths, shadows under walls, roof ridges and eaves, the foot of cave walls); then trees and boulders, which overlap
// their neighbours so a wood reads as one canopy. The World scene shows the picture as a single image. joins() has no
// drawing in it, so it can be tested.
import { TILE } from "../config.js";
import { TILES, inBounds } from "../world/map.js";
import { DRAW, PROPS, C, box } from "./tiles.js";
import { seededRng } from "../rules/dice.js";

const T = TILE;
const WET = new Set(["water", "bridge", "shallow", "boardwalk"]);
const GREEN = new Set(["grass", "flowers", "tree", "fence", "rock"]); // ground a path frays into
const TALL = new Set(["wall", "door", "smithy", "apothecary", "bank", "cavewall", "cavetorch", "backwall", "hearth", "shelf", "keepwall", "palisade"]);
const SIDES = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const CORNERS = { nw: ["n", "w", -1, -1], ne: ["n", "e", 1, -1], se: ["s", "e", 1, 1], sw: ["s", "w", -1, 1] };
const TURN = { n: 0, e: 1, s: 2, w: 3, nw: 0, ne: 1, se: 2, sw: 3 }; // quarter turns from the top (or top-left corner)

export const nameAt = (map, x, y) => (inBounds(map, x, y) ? TILES[map.rows[y][x]].name : null);

/* How tile x, y meets its neighbours. Off the map counts as more of the same, so map edges get no joins.
   - bank: water's sides that touch land ({ side, next }: next names the land); bankCorners: land only diagonally
   - verge: a path's sides that fray into grass; vergeCorners: grass only diagonally
   - shade: "n" under something tall (a wall, a cave wall), "w" just right of one
   - roof: { ridge, eave, w, e } where a roof ends
   - ledge: a cave wall with open floor below it */
export function joins(map, x, y) {
  const name = nameAt(map, x, y);
  const at = (dx, dy) => nameAt(map, x + dx, y + dy) ?? name;
  const out = { bank: [], bankCorners: [], verge: [], vergeCorners: [], shade: [], roof: null, ledge: false };
  if (name === "water") {
    for (const [side, [dx, dy]] of Object.entries(SIDES)) if (!WET.has(at(dx, dy))) out.bank.push({ side, next: at(dx, dy) });
    for (const [corner, [a, b, dx, dy]] of Object.entries(CORNERS)) {
      const open = s => WET.has(at(...SIDES[s]));
      if (open(a) && open(b) && !WET.has(at(dx, dy))) out.bankCorners.push({ side: corner, next: at(dx, dy) });
    }
  }
  if (name === "path") {
    for (const [side, [dx, dy]] of Object.entries(SIDES)) if (GREEN.has(at(dx, dy))) out.verge.push(side);
    for (const [corner, [a, b, dx, dy]] of Object.entries(CORNERS)) {
      const green = s => GREEN.has(at(...SIDES[s]));
      if (!green(a) && !green(b) && GREEN.has(at(dx, dy))) out.vergeCorners.push(corner);
    }
  }
  if (!TALL.has(name) && name !== "roof") {
    if (TALL.has(at(0, -1))) out.shade.push("n");
    if (TALL.has(at(-1, 0))) out.shade.push("w");
  }
  if (name === "roof") out.roof = { ridge: at(0, -1) !== "roof", eave: at(0, 1) !== "roof", w: at(-1, 0) !== "roof", e: at(1, 0) !== "roof" };
  if ((name === "cavewall" || name === "cavetorch") && !["cavewall", "cavetorch"].includes(at(0, 1))) out.ledge = true;
  return out;
}

/* Runs draw() with the context turned so that `side` (or corner) is at the top (or top left) of the tile. */
function turned(ctx, side, draw) {
  ctx.save();
  ctx.translate(T / 2, T / 2);
  ctx.rotate((TURN[side] * Math.PI) / 2);
  ctx.translate(-T / 2, -T / 2);
  draw();
  ctx.restore();
}

/* The colours of the ground beside water, for its bank: the land's edge, its shadow, and the earth under it. */
const UNDERGROUND = [C.floor, C.floorDark, C.stoneDark];
const LAND = {
  cavefloor: UNDERGROUND, caveexit: UNDERGROUND, cavewall: [C.stone, C.stoneDark, C.stoneDark], cavetorch: [C.stone, C.stoneDark, C.stoneDark],
  path: [C.path, C.pathDark, C.pathDark], bridge: [C.wood, C.woodDark, C.woodDark],
  marsh: [C.marsh, C.marshDark, C.mud], reeds: [C.marsh, C.marshDark, C.mud], mud: [C.mud, C.mudDark, C.mudDark],
  deadtree: [C.marsh, C.marshDark, C.mud], causeway: [C.flag, C.flagDark, C.flagDark], passage: [C.marsh, C.marshDark, C.mud],
};
const landColours = next => LAND[next] || [C.grass, C.grassDark, C.pathDark];

function drawJoins(ctx, j, rng) {
  for (const { side, next } of j.bank) turned(ctx, side, () => {
    const [land, landDark, earth] = landColours(next);
    box(ctx, "rgba(20, 30, 70, 0.22)", 0, 0, T, 6); // the bank's shadow on the water
    for (let x = 0; x < T; x++) {
      const d = 2 + (rng() < 0.3 ? 1 : 0);
      box(ctx, land, x, 0, 1, d);
      box(ctx, landDark, x, d, 1, 1);
      box(ctx, earth, x, d + 1, 1, 2); // the earth of the bank
      if (rng() < 0.75) box(ctx, C.waterLight, x, d + 3 + (rng() < 0.25 ? 1 : 0), 1, 1); // ripples along the edge
    }
  });
  for (const { side, next } of j.bankCorners) turned(ctx, side, () => {
    const [land, landDark, earth] = landColours(next);
    box(ctx, earth, 0, 0, 6, 4); box(ctx, earth, 0, 0, 4, 6); box(ctx, earth, 0, 0, 5, 5);
    box(ctx, land, 0, 0, 3, 3); box(ctx, land, 0, 0, 4, 2); box(ctx, land, 0, 0, 2, 4);
    box(ctx, landDark, 3, 2, 1, 1); box(ctx, landDark, 2, 3, 1, 1);
    box(ctx, C.waterLight, 6, 4, 1, 1); box(ctx, C.waterLight, 5, 5, 1, 1); box(ctx, C.waterLight, 4, 6, 1, 1);
  });
  for (const side of j.verge) turned(ctx, side, () => {
    let d = 1 + Math.floor(rng() * 2);
    for (let x = 0; x < T; x++) {
      if (rng() < 0.45) d = Math.max(0, Math.min(3, d + (rng() < 0.5 ? -1 : 1)));
      if (d) box(ctx, C.grass, x, 0, 1, d);
      if (d && rng() < 0.35) box(ctx, C.grassDark, x, d - 1, 1, 1);
      box(ctx, C.pathDark, x, d, 1, 1); // the worn rim
    }
  });
  for (const corner of j.vergeCorners) turned(ctx, corner, () => {
    box(ctx, C.grass, 0, 0, 3, 2); box(ctx, C.grass, 0, 0, 2, 3);
    box(ctx, C.pathDark, 3, 1, 1, 1); box(ctx, C.pathDark, 2, 2, 1, 1); box(ctx, C.pathDark, 1, 3, 1, 1);
  });
  if (j.shade.includes("n")) { box(ctx, "rgba(0, 0, 0, 0.22)", 0, 0, T, 4); box(ctx, "rgba(0, 0, 0, 0.1)", 0, 4, T, 4); }
  if (j.shade.includes("w")) box(ctx, "rgba(0, 0, 0, 0.12)", 0, 0, 3, T);
  if (j.roof) {
    const r = j.roof;
    if (r.ridge) { box(ctx, C.roofDark, 0, 0, T, 4); for (let x = 1; x < T; x += 4) box(ctx, C.roofLight, x, 0, 2, 2); }
    if (r.eave) { box(ctx, C.roofDark, 0, T - 4, T, 4); box(ctx, C.roofLight, 0, T - 4, T, 1); }
    if (r.w) { box(ctx, C.beam, 0, 0, 3, T); box(ctx, C.woodLight, 0, 0, 1, T); }
    if (r.e) { box(ctx, C.beam, T - 3, 0, 3, T); box(ctx, C.woodDark, T - 1, 0, 1, T); }
  }
  if (j.ledge) { // the foot of the wall, lit along its top edge
    box(ctx, C.stoneDark, 0, T - 9, T, 9);
    box(ctx, C.stone, 0, T - 9, T, 6); box(ctx, C.stoneLight, 0, T - 9, T, 1);
    for (let x = 3 + Math.floor(rng() * 6); x < T; x += 7 + Math.floor(rng() * 5)) box(ctx, C.stoneDark, x, T - 8, 1, 5);
  }
}

const seed = (map, x, y) => (x * 73856093) ^ (y * 19349663) ^ (map.width * 83492791);

/* Draws the whole map into ctx (map.width * TILE by map.height * TILE). */
export function drawTerrain(ctx, map) {
  const props = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    let name = nameAt(map, x, y);
    const rng = seededRng(seed(map, x, y));
    if (name === "grass" && rng() < 0.2) name = "grass2";
    ctx.save();
    ctx.translate(x * T, y * T);
    ctx.beginPath(); ctx.rect(0, 0, T, T); ctx.clip();
    DRAW[name](ctx, rng);
    drawJoins(ctx, joins(map, x, y), rng);
    ctx.restore();
    if (PROPS[name]) props.push([x, y, name, rng]);
  }
  // Trees and boulders last, top row first, so each overlaps the one behind it.
  for (const [x, y, name, rng] of props) {
    ctx.save();
    ctx.translate(x * T, y * T);
    PROPS[name](ctx, rng, (dx, dy) => nameAt(map, x + dx, y + dy));
    ctx.restore();
  }
}
