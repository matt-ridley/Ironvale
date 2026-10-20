import { test } from "node:test";
import assert from "node:assert/strict";
import { createMap, tileAt, isWalkable, step, zoneAt, reachable, placeAhead, objectAt, objectAhead, activeObjects, TILES } from "../src/world/map.js";
import { missingTileArt } from "../src/art/tiles.js";
import { OVERWORLD } from "../src/world/overworld.js";
import { DEEP_CAVE } from "../src/world/cave.js";
import { MAPS } from "../src/world/maps.js";
import { exitAt } from "../src/world/map.js";

const world = createMap(OVERWORLD);
const find = ch => {
  const out = [];
  world.rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) out.push({ x, y }); }));
  return out;
};

test("the overworld is a 64 x 62 rectangle of known tiles", () => {
  assert.equal(world.width, 64);
  assert.equal(world.height, 62);
});

test("createMap rejects uneven rows and unknown tiles", () => {
  assert.throws(() => createMap({ name: "bad", rows: ["...", ".."], zones: [] }), /row 1/);
  assert.throws(() => createMap({ name: "bad", rows: ["..?"], zones: [] }), /unknown tile/);
});

test("the edge of every map is solid all the way round", () => {
  for (const m of Object.values(MAPS)) {
    for (let x = 0; x < m.width; x++) {
      assert.ok(!isWalkable(m, x, 0), `${m.name}: top edge open at ${x}`);
      assert.ok(!isWalkable(m, x, m.height - 1), `${m.name}: bottom edge open at ${x}`);
    }
    for (let y = 0; y < m.height; y++) {
      assert.ok(!isWalkable(m, 0, y), `${m.name}: left edge open at ${y}`);
      assert.ok(!isWalkable(m, m.width - 1, y), `${m.name}: right edge open at ${y}`);
    }
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
  assert.equal(activeObjects(world, { logCleared: true }).length, world.objects.filter(o => !o.shownWhen).length - 1);
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
  for (const d of [...find("D"), ...find("B"), ...find("A"), ...find("$")]) assert.ok(isWalkable(world, d.x, d.y + 1), `door at ${d.x},${d.y} is blocked`);
});

test("the blacksmith's, apothecary's and bank's doors are in the village and reachable", () => {
  for (const [ch, place] of [["B", "blacksmith"], ["A", "apothecary"], ["$", "bank"]]) {
    const doors = find(ch);
    assert.equal(doors.length, 1, `map has one ${place}`);
    const [door] = doors;
    assert.equal(zoneAt(world, door.x, door.y).id, "village");
    const front = { x: door.x, y: door.y + 1 };
    assert.ok(reachable(world, world.spawn).has(`${front.x},${front.y}`));
    assert.equal(placeAhead(world, front, "up"), place);
    assert.equal(placeAhead(world, front, "down"), null);
  }
});

test("walking stops at solid tiles and the map edge", () => {
  const tiny = createMap({ name: "tiny", zones: [], rows: ["~.T", "..="] });
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "left"), { x: 1, y: 0, moved: false }); // water
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "right"), { x: 1, y: 0, moved: false }); // tree
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "up"), { x: 1, y: 0, moved: false }); // edge
  assert.deepEqual(step(tiny, { x: 1, y: 0 }, "down"), { x: 1, y: 1, moved: true });
  assert.equal(tileAt(tiny, 5, 5), null);
});

test("every tile has art", () => {
  assert.deepEqual(missingTileArt(), []);
});

const key = (x, y) => `${x},${y}`;

test("Willowmere, south of the village, can be explored, and every chest there can be reached", () => {
  const seen = reachable(world, world.spawn);
  const meadow = [...seen].filter(k => zoneAt(world, ...k.split(",").map(Number))?.id === "meadow");
  assert.ok(meadow.length > 500, `only ${meadow.length} meadow tiles reachable`);
  const chests = world.objects.filter(o => o.sprite === "chest");
  assert.equal(chests.length, 3);
  for (const c of chests) {
    assert.equal(zoneAt(world, c.x, c.y).id, "meadow", c.id);
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(key(c.x + dx, c.y + dy))), `${c.id} can't be reached`);
    assert.ok(c.goneWhen && c.loot, c.id);
  }
  const tom = world.objects.find(o => o.id === "tom");
  assert.ok(seen.has(key(tom.x, tom.y + 1)) || seen.has(key(tom.x + 1, tom.y)), "Old Tom can be reached");
});

test("the Deep Warrens: every room, chest and the king can be reached from the entrance once the gate is open", () => {
  const cave = MAPS[DEEP_CAVE.name];
  assert.ok(isWalkable(cave, cave.spawn.x, cave.spawn.y));
  const gate = cave.objects.find(o => o.id === "ironGate"), king = cave.objects.find(o => o.id === "goblinKing");
  const near = (seen, o) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(key(o.x + dx, o.y + dy)));
  const closed = reachable(cave, cave.spawn);
  assert.ok(!near(closed, king), "the king can be reached without passing the gate");
  assert.ok(near(closed, gate));
  for (const [dx, dy] of [[0, -1], [0, 1]]) assert.ok(isWalkable(cave, gate.x + dx, gate.y + dy), "you can stand on both sides of the gate");
  const open = reachable(cave, cave.spawn, { gateOpened: true });
  assert.ok(near(open, king), "the king can be reached once the gate is open");
  for (const c of cave.objects.filter(o => o.sprite === "chest")) assert.ok(near(closed, c), `${c.id} can't be reached`);
  // Every floor tile is part of the cave you can walk.
  cave.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (isWalkable(cave, x, y, { gateOpened: true })) assert.ok(open.has(key(x, y)), `floor at ${x},${y} is cut off`);
  }));
});

test("the cave's way out leads back to just outside the goblin cave", () => {
  const cave = MAPS[DEEP_CAVE.name];
  assert.equal(cave.exits.length, 1);
  const [exit] = cave.exits;
  assert.ok(reachable(cave, cave.spawn).has(key(exit.x, exit.y)));
  assert.equal(exitAt(cave, exit.x, exit.y), exit);
  assert.equal(exitAt(cave, exit.x, exit.y - 1), null);
  const out = MAPS[exit.to];
  assert.ok(isWalkable(out, exit.at.x, exit.at.y));
  assert.equal(tileAt(out, exit.at.x, exit.at.y - 1).name, "cave", "you come out right below the cave mouth");
});

test("map object ids are unique across the game (their flags are shared)", () => {
  const ids = Object.values(MAPS).flatMap(m => m.objects.map(o => o.id));
  assert.equal(new Set(ids).size, ids.length);
  const flags = Object.values(MAPS).flatMap(m => m.objects.filter(o => o.sprite === "chest").map(o => o.goneWhen));
  assert.equal(new Set(flags).size, flags.length);
});

test("Megan is in Willowmere, and her bow is hidden in the Whispering Wood where you can reach it", () => {
  const megan = world.objects.find(o => o.id === "megan"), bow = world.objects.find(o => o.id === "lostBow");
  assert.equal(zoneAt(world, megan.x, megan.y).id, "meadow");
  assert.equal(zoneAt(world, bow.x, bow.y).id, "forest");
  const seen = reachable(world, world.spawn, { logCleared: true });
  for (const o of [megan, bow]) assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`)), `${o.id} can't be reached`);
});
