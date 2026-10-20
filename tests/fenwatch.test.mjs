import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable, tileAt, zoneAt } from "../src/world/map.js";
import { safePlace, hubById } from "../src/world/travel.js";
import { feetAt } from "../src/world/movement.js";
import { state, newGame, faint } from "../src/state/game.js";
import { SCRIPTS, sideObjective, GRAVES_FIGHT } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { BOUNTIES, currentBounty, takeBounty, claimBounty, dropBounty, bountyLine } from "../src/story/bounties.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { createCharacter, armourClass } from "../src/rules/character.js";
import { makeItem, upgradeItem, upgradeCost, useItem } from "../src/rules/items.js";
import { buyItem } from "../src/rules/gear.js";
import { SHOPS, ITEMS } from "../src/data/items.js";
import { COMPANIONS, joinParty, companionStats, tacticsFor } from "../src/rules/party.js";
import { serialize, deserialize } from "../src/state/save.js";
import { faces } from "./helpers.mjs";

const fen = MAPS.ironvale;
const fresh = (flags = {}) => ({ hero: createCharacter({ name: "Robin" }), flags: { ...flags }, bestiary: {}, pos: feetAt(54, 50) });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));

test("Fenwatch is the Act 2 hub: safe, open, with the forge, herbalist, bank and tavern doors all reachable", () => {
  assert.equal(safePlace({ map: "ironvale", pos: feetAt(54, 50) })?.id, "fenwatch");
  assert.equal(safePlace({ map: "duck", pos: feetAt(6, 5) })?.id, "fenwatch");
  assert.equal(zoneAt(fen, 54, 50).safe, true);
  const from = reachable(fen, fen.spawn, {});
  const doorFront = place => { // the tile in front of the (one) door with this place on the map
    for (let y = 0; y < fen.height; y++) for (let x = 0; x < fen.width; x++) if (tileAt(fen, x, y).place === place) return `${x},${y + 1}`;
    return null;
  };
  for (const place of ["forge", "herbalist", "bank"]) assert.ok(from.has(doorFront(place)), `can't reach the ${place}`);
  assert.ok(from.has(`${fen.doors[0].x},${fen.doors[0].y + 1}`), "can't reach the tavern door");
});

test("the Drowned Duck: Gully lets a bed for 25 gold, and fainting in Act 2 wakes you there", () => {
  assert.equal(hubById("fenwatch").innCost, 25);
  const s = fresh();
  s.hero.gold = 30; s.hero.hp = 1;
  const c = startConversation(SCRIPTS.duck, s);
  assert.equal(view(c).speaker, "GULLY");
  pick(c, "Stay the night (25 gold)");
  assert.equal(s.hero.gold, 5);
  assert.equal(s.hero.hp, s.hero.maxHp);
  newGame();
  state.lastHub = "fenwatch";
  assert.equal(faint().hub, "fenwatch");
  assert.equal(state.map, "duck");
});

