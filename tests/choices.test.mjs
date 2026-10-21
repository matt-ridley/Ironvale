// Choices come back in Act 3: the goblin refugees (Grub's stall, Snik's shortcut, their village), Mother Sallow (the
// Queen of the Fen and Sallow's Sundries, or her sister Auntie Nettle), the ferryman and the island, monsters that cast
// spells, shops with a markup, and the pass's bounties.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable, reachableSliding } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { zoneEvent, RAIDERS_FIGHT, QUEEN_FIGHT, NETTLE_FIGHT, QUEEN_REWARD, FERRY_COST, nettleHaunting } from "../src/story/act3.js";
import { boardFor, takeBounty } from "../src/story/bounties.js";
import { createCharacter, gainXp, XP_FOR_LEVEL } from "../src/rules/character.js";
import { makeItem } from "../src/rules/items.js";
import { joinParty } from "../src/rules/party.js";
import { createBattle, castMonsterSpell, isPlayerTurn, playerAction } from "../src/rules/combat.js";
import { buyItem, buyPrice } from "../src/rules/gear.js";
import { SHOPS, ITEMS } from "../src/data/items.js";
import { MONSTERS } from "../src/data/monsters.js";
import { seededRng } from "../src/rules/dice.js";

const fen = MAPS.ironvale, pass = MAPS.pass;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const hero = (level = 10) => { const h = createCharacter({ name: "Robin" }); gainXp(h, XP_FOR_LEVEL[level], () => 0.5); h.asi = 0; return h; };
const obj = (map, id) => MAPS[map].objects.find(o => o.id === id);
const talk = (s, map, id) => startConversation(SCRIPTS[obj(map, id).script], s, { object: obj(map, id) });
const ids = (map, flags) => activeObjects(MAPS[map], flags).map(o => o.id);
const ACT2 = { kingDefeated: true, seenFen: true, causewayRaised: true };
const ACT3 = { ...ACT2, signetReturned: true, varricDefeated: true, bladeReforged: true, keepHome: true };

