import { test } from "node:test";
import assert from "node:assert/strict";
import { serialize, deserialize, saveGame, loadGame, deleteSave, SAVE_KEY } from "../src/state/save.js";
import { state, newGame } from "../src/state/game.js";
import { makeItem } from "../src/rules/items.js";
import { gainXp } from "../src/rules/character.js";
import { OVERWORLD } from "../src/world/overworld.js";
import { feetAt } from "../src/world/movement.js";

const SPAWN = feetAt(OVERWORLD.spawn.x, OVERWORLD.spawn.y);

class MemoryStorage {
  constructor() { this.data = {}; }
  getItem(k) { return k in this.data ? this.data[k] : null; }
  setItem(k, v) { this.data[k] = String(v); }
  removeItem(k) { delete this.data[k]; }
}

const played = () => {
  newGame();
  gainXp(state.hero, 900, () => 0.5);
  state.hero.gold = 123;
  state.hero.hp = 9;
  state.hero.secondWind = false;
  state.hero.equipment.weapon.upgrade = 2;
  state.hero.inventory.push(makeItem("scimitar", { upgrade: 1 }));
  state.pos = { x: 40.37, y: 12.6 }; // feet, in tiles
  state.facing = "left";
  state.flags = { questStarted: true, logCleared: true };
  return structuredClone(state);
};

test("a save loads back exactly", () => {
  const before = played();
  const store = new MemoryStorage();
  assert.equal(saveGame(state, store), true);
  newGame(); // wipe the live state
  assert.deepEqual(loadGame(store), before);
});

test("no save, or a broken one, loads as nothing", () => {
  const store = new MemoryStorage();
  assert.equal(loadGame(store), null);
  store.setItem(SAVE_KEY, "{not json");
  assert.equal(loadGame(store), null);
  store.setItem(SAVE_KEY, JSON.stringify({ format: 99, state: {} }));
  assert.equal(loadGame(store), null);
  assert.equal(deserialize(JSON.stringify({ format: 1, state: { hero: { abilities: {} } } })), null);
});

test("items the game no longer knows are dropped, not fatal", () => {
  played();
  const data = JSON.parse(serialize(state));
  data.state.hero.inventory.push({ uid: "x", base: "laserSword", upgrade: 0 });
  data.state.hero.equipment.shield = { uid: "y", base: "longsword", upgrade: 0 }; // a sword in the shield slot
  const s = deserialize(JSON.stringify(data));
  assert.ok(!s.hero.inventory.some(i => i.base === "laserSword"));
  assert.equal(s.hero.equipment.shield, null);
  assert.equal(s.hero.equipment.weapon.upgrade, 2);
});

test("a position that is now a wall (or off the map) goes back to the village", () => {
  played();
  for (const pos of [{ x: 0, y: 0 }, { x: 999, y: 3 }, null]) {
    const data = JSON.parse(serialize(state));
    data.state.pos = pos;
    assert.deepEqual(deserialize(JSON.stringify(data)).pos, SPAWN);
  }
});

test("standing where the oak was only loads if it was cleared", () => {
  played();
  const data = JSON.parse(serialize(state));
  data.state.pos = feetAt(54, 24);
  assert.deepEqual(deserialize(JSON.stringify(data)).pos, feetAt(54, 24));
  data.state.flags = {};
  assert.deepEqual(deserialize(JSON.stringify(data)).pos, SPAWN);
});

test("saves from before 0.7.0 (whole tiles) load with the hero standing in that tile", () => {
  played();
  const data = JSON.parse(serialize(state));
  data.format = 1;
  data.state.pos = { x: 17, y: 19 };
  assert.deepEqual(deserialize(JSON.stringify(data)).pos, feetAt(17, 19));
});

test("you never load in at 0 HP", () => {
  played();
  state.hero.hp = 0;
  assert.equal(deserialize(serialize(state)).hero.hp, 1);
});

test("storage that throws (private browsing, full) doesn't crash", () => {
  const broken = { getItem() { throw new Error("no"); }, setItem() { throw new Error("no"); }, removeItem() { throw new Error("no"); } };
  assert.equal(saveGame(state, broken), false);
  assert.equal(loadGame(broken), null);
  deleteSave(broken);
  assert.equal(saveGame(state, null), false);
});

test("deleteSave removes it", () => {
  const store = new MemoryStorage();
  saveGame(state, store);
  deleteSave(store);
  assert.equal(loadGame(store), null);
});

test("potion effects and the Deep Warrens are saved", () => {
  played();
  state.hero.effects = { speed: 42, dexterity: true };
  state.map = "deepCave";
  state.pos = feetAt(20, 25);
  const s = deserialize(serialize(state));
  assert.deepEqual(s.hero.effects, { speed: 42, dexterity: true });
  assert.equal(s.map, "deepCave");
  assert.deepEqual(s.pos, feetAt(20, 25));
});

test("a spot that's a wall in the Deep Warrens, or an unknown map, goes back to the village", () => {
  played();
  for (const [map, pos] of [["deepCave", feetAt(0, 0)], ["moon", feetAt(20, 25)]]) {
    const data = JSON.parse(serialize(state));
    Object.assign(data.state, { map, pos });
    const s = deserialize(JSON.stringify(data));
    assert.equal(s.map, OVERWORLD.name);
    assert.deepEqual(s.pos, SPAWN);
  }
});

test("saves from before 0.8.0 (no potion effects) load with none", () => {
  played();
  const data = JSON.parse(serialize(state));
  delete data.state.hero.effects;
  delete data.state.map;
  const s = deserialize(JSON.stringify(data));
  assert.deepEqual(s.hero.effects, { speed: 0, dexterity: false });
  assert.equal(s.map, OVERWORLD.name);
});

test("banked gold is saved, and saves from before the bank load with an empty one", () => {
  played();
  state.hero.bank = 75;
  assert.equal(deserialize(serialize(state)).hero.bank, 75);
  const data = JSON.parse(serialize(state));
  delete data.state.hero.bank;
  assert.equal(deserialize(JSON.stringify(data)).hero.bank, 0);
});

test("a companion is saved with their wounds; an unknown one is dropped", () => {
  played();
  state.hero.companion = { id: "megan", hurt: 3, gear: { bow: makeItem("longbow", { upgrade: 2 }), armour: null } };
  assert.deepEqual(deserialize(serialize(state)).hero.companion, state.hero.companion);
  // Saves from 0.10.0 (no gear) get the starting gear; gear that doesn't fit is dropped.
  state.hero.companion = { id: "megan", hurt: 0 };
  assert.deepEqual(Object.values(deserialize(serialize(state)).hero.companion.gear).map(i => i.base), ["shortbow", "leather"]);
  state.hero.companion = { id: "megan", hurt: 0, gear: { bow: makeItem("longsword"), armour: makeItem("chainMail") } };
  assert.deepEqual(deserialize(serialize(state)).hero.companion.gear, { bow: null, armour: null });
  state.hero.companion = { id: "dragon", hurt: 0 };
  assert.equal("companion" in deserialize(serialize(state)).hero, false);
});

test("the last town is saved; older saves, and towns the game doesn't know, get Oakhollow", () => {
  played();
  assert.equal(deserialize(serialize(state)).lastHub, "oakhollow");
  const data = JSON.parse(serialize(state));
  assert.equal(data.format, 7);
  delete data.state.lastHub;
  data.format = 2; // before 0.18.0
  assert.equal(deserialize(JSON.stringify(data)).lastHub, "oakhollow");
  data.state.lastHub = "atlantis";
  assert.equal(deserialize(JSON.stringify(data)).lastHub, "oakhollow");
});
