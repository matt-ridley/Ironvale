// Tile maps and grid movement. No Phaser here, so it can be tested; the World scene draws what this describes.

// Map legend. `solid` tiles block walking; `slow` ones (wading, mud) make you walk at that share of your speed.
export const TILES = {
  ".": { name: "grass", solid: false },
  ",": { name: "flowers", solid: false },
  "=": { name: "path", solid: false },
  "#": { name: "bridge", solid: false },
  "C": { name: "cave", solid: false },
  "T": { name: "tree", solid: true },
  "~": { name: "water", solid: true },
  "^": { name: "rock", solid: true },
  "R": { name: "roof", solid: true },
  "H": { name: "wall", solid: true },
  "D": { name: "door", solid: true }, // a house door: the map's `doors` say where it leads
  "B": { name: "smithy", solid: true, place: "blacksmith" }, // walk into it to go inside
  "A": { name: "apothecary", solid: true, place: "apothecary" },
  "$": { name: "bank", solid: true, place: "bank" },
  "f": { name: "fence", solid: true },
  // The Deep Warrens
  "_": { name: "cavefloor", solid: false },
  "%": { name: "cavewall", solid: true },
  "t": { name: "cavetorch", solid: true },
  "O": { name: "caveexit", solid: false },
  // Inside houses
  "w": { name: "floorboards", solid: false },
  "|": { name: "backwall", solid: true },
  "x": { name: "dark", solid: true },
  "m": { name: "doormat", solid: false }, // the way out: an exit on the map takes you back outside
  "h": { name: "hearth", solid: true },
  "s": { name: "shelf", solid: true },
  "k": { name: "table", solid: true },
  "u": { name: "barrel", solid: true },
  // Greywater Fen and Ironvale (Act 2)
  "g": { name: "marsh", solid: false },
  "r": { name: "reeds", solid: false },
  "q": { name: "shallow", solid: false, slow: 0.6 }, // wading
  ";": { name: "mud", solid: false, slow: 0.8 },
  "b": { name: "boardwalk", solid: false },
  "Y": { name: "deadtree", solid: true },
  "c": { name: "causeway", solid: false }, // the old stone road to the keep
  "K": { name: "keepwall", solid: true },
  "L": { name: "palisade", solid: true }, // Fenwatch's log wall
  "E": { name: "passage", solid: false }, // the goblins' back passage: an exit back down to the Deep Warrens
  "F": { name: "forge", solid: true, place: "forge" }, // Brannoc's forge in Fenwatch
  "J": { name: "herbalist", solid: true, place: "herbalist" },
};

export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function createMap(def) {
  const height = def.rows.length, width = def.rows[0].length;
  def.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Map ${def.name}: row ${y} is ${row.length} wide, expected ${width}`);
    for (const ch of row) if (!TILES[ch]) throw new Error(`Map ${def.name}: unknown tile "${ch}" in row ${y}`);
  });
  const map = { objects: [], exits: [], doors: [], ...def, width, height };
  for (const o of map.objects) {
    if (tileAt(map, o.x, o.y)?.solid !== false) throw new Error(`Map ${def.name}: ${o.id} stands on a solid tile`);
  }
  for (const d of map.doors) {
    if (tileAt(map, d.x, d.y)?.name !== "door") throw new Error(`Map ${def.name}: the door to ${d.to} isn't on a door tile`);
  }
  return map;
}

/* Objects on the map now, given the quest flags: `goneWhen` takes one away once its flag is set, `shownWhen` only
   puts one there once its flag is set (the Iron Signet, after the Goblin King falls). */
export const activeObjects = (map, flags = {}) => map.objects.filter(o => !(o.goneWhen && flags[o.goneWhen]) && !(o.shownWhen && !flags[o.shownWhen]));
export const objectAt = (map, x, y, flags = {}) => activeObjects(map, flags).find(o => o.x === x && o.y === y) || null;

export const inBounds = (map, x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height;
export const tileAt = (map, x, y) => (inBounds(map, x, y) ? TILES[map.rows[y][x]] : null);
export const isWalkable = (map, x, y, flags = {}) => { const t = tileAt(map, x, y); return !!t && !t.solid && !objectAt(map, x, y, flags); };

/* One step in a direction. Blocked steps stay put. */
export function step(map, pos, dir, flags = {}) {
  const d = DIRS[dir];
  const x = pos.x + d.dx, y = pos.y + d.dy;
  return isWalkable(map, x, y, flags) ? { x, y, moved: true } : { x: pos.x, y: pos.y, moved: false };
}

/* The object you'd walk into, if any. */
export function objectAhead(map, pos, dir, flags = {}) {
  const d = DIRS[dir];
  return objectAt(map, pos.x + d.dx, pos.y + d.dy, flags);
}

/* The place (a shop or the bank) on the tile you'd walk into, if any. */
export function placeAhead(map, pos, dir) {
  const d = DIRS[dir];
  return tileAt(map, pos.x + d.dx, pos.y + d.dy)?.place || null;
}

export const exitAt = (map, x, y) => map.exits.find(e => e.x === x && e.y === y) || null;

/* The house door on a tile, if any: { x, y, to, name }. Walk into it to go inside the map `to`. */
export const doorAt = (map, x, y) => map.doors.find(d => d.x === x && d.y === y) || null;

export const zoneAt = (map, x, y) => map.zones.find(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) || null;

/* Every tile you can walk to from `from`, as "x,y" strings. */
export function reachable(map, from, flags = {}) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length) {
    const p = queue.shift();
    for (const dir of Object.keys(DIRS)) {
      const n = step(map, p, dir, flags);
      const key = `${n.x},${n.y}`;
      if (n.moved && !seen.has(key)) { seen.add(key); queue.push(n); }
    }
  }
  return seen;
}