test("the goblin refugees: help them against the lizardfolk and Grub's stall opens; or send them away", () => {
  const flags = { ...ACT2 }, h = hero(6), s = { hero: h, flags };
  let c = talk(s, "ironvale", "snik");
  assert.match(view(c).text, /Don't stab/);
  choose(c, 0);
  pick(c, "I'll deal with the lizardfolk.");
  assert.ok(ids("ironvale", flags).includes("raiders"));
  c = talk(s, "ironvale", "raiders");
  pick(c, "Fight!");
  const fight = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(fight.foes, RAIDERS_FIGHT);
  flags.raidersBeaten = true;
  startConversation(SCRIPTS[fight.afterWin], s);
  assert.equal(flags.refugeesHelped, true);
  assert.ok(ids("ironvale", flags).includes("grub"));
  c = talk(s, "ironvale", "grub");
  pick(c, "Let's see");
  assert.deepEqual(takeEvents(c).find(e => e.type === "shop"), { type: "shop", shop: "goblinTrader" });
  assert.ok(questLog(flags).find(q => q.id === "refugees").done);
  // Turned away instead: no stall, and later no shortcut.
  const cold = { ...ACT2 }, c2 = talk({ hero: hero(6), flags: cold }, "ironvale", "snik");
  choose(c2, 0);
  pick(c2, "You raided Oakhollow. Go away.");
  assert.equal(cold.refugeesRefused, true);
  assert.match(view(talk({ hero: hero(), flags: { ...cold, rockslideOpen: true } }, "pass", "mineMouth")).text, /without a guide/);
  // Everyone at the camp can be reached.
  const from = reachable(fen, fen.spawn, { ...flags, refugeeQuest: true });
  for (const id of ["snik", "grub", "raiders", "refugeeHut", "ferryman"]) {
    const o = obj("ironvale", id);
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`)), id);
  }
});

test("in Act 3, the refugees go home to Goblin Rocks, Grub moves to the keep, and Snik leads you round the ice", () => {
  const flags = { ...ACT3, refugeesHelped: true, rockslideOpen: true }, s = { hero: hero(), flags, map: "pass" };
  assert.ok(!ids("ironvale", flags).includes("snik") && !ids("ironvale", flags).includes("grub"));
  assert.ok(ids("keep", flags).includes("grubKeep"));
  assert.ok(ids("overworld", flags).includes("goblinHome1"));
  assert.ok(ids("pass", flags).includes("snikPass"));
  const c = talk(s, "pass", "mineMouth");
  pick(c, "Lead on, Snik.");
  assert.deepEqual(takeEvents(c).find(e => e.type === "travel"), { type: "travel", map: "pass", at: { x: 4, y: 31 } });
  assert.equal(flags.snikShortcut, true);
  assert.ok(ids("pass", flags).includes("mineCache"));
  // The mine comes out north of the ice, where you can reach the rest of the pass (and the way back down).
  const north = reachableSliding(pass, { x: 4, y: 31 });
  assert.ok(north.has("24,37") && north.has("2,30"));
  const back = talk(s, "pass", "mineExit");
  pick(back, "Go down");
  assert.equal(takeEvents(back).find(e => e.type === "travel").at.y, 53);
});

test("the Queen of the Fen: rising tolls, then Thorne's mirror (or a fight), and Sallow's Sundries at the rockslide", () => {
  const flags = { ...ACT3, sallowBargain: true }, h = hero(), s = { hero: h, flags };
  assert.ok(!ids("ironvale", flags).includes("sallow"));
  assert.ok(ids("ironvale", flags).includes("queenSallow"));
  assert.ok(ids("ironvale", { ...ACT2, sallowBargain: true }).includes("sallow")); // still at her hut in Act 2
  assert.match(zoneEvent(s, "fenwatch").note, /Queen of the Fen/);
  h.gold = 10;
  let c = talk(s, "ironvale", "queenSallow");
  pick(c, "Pay a copper (1 gold)");
  assert.equal(h.gold, 9);
  c = talk(s, "ironvale", "queenSallow");
  pick(c, "Sing (badly)");
  c = talk(s, "ironvale", "queenSallow");
  assert.match(view(c).text, /PRETTY PEBBLE/);
  pick(c, "This has to stop.");
  assert.ok(!labels(c).includes("Give her Thorne's mirror"));
  h.inventory.push(makeItem("thorneMirror"));
  c = talk(s, "ironvale", "queenSallow");
  pick(c, "This has to stop.");
  const xp = h.xp;
  pick(c, "Give her Thorne's mirror");
  assert.equal(flags.queenSettled, true);
  assert.equal(h.xp, xp + QUEEN_REWARD.xp);
  assert.ok(!ids("ironvale", flags).includes("queenSallow"));
  assert.ok(ids("ironvale", flags).includes("sundries"));
  assert.ok(questLog(flags).find(q => q.id === "queen").done);
  // Or fight her.
  const f2 = { ...ACT3, sallowBargain: true, queenTolls: 3 }, c2 = talk({ hero: hero(), flags: f2 }, "ironvale", "queenSallow");
  pick(c2, "This has to stop.");
  pick(c2, "Then I'll make you stop!");
  const fight = takeEvents(c2).find(e => e.type === "battle");
  assert.deepEqual(fight.foes, QUEEN_FIGHT);
  startConversation(SCRIPTS[fight.afterWin], { hero: hero(), flags: f2 });
  assert.equal(f2.queenSettled, true);
});

test("Sallow's Sundries charge hag prices; Grub undercuts everyone", () => {
  const h = hero();
  h.gold = 1000;
  assert.equal(buyPrice("potionGreaterHealing", SHOPS.sundries.markup), Math.round(ITEMS.potionGreaterHealing.cost * 1.5));
  const r = buyItem(h, "potionGreaterHealing", SHOPS.sundries.stock, SHOPS.sundries.markup);
  assert.equal(r.cost, 75);
  assert.equal(h.gold, 925);
  assert.equal(buyItem(h, "potionHealing", SHOPS.goblinTrader.stock, SHOPS.goblinTrader.markup).cost, 16);
  assert.equal(buyItem(h, "potionHealing").cost, ITEMS.potionHealing.cost); // no markup by default
});

test("Auntie Nettle: if you fought Sallow, she spoils rests on the pass until you beat her at her hut", () => {
  const flags = { ...ACT3, sallowDefeated: true }, h = hero(), s = { hero: h, flags, map: "pass" };
  assert.ok(nettleHaunting(s));
  h.hp = 5;
  let c = startConversation(SCRIPTS.campfire, s);
  pick(c, "Rest by the fire (short rest)");
  assert.match(view(c).text, /Not tonight, dearie/);
  assert.equal(h.hp, 5);
  assert.ok(ids("pass", flags).includes("hagHut"));
  // Elsewhere, rests still work.
  const elsewhere = startConversation(SCRIPTS.campfire, { ...s, map: "ironvale" });
  pick(elsewhere, "Rest by the fire (short rest)");
  assert.ok(h.hp > 5);
  c = talk(s, "pass", "hagHut");
  assert.match(view(c).text, /owed me money/);
  pick(c, "You've been spoiling my rest.");
  pick(c, "Fight!");
  const fight = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(fight.foes, NETTLE_FIGHT);
  flags.nettleDefeated = true;
  startConversation(SCRIPTS[fight.afterWin], s);
  assert.ok(!nettleHaunting(s));
  h.hp = 5;
  c = startConversation(SCRIPTS.campfire, s);
  pick(c, "Rest by the fire (short rest)");
  assert.ok(h.hp > 5);
  assert.ok(!nettleHaunting({ hero: h, flags: { ...ACT3, sallowBargain: true } })); // only if you fought her sister
});

test("monsters that cast: a save for damage (halved on a success) and maybe a condition, for both of you", () => {
  assert.ok(MONSTERS.nightHag.spells.length && MONSTERS.crownedSallow.spells.length);
  const h = hero();
  joinParty(h, "megan");
  const rng = seededRng(9), b = createBattle(h, ["nightHag"], rng);
  const start = b.log.length;
  castMonsterSpell(b, 0, { name: "Test Curse", save: "WIS", dc: 99, damage: "10", damageType: "psychic", targets: "all", condition: { id: "frightened", rounds: 2 } }, rng);
  const hits = b.log.slice(start).filter(e => e.type === "monster-spell");
  assert.equal(hits.length, b.ally.hp > 0 || hits.some(e => e.who === "ally") ? 2 : 1);
  assert.ok(hits.every(e => e.damage === 10));
  assert.ok(b.conditions.player?.frightened);
  // A named monster isn't "the" anything, and the hero's WIS save is a plain d20 (no WIS score: it counts as 10).
  assert.match(b.log[start].text, /^Auntie Nettle casts Test Curse!/);
  assert.ok(!b.log.some(e => /NaN/.test(e.text)));
  assert.match(createBattle(hero(), ["troll"], rng).log[0].text, /Troll appears/);
  // Its uses run out.
  const m = b.monsters[0];
  assert.deepEqual(m.spellsLeft, { "Ray of Sickness": 2, Nightmare: 1 });
});

test("Old Vosk the ferryman: hints, and a row out to the island in the south lake and back", () => {
  const flags = { ...ACT3 }, h = hero(), s = { hero: h, flags };
  h.gold = 50;
  const seen = new Set();
  for (let i = 0; i < 4; i++) seen.add(view(talk(s, "ironvale", "ferryman")).text);
  assert.equal(seen.size, 4);
  const c = talk(s, "ironvale", "ferryman");
  pick(c, `Row to the island (${FERRY_COST} gold)`);
  assert.equal(h.gold, 50 - FERRY_COST);
  const trip = takeEvents(c).find(e => e.type === "travel");
  // The island: cut off by deep water, with the punt and the chest.
  const island = reachable(fen, trip.at);
  assert.ok(island.size <= 3);
  assert.ok(!reachable(fen, fen.spawn, { causewayRaised: true }).has(`${trip.at.x},${trip.at.y}`));
  for (const id of ["ferryBack", "islandChest"]) {
    const o = obj("ironvale", id);
    assert.ok([[1, 0], [-1, 0]].some(([dx]) => island.has(`${o.x + dx},${o.y}`)), id);
  }
  const back = talk(s, "ironvale", "ferryBack");
  pick(back, "Back to Fenwatch");
  const home = takeEvents(back).find(e => e.type === "travel");
  assert.ok(reachable(fen, fen.spawn, { causewayRaised: true }).has(`${home.at.x},${home.at.y}`));
});

test("the bounty board: the fen's hunts in Act 2, the pass's in Act 3", () => {
  assert.deepEqual(boardFor(2).map(b => b.id), ["frogs", "lizardfolk", "ghouls", "wisps"]);
  assert.deepEqual(boardFor(3).map(b => b.id), ["griffons", "trolls", "wyverns"]);
  const s = { hero: hero(), flags: { ...ACT3 } };
  const c = startConversation(SCRIPTS.bounties, s);
  assert.deepEqual(labels(c), ["Griffons x4", "Trolls x3", "Wyverns x2", "Leave it"]);
  assert.ok(takeBounty(s, "trolls").ok);
});
