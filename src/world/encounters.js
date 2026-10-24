// Random encounters. After each step in a wild area there is a chance of a fight, rolled on that area's table.
// Paths are safer (half the chance), and there is a short quiet spell after every fight. A Potion of Speed cuts the
// chance further (SPEED_ENCOUNTERS): you're past most monsters before they notice you.
// On average that's a fight every 30 or so steps off the path and every 50 or so on it (the quiet spell plus one in
// `chance`); before 0.15.1 it was about every 18 and 28, which was too often.
// From Act 3, in an area you're RUN_AWAY_LEVELS or more levels too strong for, about half the fights end before they
// start: the monsters take one look at you and bolt (runsAway), for a few XP. The rest still fight.
// With Claire in your party (Act 4), a fight that's only beasts doesn't happen at all (beastsLeave).
import { MONSTERS } from "../data/monsters.js";

/* With Claire in your party, beasts won't fight you: an encounter that's only beasts ends before it starts. */
export const beastsLeave = (foes, companionId) => companionId === "claire" && foes.every(id => MONSTERS[id]?.type === "beast");

export const ENCOUNTERS = {
  // Beyond the Door (Act 4): the ash road. Hell hounds hunt in pairs; salamanders and fire elementals shrug off fire
  // and ordinary steel, and come with company (alone, they're no match for you). Simulated, a level 13 hero with +4
  // gear and any one companion wins 99-100% of these with 77-87% of their HP left.
  ashRoad: {
    level: 13,
    chance: 0.05,
    table: [
      { weight: 3, foes: ["hellHound", "hellHound"] },
      { weight: 2, foes: ["salamander", "hellHound"] },
      { weight: 2, foes: ["fireElemental", "hellHound"] },
      { weight: 1, foes: ["salamander", "fireElemental"] },
      { weight: 1, foes: ["salamander", "salamander"] },
    ],
  },
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

  // The Mountain Pass (Act 3): fights get tougher as the road climbs. Thorne's camp and the gatehouse are guarded by
  // his rune-touched gargoyles and elementals; Corwin's watchtower is griffon country. Simulated (tools/simulate.mjs),
  // a level 9 hero with +3 gear and Rachel wins the slopes' fights with 85-100% of their HP left, the snowfield's with
  // 65-90%; the heights are for level 11 (a level 10 hero with +4 gear wins 95-100%, with 65-95% left).
  slopes: {
    level: 9,
    chance: 0.05,
    table: [
      { weight: 2, foes: ["griffon"] },
      { weight: 3, foes: ["griffon", "griffon"] },
      { weight: 2, foes: ["manticore"] },
      { weight: 2, foes: ["ettin"] },
      { weight: 2, foes: ["griffon", "manticore"] },
    ],
  },
  snowfield: {
    level: 10,
    chance: 0.05,
    table: [
      { weight: 2, foes: ["troll"] },
      { weight: 2, foes: ["ettin", "griffon"] },
      { weight: 2, foes: ["wyvern"] },
      { weight: 2, foes: ["manticore", "manticore"] },
      { weight: 2, foes: ["troll", "griffon"] },
    ],
  },
  heights: {
    level: 11,
    chance: 0.05,
    table: [
      { weight: 2, foes: ["wyvern"] },
      { weight: 2, foes: ["stoneGiant"] },
      { weight: 2, foes: ["troll"] },
      { weight: 1, foes: ["troll", "ettin"] },
      { weight: 1, foes: ["wyvern", "griffon"] },
    ],
  },
  frozenChapel: {
    level: 10,
    chance: 0.08,
    table: [
      { weight: 2, foes: ["specter", "specter"] },
      { weight: 2, foes: ["wraith"] },
      { weight: 2, foes: ["wraith", "specter"] },
      { weight: 1, foes: ["wraith", "wraith"] },
    ],
  },
  gatehouse: {
    level: 12,
    chance: 0.07,
    table: [
      { weight: 2, foes: ["helmedHorror", "helmedHorror"] },
      { weight: 2, foes: ["chimera"] },
      { weight: 2, foes: ["shieldGuardian"] },
      { weight: 1, foes: ["chimera", "helmedHorror"] },
    ],
  },
  watchtower: {
    level: 10,
    chance: 0.06,
    table: [
      { weight: 3, foes: ["griffon"] },
      { weight: 2, foes: ["griffon", "griffon"] },
    ],
  },
  thorneCamp: {
    level: 11,
    chance: 0.07,
    table: [
      { weight: 3, foes: ["gargoyle", "gargoyle"] },
      { weight: 1, foes: ["earthElemental"] },
    ],
  },
  gatehouseApproach: {
    level: 12,
    chance: 0.06,
    table: [
      { weight: 2, foes: ["gargoyle", "gargoyle"] },
      { weight: 2, foes: ["stoneGiant"] },
      { weight: 1, foes: ["earthElemental"] },
    ],
  },
};

ENCOUNTERS.frozenForge = ENCOUNTERS.barracks = ENCOUNTERS.gatehouse; // the gatehouse's side rooms

export const QUIET_STEPS = 12; // no fights for this many steps after one
export const SAFE_TILES = ["cave", "caveexit", "passage", "ice"]; // a cave mouth, or sliding on ice, never starts a fight
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
