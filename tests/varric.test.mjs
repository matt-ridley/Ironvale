import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { SCRIPTS, objective, VARRIC_FIGHT, KEEP_REWARD } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { titleOf } from "../src/story/hero.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { createCharacter, learnRune, runesLeft, rest, reforgeBlade, weaponAttack } from "../src/rules/character.js";
import { makeItem, itemName, describeItem } from "../src/rules/items.js";
import { createBattle, playerAction, isPlayerTurn } from "../src/rules/combat.js";
import { serialize, deserialize } from "../src/state/save.js";
import { seededRng } from "../src/rules/dice.js";
import { simulate } from "../tools/simulate.mjs";
import { faces } from "./helpers.mjs";

const keep = MAPS.keep;
const ACT2 = { questStarted: true, chiefDefeated: true, questRewarded: true, kingQuestStarted: true, kingDefeated: true, kingRewarded: true, signetTaken: true,
  brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true, fenReported: true, metSallow: true, causewayRaised: true,
  keepGateOpened: true, courtyardLever: true, chapelSeal: true, armouryLever: true, tombOpen: true, seenTomb: true };
const fresh = (flags = {}) => {
  const hero = createCharacter({ name: "Robin" });
  hero.inventory.push(makeItem("ironSignet"));
  return { hero, flags: { ...flags }, pos: feetAt(19, 5) };
};
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));
const rich = rng => { const f = faces(...Array(20).fill("5/10")); let n = 20; return () => (n-- > 0 ? f() : rng()); };

test("Lord Varric waits in his tomb once it's open, and mistakes you for a thief", () => {
  assert.ok(!activeObjects(keep, { keepGateOpened: true }).some(o => o.id === "varric"));
  assert.ok(activeObjects(keep, { tombOpen: true }).some(o => o.id === "varric"));
  assert.ok(!activeObjects(keep, { tombOpen: true, varricDefeated: true }).some(o => o.id === "varric"));
  const from = reachable(keep, keep.spawn, { tombOpen: true });
  assert.ok(from.has("19,5"));
  const c = startConversation(SCRIPTS.varric, fresh(ACT2));
  assert.match(view(c).text, /Thief/);
  pick(c, "I didn't steal it!");
  choose(c);
  assert.deepEqual(takeEvents(c), [{ type: "battle", foes: VARRIC_FIGHT, zone: "tomb", winFlag: "varricDefeated", afterWin: "varricFalls" }]);
  assert.equal(objective(ACT2), "Face Lord Varric in his tomb");
});

