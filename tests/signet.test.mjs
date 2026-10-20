import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, objectAt, reachable } from "../src/world/map.js";
import { SCRIPTS, objective, CHAIN_CHECKS, KING_REWARD } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { createCharacter } from "../src/rules/character.js";
import { describeItem } from "../src/rules/items.js";
import { sellItem } from "../src/rules/gear.js";
import { SPRITES } from "../src/art/sprites.js";
import { faces } from "./helpers.mjs";

const hall = MAPS.deepCave, world = MAPS.overworld;
const fresh = (flags = {}, name = "Robin") => ({ hero: createCharacter({ name }), flags: { ...flags }, pos: { x: 37.5, y: 3.85 } });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));
const KING_DONE = { questStarted: true, chiefDefeated: true, questRewarded: true, kingQuestStarted: true, gateOpened: true, kingDefeated: true };
const ids = (map, flags) => activeObjects(map, flags).map(o => o.id);

test("the ring and the smith only appear once the Goblin King has fallen", () => {
  assert.ok(ids(hall, { gateOpened: true }).includes("goblinKing"));
  assert.ok(!ids(hall, { gateOpened: true }).includes("signet"));
  assert.ok(!ids(hall, { gateOpened: true }).includes("brannocChained"));
  const after = ids(hall, KING_DONE);
  assert.ok(after.includes("signet") && after.includes("brannocChained") && !after.includes("goblinKing"));
  assert.ok(!ids(hall, { ...KING_DONE, signetTaken: true, brannocFreed: true }).includes("signet"));
  // Both can be reached from the gate.
  const from = reachable(hall, { x: 41, y: 8 }, { ...KING_DONE });
  for (const id of ["signet", "brannocChained"]) {
    const o = hall.objects.find(x => x.id === id);
    assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`)), `can't reach ${id}`);
  }
  for (const id of ["signet", "brannoc"]) assert.ok(SPRITES[id], `${id} has no sprite`);
});

test("Brannoc waits by the smithy once he's free, where you can reach him", () => {
  const b = world.objects.find(o => o.id === "brannoc");
  assert.equal(objectAt(world, b.x, b.y), null);
  assert.equal(objectAt(world, b.x, b.y, { brannocFreed: true }).id, "brannoc");
  const from = reachable(world, world.spawn, { brannocFreed: true });
  assert.ok(from.has(`${b.x},${b.y + 1}`));
});

test("the King's last words", () => {
  const c = startConversation(SCRIPTS.kingWords, fresh(KING_DONE));
  assert.match(view(c).text, /The bones.*They took our home/);
  choose(c);
  assert.match(view(c).text, /glints.*chain/);
});

