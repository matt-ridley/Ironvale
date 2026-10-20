import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, objectAt, exitAt, isWalkable, reachable, tileAt, zoneAt } from "../src/world/map.js";
import { rollEncounter, ENCOUNTERS } from "../src/world/encounters.js";
import { safePlace } from "../src/world/travel.js";
import { feetAt } from "../src/world/movement.js";
import { SCRIPTS, objective, SIGNET_REWARD, CAUSEWAY_REWARD, SALLOW_FIGHT } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { createCharacter } from "../src/rules/character.js";
import { makeItem } from "../src/rules/items.js";
import { createBattle, playerAction, isPlayerTurn } from "../src/rules/combat.js";
import { hasCondition } from "../src/rules/conditions.js";
import { MONSTERS } from "../src/data/monsters.js";
import { seededRng } from "../src/rules/dice.js";
import { faces } from "./helpers.mjs";

const fen = MAPS.ironvale, hall = MAPS.deepCave;
const AFTER_KING = { questStarted: true, chiefDefeated: true, questRewarded: true, kingQuestStarted: true, gateOpened: true, kingDefeated: true, kingRewarded: true };
const fresh = (flags = {}) => ({ hero: createCharacter({ name: "Robin" }), flags: { ...flags }, pos: feetAt(30, 45) });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));
const near = (from, o) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`));
const obj = id => fen.objects.find(o => o.id === id);

test("the goblins' passage: blocked by rubble until Brannoc clears it, then it leads up to the fen and back", () => {
  assert.equal(objectAt(hall, 45, 1, AFTER_KING).id, "rubble");
  assert.equal(objectAt(hall, 45, 1, { ...AFTER_KING, passageCleared: true }), null);
  const up = exitAt(hall, 45, 1);
  assert.equal(up.to, "ironvale");
  assert.ok(reachable(hall, { x: 41, y: 8 }, { ...AFTER_KING, passageCleared: true }).has("45,1"));
  assert.ok(isWalkable(fen, up.at.x, up.at.y));
  assert.equal(zoneAt(fen, up.at.x, up.at.y).id, "fen");
  const down = fen.exits[0];
  assert.equal(tileAt(fen, down.x, down.y).name, "passage");
  assert.equal(down.to, "deepCave");
  assert.ok(isWalkable(hall, down.at.x, down.at.y));
  assert.equal(exitAt(hall, down.at.x, down.at.y), null, "you'd walk straight back up");
});

test("from where you arrive you can reach the camp, Sallow, the floodwater, Fenwatch's gate and the chest, but not the keep", () => {
  const from = reachable(fen, fen.spawn, {});
  for (const id of ["fenCampfire", "sallow", "flood5", "fenwatchGate", "fenChest"]) assert.ok(near(from, obj(id)), `can't reach ${id}`);
  assert.ok(!near(from, obj("keepGate")), "the keep should be cut off by the water");
  const raised = reachable(fen, fen.spawn, { causewayRaised: true });
  for (const id of ["keepGate", "rockslide"]) assert.ok(near(raised, obj(id)), `can't reach ${id} once the causeway rises`);
  assert.equal(activeObjects(fen, { causewayRaised: true }).filter(o => o.id.startsWith("flood")).length, 0);
});

test("the fen: wading is slow, boardwalks are safer, the camp keeps monsters off, Fenwatch is safe", () => {
  const shallow = fen.rows.findIndex(r => r.includes("q"));
  assert.equal(tileAt(fen, fen.rows[shallow].indexOf("q"), shallow).slow, 0.6);
  const always = () => 0;
  assert.ok(rollEncounter("fen", "marsh", 99, always));
  assert.ok(rollEncounter("keepGrounds", "marsh", 99, always));
  const justUnder = () => ENCOUNTERS.fen.chance * 0.9;
  assert.ok(rollEncounter("fen", "marsh", 99, justUnder));
  assert.equal(rollEncounter("fen", "boardwalk", 99, justUnder), null);
  assert.equal(safePlace({ map: "ironvale", pos: feetAt(5, 49) })?.id, "fenCamp");
  assert.equal(zoneAt(fen, 50, 50).safe, true);
});

