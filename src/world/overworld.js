// The overworld: Oakhollow village, the river, the Whispering Wood, the rocks around the goblin cave, and
// Willowmere to the south (a lake with an island, a fisher's hut, an old garden and a bramble grove).
// One character per tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 64 wide).
// When real art arrives this moves to a Tiled map.

export const OVERWORLD = {
  name: "overworld",
  region: "vale", // the world map's page (travel.js REGIONS)
  outdoors: true, // a Homeward Feather works here (not indoors or underground)
  spawn: { x: 15, y: 20 },
  // First match wins. Tiles in no zone (the river banks) keep the last zone's name. `music` is the track that plays
  // there; `safe` zones never have monsters.
  zones: [
    { id: "village", name: "Oakhollow", x0: 2, y0: 2, x1: 28, y1: 37, music: "village", safe: true },
    { id: "forest", name: "Whispering Wood", x0: 33, y0: 2, x1: 61, y1: 24, music: "wild" },
    { id: "rocks", name: "Goblin Rocks", x0: 33, y0: 25, x1: 61, y1: 37, music: "wild" },
    { id: "meadow", name: "Willowmere", x0: 2, y0: 38, x1: 61, y1: 59, music: "wild" },
  ],
  // House doors: walk into one to go inside (`to` is the house's map, which has its own way back out).
  doors: [
    { x: 11, y: 9, to: "marenHouse", name: "Elder Maren's house" },
    { x: 9, y: 24, to: "hazelHouse", name: "Pip's house" },
    { x: 20, y: 43, to: "tomHut", name: "Old Tom's hut" },
    { x: 22, y: 9, to: "inn", name: "The Sleeping Fox inn" },
  ],
  // Things standing on the map. They block walking; walk into one to talk to it or deal with it.
  // `goneWhen` names a quest flag that removes the object (the oak, once shoved aside; a chest, once opened), and
  // `shownWhen` one that puts it there (Brannoc, once you've freed him).
  // `still` objects don't bob up and down. A chest's `loot` is what's inside. `frame` picks one frame of a sheet
  // (Megan is drawn on a walking sheet like the hero's; frame 0 is her facing you).
  objects: [
    { id: "elder", x: 17, y: 18, sprite: "elder", script: "elder" },
    { id: "pip", x: 10, y: 29, sprite: "villager", script: "villager", goneWhen: "pipRanAway" },
    // Act 3, going back: Pip home again after his big adventure, his statue of you in the square, and his trail.
    { id: "pipBack", x: 10, y: 29, sprite: "villager", script: "villager", shownWhen: "pipFound", goneWhen: "pipStowedAway" },
    { id: "pipHomeAgain", x: 10, y: 29, sprite: "villager", script: "villager", shownWhen: "pipSentHome" }, // after Act 4's wolf
    { id: "goblinHome1", x: 48, y: 30, sprite: "goblin", script: "goblinVillager", shownWhen: ["refugeesHelped", "rockslideOpen"] },
    { id: "goblinHome2", x: 53, y: 32, sprite: "goblin", script: "goblinVillager", shownWhen: ["refugeesHelped", "rockslideOpen"] },
    { id: "statue", x: 18, y: 21, sprite: "statue", script: "statue", shownWhen: "keepHome", still: true },
    { id: "pipShield", x: 39, y: 18, sprite: "pipShield", script: "pipShield", shownWhen: "pipRanAway", goneWhen: "pipShieldFound", still: true },
    { id: "pipChalk", x: 51, y: 30, sprite: "chalk", script: "pipChalk", shownWhen: "pipRanAway", still: true },
    // By the smithy once you've freed him, until he moves to his forge in Fenwatch (when you first get there).
    { id: "brannoc", x: 12, y: 17, sprite: "brannoc", script: "brannocTown", shownWhen: "brannocFreed", goneWhen: "seenFenwatch" },
    { id: "campfire", x: 50, y: 31, sprite: "campfire", script: "campfire", still: true },
    { id: "fallenLog", x: 54, y: 24, sprite: "log", script: "log", goneWhen: "logCleared", still: true },
    { id: "tom", x: 23, y: 47, sprite: "fisher", script: "fisher" },
    { id: "tomRod", x: 23, y: 49, sprite: "fishingRod", script: "fishing", spot: "willowmere", still: true,
      look: "Old Tom's spare rod, propped by the water. \"Help yourself!\" he calls. \"Perch, pike, and once in a blue moon a golden carp.\"" },
    { id: "target", x: 5, y: 27, sprite: "archeryTarget", script: "archery", still: true },
    { id: "megan", x: 12, y: 58, sprite: "megan", frame: 0, script: "megan", goneWhen: "meganJoined" },
    { id: "lostBow", x: 58, y: 21, sprite: "bow", script: "lostBow", goneWhen: "bowFound", still: true },
    { id: "isleChest", x: 33, y: 49, sprite: "chest", script: "chest", goneWhen: "isleChestOpened", still: true, loot: { gold: 40, items: ["potionSpeed", "potionHealing"] } },
    { id: "gardenChest", x: 7, y: 52, sprite: "chest", script: "chest", goneWhen: "gardenChestOpened", still: true, loot: { gold: 25, items: ["potionHealing", "potionHealing"] } },
    { id: "gardenCarving", x: 9, y: 51, sprite: "carving", script: "carving", still: true,
      lore: "\"A garden for the Warden's son, sent south with the crested sword.\" Rachel looks at you, then at your sword, for a long moment. \"There's something buried by the gate.\"",
      cache: { gold: 100, items: ["potionGreaterHealing"] } },
    { id: "groveChest", x: 57, y: 43, sprite: "chest", script: "chest", goneWhen: "groveChestOpened", still: true, loot: { gold: 60, items: ["potionDexterity"] } },
  ],
  rows: [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................~~.T..TTT.T.TT..TT...T.T.T....TTTT",
  "TT.........................,..~~.TT.TTTTTTTT...T..T.TTTTT....TTT",
  "TT............................~~.TT..T..TTTTTT.TTTTTTTTTT.T.TTTT",
  "TT.............=.,............~~.TTTTTTTTTT....TTT.TTTT.TTTTTTTT",
  "TT.......RRRRR.=...RRRRRR....T~~TT.TTT...TTTTTTTTT.TTT.TTT..TTTT",
  "TT.......RRRRR.=..,RRRRRR.....~~.TT.....TT...TT..TTTTT.T.TT..TTT",
  "TT.......HHDHH.=...HHHDHH.....~~.TTTTT.T..TT.TTT.T.TTTTTTTTTTTTT",
  "TT.........=,..=..,.......,..T~~.T.T.TT...TTT...TTTTT.T.T.TTTTTT",
  "TT.........=====.............T~~.TTTT.TT.TTTTTT...T.TTTT.TTTTTTT",
  "TT.......,.....=..............~~.T.TTT==========T.TT...TT.T.TTTT",
  "TT.............=..............~~.TTT.T=TT..TT.T=...TT.T.TTT.TTTT",
  "TT...,RRRRR....=..RRRRRR......~~.T...T=.TTTTT.T=TTT.T..T....TTTT",
  "TT....RRRRR....=..RRRRRR......~~TTTTTT=TTT..T..=TTTT.TTT.T.TTTTT",
  "TT....HHBHH....=..HHHAHH......~~.TTT..=TTT.T.TT=T.TTTT.T..TT.TTT",
  "TT......=......=.....=...,...T~~TT.TT.=T.TT..T.=TTTTTTTTTTTTTTTT",
  "TT..........,..=....,.........~~.TTTTT=..T.T.TT========.T...TTTT",
  "TT.............=..............~~TT.T.T=TT.T..TTTT.T...=T....TTTT",
  "TT..==========================##=======...T.T...TT..TT=TTTT.TTTT",
  "TT.............=...,...,.....T~~.TTTTTT..T.T.TT.TTT..T=....TTTTT",
  "TT....RRRRRR...=..,RRRRR.....T~~.TTTTTTTTTT.TTT..TTT.T=TTTT.TTTT",
  "TT....RRRRRR...=.,.RRRRR..,..T~~.TT..TTTTTT.T.TTT.TTT.=T.T.T.TTT",
  "TT....HHHDHH...=.,.HH$HH......~~.TTTTTTTTTTTTTTTTTTTTT=TTTTTTTTT",
  "TT......,=...,.=.....=........~~.^^^^^^^^^^^^^^^^^^^^^=^^^^^^^TT",
  "TT....,........=......,.......~~.^^^^^^^^^^^^^^^^^^^===^^^^^^^TT",
  "TT.............=..............~~.^^^.....^.^......^^=^...^.^^^TT",
  "TT.............=..............~~T^^^......^....^.^.^=^.....^^^TT",
  "TT.............=......,......T~~.^^^.^.............^C^...^^^^^TT",
  "TT..ffff=ffff..=.............T~~T^^^........^..^......^....^^^TT",
  "TT..f...,...f..=......,...,...~~T^^^.......^^.^............^^^TT",
  "TT..f,..,...f..=.,............~~.^^^.^...^...^..........^^.^^^TT",
  "TT.,f...,...f..=.,............~~.^^^.......^.....^.........^^^TT",
  "TT..f.,.....f,.=.............T~~.^^^..^......^...^^^.......^^^TT",
  "TT..fffffffff..=....,.....,..T~~.^^^.................^.....^^^TT",
  "TT.............=......,..,....~~T^^^^^^^^^^^^^^^^^^^^^^^^^^^^^TT",
  "TT.............=.............T~~.^^^^^^^^^^^^^^^^^^^^^^^^^^^^^TT",
  "TTTTTTTTTTTTTT.=.TTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTT.=.TTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.............=.....,..,.,...~~....,.T....T.,.......TTTTTTTTTTT",
  "TT......,......=..RRRRR.......~~...T......T...T.....TT......TTTT",
  "TT........T....=..RRRRR.T.T..,~~.......,T......,...T.T......TTTT",
  "TT...T..T...,..=..HHDHH.......~~..................=..T......TTTT",
  "TT....T........=....=.........~~~~~~~.............=..T......TTTT",
  "TT.............======......~~~~~~~~~~~~~.........,=..T......TTTT",
  "TT.T.......T...=..T..,.,T.~~~~~~~~~~~~~~~...T...,.=..TTT.TTTT.TT",
  "TT.........T...=.........~~~~~~~~~~~~~~~~~,.T.T...=...........TT",
  "TT.T..........,=........~~~~~~~~~~,,,~~~~~~.....T.=.....T.....TT",
  "TT.,...........=...,....~~~~~~~~~,,,,,#####========......T....TT",
  "TT..fff.fff.T..=..T..,..~~~~~~~~~~,,,~~~~~~.....T.=.......,...TT",
  "TT..f,,,,,f....=.........~~~~~~~~~~~~~~~~~..TT.T..=...T....T..TT",
  "TT..f,,,,,f....=.T........~~~~~~~~~~~~~~~......,..=....T......TT",
  "TT..f,,,,,f....=......T....~~~~~~~~~~~~~.,..T..T..=...........TT",
  "TTT,f,,,,,f....=..........T...~~~~~~~.....,.......=..T....T...TT",
  "TTT.fffffff..T.=.........,.........,..............=,T...T.....TT",
  "TT.........,.T.====================================...........TT",
  "TT...,....................,,.,...............................TTT",
  "TT,...............T.T...T.....T...........T...................TT",
  "TT....,..,T.........,..................,.............T........TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
};
