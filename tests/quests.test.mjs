import { test } from "node:test";
import assert from "node:assert/strict";
import { questLog, QUESTS } from "../src/story/quests.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { createCharacter } from "../src/rules/character.js";
import { faces } from "./helpers.mjs";
import { feetAt } from "../src/world/movement.js";

const ids = log => log.map(q => q.id);
const steps = (log, id) => log.find(q => q.id === id).steps.map(st => (st.current ? ">" : st.done ? "x" : "."));

test("a new game knows only the goblin chief, starting with talking to the Elder", () => {
  const log = questLog({});
  assert.deepEqual(ids(log), ["chief"]);
  assert.deepEqual(steps(log, "chief"), [">", ".", ".", "."]);
  assert.equal(log[0].done, false);
  assert.match(log[0].reward, /100 gold, 300 XP/);
});

test("steps tick off as the quest goes on, and only one is current", () => {
  assert.deepEqual(steps(questLog({ questStarted: true }), "chief"), ["x", ">", ".", "."]);
  assert.deepEqual(steps(questLog({ questStarted: true, logCleared: true }), "chief"), ["x", "x", ">", "."]);
  assert.deepEqual(steps(questLog({ questStarted: true, logPassed: true }), "chief"), ["x", "x", ">", "."]);
  // The world is open: beat the chief before taking the quest and only paying up is left.
  assert.deepEqual(steps(questLog({ chiefDefeated: true }), "chief"), ["x", "x", "x", ">"]);
});

test("the King shows up once the chief is paid for, and finished quests go to the bottom", () => {
  const log = questLog({ questStarted: true, chiefDefeated: true, questRewarded: true });
  assert.deepEqual(ids(log), ["king", "chief"]);
  assert.equal(log[1].done, true);
  assert.deepEqual(steps(log, "king"), [">", ".", ".", "."]);
  const all = { questStarted: true, chiefDefeated: true, questRewarded: true, kingQuestStarted: true, gatePassed: true, kingDefeated: true, kingRewarded: true };
  assert.ok(questLog(all).filter(q => q.id !== "signet").every(q => q.done));
  assert.equal(questLog(all)[0].id, "signet"); // the Iron Signet, unfinished, comes first
});

test("side quests appear when you hear of them", () => {
  assert.deepEqual(ids(questLog({ meganQuest: true })), ["chief", "bow"]);
  assert.deepEqual(ids(questLog({ bowFound: true })), ["chief", "bow"]); // found the bow before meeting her
  assert.deepEqual(steps(questLog({ meganQuest: true, bowFound: true }), "bow"), ["x", "x", ">"]);
  assert.equal(questLog({ meganQuest: true, bowFound: true, meganJoined: true }).find(q => q.id === "bow").done, true);
  assert.deepEqual(ids(questLog({ metTom: true })), ["chief", "willowmere"]);
  assert.deepEqual(steps(questLog({ metTom: true, gardenChestOpened: true }), "willowmere"), [">", "x", "."]);
});

test("every quest has a title, a story and steps", () => {
  for (const q of QUESTS) {
    assert.ok(q.title && q.about && q.steps.length, q.id);
    assert.ok(["main", "side"].includes(q.kind), q.id);
  }
});

test("climbing past the oak or the gate is remembered for the log", () => {
  for (const [script, flag] of [["log", "logPassed"], ["gate", "gatePassed"]]) {
    const s = { hero: createCharacter({ abilities: { STR: 10, DEX: 20, CON: 10 } }), flags: {}, pos: feetAt(54, 23) };
    const c = startConversation(SCRIPTS[script], s, { rng: faces("15/20"), object: { x: 54, y: 24 } });
    choose(c, view(c).choices.findIndex(ch => ch.label.includes("DEX")));
    assert.equal(s.flags[flag], true, script);
  }
});
