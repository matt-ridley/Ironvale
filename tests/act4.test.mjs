// Act 4's groundwork: the act from the flags, the fighter's levels 13 to 16, Indomitable's two uses (and the save
// format that counts them), and fights with a second companion beside you.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCharacter, gainXp, hasFeature, critOn, canIndomitable, indomitableUses, rest, learnRune, XP_FOR_LEVEL } from "../src/rules/character.js";
import { createBattle, resistSave, playerAction, isPlayerTurn, isAllyTurn, allyTurnKey, partyKeys, checkEnd } from "../src/rules/combat.js";
import { allyAction, chooseAllyAction, canCounter } from "../src/rules/tactics.js";
import { seededRng } from "../src/rules/dice.js";
import { makeItem } from "../src/rules/items.js";
import { joinParty, benchCompanion, secondCompanion, guestCompanion, companionMaxHp } from "../src/rules/party.js";
import { actOf } from "../src/story/hero.js";
import { serialize, deserialize, SAVE_FORMAT } from "../src/state/save.js";
import { feetAt } from "../src/world/movement.js";
import { simulate } from "../tools/simulate.mjs";

const ACT3 = { kingDefeated: true, kingRewarded: true, signetReturned: true, varricDefeated: true, bladeReforged: true, keepHome: true };
const atLevel = level => { const c = createCharacter(); gainXp(c, XP_FOR_LEVEL[level], () => 0.5); return c; };

/* A hero at `level` travelling with Megan, with Rachel along as a second companion: a guest, or from the roster. */
function twoFriends(level = 13, { roster = false } = {}) {
  const h = atLevel(level);
  if (roster) { joinParty(h, "rachel"); benchCompanion(h); }
  joinParty(h, "megan");
  return { h, second: secondCompanion(h, "rachel") };
}

/* The first seeded fight where `ok(battle)` holds. */
function fightWhere(h, foes, second, ok, opts = {}) {
  for (let seed = 1; seed < 500; seed++) {
    const copy = structuredClone({ h, second });
    const b = createBattle(copy.h, foes, seededRng(seed), { second: copy.second, ...opts });
    if (ok(b)) return b;
  }
  throw new Error("no seed gave that fight");
}

test("Act 4 begins when Act 3 ends", () => {
  assert.equal(actOf(ACT3), 3);
  assert.equal(actOf({ ...ACT3, act3Complete: true }), 4);
});

test("levels 13 to 16: Indomitable twice, ability score increases at 14 and 16, Superior Critical at 15", () => {
  const h = createCharacter();
  const { levelUps } = gainXp(h, XP_FOR_LEVEL[16], () => 0.5);
  const at = level => levelUps.find(l => l.level === level);
  assert.deepEqual(at(13).features, ["Indomitable (two uses)"]);
  assert.equal(at(14).asi, true);
  assert.deepEqual(at(15).features, ["Superior Critical"]);
  assert.equal(at(16).asi, true);
  assert.equal(at(13).asi, false);
  assert.equal(critOn(atLevel(14)), 19);
  assert.equal(critOn(atLevel(15)), 18);
  assert.equal(indomitableUses(atLevel(8)), 0);
  assert.equal(indomitableUses(atLevel(12)), 1);
  assert.equal(indomitableUses(atLevel(13)), 2);
  assert.ok(hasFeature(atLevel(16), "superiorCritical"));
});

test("Superior Critical: an 18 is a critical hit from level 15", () => {
  const hit18 = level => {
    const b = fightWhere(atLevel(level), ["troll"], null, isPlayerTurn);
    const r = playerAction(b, { type: "attack", target: 0 }, () => 17.5 / 20); // every d20 an 18
    return r.events.find(e => e.type === "attack").roll.crit;
  };
  assert.equal(hit18(14), false);
  assert.equal(hit18(15), true);
});

