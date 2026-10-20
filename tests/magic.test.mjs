import { test } from "node:test";
import assert from "node:assert/strict";
import { SPELLS, SLOT_TABLE } from "../src/data/spells.js";
import { MONSTERS } from "../src/data/monsters.js";
import { ITEMS } from "../src/data/items.js";
import { slotsFor, slotsLeft, spendForSpell, restoreSlots, makeCaster, scrollCaster, cantripTier, spellDice, castSpell, readScroll, healOutsideBattle } from "../src/rules/magic.js";
import { CONDITIONS, addCondition, hasCondition, attackMods, endTurn, startTurn, conditionSave } from "../src/rules/conditions.js";
import { createBattle, playerAction, isPlayerTurn, resolveAttack, acOf, saveBonusOf } from "../src/rules/combat.js";
import { createCharacter, rest } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { makeItem, describeItem } from "../src/rules/items.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";
import { faces } from "./helpers.mjs";

/* A fight where you go first, against these monsters with these HP. */
function myTurn(hero, foes = ["goblin"], hps = []) {
  for (let seed = 1; seed <= 200; seed++) {
    const b = createBattle(hero, foes, seededRng(seed));
    if (!isPlayerTurn(b)) continue;
    b.monsters.forEach((m, i) => { if (hps[i] !== undefined) m.hp = m.maxHp = hps[i]; });
    return b;
  }
  throw new Error("no seed gave the player the first turn");
}
const you = makeCaster({ name: "You", key: "player", level: 1, mod: 3 }); // +5 to hit, DC 13
const types = b => b.log.map(e => e.type);
/* Scripted dice, then seeded ones for whatever comes after (gold and loot at the end of a fight). */
const thenRandom = (...specs) => { const f = faces(...specs), r = seededRng(1); let n = specs.length; return () => (n-- > 0 ? f() : r()); };

test("every spell is well formed, and every monster has saves and a type", () => {
  for (const [id, s] of Object.entries(SPELLS)) {
    assert.ok(["attack", "save", "darts", "sleep", "heal", "buff"].includes(s.kind), id);
    assert.ok(Number.isInteger(s.level) && s.level >= 0 && s.level <= 9, id);
    if (s.condition) assert.ok(CONDITIONS[s.condition.id], `${id}: unknown condition`);
    if (s.kind === "save") assert.ok(["STR", "DEX", "CON", "WIS"].includes(s.save), id);
  }
  for (const [id, m] of Object.entries(MONSTERS)) {
    assert.ok(m.type, `${id} has no type`);
    for (const a of ["STR", "DEX", "CON", "WIS"]) assert.ok(Number.isInteger(m.saves?.[a]), `${id} has no ${a} save`);
  }
  for (const [id, item] of Object.entries(ITEMS)) if (item.type === "scroll") assert.ok(SPELLS[item.spell], `${id}: no such spell`);
});