test("Brannoc's forge goes to +5; Oakhollow's blacksmith still stops at +3", () => {
  const c = createCharacter();
  c.gold = 10000;
  const sword = c.equipment.weapon;
  for (let i = 0; i < 3; i++) assert.equal(upgradeItem(c, sword.uid).ok, true);
  assert.match(upgradeItem(c, sword.uid).reason, /can't be improved further here/);
  assert.equal(upgradeCost(sword, SHOPS.forge.maxUpgrade), 200);
  assert.equal(upgradeItem(c, sword.uid, SHOPS.forge.maxUpgrade).ok, true);
  assert.equal(upgradeItem(c, sword.uid, SHOPS.forge.maxUpgrade).ok, true);
  assert.equal(sword.upgrade, 5);
  assert.equal(upgradeItem(c, sword.uid, SHOPS.forge.maxUpgrade).ok, false);
});

test("the forge sells splint and plate; the herbalist sells Greater Healing", () => {
  const c = createCharacter({ gold: 2000 });
  assert.equal(buyItem(c, "plate", SHOPS.forge.stock).ok, true);
  const before = armourClass(c);
  c.equipment.armour = c.inventory.find(i => i.base === "plate");
  assert.equal(armourClass(c), before + 2); // 18 vs chain mail's 16
  assert.equal(ITEMS.splint.baseAc, 17);
  assert.ok(SHOPS.herbalist.stock.includes("potionGreaterHealing"));
  c.hp = 1; c.maxHp = 50;
  c.inventory.push(makeItem("potionGreaterHealing"));
  const r = useItem(c, c.inventory.at(-1).uid, faces("4/4", "4/4", "4/4", "4/4"));
  assert.equal(r.healed, 20);
});

test("Brannoc moves from Oakhollow to his forge in Fenwatch when you first get there", () => {
  const free = { brannocFreed: true };
  assert.ok(activeObjects(MAPS.overworld, free).some(o => o.id === "brannoc"));
  assert.ok(!activeObjects(MAPS.overworld, { ...free, seenFenwatch: true }).some(o => o.id === "brannoc"));
  assert.ok(activeObjects(fen, free).some(o => o.id === "brannocForge"));
  const c = startConversation(SCRIPTS.brannocForge, fresh(free));
  choose(c);
  assert.match(view(c).text, /The Wardens' mark/);
});

test("bounties: take one, beat the monsters, claim the reward, and take it again", () => {
  const s = fresh();
  s.bestiary = { ghoul: { seen: 3, beaten: 3 } };
  assert.equal(takeBounty(s, "ghouls").ok, true);
  assert.match(takeBounty(s, "frogs").reason, /Finish the hunt/);
  assert.deepEqual(currentBounty(s), { bounty: BOUNTIES.find(b => b.id === "ghouls"), done: 0, finished: false }); // earlier kills don't count
  s.bestiary.ghoul.beaten = 5;
  assert.equal(bountyLine(s), "Bounty: 2/4 Ghouls");
  assert.equal(claimBounty(s).ok, false);
  s.bestiary.ghoul.beaten = 9;
  assert.equal(currentBounty(s).done, 4);
  const gold = s.hero.gold;
  assert.equal(claimBounty(s, () => 0.5).ok, true);
  assert.equal(s.hero.gold, gold + 300);
  assert.equal(s.bounty, undefined);
  assert.equal(takeBounty(s, "ghouls").ok, true); // again
  dropBounty(s);
  assert.equal(currentBounty(s), null);
});

test("the bounty board in the tavern, and a hunt on the HUD and in the save", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.bounties, s);
  assert.deepEqual(labels(c), ["Frogs x6", "Lizardfolk x5", "Ghouls x4", "Wisps x2", "Leave it"]);
  pick(c, "Wisps x2");
  assert.equal(s.bounty.id, "wisps");
  assert.equal(sideObjective(s.flags, s), "Bounty: 0/2 Will-o'-Wisps");
  s.bestiary = { willOWisp: { seen: 2, beaten: 2 } };
  assert.match(sideObjective(s.flags, s), /claim it at the Drowned Duck/);
  const claim = startConversation(SCRIPTS.bounties, s, { rng: () => 0.5 });
  assert.match(view(claim).text, /Lights over the water: done/);
  // Saved, and unknown hunts dropped.
  const save = { hero: s.hero, map: "duck", pos: feetAt(6, 5), facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "fenwatch", bounty: { id: "frogs", start: 2 } };
  assert.deepEqual(deserialize(serialize(save)).bounty, { id: "frogs", start: 2 });
  save.bounty = { id: "dragons", start: 0 };
  assert.equal("bounty" in deserialize(serialize(save)), false);
});

test("The Restless Dead: Robyn's quest, the graves' ghouls, and Robyn joining", () => {
  const s = fresh({ seenFen: true });
  joinParty(s.hero, "megan");
  const hello = startConversation(SCRIPTS.robyn, s);
  assert.match(view(hello).text, /graves keep giving up ghouls/);
  pick(hello, "I'll lay them to rest.");
  assert.equal(s.flags.robynQuest, true);
  assert.equal(sideObjective(s.flags, s), "Lay the restless graves in the fen to rest");
  const cairn = startConversation(SCRIPTS.cairn, s);
  pick(cairn, "Fight!");
  assert.deepEqual(takeEvents(cairn), [{ type: "battle", foes: GRAVES_FIGHT, zone: "fen", afterWin: "gravesRest" }]);
  startConversation(SCRIPTS.gravesRest, s);
  assert.equal(s.flags.gravesAtRest, true);
  assert.equal(startConversation(SCRIPTS.cairn, s).node, "quiet");
  const thanks = startConversation(SCRIPTS.robyn, s);
  assert.match(view(thanks).text, /something's calling the dead/);
  pick(thanks, "Yes, join me.");
  choose(thanks);
  assert.match(view(thanks).text, /Robyn joined your party! Megan will wait for you at an inn/);
  assert.equal(s.hero.companion.id, "robyn");
  assert.deepEqual(s.hero.roster.map(r => r.id), ["megan"]);
  assert.ok(!activeObjects(fen, s.flags).some(o => o.id === "robyn"));
  assert.ok(questLog(s.flags).find(q => q.id === "robyn").done);
});

test("Robyn is a cleric: Sacred Flame, healing and Bless, all three tactics, and a sling", () => {
  assert.deepEqual(COMPANIONS.robyn.casting.spells, ["sacredFlame", "cureWounds", "healingWord", "bless"]);
  assert.deepEqual(tacticsFor("robyn"), ["attack", "heal", "save"]);
  const h = createCharacter();
  joinParty(h, "robyn");
  const r = companionStats(h);
  assert.equal(r.attack.name, "Sling");
  assert.ok(r.casting);
  // Saved with her slots, and on the roster too.
  h.companion.slotsUsed = [1];
  const save = { hero: h, map: "ironvale", pos: feetAt(54, 50), facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "fenwatch" };
  assert.deepEqual(deserialize(serialize(save)).hero.companion.slotsUsed, [1]);
});
