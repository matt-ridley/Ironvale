import { test } from "node:test";
import assert from "node:assert/strict";
import { rollEncounter, pickWeighted, ENCOUNTERS, QUIET_STEPS } from "../src/world/encounters.js";
import { MONSTERS } from "../src/data/monsters.js";
import { seededRng } from "../src/rules/dice.js";
import { state, newGame, faint } from "../src/state/game.js";
import { OVERWORLD } from "../src/world/overworld.js";
import { feetAt } from "../src/world/movement.js";

const always = () => 0; // a roll of 0 is under any chance
const never = () => 0.999;

test("no fights in the village or during the quiet spell", () => {
  assert.equal(rollEncounter("village", "grass", 99, always), null);
  assert.equal(rollEncounter("forest", "grass", QUIET_STEPS - 1, always), null);
  assert.ok(rollEncounter("forest", "grass", QUIET_STEPS, always));
});

test("the cave mouth is safe", () => {
  assert.equal(rollEncounter("rocks", "cave", 99, always), null);
});

test("paths halve the chance", () => {
  const chance = ENCOUNTERS.forest.chance;
  const justUnder = () => chance * 0.75;
  assert.ok(rollEncounter("forest", "grass", 99, justUnder));
  assert.equal(rollEncounter("forest", "path", 99, justUnder), null);
  assert.equal(rollEncounter("forest", "grass", 99, never), null);
});

test("every encounter uses real monsters", () => {
  for (const area of Object.values(ENCOUNTERS)) {
    for (const e of area.table) for (const id of e.foes) assert.ok(MONSTERS[id], `unknown monster ${id}`);
  }
});

test("weighted picks follow the weights", () => {
  const rng = seededRng(3), counts = { a: 0, b: 0 };
  for (let i = 0; i < 4000; i++) counts[pickWeighted([{ weight: 3, id: "a" }, { weight: 1, id: "b" }], rng).id]++;
  assert.ok(counts.a / 4000 > 0.7 && counts.a / 4000 < 0.8, JSON.stringify(counts));
});

test("encounters return a fresh list each time", () => {
  const a = rollEncounter("forest", "grass", 99, always);
  a.push("dragon");
  assert.ok(!rollEncounter("forest", "grass", 99, always).includes("dragon"));
});

test("fainting sends you home rested, minus half your gold", () => {
  newGame();
  state.hero.gold = 51;
  state.hero.hp = 0;
  state.hero.secondWind = false;
  state.pos = { x: 50, y: 30 };
  assert.deepEqual(faint(), { goldLost: 25 });
  assert.equal(state.hero.gold, 26);
  assert.equal(state.hero.hp, state.hero.maxHp);
  assert.equal(state.hero.secondWind, true);
  assert.deepEqual(state.pos, feetAt(OVERWORLD.spawn.x, OVERWORLD.spawn.y));
});
