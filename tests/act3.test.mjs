// Act 3's groundwork: the act from the flags, monsters that run from a hero far too strong for them, the fighter's
// levels 9 to 12, and the companions' campfire talks and remarks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCharacter, gainXp, hasFeature, attacksPerAction, armourClass, weaponAttack, needsFightingStyle, pickFightingStyle, rest, XP_FOR_LEVEL } from "../src/rules/character.js";
import { createBattle, resistSave } from "../src/rules/combat.js";
import { seededRng } from "../src/rules/dice.js";
import { makeItem } from "../src/rules/items.js";
import { joinParty } from "../src/rules/party.js";
import { runsAway, ENCOUNTERS, RUN_AWAY_LEVELS } from "../src/world/encounters.js";
import { actOf } from "../src/story/hero.js";
import { nextTalk, talkNodes, TALKS, remarkFor } from "../src/story/talks.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { serialize, deserialize } from "../src/state/save.js";
import { feetAt } from "../src/world/movement.js";

const atLevel = level => { const c = createCharacter(); gainXp(c, XP_FOR_LEVEL[level], () => 0.5); return c; };
export const ACT3 = { kingDefeated: true, kingRewarded: true, signetReturned: true, varricDefeated: true, bladeReforged: true, keepHome: true };
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };

test("the act follows the story: goblins, Ironvale, then the pass once the blade is reforged and the keep is home", () => {
  assert.equal(actOf({}), 1);
  assert.equal(actOf({ kingDefeated: true }), 2);
  assert.equal(actOf({ kingDefeated: true, bladeReforged: true }), 2);
  assert.equal(actOf(ACT3), 3);
});

test("from Act 3, about half the fights in an area far below you end with the monsters running away", () => {
  const forest = ENCOUNTERS.forest.level;
  assert.equal(runsAway("forest", forest + RUN_AWAY_LEVELS, 3, () => 0.1), true);
  assert.equal(runsAway("forest", forest + RUN_AWAY_LEVELS, 3, () => 0.9), false); // the other half still fight
  assert.equal(runsAway("forest", forest + RUN_AWAY_LEVELS - 1, 3, () => 0), false); // not strong enough yet
  assert.equal(runsAway("forest", 20, 2, () => 0), false); // not before Act 3
  assert.equal(runsAway("fen", 9, 3, () => 0), false); // the fen still holds up at level 9
  assert.equal(runsAway("fen", 10, 3, () => 0), true);
  for (const [id, area] of Object.entries(ENCOUNTERS)) assert.ok(Number.isInteger(area.level), `${id} has a level`);
});

test("levels 9 to 12: Indomitable, a fighting style, Extra Attack (2) and an ability score increase", () => {
  const c = atLevel(8);
  const ups = gainXp(c, XP_FOR_LEVEL[12] - c.xp, () => 0.5).levelUps;
  assert.deepEqual(ups.map(u => u.features), [["Indomitable"], ["Fighting Style"], ["Extra Attack (2)"], []]);
  assert.ok(ups.at(-1).asi);
  assert.ok(hasFeature(c, "indomitable"));
  assert.equal(attacksPerAction(c), 3);
  assert.equal(attacksPerAction(atLevel(10)), 2);
});

test("the fighting style: Defense is +1 AC in armour, Dueling +2 damage one-handed; picked once, at level 10", () => {
  assert.equal(needsFightingStyle(atLevel(9)), false);
  assert.match(pickFightingStyle(atLevel(9), "defense").reason, /level 10/);
  const d = atLevel(10), ac = armourClass(d);
  assert.equal(needsFightingStyle(d), true);
  assert.equal(pickFightingStyle(d, "defense").ok, true);
  assert.equal(armourClass(d), ac + 1);
  assert.equal(needsFightingStyle(d), false);
  assert.match(pickFightingStyle(d, "dueling").reason, /already/);
  d.equipment.armour = null;
  assert.equal(armourClass(d), 10 + 1 + 2); // no armour, no Defense (DEX +1 and the shield's +2)

  const e = atLevel(10), dmg = weaponAttack(e).damageBonus;
  pickFightingStyle(e, "dueling");
  assert.equal(weaponAttack(e).damageBonus, dmg + 2);
  e.equipment.shield = null;
  e.equipment.weapon = makeItem("greatsword");
  assert.equal(weaponAttack(e).damageBonus, 2); // two-handed: STR only
  assert.match(pickFightingStyle(atLevel(10), "berserk").reason, /Unknown/);
});

