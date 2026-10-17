import { test } from "node:test";
import assert from "node:assert/strict";
import { makeItem, equip, unequip, upgradeItem, upgradeCost, itemName } from "../src/rules/items.js";
import { createCharacter } from "../src/rules/character.js";

const carry = (c, base, opts) => { const i = makeItem(base, opts); c.inventory.push(i); return i; };

test("equipping swaps the old item back into the pack", () => {
  const c = createCharacter();
  const old = c.equipment.weapon;
  const rapier = carry(c, "rapier");
  assert.equal(equip(c, rapier.uid).ok, true);
  assert.equal(c.equipment.weapon, rapier);
  assert.ok(c.inventory.includes(old));
  assert.ok(!c.inventory.includes(rapier));
});

test("a two-handed weapon puts the shield away", () => {
  const c = createCharacter();
  const shield = c.equipment.shield;
  const axe = carry(c, "greataxe");
  const r = equip(c, axe.uid);
  assert.equal(c.equipment.shield, null);
  assert.ok(c.inventory.includes(shield));
  assert.deepEqual(r.unequipped.map(i => i.base).sort(), ["longsword", "shield"]);
});

test("a shield can't go on while holding a two-handed weapon", () => {
  const c = createCharacter({ weapon: "greatsword", shield: null });
  const shield = carry(c, "shield");
  const r = equip(c, shield.uid);
  assert.equal(r.ok, false);
  assert.match(r.reason, /both hands/);
});

test("potions can't be equipped", () => {
  const c = createCharacter();
  assert.equal(equip(c, c.inventory[0].uid).ok, false);
});

test("unequip moves the item to the pack", () => {
  const c = createCharacter();
  assert.equal(unequip(c, "armour").ok, true);
  assert.equal(c.equipment.armour, null);
  assert.equal(unequip(c, "armour").ok, false);
});

test("the blacksmith charges 50, 100, 150 and stops at +3", () => {
  const c = createCharacter({ gold: 1000 });
  const w = c.equipment.weapon;
  for (const cost of [50, 100, 150]) {
    assert.equal(upgradeCost(w), cost);
    assert.equal(upgradeItem(c, w.uid).cost, cost);
  }
  assert.equal(itemName(w), "Longsword +3");
  assert.equal(c.gold, 700);
  assert.equal(upgradeItem(c, w.uid).ok, false);
});

test("no upgrade without enough gold", () => {
  const c = createCharacter({ gold: 49 });
  const r = upgradeItem(c, c.equipment.armour.uid);
  assert.equal(r.ok, false);
  assert.equal(c.gold, 49);
  assert.equal(c.equipment.armour.upgrade, 0);
});
