// The first overworld: Oakhollow village, the river, the Whispering Wood, and the rocks around the goblin cave.
// One character per 16x16 tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 64 wide).
// When real art arrives this moves to a Tiled map.

export const OVERWORLD = {
  name: "overworld",
  spawn: { x: 15, y: 20 },
  // First match wins. Tiles in no zone (the river banks) keep the last zone's name.
  zones: [
    { id: "village", name: "Oakhollow", x0: 2, y0: 2, x1: 28, y1: 37 },
    { id: "forest", name: "Whispering Wood", x0: 33, y0: 2, x1: 61, y1: 24 },
    { id: "rocks", name: "Goblin Rocks", x0: 33, y0: 25, x1: 61, y1: 37 },
  ],
  // Things standing on the map. They block walking; walk into one to talk to it or deal with it.
  // `goneWhen` names a quest flag that removes the object (the oak, once shoved aside).
  objects: [
    { id: "elder", x: 17, y: 18, sprite: "elder", script: "elder" },
    { id: "pip", x: 10, y: 29, sprite: "villager", script: "villager" },
    { id: "fallenLog", x: 54, y: 24, sprite: "log", script: "log", goneWhen: "logCleared" },
  ],
  rows: [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................~~.T..TTT.T.TT..TT...T.T.T....TTTT",
  "TT.........................,..~~.TT.TTTTTTTT...T..T.TTTTT....TTT",
  "TT............................~~.TT..T..TTTTTT.TTTTTTTTTT.T.TTTT",
  "TT.............=.,............~~.TTTTTTTTTT....TTT.TTTT.TTTTTTTT",
  "TT.......RRRRR.=.............T~~TT.TTT...TTTTTTTTT.TTT.TTT..TTTT",
  "TT.......RRRRR.=..,...........~~.TT.....TT...TT..TTTTT.T.TT..TTT",
  "TT.......HHDHH.=..............~~.TTTTT.T..TT.TTT.T.TTTTTTTTTTTTT",
  "TT.........=,..=..,.......,..T~~.T.T.TT...TTT...TTTTT.T.T.TTTTTT",
  "TT.........=====.............T~~.TTTT.TT.TTTTTT...T.TTTT.TTTTTTT",
  "TT.......,.....=..............~~.T.TTT==========T.TT...TT.T.TTTT",
  "TT.............=..............~~.TTT.T=TT..TT.T=...TT.T.TTT.TTTT",
  "TT...,RRRRR....=..RRRRRR......~~.T...T=.TTTTT.T=TTT.T..T....TTTT",
  "TT....RRRRR....=..RRRRRR......~~TTTTTT=TTT..T..=TTTT.TTT.T.TTTTT",
  "TT....HHBHH....=..HHHDHH......~~.TTT..=TTT.T.TT=T.TTTT.T..TT.TTT",
  "TT......=......=.....=...,...T~~TT.TT.=T.TT..T.=TTTTTTTTTTTTTTTT",
  "TT..........,..=....,.........~~.TTTTT=..T.T.TT========.T...TTTT",
  "TT.............=..............~~TT.T.T=TT.T..TTTT.T...=T....TTTT",
  "TT..==========================##=======...T.T...TT..TT=TTTT.TTTT",
  "TT.............=...,...,.....T~~.TTTTTT..T.T.TT.TTT..T=....TTTTT",
  "TT....RRRRRR...=..,RRRRR.....T~~.TTTTTTTTTT.TTT..TTT.T=TTTT.TTTT",
  "TT....RRRRRR...=.,.RRRRR..,..T~~.TT..TTTTTT.T.TTT.TTT.=T.T.T.TTT",
  "TT....HHHDHH...=.,.HHDHH......~~.TTTTTTTTTTTTTTTTTTTTT=TTTTTTTTT",
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
  "TT..fffffffff.......,.....,..T~~.^^^.................^.....^^^TT",
  "TT....................,..,....~~T^^^^^^^^^^^^^^^^^^^^^^^^^^^^^TT",
  "TT...........................T~~.^^^^^^^^^^^^^^^^^^^^^^^^^^^^^TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
};
