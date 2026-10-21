// Going back to the old places in Act 3: Pip's Big Adventure and the kobolds, his statue, the bard and the plaque,
// Maren's Oath fragments, Old Gnasher, and Pip's Junior Warden badge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { SCRIPTS, sideObjective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { zoneEvent, KOBOLD_FIGHT, PIP_REWARD, GNASHER_REWARD } from "../src/story/act3.js";
import { fishingSpot } from "../src/story/minigames.js";
import { FISHING_SPOTS, landFish } from "../src/rules/minigames.js";
import { createCharacter, gainXp, rest, XP_FOR_LEVEL } from "../src/rules/character.js";
import { createBattle, resistSave } from "../src/rules/combat.js";
import { makeItem } from "../src/rules/items.js";
import { seededRng } from "../src/rules/dice.js";
import { MONSTERS } from "../src/data/monsters.js";
import { LORE } from "../src/rules/bestiary.js";

const ACT3 = { kingDefeated: true, kingRewarded: true, signetShown: true, varricDefeated: true, signetReturned: true, bladeReforged: true, keepHome: true, rockslideOpen: true };
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const hero9 = () => { const h = createCharacter({ name: "Robin" }); gainXp(h, XP_FOR_LEVEL[9], () => 0.5); h.asi = 0; return h; };
const ids = (map, flags) => activeObjects(MAPS[map], flags).map(o => o.id);

