import { test } from "node:test";
import assert from "node:assert/strict";
import { deposit, withdraw } from "../src/rules/bank.js";
import { createCharacter } from "../src/rules/character.js";

test("a new hero has an empty bank account", () => {
  assert.equal(createCharacter().bank, 0);
});

test("putting gold in and taking it out", () => {
  const c = createCharacter({ gold: 120 });
  assert.deepEqual(deposit(c, 50), { ok: true, amount: 50 });
  assert.deepEqual([c.gold, c.bank], [70, 50]);
  assert.deepEqual(deposit(c, "all"), { ok: true, amount: 70 });
  assert.deepEqual([c.gold, c.bank], [0, 120]);
  assert.deepEqual(withdraw(c, 10), { ok: true, amount: 10 });
  assert.deepEqual(withdraw(c, "all"), { ok: true, amount: 110 });
  assert.deepEqual([c.gold, c.bank], [120, 0]);
});

test("you can't move more than you have, or nothing at all", () => {
  const c = createCharacter({ gold: 30 });
  assert.equal(deposit(c, 50).amount, 30); // puts in what you have
  assert.equal(deposit(c, 10).ok, false);
  assert.equal(withdraw(c, 50).amount, 30);
  assert.equal(withdraw(c, "all").ok, false);
  assert.deepEqual([c.gold, c.bank], [30, 0]);
});

test("an old hero with no bank field can still bank", () => {
  const c = createCharacter({ gold: 20 });
  delete c.bank;
  assert.equal(withdraw(c, 10).ok, false);
  assert.equal(deposit(c, 20).ok, true);
  assert.equal(c.bank, 20);
});
