// Quest 6, the Scholar at the Rockslide: Hild's news, Rachel, the rune-stones and the rockslide opening; Rachel's
// mechanics (her spellbook, Arcane Recovery, Quill's flyby and scouting, reading the Warden carvings); the pass and its ice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable, reachableSliding, slide, tileAt } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { safePlace, regionOpen, REGIONS } from "../src/world/travel.js";
import { rollEncounter } from "../src/world/encounters.js";
import { SCRIPTS, objective, questsDone } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { stonesFound, secretsOn, ROCKSLIDE_REWARD } from "../src/story/act3.js";
import { createCharacter, gainXp, rest, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty, companionStats, copySpell, cantCopy, arcaneRecovery, knownSpells } from "../src/rules/party.js";
import { makeItem } from "../src/rules/items.js";
import { createBattle, playerAction, isPlayerTurn } from "../src/rules/combat.js";
import { allyTurn, quillFlyby, canFlyby } from "../src/rules/tactics.js";
import { attackMods, hasCondition } from "../src/rules/conditions.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";

const fen = MAPS.ironvale, pass = MAPS.pass;
const ACT3 = { kingDefeated: true, kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true,
  seenFen: true, fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true,
  varricDefeated: true, signetReturned: true, bladeReforged: true, keepHome: true };
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const talkThrough = c => { while (view(c) && view(c).choices.length === 1) choose(c, 0); };
const hero9 = () => { const h = createCharacter({ name: "Robin" }); gainXp(h, XP_FOR_LEVEL[9], () => 0.5); h.asi = 0; return h; };
const obj = (map, id) => map.objects.find(o => o.id === id);

test("Rachel camps below the rockslide once the keep is home, and the rune-stones lie on the keep's grounds", () => {
  const ids = flags => activeObjects(fen, flags).map(o => o.id);
  assert.ok(!ids({ ...ACT3, keepHome: false }).includes("rachel"));
  for (const id of ["rachel", "rachelTent", "runeStone1", "runeStone2", "runeStone3"]) assert.ok(ids(ACT3).includes(id), id);
  const from = reachable(fen, fen.spawn, ACT3);
  for (const id of ["rachel", "runeStone1", "runeStone2", "runeStone3", "rockslideFire"]) {
    const o = obj(fen, id);
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`)), `${id} can't be reached`);
  }
  assert.equal(safePlace({ map: "ironvale", pos: feetAt(30, 10), flags: ACT3 })?.id, "rockslide"); // a camp
  assert.ok(!from.has("31,5")); // the rockslide blocks the road
});

test("quest 6: Hild's news, Rachel, three rune-stones, then the blade against the rune opens the pass and she joins", () => {
  const hero = hero9(), flags = { ...ACT3 };
  joinParty(hero, "megan");
  const s = { hero, flags, map: "ironvale", pos: feetAt(31, 9) };
  assert.equal(objective(flags), "Hild has news: talk to her again");
  const q = () => questLog(flags).find(x => x.id === "rockslide");
  assert.ok(q());
  let c = startConversation(SCRIPTS.keepHall, s);
  assert.match(view(c).text, /keep shook last night/);
  assert.equal(flags.heardTremor, true);
  assert.equal(objective(flags), "Go to the rockslide, north of the keep");

  c = startConversation(SCRIPTS.rachel, s);
  assert.match(view(c).text, /Rachel/);
  choose(c, 0);
  pick(c, "Who would do that?");
  talkThrough(c);
  assert.equal(flags.metRachel, true);
  assert.equal(objective(flags), "Find the rune-stones near the keep (0/3)");
  assert.match(view(startConversation(SCRIPTS.rachel, s)).text, /0 of the three/);

  for (const [i, id] of ["runeStone1", "runeStone2", "runeStone3"].entries()) {
    c = startConversation(SCRIPTS.runeStone, s, { object: obj(fen, id) });
    assert.match(view(c).text, new RegExp(`${i + 1} of 3`));
  }
  assert.equal(stonesFound(flags), 3);
  assert.equal(objective(flags), "Take the rune-stones to Rachel");
  const xp = hero.xp, gold = hero.gold, done = questsDone(flags);
  c = startConversation(SCRIPTS.rachel, s);
  pick(c, "Lay the Wardenblade against the rune");
  assert.equal(flags.rockslideOpen, true);
  assert.equal(hero.xp, xp + ROCKSLIDE_REWARD.xp);
  assert.equal(hero.gold, gold + ROCKSLIDE_REWARD.gold);
  assert.equal(questsDone(flags), done + 1);
  talkThrough(c);
  assert.equal(hero.companion.id, "rachel");
  assert.deepEqual(hero.roster.map(r => r.id), ["megan"]);
  assert.equal(flags.rachelJoined, true);
  assert.ok(q().done);
  assert.equal(objective(flags), "Climb the pass to the first waystone");
  // The road is open, and leads up into the pass.
  assert.ok(!activeObjects(fen, flags).some(o => o.id === "rockslide" || o.id === "rachel"));
  assert.ok(reachable(fen, fen.spawn, flags).has("31,5"));
  assert.equal(fen.exits.find(e => e.x === 31 && e.y === 5).to, "pass");
});

