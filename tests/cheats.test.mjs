import { test } from "node:test";
import assert from "node:assert/strict";
import { cheatFor, applyCheat, MAX_CHEAT_AMOUNT } from "../src/rules/cheats.js";
import { createCharacter } from "../src/rules/character.js";
import { faces } from "./helpers.mjs";

test("the two codes unlock XP and gold, whatever the case or spacing", () => {
  assert.equal(cheatFor("notallwisdomisearned").kind, "xp");
  assert.equal(cheatFor("NOT ALL WISDOM IS EARNED").kind, "xp");
  assert.equal(cheatFor("notallthatglitters").kind, "gold");
  assert.equal(cheatFor("notallthatglitter"), null);
  assert.equal(cheatFor(""), null);
});

test("the gold cheat adds only gold", () => {
  const c = createCharacter();
  const before = { gold: c.gold, xp: c.xp, level: c.level };
  const r = applyCheat(c, "gold", 500);
  assert.equal(r.ok, true);
  assert.equal(c.gold, before.gold + 500);
  assert.equal(c.xp, before.xp);
  assert.equal(c.level, before.level);
});

test("the XP cheat adds XP and levels up, leaving gold alone", () => {
  const c = createCharacter();
  const gold = c.gold;
  const r = applyCheat(c, "xp", 900, faces("5/10", "5/10"));
  assert.equal(r.ok, true);
  assert.equal(c.xp, 900);
  assert.equal(c.level, 3);
  assert.equal(r.levelUps.length, 2);
  assert.equal(c.gold, gold);
});

test("an amount must be a whole number in range", () => {
  const c = createCharacter();
  for (const bad of [0, -5, 1.5, NaN, MAX_CHEAT_AMOUNT + 1]) assert.equal(applyCheat(c, "gold", bad).ok, false, String(bad));
  assert.equal(applyCheat(c, "gold", MAX_CHEAT_AMOUNT).ok, true);
});
