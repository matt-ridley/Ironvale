// Random encounters. After each step in a wild area there is a chance of a fight, rolled on that area's table.
// Paths are safer (half the chance), and there is a short quiet spell after every fight.

export const ENCOUNTERS = {
  forest: {
    chance: 0.1,
    table: [
      { weight: 4, foes: ["giantRat"] },
      { weight: 3, foes: ["wolf"] },
      { weight: 2, foes: ["goblin"] },
      { weight: 1, foes: ["giantRat", "giantRat"] },
    ],
  },
  rocks: {
    chance: 0.12,
    table: [
      { weight: 3, foes: ["goblin"] },
      { weight: 1, foes: ["wolf"] },
      { weight: 1, foes: ["goblin", "giantRat"] },
    ],
  },
};

export const QUIET_STEPS = 8; // no fights for this many steps after one
export const SAFE_TILES = ["cave"]; // standing in the cave mouth never starts a fight

/* Returns the monsters to fight (ids) or null. `stepsSinceFight` counts this step. */
export function rollEncounter(zoneId, tileName, stepsSinceFight, rng = Math.random) {
  const area = ENCOUNTERS[zoneId];
  if (!area || stepsSinceFight < QUIET_STEPS || SAFE_TILES.includes(tileName)) return null;
  const chance = tileName === "path" ? area.chance / 2 : area.chance;
  if (rng() >= chance) return null;
  return [...pickWeighted(area.table, rng).foes];
}

export function pickWeighted(entries, rng = Math.random) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let n = rng() * total;
  for (const e of entries) if ((n -= e.weight) < 0) return e;
  return entries[entries.length - 1];
}
