// Random encounters. After each step in a wild area there is a chance of a fight, rolled on that area's table.
// Paths are safer (half the chance), and there is a short quiet spell after every fight. A Potion of Speed cuts the
// chance further (SPEED_ENCOUNTERS): you're past most monsters before they notice you.

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
  meadow: {
    chance: 0.09,
    table: [
      { weight: 3, foes: ["boar"] },
      { weight: 3, foes: ["wolf"] },
      { weight: 2, foes: ["giantRat"] },
      { weight: 1, foes: ["wolf", "wolf"] },
    ],
  },
  warrens: {
    chance: 0.1,
    table: [
      { weight: 3, foes: ["goblin"] },
      { weight: 3, foes: ["giantBat"] },
      { weight: 2, foes: ["goblin", "goblin"] },
      { weight: 2, foes: ["hobgoblin"] },
      { weight: 1, foes: ["hobgoblin", "goblin"] },
    ],
  },
};

export const QUIET_STEPS = 8; // no fights for this many steps after one
export const SAFE_TILES = ["cave", "caveexit"]; // standing in a cave mouth never starts a fight
export const SPEED_ENCOUNTERS = 0.35; // a Potion of Speed leaves this much of the usual chance

/* Returns the monsters to fight (ids) or null. `stepsSinceFight` counts this step. */
export function rollEncounter(zoneId, tileName, stepsSinceFight, rng = Math.random, { fast = false } = {}) {
  const area = ENCOUNTERS[zoneId];
  if (!area || stepsSinceFight < QUIET_STEPS || SAFE_TILES.includes(tileName)) return null;
  const chance = (tileName === "path" ? area.chance / 2 : area.chance) * (fast ? SPEED_ENCOUNTERS : 1);
  if (rng() >= chance) return null;
  return [...pickWeighted(area.table, rng).foes];
}

export function pickWeighted(entries, rng = Math.random) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let n = rng() * total;
  for (const e of entries) if ((n -= e.weight) < 0) return e;
  return entries[entries.length - 1];
}
