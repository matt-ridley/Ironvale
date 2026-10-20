// The world map's rules: which parts of the overworld you've seen (the rest is under fog), the safe places (hubs
// and camps), and fast travel between them once you've found them. No Phaser here, so it can be tested; the
// WorldMap screen shows it.
import { OVERWORLD } from "./overworld.js";
import { MAPS } from "./maps.js";
import { zoneAt } from "./map.js";
import { tileOf } from "./movement.js";

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

// Safe places, which are also where you fast-travel to and from. Each is found by setting foot in its zone, and `at`
// is the tile out in the open where fast travel lands you.
// - A hub (one per act) is a whole town: no monsters, an inn for a long rest (for gold), and the shops. You wake in
//   your last hub's inn if you faint, and a Homeward Feather takes you back to it. `rooms` are its houses.
// - A camp is a small safe spot out in the wild: no monsters within CAMP_RADIUS tiles of its `centre`, and a free
//   short rest (the campfire), or Old Tom's spare bed in his hut.
export const TRAVEL_POINTS = [
  { id: "oakhollow", name: "Oakhollow", kind: "hub", map: "overworld", zone: "village", at: OVERWORLD.spawn,
    inn: "inn", innName: "the Sleeping Fox", rooms: ["marenHouse", "hazelHouse", "inn"] },
  { id: "willowmere", name: "Willowmere", kind: "camp", map: "overworld", zone: "meadow", at: { x: 20, y: 45 },
    centre: { x: 20, y: 43 }, rooms: ["tomHut"] }, // Old Tom's hut
  { id: "goblinRocks", name: "Goblin Rocks", kind: "camp", map: "overworld", zone: "rocks", at: { x: 52, y: 30 },
    centre: { x: 50, y: 31 } }, // the campfire
];
export const CAMP_RADIUS = 3;
export const FIRST_HUB = "oakhollow";

/* A hub by id (the first one if it's unknown). */
export const hubById = id => TRAVEL_POINTS.find(p => p.kind === "hub" && p.id === id) || TRAVEL_POINTS.find(p => p.id === FIRST_HUB);

/* Every travel point, with whether you've found it. */
export const travelPoints = flags => TRAVEL_POINTS.map(p => ({ ...p, found: zoneSeen(flags, p.zone) }));

/* The hub or camp you're standing in (or in one of its rooms), or null out in the wild and underground. */
export function safePlace(state) {
  const t = tileOf(state.pos);
  return TRAVEL_POINTS.find(p => p.rooms?.includes(state.map) || (p.map === state.map && (p.kind === "hub"
    ? zoneAt(MAPS[p.map], t.x, t.y)?.id === p.zone
    : Math.max(Math.abs(t.x - p.centre.x), Math.abs(t.y - p.centre.y)) <= CAMP_RADIUS))) || null;
}

/* Fast travel only works from a safe place: a hub or a camp. */
export const canFastTravel = state => !!safePlace(state);