test("as he falls: \"Warden's blood... at last\", and the Signet goes home for quest 5's reward", () => {
  const s = fresh({ ...ACT2, varricDefeated: true });
  const c = startConversation(SCRIPTS.varricFalls, s, { rng: rich(seededRng(1)) });
  assert.match(view(c).text, /Warden's blood\.\.\..*At last/);
  choose(c);
  choose(c);
  const xp = s.hero.xp, gold = s.hero.gold;
  pick(c, "Put the Signet back");
  assert.equal(s.flags.signetReturned, true);
  assert.ok(!s.hero.inventory.some(i => i.base === "ironSignet"));
  assert.equal(s.hero.xp, xp + KEEP_REWARD.xp);
  assert.equal(s.hero.gold, gold + KEEP_REWARD.gold);
  assert.match(view(c).text, /a great door in the mountains/);
  assert.equal(objective(s.flags), "Tell Brannoc what Varric called you");
  assert.equal(titleOf(s.flags), "Ironvale's Heir");
});

test("walk away before putting it back, and the sarcophagus lets you do it later", () => {
  const s = fresh({ ...ACT2, varricDefeated: true });
  assert.equal(objective(s.flags), "Put the Iron Signet back on Varric's tomb");
  const c = startConversation(SCRIPTS.sarcophagus, s, { rng: rich(seededRng(2)) });
  assert.match(view(c).text, /ring-shaped hollow/);
  choose(c);
  pick(c, "Put the Signet back");
  assert.equal(s.flags.signetReturned, true);
  assert.equal(startConversation(SCRIPTS.sarcophagus, s).node, "rest");
});

test("Brannoc reforges your sword into the Wardenblade, and your first rune burns into it: Act 2 complete", () => {
  const s = fresh({ ...ACT2, varricDefeated: true, signetReturned: true });
  s.hero.equipment.weapon.upgrade = 3;
  const c = startConversation(SCRIPTS.brannocForge, s);
  choose(c);
  pick(c, "Varric called me Warden...");
  choose(c);
  const blade = s.hero.equipment.weapon;
  assert.equal(blade.base, "wardenblade");
  assert.equal(blade.upgrade, 3);
  assert.equal(blade.silvered, true);
  assert.equal(blade.crest, true);
  assert.equal(itemName(blade), "Silvered Wardenblade +3");
  assert.match(describeItem(blade), /1d10 slashing.*Reforged by Brannoc/);
  assert.equal(runesLeft(s.hero), 2);
  assert.match(view(c).text, /learned Rune Strike/);
  choose(c);
  assert.match(view(c).text, /ACT 2 COMPLETE/);
  assert.equal(objective(s.flags), "Go home to Ironvale Keep: Hild is waiting");
  assert.ok(questLog(s.flags).find(q => q.id === "keep").done);
});

test("the reforge finds the crested sword in your pack too", () => {
  const c = createCharacter();
  const sword = c.equipment.weapon;
  c.equipment.weapon = makeItem("greatsword");
  c.inventory.push(sword);
  assert.equal(reforgeBlade(c), sword);
  assert.equal(sword.base, "wardenblade");
});

/* A fight with you to move first, against a monster made too tough to fall. */
function myTurn(hero, foe = "skeleton") {
  for (let seed = 1; seed < 200; seed++) {
    const b = createBattle(hero, [foe], seededRng(seed));
    if (isPlayerTurn(b)) { b.monsters[0].hp = b.monsters[0].maxHp = 500; return b; }
  }
  throw new Error("no seed");
}

test("Rune Strike: a slot on a hit (3d8 radiant against the undead), none on a miss; a long rest brings them back", () => {
  const hero = createCharacter();
  hero.hp = hero.maxHp = 500; // so the skeletons' swings can't end anything
  assert.match(playerAction(myTurn(hero), { type: "runeStrike", target: 0 }).reason, /don't know/);
  learnRune(hero, "runeStrike");
  const b = myTurn(hero);
  const miss = playerAction(b, { type: "runeStrike", target: 0 }, faces("1/20", ...Array(30).fill("1/20")));
  assert.ok(miss.events.some(e => e.type === "rune-miss"));
  assert.equal(runesLeft(hero), 2);
  const b2 = myTurn(hero);
  const hit = playerAction(b2, { type: "runeStrike", target: 0 }, faces("19/20", "4/8", "8/8", "8/8", "8/8", ...Array(30).fill("1/20")));
  const swing = hit.events.find(e => e.type === "attack");
  assert.match(swing.text, /rune on your blade flares: \+24 radiant/);
  assert.equal(swing.rune, true);
  assert.equal(runesLeft(hero), 1);
  rest(hero);
  assert.equal(runesLeft(hero), 2);
  const save = { hero, map: "keep", pos: feetAt(19, 5), facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "fenwatch" };
  hero.runes.used = 1;
  assert.deepEqual(deserialize(serialize(save)).hero.runes, { known: ["runeStrike"], used: 1 });
});

test("Lord Varric: silver matters, and a companion helps (the simulator)", () => {
  const plain = simulate({ level: 6, upgrade: 3, potions: 3 }, VARRIC_FIGHT, { fights: 300 });
  const silver = simulate({ level: 6, upgrade: 3, potions: 3, silvered: true }, VARRIC_FIGHT, { fights: 300 });
  const robyn = simulate({ level: 6, upgrade: 3, potions: 3, silvered: true, companion: "robyn" }, VARRIC_FIGHT, { fights: 300 });
  assert.ok(plain < 0.6, `plain steel should struggle (${plain})`);
  assert.ok(silver > plain + 0.2, `silver should help a lot (${plain} -> ${silver})`);
  assert.ok(robyn >= silver, `Robyn should help (${robyn})`);
  assert.equal(weaponAttack(createCharacter()).damageType, "slashing");
});
