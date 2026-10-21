// The Deep Warrens: the tunnels behind the goblin chief's throne, opened once the chief is beaten. A stream hall,
// a mushroom grotto, the hobgoblin barracks, a rat nest, and an iron gate before the Goblin King's throne room, whose
// back passage (top right) climbs to Greywater Fen once Brannoc has cleared the rubble.
// One character per tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 48 wide).

export const DEEP_CAVE = {
  name: "deepCave",
  region: "vale",
  spawn: { x: 6, y: 30 },
  zones: [
    { id: "warrens", name: "The Deep Warrens", x0: 0, y0: 6, x1: 47, y1: 33, music: "wild" },
    { id: "throne", name: "The Goblin King's Hall", x0: 0, y0: 0, x1: 47, y1: 5, music: "wild" },
  ],
  // Walking onto an exit tile takes you to another map (`to`), standing at `at` (a tile), facing `facing` if given.
  exits: [
    { x: 6, y: 32, to: "overworld", at: { x: 52, y: 30 } },
    { x: 45, y: 1, to: "ironvale", at: { x: 3, y: 50 }, facing: "right" }, // the goblins' passage up to Greywater Fen
  ],
  objects: [
    { id: "ironGate", x: 41, y: 7, sprite: "gate", script: "gate", goneWhen: "gateOpened", still: true },
    { id: "goblinKing", x: 37, y: 2, sprite: "goblinKing", script: "king", goneWhen: "kingDefeated" },
    // Once the King has fallen: the ring on his throne, and the smith chained behind it.
    { id: "signet", x: 37, y: 2, sprite: "signet", script: "signet", shownWhen: "kingDefeated", goneWhen: "signetTaken", still: true },
    { id: "kingCrown", x: 35, y: 2, sprite: "crown", script: "crown", shownWhen: "kingDefeated", goneWhen: "crownTaken", still: true },
    { id: "brannocChained", x: 37, y: 1, sprite: "brannoc", script: "brannoc", shownWhen: "kingDefeated", goneWhen: "brannocFreed" },
    // The goblins' back passage up to Greywater Fen, choked with rubble until Brannoc clears it.
    { id: "rubble", x: 45, y: 1, sprite: "rubble", script: "rubble", still: true, goneWhen: "passageCleared" },
    { id: "grottoChest", x: 3, y: 6, sprite: "chest", script: "chest", goneWhen: "grottoChestOpened", still: true, loot: { gold: 50, items: ["potionHealing", "potionSpeed"] } },
    { id: "barracksChest", x: 44, y: 19, sprite: "chest", script: "chest", goneWhen: "barracksChestOpened", still: true, loot: { gold: 80, items: ["potionDexterity", "potionHealing"] } },
    { id: "warrensCarving", x: 7, y: 7, sprite: "carving", script: "carving", still: true,
      lore: "\"Dug by the Wardens to bring iron down from the mountain.\" Rachel squints. \"These were Warden mines before they were goblin tunnels. And a cache: under the third mushroom.\"",
      cache: { gold: 90, items: ["scrollLightningBolt"] } },
    { id: "nestChest", x: 44, y: 29, sprite: "chest", script: "chest", goneWhen: "nestChestOpened", still: true, loot: { gold: 30, items: ["potionHealing", "potionHealing"] } },
  ],
  rows: [
  "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%t%%%%%%t%%%%%%%t%%",
  "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%_______________O%%",
  "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%________________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%___%________%___%%",
  "%%t%%%%%%%%%%%%%%%%%%%%%%%%%%%________________%%",
  "%%______%%%%%%%%%%%%%%%%%%%%%%________________%%",
  "%%______%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%",
  "%%______%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%t%%_%%%t%%",
  "%%______%%%%%%%t%%%%%%%%%%%%%%%%t%%%%%________%%",
  "%%______%%%%%%%_________~~_______%%%%%________%%",
  "%%______%%%%%%%_________~~____%__%%%%%________%%",
  "%%______________________##_______%%%%%__%_____%%",
  "%%______%%%%%%%_________~~____________________%%",
  "%%______%%%%%%%___%_____~~_______%%%%%________%%",
  "%%______%%%%%%%_________~~_______%%%%%________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%_____%__%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%________%%",
  "%%%%%%%%%%%%%%%%%%%%%%%_%%%%%%%%%%%%%%%%%%_%%%%%",
  "%%%%%%%%%%%%%%%%%%%t%%%_%%%%t%%%%%%%%%%%%%_%%%%%",
  "%%%%%%%%%%%%%%%%%%%__________%%%%%%%%%%%t%_%%%%%",
  "%%%t%%%%%%t%%%%%%%%__________%%%%%%%%%%%______%%",
  "%%%________%%%%%%%%__%_______%%%%%%%%%%%______%%",
  "%%%________%%%%%%%%__________%%%%%%%%%%%______%%",
  "%%%________%%%%%%%%___________________________%%",
  "%%%__________________________%%%%%%%%%%%______%%",
  "%%%________%%%%%%%%_______%__%%%%%%%%%%%______%%",
  "%%%________%%%%%%%%__________%%%%%%%%%%%______%%",
  "%%%________%%%%%%%%__________%%%%%%%%%%%%%%%%%%%",
  "%%%%%%O%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
  "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
  ],
};
