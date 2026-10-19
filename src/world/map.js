// Tile maps and grid movement. No Phaser here, so it can be tested; the World scene draws what this describes.

// Map legend. `solid` tiles block walking.
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
  "D": { name: "door", solid: true }, // doors open in a later milestone
  "B": { name: "smithy", solid: true, place: "blacksmith" }, // walk into it to go inside
  "A": { name: "apothecary", solid: true, place: "apothecary" },
  "$": { name: "bank", solid: true, place: "bank" },
  "f": { name: "fence", solid: true },
  // The Deep Warrens
  "_": { name: "cavefloor", solid: false },
  "%": { name: "cavewall", solid: true },
  "t": { name: "cavetorch", solid: true },
  "O": { name: "caveexit", solid: false },
};

// Order of the tiles in the tileset image. "grass2" is a second look for grass so fields don't look stamped.
export const FRAMES = ["grass", "grass2", "flowers", "path", "bridge", "cave", "tree", "water", "rock", "roof", "wall", "door", "fence", "smithy",
  "apothecary", "cavefloor", "cavewall", "cavetorch", "caveexit", "bank"];

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
  const map = { objects: [], exits: [], ...def, width, height };
  for (const o of map.objects) {
    if (tileAt(map, o.x, o.y)?.solid !== false) throw new Error(`Map ${def.name}: ${o.id} stands on a solid tile`);
  }
  return map;
}

/* Objects still on the map, given the quest flags. */
export const activeObjects = (map, flags = {}) => map.objects.filter(o => !(o.goneWhen && flags[o.goneWhen]));
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

/* The place (a shop, later a house) on the tile you'd walk into, if any. */
export function placeAhead(map, pos, dir) {
  const d = DIRS[dir];
  return tileAt(map, pos.x + d.dx, pos.y + d.dy)?.place || null;
}

export const exitAt = (map, x, y) => map.exits.find(e => e.x === x && e.y === y) || null;

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

/* Tileset frame numbers for each tile, for Phaser's tilemap. Grass alternates looks by position. */
export function frameGrid(map) {
  return map.rows.map((row, y) => [...row].map((ch, x) => {
    let name = TILES[ch].name;
    if (name === "grass" && ((x * 7 + y * 13) ^ (x * y)) % 5 === 0) name = "grass2";
    return FRAMES.indexOf(name);
  }));
}
