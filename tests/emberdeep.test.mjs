// Act 4, quest 12: the Emberdeep. The dragon's mountain, its gate from the aeries, the golem hall and the two back ways
// round it (Dunstan's red tunnel, Snik's kobold tunnel), the Wardens' lost forge (Brannoc, the Wardenblade's final
// form, a camp), the hoard's guards and doors, and the new monsters and music.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable, zoneAt, exitAt } from "../src/world/map.js";
import { travelPoints } from "../src/world/travel.js";
import { ENCOUNTERS } from "../src/world/encounters.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { act4Event, Q12_REWARD, GOLEM_FIGHT, HOARD_GUARDS, pastGolems } from "../src/story/act4.js";
import { createCharacter, gainXp, learnRune, runeSlots, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { createBattle, fireproof } from "../src/rules/combat.js";
import { makeItem } from "../src/rules/items.js";
import { MONSTERS } from "../src/data/monsters.js";
import { TRACKS, compile } from "../src/audio/tracks.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";

const deep = MAPS.emberdeep, beyond = MAPS.beyond, keep = MAPS.keep;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const hero = (...companions) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[15], () => 0.5); h.asi = 0;
  for (const c of companions) joinParty(h, c);
  return h;
};
const PLEDGED = { act3Complete: true, q9Started: true, doorOpened: true, seenThreshold: true, warbandFled: true, wolfFollowed: true, claireMet: true, broodBeaten: true, q9Done: true, claireJoined: true, q10Done: true, rachelJoined: true,
  meganJoined: true, oathSworn: true, oath: "iron", cindersBeaten: true, mattMet: true, q11Done: true, meganPledged: true, clairePledged: true,
  seenLastwatch: true, bladeReforged: true, signetReturned: true };
const reach = flags => reachable(deep, deep.spawn, flags);

test("the Emberdeep's gate under the aeries, and the way up: through the golems, or round by Dunstan's red tunnel", () => {
  assert.equal(exitAt(beyond, 40, 1).to, "emberdeep");
  assert.equal(exitAt(deep, 20, 42).to, "beyond");
  assert.ok(reachable(beyond, beyond.spawn, PLEDGED).has("40,2"), "the gate can be reached over the bridge");
  assert.equal(zoneAt(deep, 20, 35).id, "tunnels");
  assert.equal(zoneAt(deep, 6, 12).id, "lostForge");
  const low = reach({});
  assert.ok(!low.has("20,15") && !low.has("6,12"), "the golems and the crack hold the way up");
  for (const f of [{ golemsBeaten: true }, { redTunnel: true }]) assert.ok(reach(f).has("7,13") && reach(f).has("19,8"), JSON.stringify(f));
  assert.ok(!reach({ golemsBeaten: true }).has("19,4"), "the hoard's guards hold its door");
  assert.ok(reach({ golemsBeaten: true, hoardGuardsBeaten: true }).has("19,4"));
  assert.ok(reach({ golemsBeaten: true }).has("36,15"), "Snik's tunnel comes out in the upper cave");
  assert.equal(exitAt(deep, 38, 15).to, "pass");
  for (const z of deep.zones) assert.equal(z.music, "emberdeep");
  assert.ok(compile("emberdeep").length > 0 && TRACKS.emberdeep);
});

test("the first steps in, and the golem hall's clay and stone golems", () => {
  const s = { hero: hero("claire"), flags: { ...PLEDGED } };
  assert.equal(act4Event(s, "tunnels").script, "emberdeepView");
  assert.equal(act4Event(s, "tunnels"), null);
  assert.match(through(startConversation(SCRIPTS.emberdeepView, s)), /Emberdeep.*Their forge is up there/s);
  const c = startConversation(SCRIPTS.golems, s);
  assert.doesNotMatch(view(c).text, /red line/);
  pick(c, "Fight");
  const [e] = takeEvents(c);
  assert.deepEqual(e.foes, GOLEM_FIGHT);
  assert.equal(e.winFlag, "golemsBeaten");
  for (const id of ["clayGolem", "stoneGolem", "fireGiant"]) assert.ok(MONSTERS[id], id);
  assert.equal(MONSTERS.stoneGolem.weaponResist, "magic");
  assert.ok(ENCOUNTERS.tunnels.table.some(e => e.foes.includes("fireGiant")));
});

test("Dunstan's map opens the red tunnel round the golems; without it the crack goes nowhere", () => {
  const s = { hero: hero(), flags: { ...PLEDGED } };
  assert.match(through(startConversation(SCRIPTS.redCrack, s)), /Without a map/);
  assert.equal(pastGolems(s.flags), false);
  s.hero.inventory.push(makeItem("dunstansMap"));
  assert.match(view(startConversation(SCRIPTS.golems, s)).text, /red line/);
  assert.match(through(startConversation(SCRIPTS.redCrack, s)), /back way is open/);
  assert.equal(pastGolems(s.flags), true);
  assert.ok(!activeObjects(deep, s.flags).some(o => o.id === "redCrack"));
});

test("Snik's kobold tunnel, from his old mine on the pass, comes out past the golems", () => {
  const s = { hero: hero(), flags: { ...PLEDGED, refugeesHelped: true } };
  const c = startConversation(SCRIPTS.mineMouth, s);
  pick(c, "Into the dragon's mountain");
  const [e] = takeEvents(c);
  assert.deepEqual([e.type, e.map, e.at], ["travel", "emberdeep", { x: 36, y: 15 }]);
  assert.equal(pastGolems(s.flags), true);
  assert.deepEqual(labels(startConversation(SCRIPTS.mineMouth, { hero: hero(), flags: { refugeesHelped: true, rockslideOpen: true } })), ["Lead on, Snik.", "Not now."]);
});

