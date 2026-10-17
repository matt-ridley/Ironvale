// Placeholder pixel art, drawn as text: each character is one pixel, "." is transparent.
// These get swapped for real sprite sheets later; until then the game needs no image files.

export const PALETTE = {
  k: "#1a1a2e", // outline
  s: "#9aa5b1", // steel
  S: "#d4dbe2", // light steel
  v: "#2c2c3a", // visor
  r: "#c0392b", // red
  y: "#e8b923", // gold
  b: "#6b4226", // brown
  g: "#5a8f29", // goblin green
  G: "#3d6b1c", // dark green
  e: "#f4d03f", // eyes
  t: "#f5f5f0", // teeth
  n: "#6e6e78", // wolf fur
  N: "#a3a3ad", // light fur
  m: "#8b6b4a", // rat fur
  M: "#6b4f34", // dark rat fur
  p: "#e89aa0", // pink
};

export const SPRITES = {
  knight: [
    "......rrr.......",
    ".....kkkkk......",
    "....kSSSSSk.....",
    "....kSvvvSk.....",
    "....kSSSSSk..kS.",
    ".....kkkkk...kS.",
    ".kkk.ksssk...kS.",
    "kbybkssSssk..kS.",
    "kbyybksSsskkyyy.",
    "kbybkssSssk.kbk.",
    "kbbbkksSskk.....",
    ".kkk.kssssk.....",
    ".....ks..sk.....",
    ".....ks..sk.....",
    "....kbb..bbk....",
    "....kkk..kkk....",
  ],
  goblin: [
    "................",
    "................",
    ".k..kkkkkk..k...",
    ".kgkggggggkgk...",
    "..kggeggeggk....",
    "...kggggggk.....",
    "...kgtggtgk.....",
    "....kkkkkk......",
    "...kbbbbbbk.....",
    "..kgkbbbbkgk.S..",
    "..kgkbbbbkgkS...",
    "...kkbbbbkkS....",
    "....kbkkbk......",
    "....kgk.kgk.....",
    "...kGGk.kGGk....",
    "...kkkk.kkkk....",
  ],
  wolf: [
    "................",
    "................",
    "................",
    "............k.k.",
    "...........knkn.",
    "..........knnnnk",
    "k.........knenNk",
    "nk..kkkkkknnnNNk",
    ".nkknnnnnnnnnkkt",
    "..knnnnnnnnnnk..",
    "..kNNNNNNNNnnk..",
    "...knnkkkknnk...",
    "...kn.k..kn.k...",
    "...kn.k..kn.k...",
    "...kk.kk.kk.kk..",
    "................",
  ],
  giantRat: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "..........pp....",
    ".........kmmk...",
    "....kkkkkmmemk..",
    "...kmmmmmmmmmmkp",
    "pp.kmmMMMMmmmk..",
    ".pkmmmmmmmmmk...",
    "..ppkkmkkkmkk...",
    "......p...p.....",
    "................",
  ],
};
