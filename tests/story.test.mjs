import { test } from "node:test";
import assert from "node:assert/strict";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { SCRIPTS, QUEST_REWARD, BOSS_FIGHT, objective } from "../src/story/scripts.js";
import { createCharacter } from "../src/rules/character.js";
import { faces } from "./helpers.mjs";

const fresh = (flags = {}) => ({ hero: createCharacter(), flags: { ...flags }, pos: { x: 54, y: 23 } });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));

test("the elder offers the quest, and accepting it sets the flag", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.elder, s);
  assert.equal(view(c).speaker, "ELDER MAREN");
  pick(c, "What do you need?");
  pick(c, "I'll do it.");
  assert.equal(s.flags.questStarted, true);
  choose(c); // Continue to the advice
  assert.match(view(c).text, /green/); // a level 1 hero is told to train
  choose(c); // Close
  assert.equal(view(c), null);
});

test("turning the elder down leaves the quest open", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.elder, s);
  pick(c, "Not my problem.");
  assert.equal(s.flags.questStarted, undefined);
  assert.equal(startConversation(SCRIPTS.elder, s).node, "intro");
});

test("the elder's line follows the quest", () => {
  assert.equal(startConversation(SCRIPTS.elder, fresh({ questStarted: true })).node, "reminder");
  assert.equal(startConversation(SCRIPTS.elder, fresh({ questStarted: true, chiefDefeated: true, questRewarded: true })).node, "after");
});

test("the reward is paid once, even if you beat the chief before taking the quest", () => {
  const s = fresh({ chiefDefeated: true });
  const gold = s.hero.gold;
  const c = startConversation(SCRIPTS.elder, s, { rng: faces("5/10") });
  assert.match(view(c).text, /hadn't even asked/);
  assert.match(view(c).text, /level 2!/);
  assert.equal(s.hero.gold, gold + QUEST_REWARD.gold);
  assert.equal(s.hero.xp, QUEST_REWARD.xp);
  assert.equal(s.flags.questRewarded, true);
  assert.equal(startConversation(SCRIPTS.elder, s).node, "after");
  assert.equal(s.hero.gold, gold + QUEST_REWARD.gold);
});

test("shoving the log: success clears it for good", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.log, s, { rng: faces("10/20") }); // 10 + STR 2 = 12
  pick(c, "Shove it aside (STR, DC 12)");
  assert.equal(s.flags.logCleared, true);
  assert.match(view(c).text, /STR check \(DC 12\): rolled 10 \+ 2 = 12\. Success\..*path is clear/);
});

test("climbing the log: success puts you on the far side, and the log stays", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.log, s, { rng: faces("13/20"), object: { x: 54, y: 24 } }); // 13 + DEX 1 = 14
  pick(c, "Climb over (DEX, DC 14)");
  assert.deepEqual(s.pos, { x: 54, y: 25 });
  assert.equal(s.flags.logCleared, undefined);
  assert.match(view(c).text, /other side/);
});

test("failing at the log hurts a little, never down to 0, and you can try again", () => {
  const s = fresh();
  s.hero.hp = 2;
  const c = startConversation(SCRIPTS.log, s, { rng: faces("1/20", "4/4") });
  pick(c, "Shove it aside (STR, DC 12)");
  assert.equal(s.hero.hp, 1);
  assert.match(view(c).text, /-1 HP/);
  pick(c, "Try again");
  assert.equal(c.node, "look");
});

test("the cave starts the boss fight once, then goes quiet", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.cave, s);
  pick(c, "Fight!");
  assert.equal(view(c), null);
  assert.deepEqual(takeEvents(c), [{ type: "battle", foes: BOSS_FIGHT, zone: "cave", winFlag: "chiefDefeated" }]);
  assert.deepEqual(takeEvents(c), []);
  assert.equal(startConversation(SCRIPTS.cave, fresh({ chiefDefeated: true })).node, "quiet");
});

test("the quest objective follows the flags", () => {
  assert.match(objective({}), /Elder Maren/);
  assert.match(objective({ questStarted: true }), /goblin chief/);
  assert.match(objective({ chiefDefeated: true }), /Return/);
  assert.equal(objective({ questRewarded: true }), "");
});

test("every choice in every script leads somewhere real", () => {
  for (const [name, script] of Object.entries(SCRIPTS)) {
    for (const [id, node] of Object.entries(script.nodes)) {
      for (const ch of node.choices || []) assert.ok(ch.to === null || script.nodes[ch.to], `${name}.${id} -> ${ch.to}`);
      if (node.to) assert.ok(script.nodes[node.to], `${name}.${id} -> ${node.to}`);
    }
  }
});
