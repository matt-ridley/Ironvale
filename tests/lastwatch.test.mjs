// Act 4, quest 11: Lastwatch. The road east, the Cinder Wardens at the gate, Matt (his story, a scene for each
// daughter, the Breaking Rune and the true name), his camp and arm-wrestle, the sisters told at the keep, the bridge
// north to the aeries and the diggings, the new monsters, and Thorne's Act 4 lines in the cells.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable, zoneAt } from "../src/world/map.js";
import { travelPoints } from "../src/world/travel.js";
import { ENCOUNTERS, beastsLeave } from "../src/world/encounters.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { Q11_REWARD, CINDER_FIGHT, act4Event, untoldSister } from "../src/story/act4.js";
import { createCharacter, gainXp, knowsRune, runesLeft, learnRune, XP_FOR_LEVEL, RUNES } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { createBattle, playerAction, isPlayerTurn } from "../src/rules/combat.js";
import { winPrize } from "../src/rules/minigames.js";
import { abilityScore } from "../src/rules/character.js";
import { MONSTERS } from "../src/data/monsters.js";
import { seededRng } from "../src/rules/dice.js";

const beyond = MAPS.beyond;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const hero = (...companions) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[14], () => 0.5); h.asi = 0;
  for (const c of companions) joinParty(h, c); // the last one travels with you
  return h;
};
const Q10_DONE = { act3Complete: true, q9Started: true, doorOpened: true, seenThreshold: true, warbandFled: true, q9Done: true, wolfFollowed: true, claireMet: true,
  broodBeaten: true, claireJoined: true, q10Done: true, rachelJoined: true, oathSworn: true, oath: "iron" };
const reach = flags => reachable(beyond, beyond.spawn, flags);

test("the road runs east to Lastwatch, and the Cinder Wardens hold its gate", () => {
  assert.equal(beyond.width, 104);
  assert.equal(zoneAt(beyond, 60, 16).id, "lastwatch");
  assert.equal(zoneAt(beyond, 82, 19).id, "lastwatchHold");
  assert.equal(zoneAt(beyond, 82, 5).id, "aeries");
  const before = reach({ ...Q10_DONE });
  assert.ok(before.has("71,16"), "the road reaches the gate");
  assert.ok(!before.has("80,22"), "but not inside");
  assert.ok(before.has("97,29"), "the shrine's door can be reached from outside");
  const inside = reach({ ...Q10_DONE, cindersBeaten: true });
  assert.ok(inside.has("80,22"));
  assert.ok(!inside.has("82,10"), "the bridge is up");
  const over = reach({ ...Q10_DONE, cindersBeaten: true, q11Done: true });
  for (const at of ["82,10", "69,4", "98,5"]) assert.ok(over.has(at), `${at} over the bridge`);
});

