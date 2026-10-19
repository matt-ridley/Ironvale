import { test } from "node:test";
import assert from "node:assert/strict";
import { compareEquip, buyItem, sellItem, sellPrice } from "../src/rules/gear.js";
import { makeItem, describeItem, useItem, itemName, groupPack, cantDrink, drinkText } from "../src/rules/items.js";
import { rollLoot, spawnMonster } from "../src/rules/combat.js";
import { createCharacter } from "../src/rules/character.js";
import { STOCK, ITEMS, SHOPS } from "../src/data/items.js";
import { MONSTERS } from "../src/data/monsters.js";
import { faces } from "./helpers.mjs";

const carry = (c, base, opts) => { const i = makeItem(base, opts); c.inventory.push(i); return i; };

test("compareEquip shows the change without changing anything", () => {
  const c = createCharacter(); // chain mail + shield = AC 18, longsword +4
  const axe = carry(c, "greataxe");
  const r = compareEquip(c, axe.uid);
  assert.deepEqual(r.before, { ac: 18, bonus: 4, damage: "1d8", damageBonus: 2 });
  assert.deepEqual(r.after, { ac: 16, bonus: 4, damage: "1d12", damageBonus: 2 }); // the shield comes off
  assert.equal(c.equipment.weapon.base, "longsword");
  assert.ok(c.inventory.includes(axe));
});

test("compareEquip passes on the reason something can't be worn", () => {
  const c = createCharacter({ weapon: "greatsword", shield: null });
  const s = carry(c, "shield");
  const r = compareEquip(c, s.uid);
  assert.equal(r.ok, false);
  assert.equal(r.after, null);
});

test("buying costs gold and puts the item in your pack", () => {
  const c = createCharacter({ gold: 29 });
  const r = buyItem(c, "longsword");
  assert.equal(r.ok, true);
  assert.equal(c.gold, 14);
  assert.equal(c.inventory.at(-1).base, "longsword");
  assert.equal(buyItem(c, "longsword").ok, false); // 14 gold left
  assert.equal(buyItem(c, "dragonLance").ok, false);
});

test("selling pays half, including half of the upgrades", () => {
  assert.equal(sellPrice(makeItem("longsword")), 7);
  assert.equal(sellPrice(makeItem("longsword", { upgrade: 1 })), 32); // (15 + 50) / 2
  assert.equal(sellPrice(makeItem("longsword", { upgrade: 3 })), 157); // (15 + 300) / 2
  const c = createCharacter({ gold: 0 });
  const dagger = carry(c, "dagger");
  assert.equal(sellItem(c, dagger.uid).price, 1);
  assert.equal(c.gold, 1);
  assert.ok(!c.inventory.includes(dagger));
});

test("equipped items can't be sold", () => {
  const c = createCharacter();
  assert.equal(sellItem(c, c.equipment.weapon.uid).ok, false);
});

test("drinking a potion outside battle heals and uses it up", () => {
  const c = createCharacter({ potions: 1 });
  c.hp = 3;
  const r = useItem(c, c.inventory[0].uid, faces("2/4", "3/4"));
  assert.equal(r.healed, 2 + 3 + 2);
  assert.equal(c.hp, 10);
  assert.equal(c.inventory.length, 0);
});

test("potions aren't wasted at full health, and swords can't be drunk", () => {
  const c = createCharacter({ potions: 1 });
  assert.equal(useItem(c, c.inventory[0].uid).ok, false);
  assert.equal(c.inventory.length, 1);
  c.hp = 1;
  assert.equal(useItem(c, carry(c, "dagger").uid).ok, false);
});

test("item descriptions", () => {
  assert.equal(describeItem(makeItem("rapier", { upgrade: 2 })), "1d8 damage, finesse. +2 to hit and damage.");
  assert.equal(describeItem(makeItem("chainShirt")), "Medium armour: AC 13 + DEX (max 2).");
  assert.equal(describeItem(makeItem("shield", { upgrade: 1 })), "+2 AC. +1 more AC.");
  assert.equal(describeItem(makeItem("potionHealing")), "Drink to heal 2d4+2 HP.");
});

test("loot rolls each entry on its own", () => {
  const goblin = spawnMonster("goblin", () => 0.5);
  assert.deepEqual(rollLoot([goblin], () => 0).map(itemName), ["Scimitar", "Potion of Healing"]);
  assert.deepEqual(rollLoot([goblin], () => 0.99), []);
  assert.deepEqual(rollLoot([spawnMonster("giantRat", () => 0.5)], () => 0), []);
});

test("shop stock and loot only name real items", () => {
  for (const base of STOCK) assert.ok(ITEMS[base], base);
  for (const m of Object.values(MONSTERS)) for (const l of m.loot || []) assert.ok(ITEMS[l.base], l.base);
});

test("the pack groups identical items", () => {
  const c = createCharacter({ potions: 2 });
  carry(c, "dagger");
  carry(c, "dagger", { upgrade: 1 });
  const g = groupPack(c.inventory);
  assert.deepEqual(g.map(x => [x.name, x.count]), [["Potion of Healing", 2], ["Dagger", 1], ["Dagger +1", 1]]);
});

test("a Potion of Healing costs 20 gold, and the apothecary sells all three potions", () => {
  assert.equal(ITEMS.potionHealing.cost, 20);
  assert.deepEqual(SHOPS.apothecary.stock, ["potionHealing", "potionSpeed", "potionDexterity"]);
  for (const shop of Object.values(SHOPS)) for (const base of shop.stock) assert.ok(ITEMS[base], base);
  const c = createCharacter({ gold: 30, potions: 0 });
  assert.equal(buyItem(c, "potionSpeed", SHOPS.apothecary.stock).ok, true);
  assert.equal(c.gold, 0);
  assert.equal(buyItem(createCharacter({ gold: 999 }), "potionDexterity").ok, false); // not at the blacksmith
});

test("a Potion of Speed works at full health and counts down in steps", () => {
  const c = createCharacter({ potions: 0 });
  const r = useItem(c, carry(c, "potionSpeed").uid);
  assert.equal(r.ok, true);
  assert.equal(c.effects.speed, ITEMS.potionSpeed.steps);
  assert.equal(c.inventory.length, 0);
  assert.match(drinkText(r), /light on your feet/);
});

test("a Potion of Dexterity waits for the next fight, and only one at a time", () => {
  const c = createCharacter({ potions: 0 });
  assert.equal(useItem(c, carry(c, "potionDexterity").uid).ok, true);
  assert.equal(c.effects.dexterity, true);
  const second = carry(c, "potionDexterity");
  assert.match(cantDrink(c, second), /already/);
  assert.equal(useItem(c, second.uid).ok, false);
  assert.equal(c.inventory.length, 1);
});

test("potion descriptions", () => {
  assert.match(describeItem(makeItem("potionSpeed")), /faster.*150 steps/);
  assert.match(describeItem(makeItem("potionDexterity")), /twice/);
});
