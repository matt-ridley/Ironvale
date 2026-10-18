import { test } from "node:test";
import assert from "node:assert/strict";
import { blockedAt, moveBody, velocity, facingFor, feetAt, tileOf, tileAhead, WALK_SPEED, RUN_SPEED, HITBOX } from "../src/world/movement.js";
import { createMap } from "../src/world/map.js";
import { OVERWORLD } from "../src/world/overworld.js";

// A little room: walls round the edge, a pillar in the middle, a one-tile gap in the right-hand wall.
const room = createMap({
  name: "room", zones: [], rows: [
    "TTTTTTT",
    "T.....T",
    "T..T...",
    "T.....T",
    "TTTTTTT",
  ],
});
const near = (a, b, d = 1e-6) => Math.abs(a - b) < d;
const walk = (map, pos, dx, dy, frames = 60, flags) => {
  for (let i = 0; i < frames; i++) pos = moveBody(map, pos, dx, dy, flags);
  return pos;
};

test("feet sit inside the tile they stand on", () => {
  assert.deepEqual(tileOf(feetAt(3, 2)), { x: 3, y: 2 });
  assert.equal(blockedAt(room, 1.5, 1.85), false);
  assert.equal(blockedAt(room, 3.5, 2.85), true); // the pillar
});

test("diagonals are no faster than straight lines", () => {
  const straight = velocity(1, 0), diag = velocity(1, 1);
  assert.ok(near(Math.hypot(diag.vx, diag.vy), Math.hypot(straight.vx, straight.vy)));
  assert.equal(velocity(0.05, 0).speed, 0); // dead zone
  assert.equal(velocity(1, 0).speed, RUN_SPEED); // stick pushed all the way
  assert.ok(velocity(0.5, 0).speed < WALK_SPEED * 0.6 + 1e-9 && velocity(0.5, 0).speed > 0);
  assert.equal(velocity(0.5, 0, { run: true }).speed, RUN_SPEED);
});

test("walls stop you, and you end up right against them", () => {
  const end = walk(room, feetAt(1, 1), -0.05, 0);
  assert.ok(near(end.x, 1 + HITBOX.hw, 0.01), `x ${end.x}`);
  assert.ok(!blockedAt(room, end.x, end.y));
});

test("walking diagonally into a wall slides along it", () => {
  const start = feetAt(1, 1);
  const end = walk(room, start, 0.05, -0.05, 20);
  assert.ok(end.x > start.x + 0.5, "kept moving sideways");
  assert.ok(end.y >= 1 + HITBOX.h - 0.01, "never went into the top wall");
});

test("a slightly-off approach is nudged through a one-tile gap", () => {
  // The gap is at (6, 2). Start with the feet just into row 3, so the hitbox clips the wall below the gap.
  const start = { x: 5.5, y: 3.1 };
  assert.ok(blockedAt(room, 6.5, 3.1), "lined up badly on purpose");
  const end = walk(room, start, 0.05, 0, 40);
  assert.ok(end.x > 6.2, `got through the gap (x ${end.x.toFixed(2)})`);
});

test("you never end up inside anything, whatever you press", () => {
  let pos = feetAt(1, 1);
  const dirs = [[0.07, 0.03], [-0.02, 0.07], [0.07, -0.07], [-0.07, -0.01], [0.01, 0.07]];
  for (let i = 0; i < 400; i++) {
    const [dx, dy] = dirs[i % dirs.length];
    pos = moveBody(room, pos, dx, dy);
    assert.ok(!blockedAt(room, pos.x, pos.y), `stuck in a wall at ${pos.x.toFixed(2)},${pos.y.toFixed(2)}`);
  }
});

test("objects block too, until a quest flag removes them", () => {
  const world = createMap(OVERWORLD);
  const log = world.objects.find(o => o.id === "fallenLog");
  const north = feetAt(log.x, log.y - 1);
  const end = walk(world, north, 0, 0.05, 40);
  assert.equal(tileOf(end).y, log.y - 1, "stopped by the oak");
  const cleared = walk(world, north, 0, 0.05, 40, { logCleared: true });
  assert.ok(tileOf(cleared).y > log.y, "walked past once it's gone");
});

test("facing: diagonals use the side frames", () => {
  assert.equal(facingFor(1, 1), "right");
  assert.equal(facingFor(-1, 0.3), "left");
  assert.equal(facingFor(0.1, -1), "up");
  assert.equal(facingFor(0, 0, "up"), "up");
});

test("the tile ahead is the one you face", () => {
  const pos = feetAt(5, 5);
  assert.deepEqual(tileAhead(pos, "up"), { x: 5, y: 4 });
  assert.deepEqual(tileAhead(pos, "down"), { x: 5, y: 6 });
  assert.deepEqual(tileAhead(pos, "left"), { x: 4, y: 5 });
  assert.deepEqual(tileAhead(pos, "right"), { x: 6, y: 5 });
  // Still the next tile when pressed right up against it
  assert.deepEqual(tileAhead({ x: 5.5, y: 5 + HITBOX.h + 0.001 }, "up"), { x: 5, y: 4 });
  assert.deepEqual(tileAhead({ x: 5 + HITBOX.hw + 0.001, y: 5.85 }, "left"), { x: 4, y: 5 });
});
