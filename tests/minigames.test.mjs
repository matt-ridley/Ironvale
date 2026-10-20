import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KB_STAKE, kbNew, kbRoll, kbPlace, kbBestColumn, kbColumnScore, kbScores, kbWinner,
  awNew, awTick, awTap, awInZone, AW_SLIP,
  ARROWS, MEGAN_SCORE, archNew, archAim, archShoot, archTotal, archDone, ringScore,
  fishNew, fishTick, fishTap, fishLeft, landFish, pickFish, FISH_PER_REST, BITE_WINDOW, FISHING_SPOTS,
  winPrize, PRIZES,
} from "../src/rules/minigames.js";
import { createCharacter, mod, rest, abilityScore } from "../src/rules/character.js";
import { joinParty, companionStats } from "../src/rules/party.js";
import { makeItem } from "../src/rules/items.js";
import { sellItem } from "../src/rules/gear.js";
import { createBattle, playerAction, isPlayerTurn } from "../src/rules/combat.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { MAPS } from "../src/world/maps.js";
import { reachable } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { seededRng } from "../src/rules/dice.js";
import { faces } from "./helpers.mjs";

const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));

test("knucklebones: matching dice multiply, and a match knocks the other side's out", () => {
  assert.equal(kbColumnScore([4, 4]), 16);
  assert.equal(kbColumnScore([3, 3, 3]), 27);
  assert.equal(kbColumnScore([6, 2, 6]), 26);
  const g = kbNew(() => 0); // you go first
  assert.equal(g.turn, 0);
  assert.equal(kbPlace(g, 0).ok, false); // roll first
  kbRoll(g, faces("5/6"));
  assert.deepEqual(kbPlace(g, 1), { ok: true, die: 5, col: 1, knocked: 0 });
  assert.equal(g.turn, 1);
  kbRoll(g, faces("5/6"));
  assert.equal(kbBestColumn(g), 1); // knocking out your 5 is worth more than anywhere else
  assert.equal(kbPlace(g, 1).knocked, 1);
  assert.deepEqual(g.boards[0][1], []);
  assert.deepEqual(kbScores(g), [0, 5]);
});

test("knucklebones: a full board ends it, and a column holds three", () => {
  const g = kbNew(() => 0);
  for (let i = 0; i < 9; i++) {
    kbRoll(g, faces(`${(i % 3) + 1}/6`));
    if (g.turn === 0) { kbPlace(g, Math.floor(i / 2) % 3); } else kbPlace(g, kbBestColumn(g));
    if (g.over) break;
  }
  const full = kbNew(() => 0);
  full.boards[0] = [[1, 2, 3], [4, 5, 6], [6, 6]];
  full.die = 2;
  assert.match(kbPlace(full, 0).reason, /full/);
  kbPlace(full, 2);
  assert.equal(full.over, true);
  assert.equal(kbWinner(full), 0);
});

test("arm wrestling: good taps in the green win, wild tapping loses, and a stronger arm pushes further", () => {
  const hero = createCharacter();
  const g = awNew(hero);
  assert.equal(g.push, 8 + 2 * mod(hero, "STR"));
  let wasIn = false;
  while (!g.result) { awTick(g, 0.016); const inZone = awInZone(g); if (inZone && !wasIn) awTap(g); wasIn = inZone; }
  assert.equal(g.result, "won");
  const lazy = awNew(hero);
  while (!lazy.result) awTick(lazy, 0.05);
  assert.equal(lazy.result, "lost");
  const slip = awNew(hero);
  slip.cursor = 0;
  awTap(slip);
  assert.equal(slip.pos, 50 - AW_SLIP);
  hero.inventory.push(makeItem("oswinBelt"));
  assert.equal(awNew(hero).push, g.push + 2); // +2 STR is +1 to the modifier
});

test("archery: rings score 10 to 2, five arrows, and Megan's score to beat", () => {
  assert.equal(ringScore(0, 0), 10);
  assert.equal(ringScore(0.2, 0), 8);
  assert.equal(ringScore(0, 0.6), 4);
  assert.equal(ringScore(0.8, 0.8), 0);
  const g = archNew(createCharacter());
  const steady = archNew(createCharacter({ abilities: { STR: 10, DEX: 18, CON: 10 } }));
  assert.ok(steady.drift < g.drift, "a steadier hand drifts less");
  for (let i = 0; i < ARROWS; i++) { g.t = i * 7.3; archShoot(g); }
  assert.equal(archDone(g), true);
  assert.equal(archShoot(g), null);
  assert.equal(archTotal(g), g.scores.reduce((a, b) => a + b));
  // Shooting at the best moment beats Megan; she's no pushover for wild shots.
  const best = archNew(createCharacter());
  for (let a = 0; a < ARROWS; a++) {
    let bt = best.t, bd = 9;
    for (let t = best.t; t < best.t + 3; t += 0.01) { const saved = best.t; best.t = t; const p = archAim(best); best.t = saved; const d = Math.hypot(p.x, p.y); if (d < bd) { bd = d; bt = t; } }
    best.t = bt; archShoot(best); best.t += 0.4;
  }
  assert.ok(archTotal(best) > MEGAN_SCORE, `perfect timing (${archTotal(best)}) should win`);
  assert.ok(MEGAN_SCORE > ARROWS * 6, "Megan's better than six a shot");
});