test("first sight of Lastwatch (Claire knows the Cinder Wardens), and they fight you at the gate", () => {
  const s = { hero: hero("claire"), flags: { ...Q10_DONE } };
  assert.equal(act4Event(s, "lastwatch").script, "lastwatchView");
  assert.equal(act4Event(s, "lastwatch"), null); // once
  assert.match(through(startConversation(SCRIPTS.lastwatchView, s)), /Lastwatch.*Father's Wardens/s);
  assert.equal(act4Event({ hero: hero(), flags: { q9Done: true } }, "lastwatch"), null); // not before Claire
  const c = startConversation(SCRIPTS.cinderGate, s);
  pick(c, "Fight");
  const [e] = takeEvents(c);
  assert.deepEqual(e.foes, CINDER_FIGHT);
  assert.equal(e.winFlag, "cindersBeaten");
  assert.equal(e.afterWin, "matt");
  assert.ok(activeObjects(beyond, { cindersBeaten: true }).every(o => !o.id.startsWith("cinderGate")));
});

test("Matt: his story, the Breaking Rune and the true name, paid once; Lastwatch becomes a camp and the bridge comes down", () => {
  const h = hero("claire"), s = { hero: h, flags: { ...Q10_DONE, cindersBeaten: true } };
  const xp = h.xp, gold = h.gold;
  const text = through(startConversation(SCRIPTS.matt, s));
  assert.match(text, /Colleen's.*the boy made it south.*our brother's line.*sealed the Door.*twenty-five years ago.*Rachel and Claire.*Robyn.*Megan.*BREAKING RUNE.*hatched with/s);
  assert.match(text, /QUEST COMPLETE: Lastwatch/);
  assert.ok(knowsRune(h, "breakingRune"));
  assert.equal(s.flags.trueName, true);
  assert.equal(s.flags.q11Done, true);
  assert.equal(gold + Q11_REWARD.gold, h.gold);
  assert.ok(h.xp >= xp + Q11_REWARD.xp);
  const again = startConversation(SCRIPTS.matt, s); // after that, just talk (and no second reward)
  assert.deepEqual(labels(again), ["Ask about your Oath", "Arm wrestle him", "Leave"]);
  assert.equal(h.gold, gold + Q11_REWARD.gold);
  pick(again, "Ask about your Oath");
  assert.match(view(again).text, /Sworn of Iron.*That was hers/s);
  const camp = flags => travelPoints({ ...flags, seenLastwatchHold: true }).find(p => p.id === "lastwatch").found;
  assert.equal(camp({ ...Q10_DONE }), false);
  assert.equal(camp(s.flags), true);
  assert.ok(activeObjects(beyond, s.flags).some(o => o.id === "lastwatchFire"));
  assert.ok(!activeObjects(beyond, s.flags).some(o => o.id === "northGate"));
});

test("each daughter gets her own scene with him: at the meeting, or later at Lastwatch", () => {
  const s = { hero: hero("rachel"), flags: { ...Q10_DONE, cindersBeaten: true } };
  assert.match(through(startConversation(SCRIPTS.matt, s)), /You're our father.*taking notes.*BREAKING RUNE/s);
  assert.equal(s.flags.rachelMetMatt, true);
  assert.equal(s.flags.rachelHeard, true);
  const m = { hero: hero("megan"), flags: { ...s.flags, meganJoined: true } };
  assert.match(through(startConversation(SCRIPTS.matt, m)), /My da found me.*named you Megan, after my mother/s);
  assert.equal(m.flags.meganMetMatt, true);
  assert.equal(m.hero.gold, hero().gold, "no reward the second time round");
  const r = { hero: hero("robyn"), flags: { ...m.flags, robynJoined: true } };
  assert.match(through(startConversation(SCRIPTS.matt, r)), /candle.*It was you.*your family's all along/s);
  assert.deepEqual(labels(startConversation(SCRIPTS.matt, r)), ["Ask about your Oath", "Arm wrestle him", "Leave"]);
});

test("sisters who weren't at Lastwatch hear it from you at the keep", () => {
  const s = { hero: hero("claire"), flags: { ...Q10_DONE, meganJoined: true, robynJoined: true } };
  assert.equal(untoldSister(s), null); // nothing to tell yet
  s.flags.q11Done = true;
  s.flags.robynHeard = true; // she was there
  assert.equal(act4Event(s, "courtyard").script, "familyNews");
  assert.match(through(startConversation(SCRIPTS.familyNews, s)), /Rachel.*He's alive.*Megan.*My other da/s);
  assert.equal(s.flags.rachelHeard && s.flags.meganHeard, true);
  assert.equal(act4Event(s, "courtyard"), null);
});

test("the Breaking Rune hits every monster with force (nothing beyond the Door is immune), and spends a slot", () => {
  assert.ok(RUNES.breakingRune);
  const h = hero("claire");
  for (const r of ["runeStrike", "breakingRune"]) learnRune(h, r);
  for (let seed = 1; seed < 50; seed++) {
    const b = createBattle(structuredClone(h), ["fireElemental", "hellHound"], seededRng(seed));
    if (!isPlayerTurn(b)) continue;
    const left = runesLeft(b.player), hp = b.monsters.map(m => m.hp);
    assert.ok(playerAction(b, { type: "breakingRune" }, seededRng(seed)).ok);
    assert.equal(runesLeft(b.player), left - 1);
    b.monsters.forEach((m, i) => assert.ok(m.hp < hp[i], `${m.name} took force damage`));
    return;
  }
  assert.fail("never the hero's turn");
});

test("Matt's arm-wrestle prize: his captain's badge, +2 DEX", () => {
  const h = hero(), flags = {}, dex = abilityScore(h, "DEX");
  assert.equal(winPrize(h, flags, "armMatt").base, "captainsBadge");
  assert.equal(abilityScore(h, "DEX"), dex + 2);
  assert.equal(winPrize(h, flags, "armMatt"), null);
});

test("the new monsters: Lastwatch's always come in twos, the aeries' alone; beasts lie down for Claire, werewolves don't", () => {
  for (const id of ["cinderWarden", "vampireSpawn", "mummy", "roc", "giantApe", "werewolf"]) assert.ok(MONSTERS[id], id);
  assert.ok(ENCOUNTERS.lastwatch.table.every(e => e.foes.length === 2));
  assert.ok(ENCOUNTERS.aeries.table.some(e => e.foes.includes("roc")));
  assert.equal(beastsLeave(["giantApe"], "claire"), true);
  assert.equal(beastsLeave(["giantApe", "werewolf"], "claire"), false);
  assert.ok(MONSTERS.cinderWarden.immune.includes("fire"));
});

test("Thorne in Act 4: the Door's binding, and with Claire, the one time he says sorry", () => {
  const s = { hero: hero("megan"), flags: { ...Q10_DONE, thorneSpared: true } };
  assert.match(through(startConversation(SCRIPTS.thorneCell, s)), /smell the ash.*One round/s);
  assert.equal(s.flags.thorneBinding, true);
  const c = { hero: hero("claire"), flags: s.flags };
  assert.match(through(startConversation(SCRIPTS.thorneCell, c)), /listened to it.*I'm sorry.*worked out who your father was.*Eat something/s);
  assert.equal(c.flags.thorneClaire, true);
  assert.doesNotMatch(through(startConversation(SCRIPTS.thorneCell, c)), /I'm sorry/); // once
});

test("quest 11 in the log and on the HUD, step by step", () => {
  const story = { kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true,
    fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, varricDefeated: true, heardTremor: true,
    metRachel: true, rockslideOpen: true, metColleen: true, waystoneIron: true, waystoneCall: true, bindingRecovered: true, wardensRoad: true,
    kingDefeated: true, signetReturned: true, bladeReforged: true, keepHome: true, raeHeard: true, gatehouseOpen: true, runeDoor1: true, runeDoor2: true,
    runeDoor3: true, thorneDefeated: true, gatehouseDone: true, ...Q10_DONE };
  const steps = [
    [{}, "Find Claire's father at Lastwatch, east along the ash road"],
    [{ seenLastwatch: true }, "Fight through the Cinder Wardens at Lastwatch's gate"],
    [{ cindersBeaten: true }, "Talk to Matt at Lastwatch"],
    [{ mattMet: true, q11Done: true }, "The sisters' pledges (the next part of Act 4 is coming)"],
  ];
  let flags = { ...story };
  for (const [more, line] of steps) { flags = { ...flags, ...more }; assert.equal(objective(flags), line); }
  assert.equal(questLog(flags).find(q => q.id === "lastwatch").done, true);
  assert.equal(questLog({ q9Done: true }).some(q => q.id === "lastwatch"), false);
});
