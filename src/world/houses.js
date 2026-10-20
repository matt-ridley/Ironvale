// Inside the houses. Walk into a house door on the overworld (its `doors`) and you stand just inside, at `spawn`;
// walk onto the doormat to go back out, in front of the door. One character per tile; the legend is TILES in map.js.
// Every room's zone is "indoors": no monsters, the village music, and the meeting screen draws a room behind people.

/* A room with the way out at `mat`, leading back out to the map `outside` (the overworld, unless it's elsewhere) in
   front of the door at `door`. */
function house({ name, title, door, mat, objects = [], rows, outside = "overworld", region = "vale" }) {
  return {
    name,
    region,
    spawn: { x: mat.x, y: mat.y - 1 },
    zones: [{ id: "indoors", name: title, x0: 0, y0: 0, x1: rows[0].length - 1, y1: rows.length - 1, music: "village", safe: true }],
    exits: [{ x: mat.x, y: mat.y, to: outside, at: { x: door.x, y: door.y + 1 }, facing: "down" }],
    objects,
    rows,
  };
}

export const MAREN_HOUSE = house({
  name: "marenHouse",
  title: "Elder Maren's House",
  door: { x: 11, y: 9 },
  mat: { x: 5, y: 6 },
  objects: [{ id: "journal", x: 7, y: 3, sprite: "journal", script: "journal", still: true }],
  rows: [
    "xxxxxxxxxxx",
    "x|s||h||s|x",
    "xwwwwwwwwwx",
    "xwkwwwwwwux",
    "xwwwwwwwwwx",
    "xwwwwwwwwwx",
    "xwwwwmwwwwx",
    "xxxxxxxxxxx",
  ],
});

export const HAZEL_HOUSE = house({
  name: "hazelHouse",
  title: "Pip's House",
  door: { x: 9, y: 24 },
  mat: { x: 5, y: 6 },
  objects: [{ id: "hazel", x: 6, y: 3, sprite: "hazel", script: "hazel" }],
  rows: [
    "xxxxxxxxxxx",
    "x||h|||s||x",
    "xwwwwwwwwwx",
    "xwkkwwwwwux",
    "xwwwwwwwwux",
    "xwwwwwwwwwx",
    "xwwwwmwwwwx",
    "xxxxxxxxxxx",
  ],
});

export const TOM_HUT = house({
  name: "tomHut",
  title: "Old Tom's Hut",
  door: { x: 20, y: 43 },
  mat: { x: 4, y: 5 },
  objects: [{ id: "tomBed", x: 1, y: 2, sprite: "bed", script: "bed", still: true }],
  rows: [
    "xxxxxxxxx",
    "x|s|h|||x",
    "xwwwwwwwx",
    "xwwwwwkwx",
    "xuwwwwwwx",
    "xwwwmwwwx",
    "xxxxxxxxx",
  ],
});

// Oakhollow's inn: Nell lets you a bed for the night (a long rest, for gold). Fainting wakes you here, too.
export const INN = house({
  name: "inn",
  title: "The Sleeping Fox",
  door: { x: 22, y: 9 },
  mat: { x: 6, y: 6 },
  objects: [
    { id: "nell", x: 9, y: 2, sprite: "innkeeper", script: "inn" },
    { id: "wat", x: 8, y: 4, sprite: "gambler", script: "diceWat" }, // knucklebones
    { id: "oswin", x: 3, y: 5, sprite: "woodcutter", script: "armWrestle" },
  ],
  rows: [
    "xxxxxxxxxxxxx",
    "x|s||h|||s||x",
    "xwwwwwwwwwwux",
    "xwkwwwwkkwwux",
    "xwwwwwwwwwwwx",
    "xwkwwwwwwwwwx",
    "xwwwwwmwwwwwx",
    "xxxxxxxxxxxxx",
  ],
});

// Fenwatch's tavern, the Drowned Duck: the Act 2 inn (Gully lets a bed for more than Nell does), and the bounty board.
export const DUCK = house({
  name: "duck",
  title: "The Drowned Duck",
  door: { x: 50, y: 47 },
  mat: { x: 6, y: 6 },
  outside: "ironvale",
  region: "ironvale",
  objects: [
    { id: "gully", x: 9, y: 2, sprite: "barkeep", script: "duck" },
    { id: "bountyBoard", x: 2, y: 2, sprite: "board", script: "bounties", still: true },
    { id: "sal", x: 8, y: 4, sprite: "gambler", script: "diceSal" }, // knucklebones
  ],
  rows: [
    "xxxxxxxxxxxxx",
    "x|s||h|||u||x",
    "xwwwwwwwwwwux",
    "xwkwwwwkkwwwx",
    "xwwwwwwwwwwwx",
    "xwkwwkwwwwkwx",
    "xwwwwwmwwwwwx",
    "xxxxxxxxxxxxx",
  ],
});

export const HOUSES = [MAREN_HOUSE, HAZEL_HOUSE, TOM_HUT, INN, DUCK];
