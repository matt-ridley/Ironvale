import { test } from "node:test";
import assert from "node:assert/strict";
import { createCharacter, gainXp, increaseAbility, previewIncrease, rest, shortRest, hasFeature, critOn, attacksPerAction, asiEarned, armourClass, XP_FOR_LEVEL } from "../src/rules/character.js";
import { createBattle, playerAction, isPlayerTurn, resolveAttack, attacksThisAction } from "../src/rules/combat.js";
import { savingThrow, describeCheck } from "../src/rules/checks.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";
import { faces } from "./helpers.mjs";

const atLevel = level => { const c = createCharacter(); gainXp(c, XP_FOR_LEVEL[level], () => 0.5); return c; };

/* A fight against one goblin where you go first, with the goblin made too tough to fall. */
function myTurn(hero) {
  for (let seed = 1; seed <= 100; seed++) {
    const b = createBattle(hero, ["goblin"], seededRng(seed));
    if (isPlayerTurn(b)) { b.monsters[0].hp = b.monsters[0].maxHp = 999; return b; }
  }
  throw new Error("no seed gave the player the first turn");
}
const swings = r => r.events.filter(e => e.type === "attack").length;

test("fighter features arrive at levels 2, 3 and 5", () => {
  const c = createCharacter();
  assert.ok(!hasFeature(c, "actionSurge"));
  assert.equal(critOn(c), 20);
  assert.equal(attacksPerAction(c), 1);
  const ups = gainXp(c, XP_FOR_LEVEL[5], () => 0.5).levelUps;
  assert.deepEqual(ups.map(u => u.features), [["Action Surge"], ["Improved Critical"], [], ["Extra Attack"]]);
  assert.equal(critOn(c), 19);
  assert.equal(attacksPerAction(c), 2);
});

test("an ability score increase comes at levels 4, 6 and 8", () => {
  const c = createCharacter();
  assert.equal(c.asi, 0);
  const ups = gainXp(c, XP_FOR_LEVEL[8], () => 0.5).levelUps;
  assert.deepEqual(ups.filter(u => u.asi).map(u => u.level), [4, 6, 8]);
  assert.equal(c.asi, 3);
  assert.deepEqual([1, 3, 4, 5, 6, 8, 11, 12, 19].map(asiEarned), [0, 0, 1, 1, 2, 3, 3, 4, 7]);
});

test("raising an ability: +2, spends the increase, and CON adds HP for every level", () => {
  const c = atLevel(4);
  assert.equal(increaseAbility(c, "STR").ok, true);
  assert.equal(c.abilities.STR, 17);
  assert.equal(c.asi, 0);
  assert.match(increaseAbility(c, "STR").reason, /no ability score increase/);

  const d = atLevel(4), hp = d.maxHp;
  assert.deepEqual(increaseAbility(d, "CON"), { ok: true, ability: "CON", from: 14, to: 16, hpGain: 4 });
  assert.equal(d.maxHp, hp + 4);

  const e = atLevel(4);
  e.abilities.DEX = 20;
  assert.match(increaseAbility(e, "DEX").reason, /as high as it goes/);
  assert.equal(e.asi, 1);
  e.abilities.DEX = 19;
  assert.equal(increaseAbility(e, "DEX").to, 20); // never above 20
});

test("the level-up screen's preview says what each choice changes, without changing anything", () => {
  const c = atLevel(4);
  assert.deepEqual(previewIncrease(c, "STR"), { ok: true, from: 15, to: 17, ac: 0, hit: 1, damage: 1, hp: 0, init: 0 });
  assert.equal(previewIncrease(c, "CON").hp, 4);
  assert.equal(previewIncrease(c, "DEX").ac, 0); // chain mail is heavy armour: DEX doesn't help its AC
  assert.equal(previewIncrease(c, "DEX").init, 1);
  assert.equal(c.abilities.STR, 15);
  assert.equal(c.asi, 1);
  const light = createCharacter({ armour: "leather" });
  assert.equal(previewIncrease(light, "DEX").ac, 1);
});

test("from level 3, a natural 19 is a critical hit", () => {
  const sword = { name: "Longsword", bonus: 4, damage: "1d8", damageBonus: 2 };
  assert.equal(resolveAttack(sword, 99, faces("19/20")).hit, false);
  const r = resolveAttack(sword, 99, faces("19/20", "3/8", "6/8"), { critOn: 19 });
  assert.equal(r.crit, true);
  assert.equal(r.damage, 11);
});

