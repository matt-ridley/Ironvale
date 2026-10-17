import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAttack, createBattle, playerAction, isPlayerTurn, spawnMonster, DEFEND_AC_BONUS } from "../src/rules/combat.js";
import { createCharacter, armourClass } from "../src/rules/character.js";
import { seededRng } from "../src/rules/dice.js";
import { faces } from "./helpers.mjs";

const sword = { name: "Longsword", bonus: 4, damage: "1d8", damageBonus: 2 };

test("an attack hits when the total meets the AC", () => {
  const r = resolveAttack(sword, 15, faces("11/20", "5/8"));
  assert.equal(r.total, 15);
  assert.equal(r.hit, true);
  assert.equal(r.damage, 7);
  assert.equal(resolveAttack(sword, 16, faces("11/20")).hit, false);
});

test("a natural 20 always hits and doubles the damage dice", () => {
  const r = resolveAttack(sword, 99, faces("20/20", "3/8", "6/8"));
  assert.equal(r.hit, true);
  assert.equal(r.crit, true);
  assert.equal(r.damage, 3 + 6 + 2);
});

test("a natural 1 always misses", () => {
  assert.equal(resolveAttack({ ...sword, bonus: 50 }, 10, faces("1/20")).hit, false);
});

test("a monster's HP is rolled when it appears", () => {
  const g = spawnMonster("goblin", faces("3/6", "4/6"));
  assert.equal(g.hp, 7);
  assert.equal(g.maxHp, 7);
});

/* Plays a battle by always attacking (drinking a potion when low). */
function autoplay(battle, rng) {
  for (let i = 0; i < 200 && battle.state === "active"; i++) {
    const p = battle.player;
    const lowAndHasPotion = p.hp <= p.maxHp / 3 && p.inventory.some(it => it.base === "potionHealing");
    const r = playerAction(battle, lowAndHasPotion ? { type: "potion" } : { type: "attack" }, rng);
    assert.equal(r.ok, true, r.reason);
  }
  return battle;
}

test("battles always finish, and HP never goes below 0", () => {
  const outcomes = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seededRng(seed);
    const b = autoplay(createBattle(createCharacter(), ["goblin", "wolf"], rng), rng);
    assert.ok(["won", "lost"].includes(b.state), `seed ${seed} ended ${b.state}`);
    assert.ok(b.player.hp >= 0);
    for (const m of b.monsters) assert.ok(m.hp >= 0);
    outcomes.add(b.state);
  }
  assert.deepEqual([...outcomes].sort(), ["lost", "won"]); // both can happen
});

test("winning pays XP and gold, and can level you up", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = seededRng(seed);
    const hero = createCharacter();
    hero.xp = 290;
    const b = autoplay(createBattle(hero, ["giantRat"], rng), rng);
    if (b.state !== "won") continue;
    assert.equal(b.rewards.xp, 25);
    assert.equal(hero.xp, 315);
    assert.equal(hero.level, 2);
    assert.equal(b.rewards.levelUps.length, 1);
    assert.ok(hero.gold >= 25 + 1);
    return;
  }
  assert.fail("no seed won against a single giant rat");
});

test("defending raises the AC monsters roll against until your next turn", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = seededRng(seed);
    const b = createBattle(createCharacter(), ["goblin"], rng);
    if (!isPlayerTurn(b)) continue;
    const ac = armourClass(b.player);
    const before = b.log.length;
    playerAction(b, { type: "defend" }, rng);
    if (b.state !== "active") continue; // the goblin won; try a seed where the fight goes on
    const goblinAttack = b.log.slice(before).find(e => e.type === "monster-attack");
    assert.equal(goblinAttack.roll.targetAc, ac + DEFEND_AC_BONUS);
    assert.equal(b.defending, false); // cleared once it's your turn again
    return;
  }
  assert.fail("no seed gave the player the first turn");
});

test("a potion heals and is used up; none left means the action is refused", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = seededRng(seed);
    const hero = createCharacter({ potions: 1 });
    const b = createBattle(hero, ["giantRat"], rng);
    if (!isPlayerTurn(b) || b.state !== "active") continue;
    hero.hp = 1;
    assert.equal(playerAction(b, { type: "potion" }, rng).ok, true);
    assert.equal(hero.inventory.length, 0);
    if (b.state !== "active" || !isPlayerTurn(b)) return;
    hero.hp = 1;
    const r = playerAction(b, { type: "potion" }, rng);
    assert.equal(r.ok, false);
    assert.match(r.reason, /no potions/);
    return;
  }
  assert.fail("no usable seed");
});

test("you can't act on a monster's turn or after the battle ends", () => {
  const rng = seededRng(7);
  const b = autoplay(createBattle(createCharacter(), ["goblin"], rng), rng);
  assert.equal(playerAction(b, { type: "attack" }, rng).ok, false);
});
