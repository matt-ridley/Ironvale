import { test } from "node:test";
import assert from "node:assert/strict";
import { abilityMod, proficiencyBonus, levelForXp, createCharacter, armourClass, weaponAttack, gainXp, heal, xpToNextLevel } from "../src/rules/character.js";
import { makeItem } from "../src/rules/items.js";
import { faces } from "./helpers.mjs";

test("ability modifiers follow (score - 10) / 2 rounded down", () => {
  const table = { 1: -5, 8: -1, 9: -1, 10: 0, 11: 0, 12: 1, 15: 2, 20: 5 };
  for (const [score, m] of Object.entries(table)) assert.equal(abilityMod(Number(score)), m, `score ${score}`);
});

test("proficiency bonus goes up every four levels", () => {
  assert.deepEqual([1, 4, 5, 8, 9, 13, 17, 20].map(proficiencyBonus), [2, 2, 3, 3, 4, 5, 6, 6]);
});

test("XP thresholds decide the level", () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(299), 1);
  assert.equal(levelForXp(300), 2);
  assert.equal(levelForXp(900), 3);
  assert.equal(levelForXp(10_000_000), 20);
});

test("a new hero starts with 10 + CON HP and starting gear", () => {
  const c = createCharacter();
  assert.equal(c.maxHp, 12);
  assert.equal(c.hp, 12);
  assert.equal(c.equipment.weapon.base, "longsword");
  assert.equal(c.inventory.filter(i => i.base === "potionHealing").length, 2);
});

test("armour class by armour type", () => {
  const dex16 = { STR: 10, DEX: 16, CON: 10 };
  assert.equal(armourClass(createCharacter({ abilities: dex16, armour: null, shield: null })), 13);
  assert.equal(armourClass(createCharacter({ abilities: dex16, armour: "leather", shield: null })), 14);
  assert.equal(armourClass(createCharacter({ abilities: dex16, armour: "chainShirt", shield: null })), 15); // DEX capped at +2
  assert.equal(armourClass(createCharacter({ abilities: dex16, armour: "chainMail", shield: null })), 16); // no DEX
  assert.equal(armourClass(createCharacter({ abilities: dex16, armour: "chainMail", shield: "shield" })), 18);
});

test("upgrades add to AC", () => {
  const c = createCharacter({ abilities: { STR: 10, DEX: 10, CON: 10 }, armour: null, shield: null });
  c.equipment.armour = makeItem("chainMail", { upgrade: 2 });
  c.equipment.shield = makeItem("shield", { upgrade: 1 });
  assert.equal(armourClass(c), 16 + 2 + 2 + 1);
});

test("weapon attacks use STR, or the better of STR and DEX for finesse", () => {
  const c = createCharacter({ abilities: { STR: 12, DEX: 18, CON: 10 }, weapon: "longsword" });
  assert.deepEqual(weaponAttack(c), { name: "Longsword", bonus: 3, damage: "1d8", damageBonus: 1 });
  c.equipment.weapon = makeItem("rapier", { upgrade: 1 });
  assert.deepEqual(weaponAttack(c), { name: "Rapier", bonus: 4 + 2 + 1, damage: "1d8", damageBonus: 4 + 1 });
  c.equipment.weapon = null;
  assert.equal(weaponAttack(c).name, "Fist");
});

test("gaining XP can level up more than once, adding 1d10 + CON HP each time", () => {
  const c = createCharacter(); // CON 14 = +2
  const r = gainXp(c, 900, faces("6/10", "9/10"));
  assert.equal(c.level, 3);
  assert.deepEqual(r.levelUps.map(l => l.hpGain), [8, 11]);
  assert.equal(c.maxHp, 12 + 8 + 11);
  assert.equal(xpToNextLevel(c), 2700 - 900);
});

test("a level always gives at least 1 HP", () => {
  const c = createCharacter({ abilities: { STR: 10, DEX: 10, CON: 3 } }); // CON -4
  assert.equal(c.maxHp, 6);
  gainXp(c, 300, faces("1/10"));
  assert.equal(c.maxHp, 7);
});

test("healing stops at max HP", () => {
  const c = createCharacter();
  c.hp = 5;
  assert.equal(heal(c, 100), 7);
  assert.equal(c.hp, c.maxHp);
});
