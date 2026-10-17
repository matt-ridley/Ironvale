import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDice, roll, rollDie, d20, seededRng } from "../src/rules/dice.js";
import { faces } from "./helpers.mjs";

test("parseDice reads dice, bonuses and plain numbers", () => {
  assert.deepEqual(parseDice("2d6+3"), { count: 2, sides: 6, bonus: 3 });
  assert.deepEqual(parseDice("d20"), { count: 1, sides: 20, bonus: 0 });
  assert.deepEqual(parseDice("1d4 - 1"), { count: 1, sides: 4, bonus: -1 });
  assert.deepEqual(parseDice("4"), { count: 0, sides: 0, bonus: 4 });
  assert.throws(() => parseDice("banana"));
  assert.throws(() => parseDice(""));
});

test("rolls stay inside the die's range", () => {
  const rng = seededRng(1);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const r = rollDie(6, rng);
    assert.ok(r >= 1 && r <= 6);
    seen.add(r);
  }
  assert.equal(seen.size, 6);
});

test("the same seed gives the same rolls", () => {
  const a = seededRng(42), b = seededRng(42);
  for (let i = 0; i < 20; i++) assert.equal(rollDie(20, a), rollDie(20, b));
});

test("roll totals dice plus bonus", () => {
  const r = roll("2d6+3", faces("4/6", "5/6"));
  assert.deepEqual(r.rolls, [4, 5]);
  assert.equal(r.total, 12);
});

test("a crit doubles the dice but not the bonus", () => {
  const r = roll("1d8+3", faces("2/8", "7/8"), { crit: true });
  assert.deepEqual(r.rolls, [2, 7]);
  assert.equal(r.total, 12);
});

test("advantage keeps the higher d20, disadvantage the lower, both cancel", () => {
  assert.equal(d20({ advantage: true }, faces("4/20", "17/20")).natural, 17);
  assert.equal(d20({ disadvantage: true }, faces("4/20", "17/20")).natural, 4);
  const both = d20({ advantage: true, disadvantage: true }, faces("9/20"));
  assert.deepEqual(both.rolls, [9]);
});