test("Brannoc clears the passage the next time you talk to him; then the HUD sends you up it", () => {
  const s = fresh({ ...AFTER_KING, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true });
  assert.equal(objective(s.flags), "Come back to Brannoc by the smithy");
  assert.match(view(startConversation(SCRIPTS.brannocTown, s)).text, /goes all the way up/);
  assert.equal(s.flags.passageCleared, true);
  assert.match(objective(s.flags), /Climb the goblins' passage/);
});

test("telling Maren about the fen finishes quest 3, once", () => {
  const s = fresh({ ...AFTER_KING, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true });
  const gold = s.hero.gold, xp = s.hero.xp;
  const c = startConversation(SCRIPTS.elder, s, { rng: faces(...Array(10).fill("5/10")) });
  assert.equal(c.node, "fenReport");
  assert.match(view(c).text, /Greywater Fen/);
  assert.equal(s.hero.gold, gold + SIGNET_REWARD.gold);
  assert.equal(s.hero.xp, xp + SIGNET_REWARD.xp);
  assert.ok(questLog(s.flags).find(q => q.id === "signet").done);
  assert.equal(startConversation(SCRIPTS.elder, s).node, "ironvale");
  assert.equal(objective(s.flags), "Find a way across the drowned causeway");
});

test("the King's crown lies in his hall once he's beaten, and Mother Sallow takes it to raise the causeway", () => {
  assert.ok(activeObjects(hall, AFTER_KING).some(o => o.id === "kingCrown"));
  assert.ok(!activeObjects(hall, { gateOpened: true }).some(o => o.id === "kingCrown"));
  const s = fresh(AFTER_KING);
  const c = startConversation(SCRIPTS.crown, s);
  pick(c, "Take the crown");
  assert.equal(s.flags.crownTaken, true);
  assert.ok(s.hero.inventory.some(i => i.base === "goblinCrown"));

  const meet = startConversation(SCRIPTS.sallow, s, { rng: faces(...Array(10).fill("5/10")) });
  assert.match(view(meet).text, /Nobody visits Mother Sallow/);
  pick(meet, "Why is the causeway flooded?");
  choose(meet);
  assert.ok(labels(meet).includes("Give her the Goblin King's crown"));
  const xp = s.hero.xp;
  pick(meet, "Give her the Goblin King's crown");
  assert.equal(s.flags.causewayRaised, true);
  assert.equal(s.flags.sallowBargain, true);
  assert.equal(s.hero.xp, xp + CAUSEWAY_REWARD.xp);
  assert.ok(!s.hero.inventory.some(i => i.base === "goblinCrown"));
  assert.match(view(meet).text, /Mother remembers/);
  assert.equal(startConversation(SCRIPTS.sallow, s).node, "pleased");
  const q3 = { signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true, fenReported: true };
  assert.equal(objective({ ...s.flags, ...q3 }), "Ironvale Keep opens in a future update");
});

test("without the crown, the only way is to fight her; beating her drains the water and pays the same", () => {
  const s = fresh(AFTER_KING);
  const c = startConversation(SCRIPTS.sallow, s);
  pick(c, "Why is the causeway flooded?");
  choose(c);
  assert.ok(!labels(c).includes("Give her the Goblin King's crown"));
  pick(c, "Then I'll make you raise it!");
  assert.deepEqual(takeEvents(c), [{ type: "battle", foes: SALLOW_FIGHT, zone: "fen", winFlag: "sallowDefeated", afterWin: "sallowFalls" }]);
  const xp = s.hero.xp;
  s.flags.sallowDefeated = true;
  const falls = startConversation(SCRIPTS.sallowFalls, s, { rng: faces(...Array(10).fill("5/10")) });
  assert.match(view(falls).text, /sinks into the mud/);
  assert.equal(s.flags.causewayRaised, true);
  assert.equal(s.hero.xp, xp + CAUSEWAY_REWARD.xp);
  assert.ok(!activeObjects(fen, s.flags).some(o => o.id === "sallow"));
});

test("quest 4 in the log", () => {
  assert.equal(questLog(AFTER_KING).some(q => q.id === "causeway"), false);
  const steps = f => questLog(f).find(q => q.id === "causeway").steps.map(st => (st.done ? "x" : st.current ? ">" : "."));
  assert.deepEqual(steps({ seenFen: true }), [">", ".", ".", "."]);
  assert.deepEqual(steps({ seenFen: true, metSallow: true }), ["x", "x", ">", "."]);
  assert.deepEqual(steps({ seenFen: true, causewayRaised: true }), ["x", "x", "x", ">"]);
});

/* A fight against one monster where it goes first, against a hero who can take it. */
function monsterFirst(foe, hpBoost = 200) {
  for (let seed = 1; seed < 300; seed++) {
    const hero = createCharacter();
    hero.hp = hero.maxHp = hpBoost;
    const b = createBattle(hero, [foe], seededRng(seed));
    if (isPlayerTurn(b) && b.log.some(e => e.type === "monster-attack")) return b;
  }
  throw new Error("no seed");
}

test("lizardfolk bite and bash with their shield: two attacks a turn", () => {
  assert.equal(MONSTERS.lizardfolk.attacks.length, 2);
  const b = monsterFirst("lizardfolk");
  assert.equal(b.log.filter(e => e.type === "monster-attack").length, 2);
});

test("a ghoul's claws paralyse on a failed CON save; a good save shakes it off; you can save again each turn", () => {
  const b = monsterFirst("ghoul");
  const hits = b.log.filter(e => e.type === "monster-attack" && e.roll.hit);
  const saved = b.log.filter(e => ["save", "condition"].includes(e.type));
  assert.equal(saved.length, hits.length, "every claw that lands calls for a save");
  // Force the issue: a failed save paralyses.
  const hero = createCharacter();
  hero.hp = hero.maxHp = 200;
  for (let seed = 1; seed < 400; seed++) {
    const fight = createBattle(hero, ["ghoul"], seededRng(seed));
    const at = fight.log.findIndex(e => e.type === "condition" && e.condition === "paralyzed");
    if (at < 0) continue;
    assert.match(fight.log[at].text, /You are paralyzed!/);
    // Your turns are skipped while paralyzed, until a save at the end of one frees you: only then is it your move.
    const after = fight.log.slice(at);
    assert.ok(after.some(e => e.type === "skip" && e.who === "player"), "a turn lost");
    assert.ok(after.some(e => e.type === "condition-end" && e.who === "player"), "then freed");
    assert.ok(isPlayerTurn(fight) && !hasCondition(fight, "player", "paralyzed"));
    return;
  }
  assert.fail("no seed paralysed the hero");
});

test("Mother Sallow is a real fight: SRD green hag numbers, a little lighter on HP", () => {
  const m = MONSTERS.motherSallow;
  assert.equal(m.ac, 17);
  assert.equal(m.attack.bonus, 6);
  assert.equal(m.xp, 700);
  const hero = createCharacter();
  const b = createBattle(hero, SALLOW_FIGHT, seededRng(4));
  assert.ok(b.monsters[0].hp >= 36 && b.monsters[0].hp <= 99);
  assert.ok(playerAction(b, { type: "defend" }, seededRng(5)).ok || !isPlayerTurn(b));
});
