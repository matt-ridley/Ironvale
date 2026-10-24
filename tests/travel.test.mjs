import { test } from "node:test";
import assert from "node:assert/strict";
import { TRAVEL_POINTS, travelPoints, markSeen, zoneSeen, seenFlag, canFastTravel, safePlace, hubById, CAMP_RADIUS } from "../src/world/travel.js";
import { feetAt } from "../src/world/movement.js";
import { MAPS } from "../src/world/maps.js";
import { isWalkable, zoneAt, reachable, tileAt } from "../src/world/map.js";
import { MAP_COLOURS } from "../src/art/tiles.js";

const world = MAPS.overworld;

test("every travel point is open ground in its own zone, reachable from where you arrive on its map", () => {
  for (const p of TRAVEL_POINTS) {
    const map = MAPS[p.map], from = reachable(map, map.spawn, { logCleared: true, causewayRaised: true, runeDoor1: true, runeDoor2: true, runeDoor3: true, thorneDefeated: true });
    assert.ok(isWalkable(map, p.at.x, p.at.y), `${p.name} lands you in a wall`);
    assert.equal(zoneAt(map, p.at.x, p.at.y).id, p.zone, p.name);
    assert.ok(from.has(`${p.at.x},${p.at.y}`), `${p.name} can't be walked to`);
  }
});

test("a new game has found only Oakhollow", () => {
  assert.deepEqual(travelPoints({}).filter(p => p.found).map(p => p.id), ["oakhollow"]);
});

test("setting foot in a zone finds it, once", () => {
  const flags = {};
  assert.equal(markSeen(flags, "meadow"), true);
  assert.equal(markSeen(flags, "meadow"), false);
  assert.equal(flags[seenFlag("meadow")], true);
  assert.equal(seenFlag("meadow"), "seenMeadow");
  assert.deepEqual(travelPoints(flags).filter(p => p.found).map(p => p.id), ["oakhollow", "willowmere"]);
});

test("older saves count quest progress as having been there", () => {
  assert.ok(zoneSeen({ metTom: true }, "meadow"));
  assert.ok(zoneSeen({ chiefDefeated: true }, "rocks"));
  assert.ok(zoneSeen({ logPassed: true }, "forest"));
  assert.ok(!zoneSeen({}, "forest"));
});

const at = (map, x, y) => ({ map, pos: feetAt(x, y) });

test("fast travel only works from a town or a camp", () => {
  assert.equal(safePlace(at("overworld", 15, 20))?.id, "oakhollow"); // the crossroads
  assert.equal(safePlace(at("inn", 6, 5))?.id, "oakhollow");
  assert.equal(safePlace(at("marenHouse", 5, 5))?.id, "oakhollow");
  assert.equal(safePlace(at("tomHut", 4, 4))?.id, "willowmere");
  assert.equal(safePlace(at("overworld", 20, 45))?.id, "willowmere"); // outside Old Tom's hut
  assert.equal(safePlace(at("overworld", 51, 30))?.id, "goblinRocks"); // by the campfire
  for (const s of [at("overworld", 45, 10), at("overworld", 40, 52), at("overworld", 40, 33), at("deepCave", 20, 25)]) {
    assert.equal(safePlace(s), null, `${s.map} ${s.pos.x},${s.pos.y}`);
    assert.ok(!canFastTravel(s));
  }
  assert.ok(canFastTravel(at("overworld", 15, 20)));
});

test("each place is a hub or a camp; hubs have an inn, camps a centre in their own zone", () => {
  for (const p of TRAVEL_POINTS) {
    assert.ok(["hub", "camp"].includes(p.kind), p.id);
    assert.ok(MAPS[p.map], p.id);
    if (p.kind === "hub") { assert.ok(MAPS[p.inn], `${p.id} has no inn`); assert.ok(p.wholeMap ? p.inn === p.map : p.rooms.includes(p.inn)); }
    else {
      assert.equal(zoneAt(MAPS[p.map], p.centre.x, p.centre.y).id, p.zone, p.id);
      assert.ok(Math.max(Math.abs(p.at.x - p.centre.x), Math.abs(p.at.y - p.centre.y)) <= CAMP_RADIUS, `${p.id}: travel lands you outside the camp`);
    }
    for (const r of p.rooms || []) assert.ok(MAPS[p.map].doors.some(d => d.to === r), `${r} has no door`);
  }
  assert.equal(hubById("oakhollow").id, "oakhollow");
  assert.equal(hubById("nowhere").id, "oakhollow");
  assert.equal(hubById("willowmere").id, "oakhollow"); // a camp isn't a hub
});

test("every overworld tile has a colour on the map", () => {
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const name = tileAt(world, x, y).name;
    assert.ok(MAP_COLOURS[name], `${name} has no map colour`);
  }
});

test("the world's regions: the Vale is open, Ironvale once you've reached the fen; the rest are dark shapes with hints", async () => {
  const { REGIONS, regionOpen, regionOf } = await import("../src/world/travel.js");
  assert.deepEqual(REGIONS.map(r => r.id), ["vale", "ironvale", "pass", "beyond"]);
  assert.deepEqual(REGIONS.filter(r => regionOpen(r, {})).map(r => r.id), ["vale"]);
  assert.deepEqual(REGIONS.filter(r => regionOpen(r, { seenFen: true })).map(r => r.id), ["vale", "ironvale"]);
  for (const r of REGIONS) {
    if (r.map) assert.ok(MAPS[r.map] && r.tab, r.id);
    if (r.id !== "vale") assert.ok(["keep", "mountains", "door"].includes(r.shape) && typeof r.hint({}) === "string", r.id);
  }
  // Every map says which region it's in, and travel points' maps are real.
  for (const name of Object.keys(MAPS)) assert.equal(regionOf(name).id, MAPS[name].region, name);
  for (const p of TRAVEL_POINTS) assert.ok(MAPS[p.map], p.id);
  // Ironvale's hint follows quest 3.
  const ironvale = REGIONS.find(r => r.id === "ironvale");
  assert.match(ironvale.hint({}), /east, past the marshes/);
  assert.match(ironvale.hint({ signetShown: true }), /Ironvale Keep/);
  assert.match(ironvale.hint({ signetShown: true, askedBrannoc: true }), /Brannoc is clearing/);
});

test("every zone plays a real track, and towns and houses are safe", async () => {
  const { TRACKS } = await import("../src/audio/tracks.js");
  for (const map of Object.values(MAPS)) for (const z of map.zones) assert.ok(TRACKS[z.music], `${map.name}/${z.id} has no music`);
  assert.equal(zoneAt(world, 15, 20).safe, true);
  assert.ok(!zoneAt(world, 45, 10).safe);
  assert.equal(zoneAt(MAPS.inn, 6, 5).safe, true);
});

test("the goblins' back passage is blocked by rubble you can look at", async () => {
  const { SCRIPTS } = await import("../src/story/scripts.js");
  const { startConversation, view } = await import("../src/story/dialogue.js");
  const hall = MAPS.deepCave, rubble = hall.objects.find(o => o.id === "rubble");
  const from = reachable(hall, { x: 41, y: 8 }, { gateOpened: true, kingDefeated: true });
  assert.ok([[0, 1], [-1, 0]].some(([dx, dy]) => from.has(`${rubble.x + dx},${rubble.y + dy}`)));
  assert.match(view(startConversation(SCRIPTS.rubble, { flags: {} })).text, /choked with fallen rock/);
  assert.match(view(startConversation(SCRIPTS.rubble, { flags: { askedBrannoc: true } })).text, /you'll need Brannoc/);
});
