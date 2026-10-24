// The Emberdeep, the dragon's mountain: Act 4's dungeon (quest 12). In from the aeries at the bottom, into the kobolds'
// tunnels (fire giants, clay golems, the brood). The way up runs through the Wardens' golem hall, where a clay golem
// and a stone golem hold the north door; two back ways go round them: Dunstan's red tunnel up the west side (behind a
// crack you need his map to find) and Snik's kobold tunnel in the east, from his old mine on the pass. Above the
// golems: the upper cave, the Wardens' lost forge to the west (Brannoc's, once he's here: the Wardenblade's final
// form, and a camp), and at the top the antechamber of the hoard, its door guarded by a fire giant and its hell hound. The hoard itself is step 27.
// One character per tile; the legend is TILES in map.js. Edit the rows by hand (keep them all 40 wide).

export const EMBERDEEP = {
  name: "emberdeep",
  region: "beyond",
  spawn: { x: 20, y: 41 },
  zones: [
    { id: "hoardDoors", name: "The Hoard's Doors", x0: 12, y0: 0, x1: 27, y1: 7, music: "emberdeep" },
    { id: "lostForge", name: "The Wardens' Lost Forge", x0: 1, y0: 8, x1: 12, y1: 17, music: "emberdeep" },
    { id: "golemHall", name: "The Golem Hall", x0: 12, y0: 22, x1: 27, y1: 30, music: "emberdeep" },
    { id: "tunnels", name: "The Emberdeep", x0: 0, y0: 0, x1: 39, y1: 43, music: "emberdeep" },
  ],
  exits: [
    { x: 20, y: 42, to: "beyond", at: { x: 40, y: 2 }, facing: "down" }, // out under the aeries
    { x: 38, y: 15, to: "pass", at: { x: 4, y: 53 }, facing: "down" }, // Snik's kobold tunnel, back to his old mine
  ],
  objects: [
    // The golems in the golem hall's north door (the main way up).
    { id: "golemClay", x: 19, y: 22, sprite: "clayGolem", script: "golems", goneWhen: "golemsBeaten" },
    { id: "golemStone", x: 20, y: 22, sprite: "stoneGolem", script: "golems", goneWhen: "golemsBeaten" },
    // Dunstan's red tunnel: a crack in the west wall, only worth squeezing through if you know where it goes.
    { id: "redCrack", x: 3, y: 30, sprite: "rubble", script: "redCrack", goneWhen: "redTunnel", still: true },
    // The Wardens' lost forge, cold and black until Brannoc comes; then Brannoc, and the forge lit (a camp).
    { id: "lostForgeCold", x: 6, y: 10, sprite: "frozenForge", script: "lostForge", goneWhen: "brannocAtForge", still: true },
    { id: "lostForgeLit", x: 6, y: 10, sprite: "lostForge", script: "lostForge", shownWhen: "brannocAtForge", still: true },
    { id: "brannocDeep", x: 8, y: 11, sprite: "brannoc", script: "lostForge", shownWhen: "brannocAtForge" },
    { id: "forgeChest", x: 10, y: 15, sprite: "chest", script: "chest", goneWhen: "forgeChestOpened", still: true, loot: { gold: 500, items: ["potionGreaterHealing", "potionGreaterHealing", "scrollFireball"] } },
    { id: "tunnelChest", x: 36, y: 34, sprite: "chest", script: "chest", goneWhen: "tunnelChestOpened", still: true, loot: { gold: 400, items: ["potionGreaterHealing", "potionFireResistance"] } },
    // The hoard's guards in the antechamber's door, and the hoard's doors.
    { id: "hoardGiant", x: 19, y: 7, sprite: "fireGiant", script: "hoardGuards", goneWhen: "hoardGuardsBeaten" },
    { id: "hoardHound", x: 20, y: 7, sprite: "hellHound", script: "hoardGuards", goneWhen: "hoardGuardsBeaten" },
    { id: "hoardDoor", x: 19, y: 3, sprite: "greatDoor", name: "THE HOARD'S DOORS", script: "hoardDoor", still: true },
  ],
  rows: [
  "%%%%%%%%%%%%KKKKKKKKKKKKKKKK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KKKKKKKKKKKKKKKK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KKKKKKKKKKKKKKKK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KKKKKKKnKKKKKKKK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%%%%%%%%%%KKKKKKKnnKKKKKKK%%%%%%%%%%%%",
  "%KKKKKKKKKKKK_________________________%%",
  "%KnnnnnnnnnnK__o_e___eoooo____________%%",
  "%KnnnnnnnnnnK_______eollllo____%____e_%%",
  "%KnnnnnnnnnnK_%______ollllo___________%%",
  "%Knnnnnnnnnnn____%___ollllo___________%%",
  "%Knnnnnnnnnnn__%____oeo%oo________%___%%",
  "%KnnnnnnnnnnK_______ee________ooo_____%%",
  "%KnnnnnnnnnnK__%_____________olllo____O%",
  "%KnnnnnnnnnnK______________e_olllo_e__%%",
  "%KKnKKKKKKKKK_e____e__________ooo_____%%",
  "%%_____________e__%_______o___________%%",
  "%%____________________________________%%",
  "%%________________e____________e%_____%%",
  "%%____________________________________%%",
  "%%%_%%%%%%%%KKKKKKKnnKKKKKKK%%%%%%%%%%%%",
  "%%%_%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%__%%%%%%%KnKnnnnnnnnnnKnK%%%%%%%%%%%%",
  "%%%__%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%_%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%_%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%_%%%%%%%%KnKnnnnnnnnnnKnK%%%%%%%%%%%%",
  "%%%_%%%%%%%%KnnnnnnnnnnnnnnK%%%%%%%%%%%%",
  "%%%_%%%%%%%%KKKKKKKnnKKKKKKK%%%%%%%%%%%%",
  "%%%__%_o___________________ee_oooo_e_%%%",
  "%%%___oooe_____________%______olllo_%%%%",
  "%%%__ollllo_e________e________elllo%e%%%",
  "%%%__ollllo________%__________eooo___%%%",
  "%%%_eollllo________________ooooo_____%%%",
  "%%%___oooo______e___%_____olllllo____%%%",
  "%%%__%________ooo_e_______ollllloo___%%%",
  "%%%________e_olllo__o_____olllllo____%%%",
  "%%%__________olllo_______%_oooeo_____%%%",
  "%%%__e_e____eollloe___________e_o____%%%",
  "%%%_e____e____oeo______%_____________%%%",
  "%%%%%%%%%%%%%%%%%%%%O%%%%%%%%%%%%%%%%%%%",
  "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
  ],
};
