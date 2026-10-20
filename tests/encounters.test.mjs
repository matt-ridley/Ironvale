import { test } from "node:test";
import assert from "node:assert/strict";
import { rollEncounter, pickWeighted, ENCOUNTERS, QUIET_STEPS, SPEED_ENCOUNTERS } from "../src/world/encounters.js";
import { MONSTERS } from "../src/data/monsters.js";
import { seededRng } from "../src/rules/dice.js";
import { state, newGame, faint, FAINT_MAX_LOSS } from "../src/state/game.js";
import { OVERWORLD } from "../src/world/overworld.js";
import { feetAt } from "../src/world/movement.js";
import { MAPS } from "../src/world/maps.js";

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

test("fainting wakes you at your last town's inn, rested for free, minus half your gold", () => {
  newGame();
  state.hero.gold = 51;
  state.hero.hp = 0;
  state.hero.secondWind = false;
  state.pos = { x: 50, y: 30 };
  assert.deepEqual(faint(), { goldLost: 25, hub: "oakhollow" });
  assert.equal(state.hero.gold, 26);
  assert.equal(state.hero.hp, state.hero.maxHp);
  assert.equal(state.hero.secondWind, true);
  assert.equal(state.map, "inn");
  assert.deepEqual(state.pos, feetAt(MAPS.inn.spawn.x, MAPS.inn.spawn.y));
});

test("an unknown last town (a newer save, say) wakes you in Oakhollow", () => {
  newGame();
  state.lastHub = "atlantis";
  assert.equal(faint().hub, "oakhollow");
  assert.equal(state.map, "inn");
});

test("no monsters come near a camp", () => {
  assert.ok(rollEncounter("rocks", "grass", 99, always));
  assert.equal(rollEncounter("rocks", "grass", 99, always, { safe: true }), null);
});

test("a Potion of Speed makes fights rarer", () => {
  const chance = ENCOUNTERS.forest.chance;
  const roll = () => chance * SPEED_ENCOUNTERS * 1.5;
  assert.ok(rollEncounter("forest", "grass", 99, roll));
  assert.equal(rollEncounter("forest", "grass", 99, roll, { fast: true }), null);
  assert.ok(rollEncounter("forest", "grass", 99, always, { fast: true }));
});

test("Willowmere and the Deep Warrens have monsters; the King's hall and the cave's way out don't", () => {
  assert.ok(rollEncounter("meadow", "grass", 99, always));
  assert.ok(rollEncounter("warrens", "cavefloor", 99, always));
  assert.equal(rollEncounter("throne", "cavefloor", 99, always), null);
  assert.equal(rollEncounter("warrens", "caveexit", 99, always), null);
});

test("fainting in the Deep Warrens sends you home to Oakhollow's inn", () => {
  newGame();
  state.map = "deepCave";
  state.pos = feetAt(20, 25);
  faint();
  assert.equal(state.map, "inn");
});

test("fainting never costs more than 50 gold, and banked gold is safe", () => {
  newGame();
  state.hero.gold = 500;
  state.hero.bank = 300;
  assert.equal(faint().goldLost, FAINT_MAX_LOSS);
  assert.equal(FAINT_MAX_LOSS, 50);
  assert.equal(state.hero.gold, 450);
  assert.equal(state.hero.bank, 300);
});

test("fights come about every 30 steps off the path and every 50 on it", () => {
  // Walk a long way through each wild area and count the fights.
  for (const zone of ["forest", "rocks", "meadow", "warrens"]) {
    for (const [tile, lo, hi] of [["grass", 25, 38], ["path", 40, 65]]) {
      const rng = seededRng(7);
      let since = 0, fights = 0;
      const steps = 200000;
      for (let i = 0; i < steps; i++) {
        since++;
        if (rollEncounter(zone, tile, since, rng)) { fights++; since = 0; }
      }
      const every = steps / fights;
      assert.ok(every > lo && every < hi, `${zone} ${tile}: a fight every ${every.toFixed(1)} steps`);
    }
  }
});