test("the Iron Signet: the same crest as your sword, warm in your hand", () => {
  const s = fresh(KING_DONE);
  const c = startConversation(SCRIPTS.signet, s);
  assert.match(view(c).text, /tower between two keys: the same worn crest as on your sword/);
  pick(c, "Take the ring");
  assert.equal(s.flags.signetTaken, true);
  const ring = s.hero.inventory.find(i => i.base === "ironSignet");
  assert.ok(ring);
  assert.match(view(c).text, /as if it knows you/);
  assert.match(describeItem(ring), /like the crest on your sword/);
  assert.match(sellItem(s.hero, ring.uid).reason, /can't sell/);
});

test("freeing Brannoc: a STR or DEX check, as many tries as you like; he knows your crest from somewhere", () => {
  const s = fresh(KING_DONE);
  const c = startConversation(SCRIPTS.brannoc, s, { rng: faces("2/20", "15/20") });
  pick(c, `Smash the chain (STR, DC ${CHAIN_CHECKS.smash.dc})`);
  assert.match(view(c).text, /Not quite/);
  assert.equal(s.flags.brannocFreed, undefined);
  pick(c, `Pick the lock (DEX, DC ${CHAIN_CHECKS.pick.dc})`); // 15 + 1
  assert.equal(s.flags.brannocFreed, true);
  assert.match(view(c).text, /Brannoc, smith/);
  choose(c);
  assert.match(view(c).text, /That crest on the pommel... I've seen it before/);
  choose(c);
  assert.match(view(c).text, /take that ring off the throne/); // you haven't yet
});

test("Maren knows the seal: Ironvale Keep and its Wardens, and the same crest on your sword", () => {
  const s = fresh({ ...KING_DONE, signetTaken: true, brannocFreed: true });
  const c = startConversation(SCRIPTS.elder, s, { rng: faces("5/10", "5/10", "5/10") });
  assert.equal(c.node, "kingThanks"); // paid first...
  choose(c);
  assert.equal(c.node, "signet"); // ...then the ring
  assert.match(view(c).text, /seal of Ironvale Keep.*Wardens/);
  choose(c);
  assert.match(view(c).text, /The same crest/);
  pick(c, "I've always had it.");
  assert.match(view(c).text, /Old blood turns up in strange places.*Ask that dwarf/);
  assert.equal(s.flags.signetShown, true);
  assert.equal(s.flags.kingRewarded, true);
  // Without the ring, the King's reward ends the conversation, and she asks about the ring next time.
  const noRing = fresh(KING_DONE);
  const k = startConversation(SCRIPTS.elder, noRing, { rng: faces("5/10", "5/10", "5/10") });
  choose(k);
  assert.equal(view(k), null);
  noRing.flags.signetTaken = true;
  assert.equal(startConversation(SCRIPTS.elder, noRing).node, "signet");
});

test("Brannoc in Oakhollow knows the old road, and clears the goblins' passage", () => {
  const s = fresh({ ...KING_DONE, kingRewarded: true, signetTaken: true, brannocFreed: true });
  assert.match(view(startConversation(SCRIPTS.brannocTown, s)).text, /show it to your Elder/);
  s.flags.signetShown = true;
  const c = startConversation(SCRIPTS.brannocTown, s);
  assert.match(view(c).text, /Iron Road.*passage behind the King's throne/);
  choose(c);
  assert.match(view(c).text, /choked with rubble.*come back/);
  assert.equal(s.flags.askedBrannoc, true);
  // Next time, he's cleared it.
  assert.match(view(startConversation(SCRIPTS.brannocTown, s)).text, /goes all the way up/);
  assert.equal(s.flags.passageCleared, true);
  assert.match(view(startConversation(SCRIPTS.brannocTown, s)).text, /Ironvale steel on your hip/);
});

test("quest 3 in the log and on the HUD, step by step", () => {
  const f = { ...KING_DONE, kingRewarded: true };
  const steps = () => questLog(f).find(q => q.id === "signet").steps.map(st => (st.done ? "x" : st.current ? ">" : "."));
  assert.equal(questLog({ ...KING_DONE, kingDefeated: false }).some(q => q.id === "signet"), false);
  assert.deepEqual(steps(), [">", ".", ".", ".", ".", ".", "."]);
  assert.equal(objective(f), "Search the Goblin King's hall");
  f.signetTaken = true;
  assert.equal(objective(f), "Free the smith chained in the King's hall");
  f.brannocFreed = true;
  assert.equal(objective(f), "Show the Iron Signet to Elder Maren");
  f.signetShown = true;
  assert.equal(objective(f), "Ask Brannoc about Ironvale");
  f.askedBrannoc = true;
  assert.equal(objective(f), "Come back to Brannoc by the smithy");
  f.passageCleared = true;
  assert.match(objective(f), /Climb the goblins' passage/);
  f.seenFen = true;
  assert.equal(objective(f), "Tell Elder Maren about Greywater Fen");
  assert.deepEqual(steps(), ["x", "x", "x", "x", "x", "x", ">"]);
  assert.equal(objective({ ...KING_DONE }), "Return to Elder Maren"); // the reward comes first
  assert.ok(KING_REWARD.gold > 0);
});