test("fishing: wait for the bite, strike in time, reel faster than it pulls", () => {
  const g = fishNew("willowmere", () => 0); // bites after 1.5 s
  assert.equal(fishTap(fishNew("willowmere", () => 0)), "early");
  fishTick(g, 1.6, () => 0);
  assert.equal(g.phase, "bite");
  assert.equal(g.fish, "perch");
  const slow = structuredClone(g);
  fishTick(slow, BITE_WINDOW + 0.1);
  assert.equal(slow.phase, "missed");
  assert.equal(fishTap(g), "reel");
  const lazy = structuredClone(g);
  for (let i = 0; i < 100 && lazy.phase === "reel"; i++) fishTick(lazy, 0.1);
  assert.equal(lazy.phase, "escaped");
  while (g.phase === "reel") { fishTick(g, 0.1); fishTap(g); }
  assert.equal(g.phase, "caught");
  assert.equal(pickFish("fenwatch", () => 0.5), "fenEel");
  assert.equal(pickFish("willowmere", () => 0.95), "goldenCarp");
  for (const spot of Object.values(FISHING_SPOTS)) assert.ok(Math.abs(spot.catch.reduce((s, [, c]) => s + c, 0) - 1) < 1e-9);
});

test("fish go in your pack and sell; they stop biting after five until you sleep", () => {
  const hero = createCharacter({ gold: 0 });
  for (let i = 0; i < FISH_PER_REST; i++) landFish(hero, "pike");
  assert.equal(fishLeft(hero), 0);
  assert.match(view(startConversation(SCRIPTS.fishing, { hero, flags: {} })).text, /stopped biting/);
  assert.equal(sellItem(hero, hero.inventory.find(i => i.base === "pike").uid).price, 8);
  rest(hero);
  assert.equal(fishLeft(hero), FISH_PER_REST);
  const c = startConversation(SCRIPTS.fishing, { hero, flags: {} }, { object: { spot: "fenwatch", look: "A rod on the jetty." } });
  assert.match(view(c).text, /A rod on the jetty.*5 more times/);
  pick(c, "Fish");
  assert.deepEqual(takeEvents(c), [{ type: "minigame", key: "Fishing", data: { spot: "fenwatch" } }]);
});

test("prizes: once each. The Lucky Die rerolls a natural 1 once per rest, the belt adds 2 STR, Megan gets her bow", () => {
  const hero = createCharacter();
  const flags = {};
  assert.equal(winPrize(hero, flags, "knucklebones").base, "luckyDie");
  assert.equal(winPrize(hero, flags, "knucklebones"), null);
  assert.equal(flags[PRIZES.knucklebones.flag], true);
  assert.match(sellItem(hero, hero.inventory.find(i => i.base === "luckyDie").uid).reason, /fair and square/);
  const str = abilityScore(hero, "STR");
  winPrize(hero, flags, "armWrestle");
  assert.equal(abilityScore(hero, "STR"), str + 2);
  hero.inventory.push(makeItem("oswinBelt"));
  assert.equal(abilityScore(hero, "STR"), str + 2); // two belts don't stack
  // Megan's bow goes on Megan, at the inn or with you; her old one comes to your pack.
  joinParty(hero, "megan");
  const before = companionStats(hero).attack;
  const bow = winPrize(hero, flags, "archery");
  assert.equal(hero.companion.gear.bow, bow);
  assert.equal(bow.upgrade, 1);
  assert.ok(hero.inventory.some(i => i.base === "shortbow"));
  assert.ok(companionStats(hero).attack.bonus > before.bonus);
  // The Lucky Die in a fight.
  hero.hp = hero.maxHp = 500;
  let b;
  for (let seed = 1; !b; seed++) { const t = createBattle(hero, ["skeleton"], seededRng(seed)); if (isPlayerTurn(t)) b = t; }
  b.monsters[0].hp = b.monsters[0].maxHp = 500;
  const r = playerAction(b, { type: "attack", target: 0 }, faces("1/20", "15/20", "5/8", ...Array(30).fill("1/20")));
  assert.ok(r.events.some(e => e.type === "lucky"));
  assert.equal(hero.luckUsed, true);
  rest(hero);
  assert.equal(hero.luckUsed, false);
});

test("the hosts: Wat and Oswin at the Sleeping Fox, Sal at the Duck, the target in Oakhollow, rods at Willowmere and Fenwatch", () => {
  const where = { wat: "inn", oswin: "inn", sal: "duck", target: "overworld", tomRod: "overworld", jettyRod: "ironvale" };
  for (const [id, map] of Object.entries(where)) {
    const m = MAPS[map], o = m.objects.find(x => x.id === id);
    assert.ok(o, id);
    assert.ok(SCRIPTS[o.script], `${id}: no script`);
    const from = reachable(m, m.spawn, { causewayRaised: true, keepGateOpened: true, logCleared: true });
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`)), `can't reach ${id}`);
  }
  const hero = createCharacter({ gold: 5 });
  let c = startConversation(SCRIPTS.diceWat, { hero, flags: {} });
  pick(c, `Play (${KB_STAKE} gold)`);
  assert.match(view(c).text, /purse jingles/);
  hero.gold = 50;
  c = startConversation(SCRIPTS.diceSal, { hero, flags: {} });
  pick(c, `Play (${KB_STAKE} gold)`);
  assert.deepEqual(takeEvents(c), [{ type: "minigame", key: "Knucklebones", data: { host: "SAL" } }]);
  c = startConversation(SCRIPTS.armWrestle, { hero, flags: {} });
  pick(c, "Arm wrestle");
  assert.deepEqual(takeEvents(c), [{ type: "minigame", key: "ArmWrestle", data: {} }]);
  assert.equal(startConversation(SCRIPTS.archery, { hero, flags: {} }).node, "alone"); // no Megan, no contest
  joinParty(hero, "megan");
  c = startConversation(SCRIPTS.archery, { hero, flags: {} });
  assert.match(view(c).text, new RegExp(`${MEGAN_SCORE}`));
  pick(c, "You're on!");
  assert.deepEqual(takeEvents(c), [{ type: "minigame", key: "Archery", data: {} }]);
});
