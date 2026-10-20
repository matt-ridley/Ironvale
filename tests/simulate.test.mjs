import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, makeHero, SCENARIOS } from "../tools/simulate.mjs";

test("the battle simulator plays real fights and gives the same answer for the same seed", () => {
  const a = simulate({ level: 3, upgrade: 1 }, ["goblin"], { fights: 50 });
  assert.equal(a, simulate({ level: 3, upgrade: 1 }, ["goblin"], { fights: 50 }));
  assert.ok(a > 0.9, "a level 3 hero should nearly always beat one goblin");
  assert.ok(simulate({ level: 1 }, ["goblinKing"], { fights: 50 }) < 0.3, "a level 1 hero shouldn't beat the King");
  assert.equal(makeHero({ level: 5, upgrade: 2 }).equipment.weapon.upgrade, 2);
  assert.ok(SCENARIOS.length > 0);
});