test("the lost forge: find it cold, tell Brannoc at the keep, and he moves in (a camp)", () => {
  const s = { hero: hero(), flags: { ...PLEDGED, golemsBeaten: true } };
  assert.match(through(startConversation(SCRIPTS.lostForge, s)), /lost forge, cold and black/);
  assert.equal(s.flags.lostForgeFound, true);
  const c = startConversation(SCRIPTS.keepForge, s);
  pick(c, "Tell him about the lost forge");
  assert.match(view(c).text, /I'll pack/);
  assert.equal(s.flags.brannocAtForge, true);
  assert.ok(!activeObjects(keep, s.flags).some(o => o.id === "keepBrannoc"));
  assert.ok(activeObjects(deep, s.flags).some(o => o.id === "brannocDeep"));
  assert.equal(travelPoints({ ...s.flags, seenLostForge: true }).find(p => p.id === "lostForge").found, true);
});

test("the Wardenblade's final form: by the charm's light (or a twin reading), one more rune slot and half fire; Brannoc pledges", () => {
  const h = hero("megan"), s = { hero: h, flags: { ...PLEDGED, lostForgeFound: true, brannocAtForge: true } };
  learnRune(h, "runeStrike");
  h.bladeForm = 2;
  const slots = runeSlots(h);
  let c = startConversation(SCRIPTS.lostForge, s);
  pick(c, "Reforge the Wardenblade");
  assert.match(view(c).text, /can't read them in this murk/);
  h.inventory.push(makeItem("twinCharm"));
  c = startConversation(SCRIPTS.lostForge, s);
  pick(c, "Reforge the Wardenblade");
  assert.match(through(c), /charm.*FINAL FORM.*BRANNOC PLEDGES/s);
  assert.equal(h.bladeForm, 3);
  assert.equal(runeSlots(h), slots + 1);
  assert.equal(s.flags.brannocPledged, true);
  assert.ok(activeObjects(keep, s.flags).some(o => o.id === "bannerBrannoc"));
  assert.deepEqual(labels(startConversation(SCRIPTS.lostForge, s)), ["Let's see the forge", "Goodbye."]);
  assert.equal(fireproof(createBattle(h, ["fireGiant"], seededRng(1))), true);
  assert.equal(deserialize(serialize({ hero: h, flags: s.flags, map: "emberdeep", pos: { x: 7, y: 14 } })).hero.bladeForm, 3);
  const twin = { hero: hero("claire"), flags: { ...s.flags } };
  twin.hero.bladeForm = 2;
  c = startConversation(SCRIPTS.lostForge, twin);
  pick(c, "Reforge the Wardenblade");
  assert.match(view(c).text, /Claire reads them out/);
});

test("the hoard's guards, and its doors: sealed until the final form; opening them ends quest 12, paid once", () => {
  const h = hero(), s = { hero: h, flags: { ...PLEDGED, golemsBeaten: true } };
  const g = startConversation(SCRIPTS.hoardGuards, s);
  pick(g, "Fight");
  assert.deepEqual(takeEvents(g)[0].foes, HOARD_GUARDS);
  assert.match(through(startConversation(SCRIPTS.hoardDoor, s)), /Something the blade needs is missing/);
  assert.equal(s.flags.q12Done, undefined);
  h.bladeForm = 3;
  const gold = h.gold;
  assert.match(through(startConversation(SCRIPTS.hoardDoor, s)), /every Warden rune on them lights.*QUEST COMPLETE: The Emberdeep/s);
  assert.equal(h.gold, gold + Q12_REWARD.gold);
  assert.match(through(startConversation(SCRIPTS.hoardDoor, s)), /breathing/);
  assert.equal(h.gold, gold + Q12_REWARD.gold);
});

test("quest 12 in the log and on the HUD, step by step", () => {
  const story = { kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true,
    fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, varricDefeated: true, heardTremor: true,
    metRachel: true, rockslideOpen: true, metColleen: true, waystoneIron: true, waystoneCall: true, bindingRecovered: true, wardensRoad: true,
    kingDefeated: true, keepHome: true, raeHeard: true, gatehouseOpen: true, runeDoor1: true, runeDoor2: true, runeDoor3: true, thorneDefeated: true,
    gatehouseDone: true, ...PLEDGED };
  const steps = [
    [{}, "Find the Emberdeep's gate, at the top of the aeries"],
    [{ seenTunnels: true }, "Get past the golem hall in the Emberdeep (or find a way round)"],
    [{ redTunnel: true }, "Find the Wardens' lost forge, in the Emberdeep"],
    [{ lostForgeFound: true }, "Tell Brannoc at the keep about the lost forge"],
    [{ brannocAtForge: true }, "Have Brannoc finish the Wardenblade at the lost forge"],
    [{ bladeFinalForm: true }, "Beat the hoard's guards, at the top of the Emberdeep"],
    [{ hoardGuardsBeaten: true }, "Open the hoard's doors"],
    [{ q12Done: true }, "Go through the hoard's doors, and face the Great One"],
  ];
  let flags = { ...story };
  for (const [more, line] of steps) { flags = { ...flags, ...more }; assert.equal(objective(flags), line); }
  assert.equal(questLog(flags).find(q => q.id === "emberdeep").done, true);
  assert.equal(questLog({ q10Done: true }).some(q => q.id === "emberdeep"), false);
});
