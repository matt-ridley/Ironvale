// Placeholder pixel art, drawn as text: each character is one pixel, "." is transparent.
// These get swapped for real sprite sheets later; until then the game needs no image files.

export const PALETTE = {
  k: "#2b1d2e", // outline (tinted, not black: the 16-bit look)
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
  f: "#f1c27d", // skin
  o: "#5b4a8a", // robe
  O: "#3f3366", // dark robe
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
  goblinChief: [
    "....kkkkkkk.....",
    "...kSsSsSsSk....",
    ".k.kssssssskk...",
    ".kgkggggggkgk...",
    "..kggeggeggk....",
    "...kggggggk.....",
    "...kgtggtgk.....",
    "...kkkkkkkk.....",
    "..kssbbbbssk....",
    ".kgkbbyybbkgk.S.",
    ".kgkbbbbbbkgkS..",
    "..kkkbbbbkkkS...",
    "....kbkkbk......",
    "....kgk.kgk.....",
    "...kGGk.kGGk....",
    "...kkkk.kkkk....",
  ],
  elder: [
    "................",
    ".....kkkkk......",
    "....kNNNNNk...y.",
    "....kffffNk..yby",
    "....kfkfkfk...b.",
    "....kNffffk...b.",
    "...kkNNNNNkk..b.",
    "..kooNNNNNook.b.",
    "..kooooNooookfb.",
    "..koooooooooo.b.",
    "..kOoooooooOo.b.",
    "..kOoooooooOo.b.",
    "..kOOoooooOOo.b.",
    "...kOOOOOOOOk.b.",
    "...kbbk..kbbk.b.",
    "...kkkk..kkkk...",
  ],
  villager: [
    "................",
    "................",
    ".....kkkkkk.....",
    "....kbbbbbbk....",
    "....kbffffbk....",
    "....kfkffkfk....",
    "....kffffffk....",
    ".....kffffk.....",
    "....kgggggGk....",
    "...kfgggggGfk...",
    "...kfkggggkfk...",
    "....kbbbbbbk....",
    "....kmmmmmmk....",
    "....kmk..kmk....",
    "....kbk..kbk....",
    "....kkk..kkk....",
  ],
  log: [
    "................",
    "................",
    "................",
    "....kkkkkkkkk...",
    "..kkbbbbbbbbbkk.",
    ".kMbbMbbbMbbbkMk",
    "kMmMbbbbbbMbbkmM",
    "kmMmkbbMbbbbbkMm",
    "kMmMkbbbbMbbbkmM",
    ".kMmkbMbbbbbMkMk",
    "..kkkkkkkkkkkkk.",
    "..g.....g...g...",
    "................",
    "................",
    "................",
    "................",
  ],
};