test("the pass: a region of its own, reached up the road, with its exits back down", () => {
  const region = REGIONS.find(r => r.id === "pass");
  assert.equal(regionOpen(region, {}), false);
  assert.equal(regionOpen(region, { seenSlopes: true }), true);
  const exit = pass.exits[0];
  assert.equal(exit.to, "ironvale");
  assert.ok(reachable(pass, pass.spawn).has(`${exit.x},${exit.y}`));
  assert.equal(rollEncounter("slopes", "ice", 99, () => 0), null); // no fights on the ice
});

test("the ice: you slide until you hit something, and the only way north is to slide the right way", () => {
  assert.equal(tileAt(pass, 18, 42).ice, true);
  assert.deepEqual(slide(pass, { x: 18, y: 45 }, "up"), { x: 18, y: 39 }); // up to the rocks along the top
  assert.deepEqual(slide(pass, { x: 18, y: 39 }, "right"), { x: 24, y: 39 }); // along to the rock by the gap
  assert.deepEqual(slide(pass, { x: 24, y: 39 }, "up"), { x: 24, y: 38 }); // through the gap, off the ice
  assert.deepEqual(slide(pass, { x: 24, y: 45 }, "up"), { x: 24, y: 43 }); // straight up the middle doesn't work
  const from = reachableSliding(pass, pass.spawn);
  for (const [x, y, what] of [[24, 37], [24, 5], [5, 18], [40, 17], [40, 32]].map(([x, y], i) => [x, y, ["north of the ice", "the gatehouse door", "the watchtower", "Thorne's camp", "the chapel"][i]])) {
    assert.ok(from.has(`${x},${y}`), `${what} can't be reached`);
  }
  // Nowhere on the ice leaves you stuck.
  for (const k of from) {
    const [x, y] = k.split(",").map(Number);
    if (!tileAt(pass, x, y).ice) continue;
    assert.ok([...reachableSliding(pass, { x, y })].some(q => { const [a, b] = q.split(",").map(Number); return !tileAt(pass, a, b).ice; }), `stuck at ${k}`);
  }
});

