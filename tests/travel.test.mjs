import { test } from "node:test";
import assert from "node:assert/strict";
import { TRAVEL_POINTS, travelPoints, markSeen, zoneSeen, seenFlag, canFastTravel } from "../src/world/travel.js";
import { MAPS } from "../src/world/maps.js";
import { isWalkable, zoneAt, reachable, tileAt } from "../src/world/map.js";
import { MAP_COLOURS } from "../src/art/tiles.js";

const world = MAPS.overworld;

test("every travel point is open ground in its own zone, reachable from the village", () => {
  const from = reachable(world, world.spawn, { logCleared: true });
  for (const p of TRAVEL_POINTS) {
    assert.ok(isWalkable(world, p.at.x, p.at.y), `${p.name} lands you in a wall`);
    assert.equal(zoneAt(world, p.at.x, p.at.y).id, p.zone, p.name);
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

test("fast travel only works out in the open", () => {
  assert.ok(canFastTravel({ map: "overworld" }));
  assert.ok(!canFastTravel({ map: "deepCave" }));
  assert.ok(!canFastTravel({ map: "tomHut" }));
});

test("every overworld tile has a colour on the map", () => {
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const name = tileAt(world, x, y).name;
    assert.ok(MAP_COLOURS[name], `${name} has no map colour`);
  }
});