test("Pip runs away once the pass is open: Hazel's news, his trail, and Pip and the kobolds in the Deep Warrens", () => {
  const flags = { ...ACT3 }, hero = hero9(), s = { hero, flags };
  assert.equal(zoneEvent({ flags: { ...ACT3, rockslideOpen: false } }, "village"), null);
  assert.match(zoneEvent(s, "village"), /Have you seen Pip/);
  assert.equal(flags.pipRanAway, true);
  assert.equal(zoneEvent(s, "village"), null); // once
  assert.ok(!ids("overworld", flags).includes("pip"));
  for (const id of ["pipShield", "pipChalk"]) assert.ok(ids("overworld", flags).includes(id));
  for (const id of ["pipWarrens", "kobolds"]) assert.ok(ids("deepCave", flags).includes(id));
  const quest = () => questLog(flags).find(q => q.id === "pip");
  assert.equal(quest().steps.find(st => st.current).text, "Ask Hazel what happened");
  assert.match(view(startConversation(SCRIPTS.hazel, s)).text, /GONE TO BE A WARDEN/);
  assert.equal(sideObjective(flags, s), "Find Pip: his trail goes into the wood");
  startConversation(SCRIPTS.pipShield, s);
  startConversation(SCRIPTS.pipChalk, s);
  assert.match(view(startConversation(SCRIPTS.pipWarrens, s)).text, /Great One beyond the mountain/);
  // Everything on the trail can be reached.
  const ow = MAPS.overworld, from = reachable(ow, ow.spawn, { logCleared: true });
  for (const id of ["pipShield", "pipChalk"]) {
    const o = ow.objects.find(x => x.id === id);
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`)), id);
  }
  const cave = MAPS.deepCave, inCave = reachable(cave, cave.spawn, { gateOpened: true, ...flags });
  for (const id of ["pipWarrens", "kobolds"]) {
    const o = cave.objects.find(x => x.id === id);
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => inCave.has(`${o.x + dx},${o.y + dy}`)), id);
  }
});

test("the kobolds: a fight that's no match for you, then Pip goes home and Hazel hands over his badge", () => {
  const flags = { ...ACT3, pipRanAway: true, hazelPipNews: true, pipShieldFound: true, pipChalkFound: true, pipMetWarrens: true }, hero = hero9(), s = { hero, flags };
  const c = startConversation(SCRIPTS.kobolds, s);
  pick(c, "Fight!");
  const fight = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(fight.foes, KOBOLD_FIGHT);
  assert.equal(fight.winFlag, "koboldsGone");
  assert.ok(KOBOLD_FIGHT.every(id => MONSTERS[id].xp <= 25 && LORE[id]));
  flags.koboldsGone = true;
  const after = startConversation(SCRIPTS[fight.afterWin], s);
  assert.match(view(after).text, /Great One will eat you/);
  choose(after, 0);
  assert.equal(flags.pipFound, true);
  assert.ok(ids("overworld", flags).includes("pipBack"));
  assert.ok(!ids("deepCave", flags).includes("pipWarrens"));
  const xp = hero.xp;
  const h = startConversation(SCRIPTS.hazel, s);
  assert.match(view(h).text, /grounded until he's thirty/);
  choose(h, 0);
  assert.ok(hero.inventory.some(i => i.base === "juniorBadge"));
  assert.equal(hero.xp, xp + PIP_REWARD.xp);
  assert.ok(questLog(flags).find(q => q.id === "pip").done);
  assert.match(view(startConversation(SCRIPTS.villager, s)).text, /grounded until I'm thirty/);
});

test("Pip's Junior Warden badge: +1 to a save that only just failed, once per rest", () => {
  const hero = hero9(), rng = seededRng(7);
  hero.level = 8; // no Indomitable
  hero.inventory.push(makeItem("juniorBadge"));
  const b = createBattle(hero, ["goblin"], rng);
  // A save that misses by one: CON save bonus at level 8 is +2 (CON 14) + 3 (proficiency) = +5.
  const save = () => resistSave(b, "player", "CON", 99, () => 0.999); // a natural 20: 25, still short of 99
  assert.equal(save().success, false); // far short: the badge doesn't help, and isn't spent
  assert.equal(hero.badgeUsed, undefined);
  const close = resistSave(b, "player", "CON", 26, () => 0.999); // 20 + 5 = 25: one short
  assert.equal(close.success, true);
  assert.equal(close.total, 26);
  assert.equal(hero.badgeUsed, true);
  assert.equal(resistSave(b, "player", "CON", 26, () => 0.999).success, false); // used up
  rest(hero);
  assert.equal(hero.badgeUsed, false);
});

test("Pip's statue and the Sleeping Fox's bard and plaque, once the keep is home", () => {
  const flags = { ...ACT3 }, hero = hero9(), s = { hero, flags };
  assert.ok(ids("overworld", flags).includes("statue"));
  assert.ok(!ids("overworld", { kingDefeated: true }).includes("statue"));
  assert.ok(ids("inn", flags).includes("bard") && ids("inn", flags).includes("plaque"));
  assert.match(view(startConversation(SCRIPTS.statue, s)).text, /turnip.*cape.*ROBIN/s);
  hero.gold = 10;
  const bard = startConversation(SCRIPTS.bard, s);
  assert.match(view(bard).text, /Robin/);
  pick(bard, "Tip him (5 gold)");
  assert.equal(hero.gold, 5);
  assert.match(view(startConversation(SCRIPTS.plaque, s)).text, /THE HERO SLEPT HERE/);
});

test("Maren has the Wardens' Oath in three pieces: Iron, Storm and Dawn", () => {
  const flags = { ...ACT3, signetTaken: true, askedBrannoc: true, fenReported: true }, s = { hero: hero9(), flags };
  const c = startConversation(SCRIPTS.elder, s);
  pick(c, "Do you know the Wardens' Oath?");
  const seen = [];
  while (view(c)) { seen.push(view(c).text); choose(c, 0); }
  assert.match(seen.join(" "), /Oath of Iron.*Oath of Storm.*Oath of Dawn/s);
  assert.equal(flags.oathFragments, true);
  assert.ok(!labels(startConversation(SCRIPTS.elder, { hero: hero9(), flags: { ...flags, keepHome: false } })).includes("Do you know the Wardens' Oath?"));
});

test("Old Gnasher: Tom's letter (via Hazel), the legendary pike at Willowmere, and Tom pays and mounts him", () => {
  const flags = { ...ACT3 }, hero = hero9(), s = { hero, flags };
  assert.equal(fishingSpot(s, "willowmere"), "willowmere");
  assert.match(view(startConversation(SCRIPTS.hazel, s)).text, /OLD GNASHER IS BITING/);
  assert.equal(flags.gnasherQuest, true);
  assert.equal(fishingSpot(s, "willowmere"), "gnasher");
  assert.equal(fishingSpot(s, "fenwatch"), "fenwatch");
  assert.ok(FISHING_SPOTS.gnasher.catch.some(([id]) => id === "oldGnasher"));
  assert.match(view(startConversation(SCRIPTS.fisher, s)).text, /reel like your life depends on it/);
  landFish(hero, "oldGnasher");
  assert.equal(fishingSpot(s, "willowmere"), "willowmere"); // one Gnasher is enough
  const gold = hero.gold;
  assert.match(view(startConversation(SCRIPTS.fisher, s)).text, /OLD GNASHER/);
  assert.equal(hero.gold, gold + GNASHER_REWARD.gold);
  assert.ok(!hero.inventory.some(i => i.base === "oldGnasher"));
  assert.equal(flags.gnasherCaught, true);
  assert.ok(ids("tomHut", flags).includes("gnasherMount"));
  assert.ok(questLog(flags).find(q => q.id === "gnasher").done);
});
