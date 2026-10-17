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
  "f": { name: "fence", solid: true },
};

// Order of the tiles in the tileset image. "grass2" is a second look for grass so fields don't look stamped.
export const FRAMES = ["grass", "grass2", "flowers", "path", "bridge", "cave", "tree", "water", "rock", "roof", "wall", "door", "fence"];

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
  return { ...def, width, height };
}

export const inBounds = (map, x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height;
export const tileAt = (map, x, y) => (inBounds(map, x, y) ? TILES[map.rows[y][x]] : null);
export const isWalkable = (map, x, y) => { const t = tileAt(map, x, y); return !!t && !t.solid; };

/* One step in a direction. Blocked steps stay put. */
export function step(map, pos, dir) {
  const d = DIRS[dir];
  const x = pos.x + d.dx, y = pos.y + d.dy;
  return isWalkable(map, x, y) ? { x, y, moved: true } : { x: pos.x, y: pos.y, moved: false };
}

export const zoneAt = (map, x, y) => map.zones.find(z => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) || null;

/* Every tile you can walk to from `from`, as "x,y" strings. */
export function reachable(map, from) {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length) {
    const p = queue.shift();
    for (const dir of Object.keys(DIRS)) {
      const n = step(map, p, dir);
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
