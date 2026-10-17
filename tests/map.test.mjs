import { test } from "node:test";
import assert from "node:assert/strict";
import { createMap, tileAt, isWalkable, step, zoneAt, reachable, frameGrid, placeAhead, objectAt, objectAhead, activeObjects, FRAMES, TILES } from "../src/world/map.js";
import { OVERWORLD } from "../src/world/overworld.js";

const world = createMap(OVERWORLD);
const find = ch => {
  const out = [];
  world.rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push({ x, y }); }));
  return out;
};

test("the overworld is a 64 x 40 rectangle of known tiles", () => {
  assert.equal(world.width, 64);
  assert.equal(world.height, 40);
});

test("createMap rejects uneven rows and unknown tiles", () => {
  assert.throws(() => createMap({ name: "bad", rows: ["...", ".."], zones: [] }), /row 1/);
  assert.throws(() => createMap({ name: "bad", rows: ["..?"], zones: [] }), /unknown tile/);
});

test("the edge of the world is solid all the way round", () => {
  for (let x = 0; x < world.width; x++) {
    assert.ok(!isWalkable(world, x, 0), `top edge open at ${x}`);
    assert.ok(!isWalkable(world, x, world.height - 1), `bottom edge open at ${x}`);
  }
  for (let y = 0; y < world.height; y++) {
    assert.ok(!isWalkable(world, 0, y), `left edge open at ${y}`);
    assert.ok(!isWalkable(world, world.width - 1, y), `right edge open at ${y}`);
  }
});

test("you start on open ground in the village", () => {
  assert.ok(isWalkable(world, world.spawn.x, world.spawn.y));
  assert.equal(zoneAt(world, world.spawn.x, world.spawn.y).id, "village");
});

test("the fallen oak is the only way to the cave", () => {
  const [cave] = find("C");
  assert.ok(!reachable(world, world.spawn).has(`${cave.x},${cave.y}`), "cave reachable with the oak in place");
  const log = world.objects.find(o => o.id === "fallenLog");
  for (const [dx, dy] of [[0, -1], [0, 1]]) assert.ok(isWalkable(world, log.x + dx, log.y + dy), "you can stand on both sides of the oak");
});

test("people and the oak block the way until the oak is cleared", () => {
  const elder = world.objects.find(o => o.id === "elder");
  assert.equal(isWalkable(world, elder.x, elder.y), false);
  assert.equal(objectAhead(world, { x: elder.x, y: elder.y + 1 }, "up").id, "elder");
  const log = world.objects.find(o => o.id === "fallenLog");
  assert.equal(objectAt(world, log.x, log.y).id, "fallenLog");
  assert.equal(objectAt(world, log.x, log.y, { logCleared: true }), null);
  assert.equal(activeObjects(world, { logCleared: true }).length, world.objects.length - 1);
});

test("objects can't be placed on solid tiles", () => {
  assert.throws(() => createMap({ name: "bad", zones: [], rows: ["T."], objects: [{ id: "x", x: 0, y: 0 }] }), /solid/);
});

test("the bridge, the forest and the cave mouth can all be reached from the start (once the oak is moved)", () => {
  const seen = reachable(world, world.spawn, { logCleared: true });
  const [cave] = find("C");
  assert.ok(cave, "map has a cave mouth");
  assert.ok(seen.has(`${cave.x},${cave.y}`), "cave mouth is reachable");
  for (const b of find("#")) assert.ok(seen.has(`${b.x},${b.y}`), "bridge is reachable");
  assert.ok([...seen].some(k => zoneAt(world, ...k.split(",").map(Number))?.id === "forest"), "forest is reachable");
});

test("every door has open ground in front of it", () => {
  for (const d of [...find("D"), ...find("B")]) assert.ok(isWalkable(world, d.x, d.y + 1), `door at ${d.x},${d.y} is blocked`);
});

test("the blacksmith's door is in the village and reachable", () => {
  const [smithy] = find("B");
  assert.ok(smithy, "map has a blacksmith");
  assert.equal(zoneAt(world, smithy.x, smithy.y).id, "village");
  const front = { x: smithy.x, y: smithy.y + 1 };
  assert.ok(reachable(world, world.spawn).has(`${front.x},${front.y}`));
  assert.equal(placeAhead(world, front, "up"), "blacksmith");
  assert.equal(placeAhead(world, front, "down"), null);
});

test("walking stops at solid tiles and the map edge", () => {
  const tiny = createMap({ name: "tiny", zones: [], rows: ["~.T", "..="] });
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "left"), { x: 1, y: 0, moved: false }); // water
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "right"), { x: 1, y: 0, moved: false }); // tree
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "up"), { x: 1, y: 0, moved: false }); // edge
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "down"), { x: 1, y: 1, moved: true });
  assert.equal(tileAt(tiny, 5, 5), null);
});

test("every tile has a tileset frame", () => {
  for (const t of Object.values(TILES)) assert.ok(FRAMES.includes(t.name), `${t.name} has no frame`);
  for (const row of frameGrid(world)) for (const f of row) assert.ok(f >= 0);
});
