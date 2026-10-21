// The Wardens' Gatehouse, Act 3's dungeon: a fortress cut into the mountain in front of the Door. In from the pass at the
// bottom, through three rune doors (each wants one of the Wardens' runes: Rachel can read which), past the frozen forge
// (west, with rune-iron in its ore bins) and the Wardens' barracks (east), up to the Door chamber, where Thorne waits
// with his shield guardian.
// One character per tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 40 wide).

export const GATEHOUSE = {
  name: "gatehouse",
  region: "pass",
  spawn: { x: 20, y: 36 },
  zones: [
    { id: "door", name: "The Door", x0: 0, y0: 0, x1: 39, y1: 6, music: "gatehouse" },
    { id: "frozenForge", name: "The Frozen Forge", x0: 1, y0: 17, x1: 12, y1: 28, music: "gatehouse" },
    { id: "barracks", name: "The Wardens' Barracks", x0: 27, y0: 17, x1: 38, y1: 28, music: "gatehouse" },
    { id: "gatehouse", name: "The Wardens' Gatehouse", x0: 0, y0: 0, x1: 39, y1: 39, music: "gatehouse" },
  ],
  // Back out onto the pass, in front of the gatehouse door.
  exits: [{ x: 20, y: 38, to: "pass", at: { x: 24, y: 5 }, facing: "down" }],
  objects: [
    // Three rune doors: each opens to the right rune (its `answer`), with a `riddle` carved on it.
    { id: "runeDoor1", x: 20, y: 29, sprite: "runeDoor", script: "runeLock", flag: "runeDoor1", answer: "iron", goneWhen: "runeDoor1", still: true,
      riddle: "\"I turn the blow, but never the blade. I stand where the wall stands.\"" },
    { id: "runeDoor2", x: 20, y: 17, sprite: "runeDoor", script: "runeLock", flag: "runeDoor2", answer: "call", goneWhen: "runeDoor2", still: true,
      riddle: "\"No Warden holds alone. Speak, and they rise.\"" },
    { id: "runeDoor3", x: 20, y: 7, sprite: "runeDoor", script: "runeLock", flag: "runeDoor3", answer: "binding", goneWhen: "runeDoor3", still: true,
      riddle: "\"What is held stays held. What is bound stays bound.\"" },
    // The frozen forge, and the rune-iron in its ore bin (for Brannoc: the Wardenblade's second form).
    { id: "frozenForge", x: 4, y: 19, sprite: "frozenForge", script: "frozenForge", still: true },
    { id: "oreBin", x: 8, y: 26, sprite: "oreBin", script: "oreBin", still: true },
    // The barracks: a chest, and a carving (the Wardens' roll).
    { id: "gateBarracksChest", x: 35, y: 20, sprite: "chest", script: "chest", goneWhen: "barracksGateChestOpened", still: true, loot: { gold: 300, items: ["scrollCounterspell", "potionGreaterHealing", "potionGreaterHealing"] } },
    { id: "barracksCarving", x: 30, y: 26, sprite: "carving", script: "carving", still: true,
      lore: "\"The roll of the Wardens of Ironvale.\" Name after name, a hundred years of them. Rachel stops at the last. \"Colleen. And under it, carved small: and her son, sent south.\" She looks at you.",
      cache: { gold: 200, items: ["potionSpeed"] } },
    // The Door chamber: Thorne and his shield guardian, and the Door itself.
    { id: "thorne", x: 20, y: 3, sprite: "thorne", script: "thorneBoss", goneWhen: "thorneDefeated" },
    { id: "guardian", x: 23, y: 3, sprite: "shieldGuardian", script: "thorneBoss", goneWhen: "thorneDefeated" },
    { id: "greatDoor", x: 20, y: 1, sprite: "greatDoor", script: "greatDoor", still: true },
  ],
  rows: [
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  "KKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKK",
  "KKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKK",
  "KKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKK",
  "KKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKK",
  "KKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKK",
  "KKKKKKKKnnnnnnnnnnnnnnnnnnnnnnnnnKKKKKKK",
  "KKKKKKKKKKKKKKKKKKKKnKKKKKKKKKKKKKKKKKKK",
  "KKKKKKKKKKnnnnnnInnnnnnnnnnnnnnKKKKKKKKK",
  "KKKKKKKKKKnnnnInnnnnnnnnnnnnnnnKKKKKKKKK",
  "KKKKKKKKKKnnKnnnKnnnnnnnKnnnKnnKKKKKKKKK",
  "KKKKKKKKKKnnnnnnnnnnnnnnnnInInnKKKKKKKKK",
  "KKKKKKKKKKnnnnnnnInnnnInnnnnnnnKKKKKKKKK",
  "KKKKKKKKKKnnnnnnnnnnnnInnInnnnnKKKKKKKKK",
  "KKKKKKKKKKnnKnnIKnnnnnnnKnnnKnnKKKKKKKKK",
  "KKKKKKKKKKnnInnnnnnnnnnnnnnnnnnKKKKKKKKK",
  "KKKKKKKKKKnnnnnnnnnnnnnnnnnnnnnKKKKKKKKK",
  "KKKKKKKKKKKKKKKKKKKKnKKKKKKKKKKKKKKKKKKK",
  "KKInnnnnnnIInKnnnnnnnnnnnnnKnnnnnnnnnnKK",
  "KKnnInnnnnIInKnKnnnnn**nnKnKnnnnnnnnnnKK",
  "KKnnnnInnnnnnKnnn*nnnnnnnnnKnnnnnnnnnnKK",
  "KKnnInnnnnnInKnnnnnnnnnnnnnKnnnnnnnnnnKK",
  "KKnnnnnnnnnnnKnKnnnnnnnnnKnKnnnnnnnnnnKK",
  "KKnInnnInnnnnnnnnnnnnnnnnnnnnnnnnnnnnnKK",
  "KKnnnnnIInnnnKnnnnnnnnnnnnnKnnnnnnnnnnKK",
  "KKInnnnnnnnnnKnKnnnnnnn*nKnKnnnnnnnnnnKK",
  "KKnnnInnnnnnnKnn*n*nnnnnnnnKnnnnnnnnnnKK",
  "KKnInnnnnnnnnKn*nnnnn*nnnnnKnnnnnnnnnnKK",
  "KKnnInInnnnnnKnnnnnnnnnnnnnKnnnnnnnnnnKK",
  "KKKKKKKKKKKKKKKKKKKKnKKKKKKKKKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKnnnnnnnnnnnnnnnnnKKKKKKKKKKK",
  "KKKKKKKKKKKKKKKKKKKKnKKKKKKKKKKKKKKKKKKK",
  "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  ],
};
