// The hero, drawn 16 x 24 and rendered at double detail (32 x 48) with shading.
// Three facings (down, up, side; left is the side frames mirrored) and a four-frame walk: stand, stride, stand,
// other stride. Diagonal movement uses the side frames.
// Colours: o outline, h plume, s skin, a armour, A armour shadow, v visor, c cape, g gold, w blade, b leather.

export const HERO_COLOURS = {
  o: "#2b1d2e", h: "#c23b3b", s: "#f2c39b", a: "#c9d3dc", A: "#7d8a99", v: "#2b2f3a",
  c: "#3a5fb0", g: "#e8b84a", w: "#e9eef2", b: "#6b4a2f",
};

const FRONT = [
  ".......hh.......",
  ".....oohhoo.....",
  "....oaaaaaao....",
  "...oaaaaaaaao...",
  "...oAvvvvvvAo...",
  "...oaaaaaaaao...",
  "....oAaaaaAo....",
  ".....oooooo.....",
  "...ooAaaaaAoo...",
  "..oaaAaggaAaao..",
  ".oAaoaaggaaoaAo.",
  ".oAaoaaaaaaoaAo.",
  ".osoAaaaaaaAoso.",
  ".oo.oggggggo.oo.",
  "....oAaaaaAo....",
  "....oAaooaAo....",
];

const BACK = [
  ".......hh.......",
  ".....oohhoo.....",
  "....oaaaaaao....",
  "...oaaaaaaaao...",
  "...oaaaaaaaao...",
  "...oAaaaaaaAo...",
  "....oAAAAAAo....",
  ".....oooooo.....",
  "...ooccccccoo...",
  "..oaccccccccao..",
  ".oAaccccccccaAo.",
  ".oAaccccccccaAo.",
  ".osoccccccccoso.",
  ".oo.occcccco.oo.",
  "....occcccco....",
  "....oAccccAo....",
];

const SIDE = [
  "......hh........",
  ".....ohhoo......",
  "....oaaaaao.....",
  "...oaaaaaaao....",
  "...oaaaaAvvo....",
  "...oaaaaaaao....",
  "....oAaaaAo.....",
  ".....ooooo...ow.",
  "...occaaaaAo.ow.",
  "..occaaaggaAoow.",
  "..occaaaaaAoggo.",
  "..occaaaaaaosb..",
  "..occAaaaaAoo...",
  "..occoggggoo....",
  "...ocoAaaAo.....",
  "....oAaaaAo.....",
];

const LEGS_STAND = [
  "....oAaooaAo....",
  "....oAaooaAo....",
  "....oaaooaao....",
  "....oAaooaAo....",
  "....obboobbo....",
  "...obbbo.obbbo..",
  "...ooooo.ooooo..",
  "................",
];
const LEGS_STRIDE = [
  "....oAaooaAo....",
  "....oAaooaAo....",
  "....oaaooaao....",
  "....obbooaAo....",
  "...obbbooaao....",
  "...ooooo.obbo...",
  ".........obbbo..",
  ".........ooooo..",
];
const mirror = rows => rows.map(r => [...r].reverse().join(""));

const SIDE_STAND = [
  "....oAaaAo......",
  "....oAaaAo......",
  "....oaaaao......",
  "....oAaaAo......",
  "....obbbbo......",
  "....obbbbbo.....",
  "....ooooooo.....",
  "................",
];
const SIDE_STRIDE = [
  "...oAao.oaAo....",
  "..oAao...oaAo...",
  "..oaao...oaao...",
  ".oAao.....oaAo..",
  ".obbo.....obbbo.",
  ".oooo.....ooooo.",
  "................",
  "................",
];
// The other stride: same shape, light and shadow swapped so the legs seem to change places.
const swapShade = rows => rows.map(r => r.replace(/[aA]/g, ch => (ch === "a" ? "A" : "a")));

/* Frame lists per facing: [stand, stride, stand, other stride]. */
export const HERO_FRAMES = {
  down: [FRONT.concat(LEGS_STAND), FRONT.concat(LEGS_STRIDE), FRONT.concat(LEGS_STAND), FRONT.concat(mirror(LEGS_STRIDE))],
  up: [BACK.concat(LEGS_STAND), BACK.concat(mirror(LEGS_STRIDE)), BACK.concat(LEGS_STAND), BACK.concat(LEGS_STRIDE)],
  side: [SIDE.concat(SIDE_STAND), SIDE.concat(SIDE_STRIDE), SIDE.concat(SIDE_STAND), SIDE.concat(swapShade(SIDE_STRIDE))],
};
export const FACINGS = ["down", "up", "side"];
export const HERO_W = 16, HERO_H = 24;