test("ATTACK is one attack, two with Extra Attack, and a Potion of Dexterity adds one more", () => {
  const low = myTurn(createCharacter());
  assert.equal(swings(playerAction(low, { type: "attack", target: 0 }, seededRng(3))), 1);
  const high = myTurn(atLevel(5));
  assert.equal(attacksThisAction(high), 2);
  assert.equal(swings(playerAction(high, { type: "attack", target: 0 }, seededRng(3))), 2);
  const hero = atLevel(5);
  hero.effects.dexterity = true;
  const quick = myTurn(hero);
  assert.equal(attacksThisAction(quick), 3);
  const quickLow = createCharacter();
  quickLow.effects.dexterity = true;
  assert.equal(attacksThisAction(myTurn(quickLow)), 2);
});

test("Action Surge: from level 2, one more action this turn, once per rest", () => {
  assert.match(playerAction(myTurn(createCharacter()), { type: "actionSurge" }).reason, /level 2/);
  const hero = atLevel(2);
  const b = myTurn(hero);
  assert.equal(playerAction(b, { type: "actionSurge" }).ok, true);
  assert.equal(hero.actionSurge, false);
  assert.match(playerAction(b, { type: "actionSurge" }).reason, /already surged/);
  const first = playerAction(b, { type: "attack", target: 0 }, seededRng(5));
  assert.equal(first.events.at(-1).type, "surge-again");
  assert.ok(isPlayerTurn(b), "still your turn after the first action");
  const second = playerAction(b, { type: "defend" }, seededRng(6));
  assert.ok(second.events.some(e => e.type === "monster-attack"), "the goblin acts after your second action");
  assert.match(playerAction(myTurn(hero), { type: "actionSurge" }).reason, /Rest to get it back/);
  rest(hero);
  assert.equal(hero.actionSurge, true);
  hero.actionSurge = false;
  assert.equal(shortRest(hero).actionSurge, true);
  assert.equal(hero.actionSurge, true);
});

test("levelling up in a fight says what's new", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const hero = createCharacter();
    hero.xp = XP_FOR_LEVEL[2] - 1;
    const rng = seededRng(seed);
    const b = createBattle(hero, ["giantRat"], rng);
    for (let i = 0; i < 50 && b.state === "active"; i++) playerAction(b, { type: "attack", target: 0 }, rng);
    if (b.state !== "won") continue;
    assert.match(b.log.find(e => e.type === "level-up").text, /level 2!.*New: Action Surge/);
    return;
  }
  assert.fail("never won");
});

test("a fighter's STR and CON saves add proficiency; DEX saves don't", () => {
  const c = createCharacter(); // STR 15, DEX 13, CON 14, proficiency +2
  assert.equal(savingThrow(c, "STR", 10, faces("10/20")).bonus, 4);
  assert.equal(savingThrow(c, "CON", 10, faces("10/20")).bonus, 4);
  assert.equal(savingThrow(c, "DEX", 10, faces("10/20")).bonus, 1);
  assert.match(describeCheck(savingThrow(c, "CON", 13, faces("8/20"))), /^CON save \(DC 13\).*= 12\. Failure/);
});

test("saves keep Action Surge and increases; heroes saved at level 4+ before 0.19.0 get theirs to pick", () => {
  const hero = atLevel(4);
  hero.actionSurge = false;
  const s = { hero, map: "overworld", pos: { x: 15.5, y: 20.85 }, facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "oakhollow" };
  const loaded = deserialize(serialize(s)).hero;
  assert.equal(loaded.actionSurge, false);
  assert.equal(loaded.asi, 1);
  hero.asi = 0;
  assert.equal(deserialize(serialize(s)).hero.asi, 0);
  const old = JSON.parse(serialize(s));
  old.format = 3;
  delete old.state.hero.asi;
  delete old.state.hero.actionSurge;
  assert.equal(deserialize(JSON.stringify(old)).hero.asi, 1);
  assert.equal(deserialize(JSON.stringify(old)).hero.actionSurge, true);
  old.state.hero.level = 1;
  assert.equal(deserialize(JSON.stringify(old)).hero.asi, 0);
});

test("raising DEX in light armour raises AC", () => {
  const c = createCharacter({ armour: "leather" });
  c.asi = 1;
  const before = armourClass(c);
  increaseAbility(c, "DEX");
  assert.equal(armourClass(c), before + 1);
});
