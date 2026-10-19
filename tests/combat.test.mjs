import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAttack, createBattle, playerAction, isPlayerTurn, spawnMonster, DEFEND_AC_BONUS } from "../src/rules/combat.js";
import { createCharacter, armourClass, rest } from "../src/rules/character.js";
import { seededRng } from "../src/rules/dice.js";
import { makeItem } from "../src/rules/items.js";
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

test("Second Wind heals 1d10 + level, keeps your turn, and works once per rest", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = seededRng(seed);
    const hero = createCharacter();
    const b = createBattle(hero, ["goblin"], rng);
    if (!isPlayerTurn(b)) continue;
    hero.hp = 2;
    const before = b.log.length;
    const r = playerAction(b, { type: "secondWind" }, faces("6/10"));
    assert.equal(r.ok, true);
    assert.equal(hero.hp, 2 + 6 + 1);
    assert.equal(b.log.length, before + 1); // the goblin didn't get a turn
    assert.equal(isPlayerTurn(b), true);
    assert.match(playerAction(b, { type: "secondWind" }, rng).reason, /used your Second Wind/);
    rest(hero);
    assert.equal(hero.secondWind, true);
    return;
  }
  assert.fail("no seed gave the player the first turn");
});

test("every log entry records everyone's HP at that moment", () => {
  const rng = seededRng(11);
  const b = autoplay(createBattle(createCharacter(), ["goblin", "giantRat"], rng), rng);
  for (const e of b.log) {
    assert.equal(typeof e.hp.player, "number");
    assert.equal(e.hp.monsters.length, 2);
  }
  const last = b.log.at(-1).hp;
  assert.equal(last.player, b.player.hp);
  assert.deepEqual(last.monsters, b.monsters.map(m => m.hp));
  for (const e of b.log.filter(e => e.type === "attack" || e.type === "defeat")) assert.ok(e.target >= 0);
});

test("you can't act on a monster's turn or after the battle ends", () => {
  const rng = seededRng(7);
  const b = autoplay(createBattle(createCharacter(), ["goblin"], rng), rng);
  assert.equal(playerAction(b, { type: "attack" }, rng).ok, false);
});

/* The first seed where the player acts first against `foes`, or a failure. */
function playerFirst(hero, foes) {
  for (let seed = 1; seed <= 100; seed++) {
    const rng = seededRng(seed);
    const b = createBattle(hero(), foes, rng);
    if (isPlayerTurn(b)) return { b, rng };
  }
  assert.fail("no seed gave the player the first turn");
}

test("a Potion of Dexterity drunk before a fight means two attacks a turn, and is used up by that fight", () => {
  const { b } = playerFirst(() => { const h = createCharacter(); h.effects.dexterity = true; return h; }, ["goblinKing"]);
  assert.equal(b.quick, true);
  assert.equal(b.player.effects.dexterity, false);
  assert.ok(b.log.some(e => e.type === "quick"));
  const r = playerAction(b, { type: "attack" }, faces("2/20", "2/20", ...Array(40).fill("1/20")));
  assert.equal(r.events.filter(e => e.type === "attack").length, 2);
});

test("without the potion it's one attack a turn", () => {
  const { b } = playerFirst(() => createCharacter(), ["goblinKing"]);
  assert.equal(b.quick, false);
  const r = playerAction(b, { type: "attack" }, faces("2/20", ...Array(40).fill("1/20")));
  assert.equal(r.events.filter(e => e.type === "attack").length, 1);
});

test("drinking a Potion of Dexterity in a fight uses your turn, then you attack twice", () => {
  const { b, rng } = playerFirst(() => { const h = createCharacter({ potions: 0 }); h.inventory.push(makeItem("potionDexterity")); return h; }, ["goblinKing"]);
  const r = playerAction(b, { type: "potion", base: "potionDexterity" }, rng);
  assert.equal(r.ok, true);
  assert.equal(b.quick, true);
  assert.equal(b.player.inventory.length, 0);
  assert.equal(r.events.filter(e => e.type === "attack").length, 0);
});

test("the second attack moves on to the next monster when the first one falls", () => {
  const { b } = playerFirst(() => { const h = createCharacter(); h.effects.dexterity = true; return h; }, ["giantRat", "giantRat"]);
  b.monsters[0].hp = 1;
  const r = playerAction(b, { type: "attack", target: 0 }, faces("19/20", "4/8", "19/20", "4/8", ...Array(40).fill("1/20")));
  const attacks = r.events.filter(e => e.type === "attack");
  assert.deepEqual(attacks.map(e => e.target), [0, 1]);
});

test("a Potion of Speed can't be drunk in a fight", () => {
  const { b, rng } = playerFirst(() => { const h = createCharacter({ potions: 0 }); h.inventory.push(makeItem("potionSpeed")); return h; }, ["goblin"]);
  const r = playerAction(b, { type: "potion", base: "potionSpeed" }, rng);
  assert.equal(r.ok, false);
  assert.match(r.reason, /travelling/);
  assert.equal(b.player.inventory.length, 1);
});