test("Rachel copies scrolls into her book for good: the scroll is used up, and the ink costs 50 gold a spell level", () => {
  const hero = hero9();
  joinParty(hero, "rachel");
  hero.gold = 120;
  const fire = makeItem("scrollFireball"), mist = makeItem("scrollMistyStep"), cure = makeItem("scrollCureWounds");
  hero.inventory.push(fire, mist, cure);
  assert.match(cantCopy(hero, fire), /150 gold/);
  assert.match(cantCopy(hero, cure), /isn't a wizard's spell/);
  assert.equal(copySpell(hero, mist.uid).cost, 100);
  assert.equal(hero.gold, 20);
  assert.ok(!hero.inventory.includes(mist));
  assert.ok(knownSpells(hero.companion).includes("mistyStep"));
  assert.ok(companionStats(hero).casting.spells.includes("mistyStep"));
  hero.inventory.push(makeItem("scrollMistyStep"));
  hero.gold = 500;
  assert.match(cantCopy(hero, hero.inventory.at(-1)), /already knows/);
  const back = deserialize(serialize({ hero, map: "keep", pos: feetAt(19, 29), flags: {}, facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" }));
  assert.ok(back.hero.companion.spells.includes("mistyStep"));
  const megan = hero9();
  joinParty(megan, "megan");
  megan.inventory.push(makeItem("scrollSleep"));
  assert.match(cantCopy(megan, megan.inventory.at(-1)), /Only a wizard/);
});

test("Arcane Recovery: once between long rests, a short rest brings back slots worth half her level", () => {
  const hero = hero9();
  joinParty(hero, "rachel");
  hero.companion.slotsUsed = [2, 1, 1, 0, 1];
  assert.equal(arcaneRecovery(hero), 1); // level 9: 5 levels' worth, so the 5th-level slot
  assert.deepEqual(hero.companion.slotsUsed, [2, 1, 1, 0, 0]);
  assert.equal(arcaneRecovery(hero), 0); // once
  rest(hero);
  hero.companion.slotsUsed = [3, 2, 0];
  assert.equal(arcaneRecovery(hero), 3); // 2 + 2 + 1
  assert.deepEqual(hero.companion.slotsUsed, [2, 0, 0]);
  const robyn = hero9();
  joinParty(robyn, "robyn");
  robyn.companion.slotsUsed = [2];
  assert.equal(arcaneRecovery(robyn), 0); // only wizards
});

test("the campfire: Rachel's Arcane Recovery, and sending Quill to scout marks this map's secrets", () => {
  const hero = hero9();
  joinParty(hero, "rachel");
  hero.companion.slotsUsed = [1];
  const flags = { ...ACT3, rachelJoined: true };
  const s = { hero, flags, map: "ironvale", pos: feetAt(30, 10) };
  let c = startConversation(SCRIPTS.campfire, s, { object: obj(fen, "rockslideFire") });
  pick(c, "Rest by the fire (short rest)");
  assert.match(view(c).text, /Arcane Recovery: 1 spell slot back/);
  const before = secretsOn(fen, flags).length;
  assert.ok(before > 0);
  c = startConversation(SCRIPTS.campfire, s, { object: obj(fen, "rockslideFire") });
  pick(c, "Send Quill to scout");
  assert.equal(flags.scouted_ironvale, true);
  assert.match(view(c).text, /chest/);
  const robyn = hero9();
  joinParty(robyn, "robyn");
  assert.ok(!labels(startConversation(SCRIPTS.campfire, { hero: robyn, flags, map: "ironvale" })).includes("Send Quill to scout"));
});

test("Quill's flyby: once a fight, your next attack has advantage, and it doesn't use up Rachel's turn", () => {
  const hero = hero9();
  joinParty(hero, "rachel");
  const rng = seededRng(3);
  const b = createBattle(hero, ["giantRat"], rng);
  b.monsters[0].hp = b.monsters[0].maxHp = 999;
  assert.ok(canFlyby(b));
  assert.equal(quillFlyby(b).ok, true);
  assert.ok(hasCondition(b, "player", "helped"));
  assert.equal(attackMods(b, "player", 0).advantage, true);
  assert.ok(!hasCondition(b, "player", "helped")); // used up by the attack
  assert.match(quillFlyby(b).reason, /already/);
  // By herself, Rachel sends Quill on her first turn.
  const b2 = createBattle(hero, ["giantRat"], rng);
  b2.state = "active";
  allyTurn(b2, rng);
  assert.ok(b2.log.some(e => e.type === "flyby"));
  const robyn = hero9();
  joinParty(robyn, "robyn");
  assert.equal(canFlyby(createBattle(robyn, ["giantRat"], rng)), false);
});

test("Warden carvings: worn runes without Rachel; with her, lore and a cache, found once", () => {
  const hero = hero9(), flags = { ...ACT3 };
  const s = { hero, flags, map: "keep" };
  const carving = obj(MAPS.keep, "keepCarving");
  assert.match(view(startConversation(SCRIPTS.carving, s, { object: carving })).text, /can't read/);
  joinParty(hero, "rachel");
  flags.rachelJoined = true;
  const gold = hero.gold;
  const c = startConversation(SCRIPTS.carving, s, { object: carving });
  assert.equal(view(c).speaker, "RACHEL");
  choose(c, 0);
  assert.match(view(c).text, /150 gold/);
  assert.equal(hero.gold, gold + 150);
  assert.match(view(startConversation(SCRIPTS.carving, s, { object: carving })).text, /already found/);
  assert.equal(hero.gold, gold + 150);
  // There's one on every old map.
  for (const m of ["overworld", "deepCave", "keep", "ironvale", "pass"]) assert.ok(MAPS[m].objects.some(o => o.script === "carving"), m);
});
