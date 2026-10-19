// Megan, drawn like the hero: 16 x 24, rendered at double detail (32 x 48) with shading, so the two match side by
// side in battle and in the world. Same facings and four-frame walk as the hero; the legs are the hero's leg rows,
// which come out as leggings and boots in her colours.
// Colours: o outline, c cloak, C cloak shadow, r hair, s skin, e eyes, p cheeks, t tunic, T tunic shadow,
// y buckle, d bow wood, w bowstring, q quiver, a leggings, A leggings shadow, b boots.
import { HERO_LEGS } from "./hero.js";

export const MEGAN_COLOURS = {
  o: "#2b1d2e", c: "#4f8a3a", C: "#355f2a", r: "#b5532c", s: "#f2c39b", e: "#2b2f3a", p: "#e89aa0",
  t: "#d8c08a", T: "#a88f5c", y: "#e8b84a", d: "#8a5a2f", w: "#e9eef2", q: "#7a4a2a",
  a: "#6d6a52", A: "#4c4a39", b: "#6b4a2f",
};

const FRONT = [
  "................",
  "......oooo......",
  "....oocccCoo....",
  "...occccccCCo...",
  "...ocrrrrrrCo...",
  "...orsessesro...",
  "...orpssssprr...",
  "....oossssoor...",
  "...occttttCCor..",
  "..occtttttTCCo..",
  ".ocoottttTToco..",
  ".ocoottttTToco..",
  ".osobbbybbbboso.",
  ".oo.otttttTo.oo.",
  "....otttttTo....",
  "....ottootTo....",
];

const BACK = [
  "................",
  "......oooo......",
  "....oocccCoo....",
  "...occccccCCo...",
  "...occccccCCo...",
  "...occccccCCo...",
  "...oCccccCCCo...",
  "....oCrrrrCo....",
  "...occqrrqcCo...",
  "..occcqrrqccCo..",
  ".ocoocqqqcCoco..",
  ".ocooccqccCoco..",
  ".osobbbbbbbboso.",
  ".oo.occcccCo.oo.",
  "....occcCCCo....",
  "....ottootTo....",
];

// Facing right, bow held out in front.
const SIDE = [
  "................",
  "......oooo......",
  ".....occccoo....",
  "....occcccCo..od",
  "...occrrrrro.odw",
  "...ocrssseso.odw",
  "...ocrssspso.odw",
  "....orrrosso.odw",
  "...ocqqtttTo.odw",
  "..occqttttsssodw",
  "..occqtttTTooodw",
  "..occttttTTo.odw",
  "..occbbbybbo.odw",
  "..occottttoo..od",
  "...ocottTTo....o",
  "....otttTTo.....",
];

const L = HERO_LEGS;
const mirror = rows => rows.map(r => [...r].reverse().join(""));
const swapShade = rows => rows.map(r => r.replace(/[aA]/g, ch => (ch === "a" ? "A" : "a")));

/* Frame lists per facing: [stand, stride, stand, other stride], like the hero's. */
export const MEGAN_FRAMES = {
  down: [FRONT.concat(L.stand), FRONT.concat(L.stride), FRONT.concat(L.stand), FRONT.concat(mirror(L.stride))],
  up: [BACK.concat(L.stand), BACK.concat(mirror(L.stride)), BACK.concat(L.stand), BACK.concat(L.stride)],
  side: [SIDE.concat(L.sideStand), SIDE.concat(L.sideStride), SIDE.concat(L.sideStand), SIDE.concat(swapShade(L.sideStride))],
};
