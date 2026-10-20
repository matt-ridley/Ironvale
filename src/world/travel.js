// The world map's rules: which parts of the overworld you've seen (the rest is under fog), and the places you can
// fast-travel to once you've found them. No Phaser here, so it can be tested; the WorldMap screen shows it.
import { OVERWORLD } from "./overworld.js";

/* The quest flag that says you've been in a zone, e.g. seenForest. */
export const seenFlag = zoneId => `seen${zoneId[0].toUpperCase()}${zoneId.slice(1)}`;

// Saves from before 0.16.0 have no seen flags, so quest progress counts as having been there too.
const ALREADY_THERE = {
  village: () => true,
  forest: f => f.logCleared || f.logPassed || f.bowFound || f.chiefDefeated,
  rocks: f => f.logCleared || f.logPassed || f.chiefDefeated,
  meadow: f => f.metTom || f.meganQuest || f.meganJoined,
};

export const zoneSeen = (flags, zoneId) => !!(flags[seenFlag(zoneId)] || ALREADY_THERE[zoneId]?.(flags));

/* Notes that you've been in a zone. Returns true the first time. */
export function markSeen(flags, zoneId) {
  if (flags[seenFlag(zoneId)]) return false;
  flags[seenFlag(zoneId)] = true;
  return true;
}

// Places to fast-travel to, found by setting foot in their zone. `at` is a tile out in the open.
export const TRAVEL_POINTS = [
  { id: "oakhollow", name: "Oakhollow", zone: "village", at: OVERWORLD.spawn },
  { id: "willowmere", name: "Willowmere", zone: "meadow", at: { x: 20, y: 45 } },
  { id: "goblinRocks", name: "Goblin Rocks", zone: "rocks", at: { x: 52, y: 30 } },
];

/* Every travel point, with whether you've found it. */
export const travelPoints = flags => TRAVEL_POINTS.map(p => ({ ...p, found: zoneSeen(flags, p.zone) }));

/* Fast travel works from anywhere out in the open, not from inside a house or underground. */
export const canFastTravel = state => state.map === OVERWORLD.name;