test("spell slots follow the SRD table, and casting spends them until a long rest", () => {
  assert.equal(SLOT_TABLE.length, 21);
  assert.deepEqual(slotsFor(1), [2]);
  assert.deepEqual(slotsFor(5), [4, 3, 2]);
  assert.deepEqual(slotsFor(20), [4, 3, 3, 3, 3, 2, 2, 1, 1]);
  const book = { spells: ["fireBolt", "magicMissile", "fireball"] };
  assert.deepEqual(spendForSpell(book, 1, "fireBolt"), { ok: true, slotLevel: 0 }); // cantrips are free
  assert.match(spendForSpell(book, 1, "sleep").reason, /isn't a spell they know/);
  assert.match(spendForSpell(book, 1, "fireball").reason, /No level 3/);
  assert.deepEqual(spendForSpell(book, 1, "magicMissile"), { ok: true, slotLevel: 1 });
  assert.deepEqual(spendForSpell(book, 1, "magicMissile"), { ok: true, slotLevel: 1 });
  assert.match(spendForSpell(book, 1, "magicMissile").reason, /No level 1 spell slots left/);
  assert.deepEqual(slotsLeft(book, 3), [2, 2]);
  assert.deepEqual(spendForSpell(book, 3, "magicMissile", 2), { ok: true, slotLevel: 2 }); // upcast
  assert.match(spendForSpell(book, 5, "fireball", 2).reason, /needs a level 3 slot/);
  restoreSlots(book);
  assert.deepEqual(slotsLeft(book, 1), [2]);
});

test("a long rest refills a companion's spell slots, and saves keep them", () => {
  const hero = createCharacter();
  joinParty(hero, "megan");
  hero.companion.slotsUsed = [2, 1];
  const s = { hero, map: "overworld", pos: { x: 15.5, y: 20.85 }, facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "oakhollow" };
  assert.deepEqual(deserialize(serialize(s)).hero.companion.slotsUsed, [2, 1]);
  rest(hero);
  assert.deepEqual(hero.companion.slotsUsed, []);
});

test("caster numbers: attack bonus and save DC; scrolls use their own", () => {
  assert.equal(you.attackBonus, 5);
  assert.equal(you.saveDc, 13);
  assert.equal(makeCaster({ name: "W", key: "ally", level: 5, mod: 4 }).saveDc, 15);
  assert.deepEqual(scrollCaster(SPELLS.fireball, { name: "You", key: "player", level: 1 }), { name: "You", key: "player", level: 1, mod: 5, attackBonus: 7, saveDc: 15 });
  assert.equal(scrollCaster(SPELLS.magicMissile, { key: "player", level: 9 }).saveDc, 13);
});

test("cantrips grow at levels 5, 11 and 17; slots above a spell's level add dice", () => {
  assert.deepEqual([1, 4, 5, 10, 11, 17].map(cantripTier), [1, 1, 2, 2, 3, 4]);
  assert.equal(spellDice(SPELLS.fireBolt, "damage", 5), "2d10");
  assert.equal(spellDice(SPELLS.fireBolt, "damage", 17, 9), "4d10"); // a slot means nothing to a cantrip
  assert.equal(spellDice(SPELLS.burningHands, "damage", 3, 2), "4d6");
  assert.equal(spellDice(SPELLS.fireball, "damage", 9, 5), "10d6");
  assert.equal(spellDice(SPELLS.cureWounds, "heal", 3, 3), "3d8");
  assert.equal(spellDice(SPELLS.sleep, "pool", 3, 2, SPELLS.sleep.upcast.pool), "7d8");
});

test("Fire Bolt: a spell attack against AC", () => {
  const b = myTurn(createCharacter(), ["goblin"], [20]);
  assert.equal(castSpell(b, you, "fireBolt", { target: 0 }, faces("10/20", "7/10")).ok, true); // 10 + 5 = 15 vs AC 15
  assert.equal(b.monsters[0].hp, 13);
  castSpell(b, you, "fireBolt", { target: 0 }, faces("9/20"));
  assert.equal(b.monsters[0].hp, 13);
  assert.match(b.log.at(-1).text, /Miss/);
});

test("Burning Hands catches every monster: a DEX save for half", () => {
  const b = myTurn(createCharacter(), ["goblin", "goblin"], [20, 20]);
  castSpell(b, you, "burningHands", {}, faces("5/20", "3/6", "4/6", "5/6", "15/20", "3/6", "4/6", "5/6")); // 5+2 fails; 15+2 saves
  assert.equal(b.monsters[0].hp, 8);
  assert.equal(b.monsters[1].hp, 14);
});

test("Fireball can kill, and the fight ends when the last monster falls", () => {
  const hero = createCharacter({ potions: 0 });
  hero.inventory.push(makeItem("scrollFireball"));
  const b = myTurn(hero, ["goblin", "goblin"], [3, 3]);
  const r = readScroll(b, hero.inventory[0].uid, {}, thenRandom("1/20", ...Array(8).fill("6/6"), "1/20", ...Array(8).fill("6/6")));
  assert.equal(r.ok, true);
  assert.equal(b.state, "won");
  assert.equal(r.events.filter(e => e.type === "defeat").length, 2);
  assert.equal(hero.inventory.filter(i => i.base === "scrollFireball").length, 0);
});

test("Magic Missile never misses, and darts move on once their target falls", () => {
  const b = myTurn(createCharacter(), ["goblin", "goblin"], [2, 20]);
  castSpell(b, you, "magicMissile", { target: 0 }, faces("1/4", "2/4", "3/4"));
  assert.equal(b.monsters[0].hp, 0);
  assert.equal(b.monsters[1].hp, 20 - 3 - 4);
  const up = myTurn(createCharacter(), ["goblin"], [30]);
  castSpell(up, you, "magicMissile", { target: 0, slotLevel: 2 }, faces("1/4", "1/4", "1/4", "1/4"));
  assert.equal(up.monsters[0].hp, 30 - 8); // four darts
});

test("Sleep drops the weakest first while the pool lasts; sleepers lose turns and wake when hit", () => {
  const b = myTurn(createCharacter(), ["goblin", "goblin"], [9, 5]);
  castSpell(b, you, "sleep", {}, faces("1/8", "1/8", "1/8", "1/8", "3/8")); // a pool of 7: the 5 HP goblin only
  assert.ok(hasCondition(b, 1, "asleep"));
  assert.ok(!hasCondition(b, 0, "asleep"));
  assert.equal(attackMods(b, "player", 1).advantage, true);
  // End your turn: the sleeping goblin can't act.
  playerAction(b, { type: "defend" }, seededRng(4));
  assert.ok(b.log.some(e => e.type === "skip" && e.who === 1));
  // Hitting it wakes it.
  for (let seed = 1; seed < 50 && hasCondition(b, 1, "asleep"); seed++) {
    if (!isPlayerTurn(b)) break;
    playerAction(b, { type: "attack", target: 1 }, seededRng(seed));
  }
  assert.ok(!hasCondition(b, 1, "asleep") || b.monsters[1].hp === 0);
});

test("Entangle restrains on a failed STR save: advantage against them, disadvantage for them, and they can break free", () => {
  const b = myTurn(createCharacter(), ["goblin"], [20]);
  castSpell(b, you, "entangle", {}, faces("2/20")); // 2 - 1 = 1 vs DC 13
  assert.ok(hasCondition(b, 0, "restrained"));
  assert.deepEqual(attackMods(b, "player", 0), { advantage: true, disadvantage: false, critOnHit: false, bonusDice: null });
  assert.equal(attackMods(b, 0, "player").disadvantage, true);
  const ended = endTurn(b, 0, ab => saveBonusOf(b, 0, ab), faces("20/20"));
  assert.equal(ended[0].id, "restrained");
  assert.equal(ended[0].save.success, true);
  assert.ok(!hasCondition(b, 0, "restrained"));
});

test("Bless adds 1d4 to your attacks and saves; Shield adds 5 AC until your next turn", () => {
  const hero = createCharacter();
  joinParty(hero, "megan");
  const b = myTurn(hero, ["goblin"], [50]);
  castSpell(b, you, "bless", {});
  assert.ok(hasCondition(b, "player", "blessed") && hasCondition(b, "ally", "blessed"));
  const r = resolveAttack({ bonus: 0, damage: "1d4" }, 99, faces("10/20", "3/4"), attackMods(b, "player", 0));
  assert.equal(r.total, 13);
  assert.equal(conditionSave(b, "player", "WIS", 10, 0, faces("5/20", "4/4")).total, 9);
  const ac = acOf(b, "player");
  castSpell(b, you, "shield", {});
  assert.equal(acOf(b, "player"), ac + 5);
  assert.deepEqual(startTurn(b, "player"), ["shielded"]);
  assert.equal(acOf(b, "player"), ac);
});

test("conditions count down at the end of each turn", () => {
  const b = { conditions: {} };
  addCondition(b, 0, "outlined", { rounds: 2 });
  assert.deepEqual(endTurn(b, 0, () => 0), []);
  assert.equal(endTurn(b, 0, () => 0)[0].id, "outlined");
  assert.ok(!hasCondition(b, 0, "outlined"));
});

test("Vicious Mockery: damage, and disadvantage on the target's next attack only", () => {
  const b = myTurn(createCharacter(), ["goblin"], [20]);
  castSpell(b, you, "viciousMockery", { target: 0 }, faces("1/20", "4/4")); // 1 - 1 fails
  assert.equal(b.monsters[0].hp, 16);
  assert.equal(attackMods(b, 0, "player").disadvantage, true);
  assert.equal(attackMods(b, 0, "player").disadvantage, false); // used up
});

test("paralyzed: melee hits on them are critical hits, and they lose their turns", () => {
  const b = myTurn(createCharacter(), ["goblin"], [50]);
  addCondition(b, 0, "paralyzed", { saveEnds: { ability: "CON", dc: 10 } });
  const mods = attackMods(b, "player", 0);
  assert.equal(mods.critOnHit, true);
  const r = resolveAttack({ bonus: 5, damage: "1d8", damageBonus: 0 }, 15, faces("12/20", "3/20", "2/8", "3/8"), mods); // advantage: two d20s
  assert.equal(r.crit, true);
  assert.equal(r.damage, 5);
  assert.equal(attackMods(b, "ally", 0, { melee: false }).critOnHit, false); // not from a bow
});

test("you lose your turns too while paralyzed, until it wears off", () => {
  const hero = createCharacter();
  hero.hp = hero.maxHp = 500; // so the goblin's free hits can't end the fight
  const b = myTurn(hero, ["goblin"], [50]);
  addCondition(b, "player", "paralyzed", { rounds: 1 });
  playerAction(b, { type: "defend" }, seededRng(9)); // ends this turn: it wears off
  assert.ok(isPlayerTurn(b));
  addCondition(b, "player", "paralyzed", { rounds: 2 });
  const r = playerAction(b, { type: "defend" }, seededRng(9));
  assert.ok(r.events.some(e => e.type === "skip" && e.who === "player"), "your next turn is skipped");
  assert.ok(isPlayerTurn(b) || b.state !== "active");
});

test("healing spells: on a friend in a fight (getting them back up), or from the bag", () => {
  const hero = createCharacter();
  joinParty(hero, "megan");
  const b = myTurn(hero, ["goblin"], [50]);
  b.ally.hp = 0;
  castSpell(b, you, "cureWounds", { target: "ally" }, faces("2/8"));
  assert.equal(b.ally.hp, 5);
  assert.equal(b.log.at(-1).revived, true);
  assert.match(castSpell(b, you, "cureWounds", { target: 3 }).reason, /yourself or a friend/);

  hero.hp = 1;
  assert.deepEqual(healOutsideBattle(hero, you, "healingWord", "hero", {}, faces("4/4")), { ok: true, healed: 7 });
  hero.companion.hurt = 6;
  assert.equal(healOutsideBattle(hero, you, "cureWounds", "ally", {}, faces("1/8")).healed, 4);
  assert.match(healOutsideBattle(hero, you, "fireBolt", "hero").reason, /Only healing/);
});

test("a scroll: anyone can read it once on their turn; it ends the turn unless it's a bonus action", () => {
  const hero = createCharacter({ potions: 0 });
  hero.inventory.push(makeItem("scrollMagicMissile"), makeItem("scrollCureWounds"));
  assert.match(describeItem(hero.inventory[0]), /Anyone can/);
  const b = myTurn(hero, ["goblin"], [50]);
  assert.match(readScroll(b, "nope").reason, /isn't a scroll/);
  assert.match(readScroll(b, hero.inventory[0].uid, { target: 5 }).reason, /still standing/);
  assert.equal(hero.inventory.length, 2, "a bad target doesn't use the scroll up");
  const r = readScroll(b, hero.inventory[0].uid, { target: 0 }, seededRng(2));
  assert.equal(r.ok, true);
  assert.equal(r.events[0].type, "scroll");
  assert.equal(r.events.filter(e => e.type === "spell-hit").length, 3);
  assert.ok(r.events.some(e => e.type === "monster-attack"), "it used up your turn");
  assert.equal(hero.inventory.length, 1);
  assert.match(readScroll({ ...b, turn: (b.turn + 1) % b.order.length }, hero.inventory[0].uid).reason || "", /your turn|isn't/);
});

test("conditions stay in the fight: nothing is left on the hero afterwards", () => {
  const hero = createCharacter();
  const b = myTurn(hero, ["giantRat"], [1]);
  castSpell(b, you, "bless", {});
  playerAction(b, { type: "attack", target: 0 }, seededRng(1));
  assert.equal("conditions" in hero, false);
  assert.ok(types(b).includes("condition"));
});
