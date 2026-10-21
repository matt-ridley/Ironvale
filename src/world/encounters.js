// Random encounters. After each step in a wild area there is a chance of a fight, rolled on that area's table.
// Paths are safer (half the chance), and there is a short quiet spell after every fight. A Potion of Speed cuts the
// chance further (SPEED_ENCOUNTERS): you're past most monsters before they notice you.
// On average that's a fight every 30 or so steps off the path and every 50 or so on it (the quiet spell plus one in
// `chance`); before 0.15.1 it was about every 18 and 28, which was too often.
// From Act 3, in an area you're RUN_AWAY_LEVELS or more levels too strong for, about half the fights end before they
// start: the monsters take one look at you and bolt (runsAway), for a few XP. The rest still fight.

export const ENCOUNTERS = {
  forest: {
    level: 1, // about the level you'd be on your first visit (for monsters that run away)
    chance: 0.05,
    table: [
      { weight: 4, foes: ["giantRat"] },
      { weight: 3, foes: ["wolf"] },
      { weight: 2, foes: ["goblin"] },
      { weight: 1, foes: ["giantRat", "giantRat"] },
    ],
  },
  rocks: {
    level: 2,
    chance: 0.06,
    table: [
      { weight: 3, foes: ["goblin"] },
      { weight: 1, foes: ["wolf"] },
      { weight: 1, foes: ["goblin", "giantRat"] },
    ],
  },
  meadow: {
    level: 2,
    chance: 0.045,
    table: [
      { weight: 3, foes: ["boar"] },
      { weight: 3, foes: ["wolf"] },
      { weight: 2, foes: ["giantRat"] },
      { weight: 1, foes: ["wolf", "wolf"] },
    ],
  },
  warrens: {
    level: 3,
    chance: 0.05,
    table: [
      { weight: 3, foes: ["goblin"] },
      { weight: 3, foes: ["giantBat"] },
      { weight: 2, foes: ["goblin", "goblin"] },
      { weight: 2, foes: ["hobgoblin"] },
      { weight: 1, foes: ["hobgoblin", "goblin"] },
    ],
  },
  fen: {
    level: 5,
    chance: 0.05,
    table: [
      { weight: 3, foes: ["giantFrog"] },
      { weight: 3, foes: ["lizardfolk"] },
      { weight: 2, foes: ["giantFrog", "giantFrog"] },
      { weight: 2, foes: ["ghoul"] },
      { weight: 1, foes: ["lizardfolk", "giantFrog"] },
      { weight: 1, foes: ["lizardfolk", "lizardfolk"] },
      { weight: 1, foes: ["willOWisp"] },
    ],
  },
  // Ironvale Keep: the risen garrison comes in pairs (the hero's armour is good by now). At level 5 with +2 gear the
  // simulator gives two wights about 77%, a wight and a ghast 81%, a helmed horror and a skeleton 87%.
  courtyard: {
    level: 6,
    chance: 0.06,
    table: [
      { weight: 3, foes: ["skeleton", "skeleton"] },
      { weight: 2, foes: ["skeleton", "ghoul"] },
      { weight: 2, foes: ["ghast", "skeleton"] },
      { weight: 1, foes: ["wight"] },
    ],
  },
  chapel: {
    level: 7,
    chance: 0.07,
    table: [
      { weight: 2, foes: ["ghast", "ghast"] },
      { weight: 2, foes: ["wight", "skeleton"] },
      { weight: 1, foes: ["wight", "ghast"] },
    ],
  },
  armoury: {
    level: 7,
    chance: 0.07,
    table: [
      { weight: 2, foes: ["skeleton", "skeleton"] },
      { weight: 2, foes: ["helmedHorror", "skeleton"] },
      { weight: 1, foes: ["wight", "wight"] },
    ],
  },
  keepGrounds: {
    level: 6,
    chance: 0.06,
    table: [
      { weight: 3, foes: ["ghoul"] },
      { weight: 2, foes: ["willOWisp"] },
      { weight: 2, foes: ["ghoul", "ghoul"] },
      { weight: 1, foes: ["willOWisp", "ghoul"] },
      { weight: 1, foes: ["lizardfolk", "lizardfolk"] },
    ],
  },
};

export const QUIET_STEPS = 12; // no fights for this many steps after one
export const SAFE_TILES = ["cave", "caveexit", "passage"]; // standing in a cave mouth never starts a fight
export const ROADS = ["path", "boardwalk", "causeway"]; // half the chance of a fight
export const SPEED_ENCOUNTERS = 0.35; // a Potion of Speed leaves this much of the usual chance

/* Returns the monsters to fight (ids) or null. `stepsSinceFight` counts this step. `safe`: you're at a camp. */
export function rollEncounter(zoneId, tileName, stepsSinceFight, rng = Math.random, { fast = false, safe = false } = {}) {
  const area = ENCOUNTERS[zoneId];
  if (!area || safe || stepsSinceFight < QUIET_STEPS || SAFE_TILES.includes(tileName)) return null;
  const chance = (ROADS.includes(tileName) ? area.chance / 2 : area.chance) * (fast ? SPEED_ENCOUNTERS : 1);
  if (rng() >= chance) return null;
  return [...pickWeighted(area.table, rng).foes];
}

export const RUN_AWAY_LEVELS = 5;
export const RUN_AWAY_CHANCE = 0.5;
export const RUN_AWAY_XP = 0.25; // the share of the monsters' XP you still get

/* True if these monsters run off instead of fighting: from Act 3, in an area far below the hero's level. */
export function runsAway(zoneId, heroLevel, act, rng = Math.random) {
  const area = ENCOUNTERS[zoneId];
  return !!area && act >= 3 && heroLevel >= area.level + RUN_AWAY_LEVELS && rng() < RUN_AWAY_CHANCE;
}

export function pickWeighted(entries, rng = Math.random) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let n = rng() * total;
  for (const e of entries) if ((n -= e.weight) < 0) return e;
  return entries[entries.length - 1];
}
