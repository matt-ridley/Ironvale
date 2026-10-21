import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable } from "../src/world/map.js";
import { rollEncounter } from "../src/world/encounters.js";
import { feetAt } from "../src/world/movement.js";
import { safePlace, travelPoints, hubById, canFastTravel } from "../src/world/travel.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { createCharacter } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { makeItem } from "../src/rules/items.js";
import { state, faint } from "../src/state/game.js";

const keep = MAPS.keep, fen = MAPS.ironvale;
const ACT2 = { kingDefeated: true, kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true,
  seenFen: true, fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true,
  varricDefeated: true, seenCourtyard: true };
const at = (x, y, flags) => ({ map: "keep", pos: feetAt(x, y), flags });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));

test("the keep becomes a hub once the Signet is back: safe in every room, and a place to fast-travel to", () => {
  assert.equal(safePlace(at(5, 20, ACT2)), null); // the chapel, while the dead still walk
  assert.ok(!travelPoints(ACT2).find(p => p.id === "keep").found);
  const home = { ...ACT2, signetReturned: true };
  for (const [x, y] of [[19, 29], [5, 20], [33, 20], [19, 3]]) assert.equal(safePlace(at(x, y, home))?.id, "keep", `${x},${y}`);
  assert.ok(canFastTravel(at(5, 20, home)));
  assert.ok(travelPoints(home).find(p => p.id === "keep").found);
  assert.equal(safePlace({ map: "ironvale", pos: feetAt(31, 30), flags: home }), null); // not the grounds outside
  assert.equal(hubById("keep").innCost, 0);
  assert.ok(rollEncounter("chapel", "flagstone", 99, () => 0)); // the zones still have monsters...
  assert.equal(rollEncounter("chapel", "flagstone", 99, () => 0, { safe: true }), null); // ...but a safe place stops them
});

test("Hild the steward: a free bed, the companions who wait, and the keep is home", () => {
  assert.ok(!activeObjects(keep, ACT2).some(o => o.id === "hild"));
  const flags = { ...ACT2, signetReturned: true, bladeReforged: true };
  assert.ok(activeObjects(keep, flags).some(o => o.id === "hild"));
  const from = reachable(keep, keep.spawn, flags);
  assert.ok(from.has("17,29") && from.has("22,29"));
  assert.equal(objective(flags), "Go home to Ironvale Keep: Hild is waiting");
  const hero = createCharacter({ name: "Robin", gold: 7 });
  joinParty(hero, "megan");
  hero.hp = 1;
  const s = { hero, flags, pos: feetAt(17, 29) };
  let c = startConversation(SCRIPTS.keepHall, s);
  assert.match(view(c).text, /steward.*Welcome home, Robin/);
  assert.equal(flags.keepHome, true);
  assert.equal(objective(flags), "Hild has news: talk to her again");
  assert.ok(labels(c).includes("Your companions"));
  pick(c, "Sleep in your own bed");
  assert.equal(hero.hp, hero.maxHp);
  assert.equal(hero.gold, 7);
  assert.doesNotMatch(view(c).text, /gold/);
  c = startConversation(SCRIPTS.keepHall, s);
  assert.match(view(c).text, /^Robin, the keep shook last night/); // Act 3 begins
  assert.equal(objective(flags), "Go to the rockslide, north of the keep");
  choose(c, 0);
  assert.match(view(c).text, /^Welcome home, Robin/);
  pick(c, "Your companions");
  pick(c, "Megan: wait here");
  assert.ok(!hero.companion);
  assert.ok(hero.roster.some(r => r.id === "megan"));
});

test("Brannoc moves his forge into the keep once he's reforged the blade", () => {
  const before = { ...ACT2, signetReturned: true };
  const after = { ...before, bladeReforged: true };
  assert.ok(activeObjects(fen, before).some(o => o.id === "brannocForge"));
  assert.ok(!activeObjects(fen, after).some(o => o.id === "brannocForge"));
  assert.ok(!activeObjects(keep, before).some(o => o.id === "keepBrannoc"));
  assert.ok(activeObjects(keep, after).some(o => o.id === "keepBrannoc"));
  const hero = createCharacter();
  hero.inventory.push(makeItem("brannocTools"));
  const s = { hero, flags: after, pos: feetAt(22, 29) };
  let c = startConversation(SCRIPTS.keepForge, s);
  pick(c, "Let's see the forge");
  assert.deepEqual(takeEvents(c), [{ type: "shop", shop: "forge" }]);
  c = startConversation(SCRIPTS.keepForge, s);
  pick(c, "Give Brannoc his tools");
  assert.equal(hero.equipment.weapon.silvered, true);
});

test("faint after making the keep your last hub, and you wake in the keep", () => {
  state.hero = createCharacter({ gold: 40 });
  state.hero.hp = 0;
  state.lastHub = "keep";
  const r = faint();
  assert.equal(r.hub, "keep");
  assert.equal(state.map, "keep");
  assert.equal(state.hero.hp, state.hero.maxHp);
  assert.equal(hubById("keep").innName, "Ironvale Keep");
});