test("Indomitable rolls a failed save again, once per long rest, and says so", () => {
  const hero = atLevel(9), rng = seededRng(4);
  const b = createBattle(hero, ["goblin"], rng);
  const start = b.log.length;
  assert.equal(resistSave(b, "player", "CON", 99, rng).success, false); // fails both times
  assert.equal(b.log.slice(start).filter(e => e.type === "indomitable").length, 1);
  assert.equal(hero.indomitableUsed, true);
  resistSave(b, "player", "CON", 99, rng);
  assert.equal(b.log.slice(start).filter(e => e.type === "indomitable").length, 1); // used up
  rest(hero);
  assert.equal(hero.indomitableUsed, false);
  const low = atLevel(8), b2 = createBattle(low, ["goblin"], rng), n = b2.log.length;
  resistSave(b2, "player", "CON", 99, rng);
  assert.equal(b2.log.length, n); // not before level 9
});

const act3State = (companion, flags = {}) => {
  const hero = atLevel(9);
  if (companion) joinParty(hero, companion);
  return { hero, flags: { ...ACT3, ...flags }, map: "overworld", pos: feetAt(50, 31) };
};

test("campfire talks: in order, one per rest, each waiting for its story flag, and the third opens a quest", () => {
  const s = act3State("megan");
  assert.equal(nextTalk({ ...s, flags: { kingDefeated: true } }), null); // not before Act 3
  assert.equal(nextTalk(s).id, "megan1");
  s.hero.companion.talks = 1;
  assert.equal(nextTalk(s), null); // the second waits for the pass to open
  s.flags.rockslideOpen = true;
  assert.equal(nextTalk(s).id, "megan2");
  s.hero.companion.talks = 2;
  s.flags.wardenTraining = true;
  assert.equal(nextTalk(s).id, "megan3");
  assert.equal(nextTalk(act3State(null)), null);
  for (const [id, list] of Object.entries(TALKS)) assert.equal(list.length, 3, id);
  assert.ok(Object.keys(talkNodes()).length > 9);
});

test("a talk plays after a rest at the campfire, and isn't told twice", () => {
  const s = act3State("robyn");
  s.hero.hp = 1;
  const c = startConversation(SCRIPTS.campfire, s);
  pick(c, "Rest by the fire (short rest)");
  assert.deepEqual(labels(c), ["Continue"]);
  choose(c, 0);
  assert.equal(s.hero.companion.talks, 1);
  while (view(c)) { assert.ok(view(c).text); choose(c, 0); }
  const again = startConversation(SCRIPTS.campfire, s);
  pick(again, "Rest by the fire (short rest)");
  assert.deepEqual(labels(again), ["Close"]); // nothing more until the pass opens
});

test("a talk after a night at the inn, and the third talk opens the companion's quest", () => {
  const s = act3State("megan", { rockslideOpen: true, wardenTraining: true });
  s.hero.companion.talks = 2;
  s.hero.gold = 100;
  const c = startConversation(SCRIPTS.inn, s);
  pick(c, "Stay the night (10 gold)");
  pick(c, "Continue");
  assert.equal(s.flags.matthewQuest, true);
  assert.equal(s.hero.companion.talks, 3);
});

test("remarks: once per zone per companion, and only when the zone has something to say", () => {
  const names = { megan: "Megan", robyn: "Robyn" };
  const s = act3State("megan");
  const r = remarkFor(s, "slopes", names);
  assert.equal(r.name, "Megan");
  assert.match(r.line, /looking down/);
  s.flags[r.flag] = true;
  assert.equal(remarkFor(s, "slopes", names), null);
  assert.equal(remarkFor(act3State("megan", { keepHome: false }), "courtyard", names), null); // the keep isn't home yet
  assert.equal(remarkFor(act3State(null), "slopes", names), null);
  assert.equal(remarkFor(s, "forest", names), null);
});

test("a save keeps the talks heard, the fighting style and Indomitable", () => {
  const s = act3State("megan");
  s.hero.companion.talks = 2;
  s.hero.fightingStyle = "dueling";
  s.hero.indomitableUsed = true;
  const back = deserialize(serialize({ ...s, facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" })).hero;
  assert.equal(back.companion.talks, 2);
  assert.equal(back.fightingStyle, "dueling");
  assert.equal(back.indomitableUsed, true);
  s.hero.fightingStyle = "juggling";
  assert.equal("fightingStyle" in deserialize(serialize({ ...s, facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" })).hero, false);
});
