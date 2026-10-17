import { test } from "node:test";
import assert from "node:assert/strict";
import { abilityCheck, describeCheck } from "../src/rules/checks.js";
import { createCharacter } from "../src/rules/character.js";
import { faces } from "./helpers.mjs";

const hero = () => createCharacter(); // STR 15 (+2), DEX 13 (+1), CON 14 (+2)

test("meeting the DC exactly succeeds", () => {
  assert.equal(abilityCheck(hero(), "STR", 12, faces("10/20")).success, true);
  assert.equal(abilityCheck(hero(), "STR", 12, faces("9/20")).success, false);
});

test("proficiency adds the proficiency bonus", () => {
  const r = abilityCheck(hero(), "DEX", 14, faces("11/20"), { proficient: true });
  assert.equal(r.bonus, 3);
  assert.equal(r.total, 14);
  assert.equal(r.success, true);
});

test("a natural 20 is not an automatic success on a check", () => {
  assert.equal(abilityCheck(hero(), "DEX", 25, faces("20/20")).success, false);
});

test("advantage uses the higher roll", () => {
  const r = abilityCheck(hero(), "STR", 15, faces("3/20", "16/20"), { advantage: true });
  assert.equal(r.natural, 16);
  assert.equal(r.success, true);
  assert.equal(describeCheck(r), "STR check (DC 15): rolled 3 / 16 -> 16 + 2 = 18. Success.");
});
