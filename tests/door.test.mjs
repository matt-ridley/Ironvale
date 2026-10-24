// Act 4, quest 9: Through the Door. Hild's news, opening the Door, the Emberreach's south (the Threshold, the ash
// road, the gorge, the wildwood's edge), its monsters, the kobold warband and the wolves, and Pip stowing away.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, objectAt, isWalkable, exitAt, zoneAt, reachable, tileAt } from "../src/world/map.js";
import { REGIONS, regionOpen, travelPoints, safePlace } from "../src/world/travel.js";
import { ENCOUNTERS } from "../src/world/encounters.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { zoneEvent } from "../src/story/act3.js";
import { act4Event, Q9_REWARD } from "../src/story/act4.js";
import { createCharacter, gainXp, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { adjustDamage, spawnMonster } from "../src/rules/combat.js";
import { feetAt } from "../src/world/movement.js";
import { TRACKS } from "../src/audio/tracks.js";
import { simulate } from "../tools/simulate.mjs";

const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const ACT3_DONE = { kingDefeated: true, signetReturned: true, bladeReforged: true, keepHome: true, rachelJoined: true, raeHeard: true,
  gatehouseOpen: true, runeDoor1: true, runeDoor2: true, runeDoor3: true, thorneDefeated: true, gatehouseDone: true, oathSworn: true, oath: "iron", act3Complete: true };
const hero = (companion = null) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[13], () => 0.5); h.asi = 0;
  if (companion) joinParty(h, companion);
  return h;
};
const at = (state, map, x, y) => ({ ...state, map, pos: feetAt(x, y) });
const beyond = MAPS.beyond, gatehouse = MAPS.gatehouse;
const near = (map, flags, x, y) => { // a tile next to (x, y) you can walk to from the map's spawn
  const from = reachable(map, map.spawn, flags);
  return [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${x + dx},${y + dy}`));
};

test("back at the keep after Act 3, Hild has news (after Rachel's, if she missed the Door)", () => {
  const s = { hero: hero(), flags: { ...ACT3_DONE } };
  assert.equal(zoneEvent(s, "courtyard"), null);
  assert.deepEqual(act4Event(s, "courtyard"), { script: "doorNews" });
  const c = startConversation(SCRIPTS.doorNews, s);
  assert.match(through(c), /glows at night.*kobolds.*Rachel's been through every book/s);
  assert.equal(s.flags.q9Started, true);
  assert.equal(act4Event(s, "courtyard"), null);
  const withRachel = { hero: hero("rachel"), flags: { ...ACT3_DONE } };
  assert.match(through(startConversation(SCRIPTS.doorNews, withRachel)), /The Door answers a Warden.*She's on the other side/s);
  // Rachel's own news comes first if she wasn't at the Door.
  const missed = { hero: hero(), flags: { ...ACT3_DONE, raeHeard: false } };
  assert.deepEqual(zoneEvent(missed, "courtyard"), { script: "raeNews" });
  assert.equal(act4Event({ hero: hero(), flags: { ...ACT3_DONE, act3Complete: false } }, "courtyard"), null);
});

test("the Door opens for the Wardenblade, and then it's a way through", () => {
  const flags = { ...ACT3_DONE }, s = { hero: hero(), flags };
  assert.ok(objectAt(gatehouse, 20, 1, flags), "the Door blocks the way while it's shut");
  assert.equal(near(gatehouse, flags, 20, 1), true);
  const c = startConversation(SCRIPTS.greatDoor, s);
  assert.match(view(c).text, /steel-grey.*flicker/);
  assert.deepEqual(labels(c), ["Lay the Wardenblade on it", "Not yet"]);
  pick(c, "Lay the Wardenblade on it");
  assert.match(view(c).text, /swings open/);
  assert.equal(flags.doorOpened, true);
  // Open: the Door's gone from the way, a picture of it open stands there, and walking in takes you beyond.
  assert.equal(objectAt(gatehouse, 20, 1, flags), null);
  assert.ok(activeObjects(gatehouse, flags).some(o => o.id === "greatDoorOpen" && o.walkable));
  assert.ok(reachable(gatehouse, gatehouse.spawn, flags).has("20,1"));
  const exit = exitAt(gatehouse, 20, 1);
  assert.equal(exit.to, "beyond");
  assert.ok(isWalkable(beyond, exit.at.x, exit.at.y));
  assert.equal(zoneAt(beyond, exit.at.x, exit.at.y).id, "threshold");
  // And back: the far side of the Door leads into the gatehouse, in front of it.
  const back = beyond.exits[0];
  assert.ok(reachable(beyond, beyond.spawn, flags).has(`${back.x},${back.y}`));
  assert.equal(back.to, "gatehouse");
  assert.ok(isWalkable(gatehouse, back.at.x, back.at.y, flags));
  assert.match(view(startConversation(SCRIPTS.greatDoor, s)).text, /whole again|steel-grey/); // nothing more to do there
});

test("the Emberreach: new ground, its own music, a region on the world map, and a camp each side of the Door", () => {
  for (const name of ["ash", "cinders", "obsidian", "lava", "burnttree", "wildtree"]) {
    assert.ok(beyond.rows.some((row, y) => [...row].some((_, x) => tileAt(beyond, x, y).name === name)), `${name} is used`);
  }
  assert.equal(tileAt(beyond, 30, 13).name, "lava");
  assert.equal(isWalkable(beyond, 30, 13), false);
  assert.ok(TRACKS.emberreach);
  for (const z of beyond.zones) assert.ok(["emberreach", "wildwood"].includes(z.music), z.id);
  assert.ok(TRACKS.wildwood);
  const region = REGIONS.find(r => r.id === "beyond");
  assert.equal(regionOpen(region, { act3Complete: true }), false);
  assert.equal(regionOpen(region, { seenThreshold: true }), true);
  assert.match(region.hint({ act3Complete: true }), /Rachel's name/);
  const found = id => travelPoints({ ...ACT3_DONE, seenDoor: true, seenThreshold: true, doorOpened: true }).find(p => p.id === id).found;
  assert.equal(found("doorCamp"), true);
  assert.equal(found("threshold"), true);
  assert.equal(travelPoints({ seenThreshold: true }).find(p => p.id === "threshold").found, false); // not before the Door's open
  const s = at({ hero: hero(), flags: { doorOpened: true } }, "beyond", 32, 31);
  assert.equal(safePlace(s)?.id, "threshold");
  assert.equal(safePlace(at(s, "beyond", 40, 20)), null);
});

test("past the Threshold only the road goes west, and the kobold warband stands on it", () => {
  const flags = { ...ACT3_DONE, doorOpened: true };
  const from = reachable(beyond, beyond.spawn, flags);
  assert.ok(near(beyond, flags, 32, 15), "the gorge's lip");
  assert.ok(near(beyond, flags, 24, 20), "the warband");
  assert.equal(from.has("17,21"), false, "the wildwood's edge, past the kobolds");
  assert.equal([...from].some(k => Number(k.split(",")[1]) < 12), false, "nothing past the gorge yet");
  const after = { ...flags, warbandFled: true };
  assert.ok(near(beyond, after, 17, 20), "the grey wolf, once they've gone");
  assert.ok(near(beyond, { ...after, q9Done: true }, 10, 15), "the wolf waiting at the trail");
});

test("through the Door: footprints, and Pip in your pack if he's had his big adventure", () => {
  const s = { hero: hero("rachel"), flags: { ...ACT3_DONE, doorOpened: true, pipRewarded: true } };
  assert.deepEqual(act4Event(s, "threshold"), { script: "throughDoor" });
  assert.equal(act4Event(s, "threshold"), null);
  assert.match(through(startConversation(SCRIPTS.throughDoor, s)), /Threshold.*Claire never wore shoes.*Junior Warden Pip, reporting/s);
  assert.equal(s.flags.pipStowedAway, true);
  assert.ok(activeObjects(beyond, s.flags).some(o => o.id === "pipStowaway"));
  assert.ok(!activeObjects(MAPS.overworld, { ...s.flags, pipFound: true }).some(o => o.id === "pipBack"), "Pip isn't in Oakhollow");
  const alone = { hero: hero(), flags: { ...ACT3_DONE, doorOpened: true } };
  const text = through(startConversation(SCRIPTS.throughDoor, alone));
  assert.match(text, /footprints, small and bare/);
  assert.doesNotMatch(text, /Pip/);
  assert.equal(alone.flags.pipStowedAway, undefined);
});

test("the warband: kobolds for the Great One, then wolves; one carries Pip home", () => {
  const s = { hero: hero("rachel"), flags: { ...ACT3_DONE, doorOpened: true, pipStowedAway: true } };
  const c = startConversation(SCRIPTS.warband, s);
  assert.match(view(c).text, /The Great One is waking/);
  pick(c, "Draw your sword");
  assert.match(through(c), /howl.*Grey wolves.*PUT ME DOWN.*Someone sent them/s);
  assert.equal(s.flags.warbandFled, true);
  assert.equal(s.flags.pipSentHome, true);
  assert.ok(!activeObjects(beyond, s.flags).some(o => o.id.startsWith("warband") || o.id === "pipStowaway"));
  assert.ok(activeObjects(beyond, s.flags).some(o => o.id === "wolfGuide"));
  assert.ok(activeObjects(MAPS.overworld, { ...s.flags, pipFound: true }).some(o => o.id === "pipHomeAgain"));
  assert.match(view(startConversation(SCRIPTS.villager, { hero: hero(), flags: { ...s.flags, pipFound: true, pipRewarded: true } })).text, /WOLF carried me home/);
  const back = { hero: hero(), flags: { ...ACT3_DONE } };
  pick(startConversation(SCRIPTS.warband, back), "Back away");
  assert.equal(back.flags.warbandFled, undefined);
});

test("the grey wolf at the wildwood's edge ends quest 9, and pays once", () => {
  const s = { hero: hero(), flags: { ...ACT3_DONE, doorOpened: true, seenThreshold: true, warbandFled: true } };
  const xp = s.hero.xp, gold = s.hero.gold;
  assert.match(through(startConversation(SCRIPTS.wolfGuide, s)), /follow.*a girl laughs.*QUEST COMPLETE: Through the Door/s);
  assert.equal(s.flags.q9Done, true);
  assert.equal(s.hero.xp, xp + Q9_REWARD.xp);
  assert.equal(s.hero.gold, gold + Q9_REWARD.gold);
  assert.ok(!activeObjects(beyond, s.flags).some(o => o.id === "wolfGuide"));
  assert.ok(activeObjects(beyond, s.flags).some(o => o.id === "wolfWaiting"));
});

test("quest 9 in the log and on the HUD, step by step", () => {
  const steps = [
    [{}, "Go home to Ironvale Keep: Hild has news"],
    [{ q9Started: true }, "Open the Door, at the top of the gatehouse"],
    [{ doorOpened: true }, "Go through the Door"],
    [{ seenThreshold: true }, "Follow the footprints up the ash road"],
    [{ warbandFled: true }, "Follow the grey wolf to the wildwood, west"],
    [{ q9Done: true }, "Follow the grey wolf up the trail, north"],
  ];
  const story = { kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true,
    fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, varricDefeated: true, heardTremor: true,
    metRachel: true, rockslideOpen: true, metColleen: true, waystoneIron: true, waystoneCall: true, bindingRecovered: true, wardensRoad: true, ...ACT3_DONE };
  let flags = { ...story };
  for (const [more, line] of steps) { flags = { ...flags, ...more }; assert.equal(objective(flags), line); }
  const q = questLog(flags).find(x => x.id === "throughTheDoor");
  assert.equal(q.done, true);
  assert.equal(questLog({ ...ACT3_DONE }).find(x => x.id === "throughTheDoor").steps.filter(x => x.done).length, 0);
  assert.equal(questLog({ oathSworn: true }).some(x => x.id === "throughTheDoor"), false);
});

test("the ash road's monsters: fire can't touch them, and a level 13 hero wins", () => {
  for (const id of ["hellHound", "salamander", "fireElemental"]) {
    const m = spawnMonster(id, () => 0.5);
    assert.deepEqual(adjustDamage(m, 20, "fire"), { damage: 0, note: "immune" }, id);
    assert.ok(ENCOUNTERS.ashRoad.table.some(e => e.foes.includes(id)), id);
  }
  assert.equal(adjustDamage(spawnMonster("salamander", () => 0.5), 10, "cold").damage, 20);
  const h = { level: 13, upgrade: 4, potions: 3, greater: 2, weapon: "wardenblade", silvered: true, runes: ["runeStrike", "ironWard"], companion: "rachel" };
  assert.ok(simulate(h, ["salamander", "fireElemental"], { fights: 200 }) > 0.9);
  assert.ok(simulate(h, ["hellHound", "hellHound"], { fights: 200 }) > 0.9);
});
