// Inside the houses. Walk into a house door on the overworld (its `doors`) and you stand just inside, at `spawn`;
// walk onto the doormat to go back out, in front of the door. One character per tile; the legend is TILES in map.js.
// Every room's zone is "indoors": no monsters, the village music, and the meeting screen draws a room behind people.

/* A room with the way out at `mat`, leading back to the overworld in front of the door at `door`. */
function house({ name, title, door, mat, objects = [], rows }) {
  return {
    name,
    spawn: { x: mat.x, y: mat.y - 1 },
    zones: [{ id: "indoors", name: title, x0: 0, y0: 0, x1: rows[0].length - 1, y1: rows.length - 1 }],
    exits: [{ x: mat.x, y: mat.y, to: "overworld", at: { x: door.x, y: door.y + 1 }, facing: "down" }],
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

export const HOUSES = [MAREN_HOUSE, HAZEL_HOUSE, TOM_HUT];
