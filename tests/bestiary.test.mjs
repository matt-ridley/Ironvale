import { test } from "node:test";
import assert from "node:assert/strict";
import { recordBattle, bestiaryEntries, cleanBestiary, habitat, LORE } from "../src/rules/bestiary.js";
import { MONSTERS } from "../src/data/monsters.js";
import { serialize, deserialize } from "../src/state/save.js";
import { state, newGame } from "../src/state/game.js";

test("every monster has a story and somewhere to live", () => {
  for (const id of Object.keys(MONSTERS)) {
    assert.ok(LORE[id], `${id} has no story`);
    assert.ok(habitat(id), `${id} lives nowhere`);
  }
  assert.equal(habitat("hobgoblin"), "The Deep Warrens");
  assert.match(habitat("wolf"), /Whispering Wood.*Goblin Rocks.*Willowmere/);
  assert.equal(habitat("goblinKing"), "The Goblin King's Hall");
});

test("a battle counts everyone as met, and the fallen as beaten", () => {
  const b = {};
  recordBattle(b, { monsters: [{ id: "goblin", hp: 0 }, { id: "wolf", hp: 4 }] }); // fled after the goblin fell
  recordBattle(b, { monsters: [{ id: "goblin", hp: -2 }] });
  assert.deepEqual(b, { goblin: { seen: 2, beaten: 2 }, wolf: { seen: 1, beaten: 0 } });
});

test("entries show names once met and stats once beaten", () => {
  const entries = bestiaryEntries({ goblin: { seen: 2, beaten: 1 }, wolf: { seen: 1, beaten: 0 } });
  assert.equal(entries.length, Object.keys(MONSTERS).length);
  const goblin = entries.find(e => e.id === "goblin"), wolf = entries.find(e => e.id === "wolf"), rat = entries.find(e => e.id === "giantRat");
  assert.ok(goblin.known && goblin.studied);
  assert.ok(wolf.known && !wolf.studied);
  assert.ok(!rat.known && !rat.studied);
  assert.equal(goblin.stats[0], "AC 15   HP 2d6 (about 7)");
  assert.equal(goblin.stats[1], "Scimitar: +4 to hit, 1d6+2 damage");
  assert.equal(goblin.stats[2], "50 XP, 2d6 gold");
  assert.equal(wolf.stats[2], "50 XP"); // wolves carry no gold
});

test("the bestiary is saved, and junk in it is dropped", () => {
  newGame();
  state.bestiary = { goblin: { seen: 3, beaten: 2 } };
  assert.deepEqual(deserialize(serialize(state)).bestiary, { goblin: { seen: 3, beaten: 2 } });
  assert.deepEqual(cleanBestiary({ dragon: { seen: 1, beaten: 1 }, wolf: { seen: -1, beaten: 0 }, rat: "x" }), {});
  assert.deepEqual(cleanBestiary(undefined), {});
  const old = JSON.parse(serialize(state));
  delete old.state.bestiary; // a save from before 0.16.0
  assert.deepEqual(deserialize(JSON.stringify(old)).bestiary, {});
});
