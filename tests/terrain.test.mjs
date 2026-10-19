import { test } from "node:test";
import assert from "node:assert/strict";
import { joins } from "../src/art/terrain.js";
import { createMap } from "../src/world/map.js";
import { MAPS } from "../src/world/maps.js";

// A little pond in a meadow, crossed by a path, beside a house.
const map = createMap({
  name: "test",
  zones: [],
  rows: [
    "......RRR",
    ".~~~..HDH",
    ".~~~..===",
    "..~..=...",
    "=====....",
  ],
});
const sides = list => list.map(e => e.side ?? e).sort();

test("water gets a bank on every side that touches land", () => {
  assert.deepEqual(sides(joins(map, 1, 1).bank), ["n", "w"]); // the pond's top-left corner
  assert.deepEqual(sides(joins(map, 2, 1).bank), ["n"]);
  assert.deepEqual(sides(joins(map, 2, 3).bank), ["e", "s", "w"]);
  assert.equal(joins(map, 2, 1).bank[0].next, "grass");
});

test("an inside corner of the water gets a corner of bank", () => {
  // (2, 2) has water on all four sides but grass diagonally down-left and down-right.
  assert.deepEqual(sides(joins(map, 2, 2).bank), []);
  assert.deepEqual(sides(joins(map, 2, 2).bankCorners), ["se", "sw"]);
});

test("paths fray into grass, not into each other", () => {
  assert.deepEqual(sides(joins(map, 3, 4).verge), ["n"]);
  assert.deepEqual(sides(joins(map, 2, 4).verge), []); // water above, not grass
  assert.deepEqual(sides(joins(map, 0, 4).verge), ["n"]); // the map's edge is more path
  assert.deepEqual(sides(joins(map, 5, 3).verge), ["e", "n", "s", "w"]); // a lone bit of path
});

test("ground under a wall is in its shadow, and roofs get a ridge and an eave", () => {
  assert.deepEqual(joins(map, 7, 2).shade, ["n"]);
  assert.deepEqual(joins(map, 0, 0).shade, []);
  assert.deepEqual(joins(map, 7, 0).roof, { ridge: false, eave: true, w: false, e: false }); // the top row is the map's edge
  assert.deepEqual(joins(map, 6, 0).roof, { ridge: false, eave: true, w: true, e: false });
});

test("cave walls get a ledge above open floor", () => {
  const cave = MAPS.deepCave;
  assert.equal(joins(cave, 10, 4).ledge, false); // wall above wall
  assert.equal(joins(cave, 2, 4).ledge, true); // the torch above the grotto
});

test("every map's joins can be worked out", () => {
  for (const m of Object.values(MAPS)) for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) joins(m, x, y);
});