test("from level 13, Indomitable rolls a failed save again twice per long rest", () => {
  const hero = atLevel(13), rng = seededRng(4);
  const b = createBattle(hero, ["goblin"], rng);
  const start = b.log.length;
  for (let i = 0; i < 3; i++) resistSave(b, "player", "CON", 99, rng);
  assert.equal(b.log.slice(start).filter(e => e.type === "indomitable").length, 2);
  assert.equal(hero.indomitableUsed, 2);
  assert.equal(canIndomitable(hero), false);
  rest(hero);
  assert.equal(canIndomitable(hero), true);
});

test("save format 7 counts Indomitable's uses; an older save's 'used' is one use", () => {
  assert.equal(SAVE_FORMAT, 7);
  const s = { hero: atLevel(13), flags: { ...ACT3 }, map: "overworld", pos: feetAt(50, 31), facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" };
  const load = (used, format = SAVE_FORMAT) => {
    const data = JSON.parse(serialize({ ...s, hero: { ...s.hero, indomitableUsed: used } }));
    data.format = format;
    return deserialize(JSON.stringify(data)).hero;
  };
  assert.equal(load(2).indomitableUsed, 2);
  assert.equal(load(1).indomitableUsed, 1);
  assert.equal("indomitableUsed" in load(0), false);
  assert.equal(load(9).indomitableUsed, 2); // never more than two
  assert.equal("indomitableUsed" in load("lots"), false);
  assert.equal(load(true, 6).indomitableUsed, 1);
  assert.equal("indomitableUsed" in load(false, 6), false);
});

test("a second companion: from the roster if they're waiting there, else a guest; never the one already with you", () => {
  const { h, second } = twoFriends(13, { roster: true });
  assert.equal(second, h.roster[0]); // the roster's own record, so wounds and slots carry on
  assert.equal(secondCompanion(h, "megan"), null);
  assert.equal(secondCompanion(h, "nobody"), null);
  const guest = secondCompanion(atLevel(13), "robyn");
  assert.equal(guest.guest, true);
  assert.equal(guest.hurt, 0);
  assert.deepEqual(Object.keys(guest.gear), Object.keys(guestCompanion("robyn").gear)); // their starting gear
});

test("a fight with two companions: both roll initiative, stand in the log, and take their own turns", () => {
  const { h, second } = twoFriends();
  const b = createBattle(h, ["troll", "griffon"], seededRng(7), { second });
  assert.equal(b.ally.id, "megan");
  assert.equal(b.ally2.id, "rachel");
  assert.deepEqual(partyKeys(b), ["player", "ally", "ally2"]);
  assert.equal(b.order.filter(e => e.who === "ally2").length, 1);
  assert.match(b.log[0].text, /Rachel \(\d+\)/);
  for (let i = 0; i < 6 && isPlayerTurn(b); i++) playerAction(b, { type: "defend" }, seededRng(100 + i));
  const by = new Set(b.log.filter(e => e.type === "ally-attack").map(e => e.by));
  const rachelActed = b.log.some(e => e.type === "flyby" || (e.type === "spell" && e.caster === "ally2"));
  assert.ok(by.has("ally"), "Megan shoots");
  assert.ok(rachelActed || by.has("ally2"), "Rachel acts too");
  for (const e of b.log) assert.equal(typeof e.hp.ally2, "number");
});

test("monsters go for any of you who are standing", () => {
  const { h, second } = twoFriends();
  const hit = new Set();
  for (let seed = 1; seed < 40 && hit.size < 3; seed++) {
    const copy = structuredClone({ h, second });
    const b = createBattle(copy.h, ["troll", "troll"], seededRng(seed), { second: copy.second });
    for (let i = 0; i < 4 && isPlayerTurn(b); i++) playerAction(b, { type: "defend" }, seededRng(seed * 10 + i));
    for (const e of b.log) if (e.type === "monster-attack") hit.add(e.who);
  }
  assert.deepEqual([...hit].sort(), ["ally", "ally2", "player"]);
});

test("leading the second companion: their turn waits for you, and their actions are theirs", () => {
  const { h, second } = twoFriends();
  second.lead = true;
  const b = fightWhere(h, ["troll"], second, isAllyTurn);
  assert.equal(allyTurnKey(b), "ally2");
  assert.equal(b.leadAlly2, true);
  assert.equal(b.leadAlly, false);
  const r = allyAction(b, { type: "shoot", target: 0 }, seededRng(3));
  assert.equal(r.ok, true);
  assert.equal(r.events[0].by, "ally2");
  assert.match(r.events[0].text, /^Rachel attacks/);
});

test("a second companion's spells come from their own book and slots", () => {
  const { h, second } = twoFriends(13, { roster: true });
  second.lead = true;
  const b = fightWhere(h, ["troll"], second, isAllyTurn);
  const r = allyAction(b, { type: "cast", spell: "magicMissile", target: 0, slotLevel: 1 }, seededRng(3));
  assert.equal(r.ok, true);
  assert.equal(b.ally2.src, b.player.roster[0]);
  assert.deepEqual(b.player.roster[0].slotsUsed, [1]); // on Rachel's roster record
  assert.equal(b.player.companion.slotsUsed, undefined); // not Megan's
});

test("healing and potions reach the second companion too", () => {
  const { h, second } = twoFriends();
  h.inventory = [makeItem("potionHealing"), makeItem("potionHealing")];
  learnRune(h, "wardensCall");
  const b = fightWhere(h, ["troll"], second, isPlayerTurn);
  b.ally2.hp = 3;
  const r = playerAction(b, { type: "allyPotion", on: "ally2" }, seededRng(2));
  assert.equal(r.ok, true);
  assert.equal(r.events[0].who, "ally2");
  assert.match(r.events[0].text, /You give Rachel/);
  const c = fightWhere(h, ["troll"], second, isPlayerTurn);
  c.ally.hp = 2; c.ally2.hp = 2;
  const call = playerAction(c, { type: "wardensCall" }, seededRng(2));
  assert.deepEqual(call.events.filter(e => e.type === "call-heal").map(e => e.who), ["player", "ally", "ally2"]);
});

test("a companion on HEAL looks after whichever of the three of you is worst off", () => {
  const { h, second } = twoFriends();
  h.inventory = [makeItem("potionHealing")];
  h.companion.tactics = "heal";
  const b = fightWhere(h, ["troll"], second, isPlayerTurn);
  b.ally.tactics = "heal";
  b.ally2.hp = 1;
  assert.deepEqual(chooseAllyAction(b, "ally"), { type: "potion", on: "ally2" });
});

test("wounds go back to each companion's own record after the fight", () => {
  const { h, second } = twoFriends(13, { roster: true });
  const b = createBattle(h, ["goblin"], seededRng(5), { second });
  b.ally.hp = 4; b.ally2.hp = 6;
  b.monsters[0].hp = 0;
  assert.equal(checkEnd(b, seededRng(1)), true);
  assert.equal(h.companion.hurt, companionMaxHp("megan", 13) - 4);
  assert.equal(second.hurt, companionMaxHp("rachel", 13) - 6);
});

test("Rachel as the second companion can still COUNTER", () => {
  const { h, second } = twoFriends(13, { roster: true });
  second.spells = ["fireBolt", "counterspell"];
  const b = createBattle(h, ["thorne"], seededRng(2), { second });
  assert.equal(b.ally2.id, "rachel");
  assert.equal(canCounter(b), true);
});

test("a second companion makes a hard fight easier", () => {
  const foes = ["stoneGiant", "stoneGiant"];
  const hero = { level: 13, upgrade: 4, potions: 1, greater: 0, weapon: "wardenblade", silvered: true, runes: ["runeStrike", "ironWard"], companion: "megan" };
  const one = simulate(hero, foes, { fights: 300 });
  const two = simulate({ ...hero, second: "rachel" }, foes, { fights: 300 });
  assert.ok(two > one, `two companions ${two} vs one ${one}`);
});
