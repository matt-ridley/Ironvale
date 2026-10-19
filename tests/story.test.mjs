import { test } from "node:test";
import assert from "node:assert/strict";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { SCRIPTS, QUEST_REWARD, KING_REWARD, BOSS_FIGHT, KING_FIGHT, GATE_CHECKS, objective, questsDone } from "../src/story/scripts.js";
import { DEEP_CAVE } from "../src/world/cave.js";
import { createCharacter } from "../src/rules/character.js";
import { faces } from "./helpers.mjs";
import { feetAt } from "../src/world/movement.js";

const fresh = (flags = {}) => ({ hero: createCharacter(), flags: { ...flags }, pos: feetAt(54, 23) });
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
  const paid = { questStarted: true, chiefDefeated: true, questRewarded: true };
  assert.equal(startConversation(SCRIPTS.elder, fresh(paid)).node, "kingIntro");
  assert.equal(startConversation(SCRIPTS.elder, fresh({ ...paid, kingQuestStarted: true })).node, "kingReminder");
  assert.equal(startConversation(SCRIPTS.elder, fresh({ ...paid, kingQuestStarted: true, kingDefeated: true, kingRewarded: true })).node, "afterAll");
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
  choose(c); // Continue: she tells you about the Goblin King
  assert.match(view(c).text, /Goblin King/);
  assert.equal(startConversation(SCRIPTS.elder, s).node, "kingIntro");
  assert.equal(s.hero.gold, gold + QUEST_REWARD.gold);
});

test("the second quest: the elder sends you after the Goblin King and pays once he's beaten", () => {
  const s = fresh({ questStarted: true, chiefDefeated: true, questRewarded: true });
  const c = startConversation(SCRIPTS.elder, s);
  pick(c, "I'll find the King.");
  assert.equal(s.flags.kingQuestStarted, true);
  assert.match(objective(s.flags), /Goblin King/);
  s.flags.kingDefeated = true;
  assert.match(objective(s.flags), /Return/);
  const gold = s.hero.gold;
  const k = startConversation(SCRIPTS.elder, s, { rng: faces("5/10", "5/10", "5/10") });
  assert.equal(k.node, "kingThanks");
  assert.equal(s.hero.gold, gold + KING_REWARD.gold);
  assert.equal(s.flags.kingRewarded, true);
  assert.equal(objective(s.flags), "");
  assert.equal(questsDone(s.flags), 2);
  assert.equal(startConversation(SCRIPTS.elder, s).node, "afterAll");
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
  assert.deepEqual(s.pos, feetAt(54, 25));
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

test("once the chief is beaten, the cave leads down into the Deep Warrens", () => {
  const c = startConversation(SCRIPTS.cave, fresh({ chiefDefeated: true }));
  pick(c, "Go down the tunnel");
  assert.equal(view(c), null);
  assert.deepEqual(takeEvents(c), [{ type: "travel", map: DEEP_CAVE.name, at: DEEP_CAVE.spawn }]);
});

test("the Goblin King starts the final fight", () => {
  const c = startConversation(SCRIPTS.king, fresh());
  pick(c, "Fight the Goblin King!");
  assert.deepEqual(takeEvents(c), [{ type: "battle", foes: KING_FIGHT, zone: "cave", winFlag: "kingDefeated" }]);
});

test("the iron gate: lifting it opens it for good, squeezing through puts you on the far side", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.gate, s, { rng: faces("11/20") }); // 11 + STR 2 = 13
  pick(c, `Lift the gate (STR, DC ${GATE_CHECKS.shove.dc})`);
  assert.equal(s.flags.gateOpened, true);
  assert.match(view(c).text, /way is open/);
  const t = fresh();
  t.pos = feetAt(41, 8);
  const d = startConversation(SCRIPTS.gate, t, { rng: faces("14/20"), object: { x: 41, y: 7 } }); // 14 + DEX 1 = 15
  pick(d, `Squeeze through the bars (DEX, DC ${GATE_CHECKS.climb.dc})`);
  assert.deepEqual(t.pos, feetAt(41, 6));
  assert.equal(t.flags.gateOpened, undefined);
});

test("a chest gives its gold and items once and marks itself opened", () => {
  const s = fresh();
  const gold = s.hero.gold, items = s.hero.inventory.length;
  const chest = { id: "testChest", goneWhen: "testChestOpened", loot: { gold: 40, items: ["potionSpeed", "potionHealing"] } };
  const c = startConversation(SCRIPTS.chest, s, { object: chest });
  assert.match(view(c).text, /40 gold, Potion of Speed, Potion of Healing/);
  assert.equal(s.hero.gold, gold + 40);
  assert.equal(s.hero.inventory.length, items + 2);
  assert.equal(s.flags.testChestOpened, true);
});

test("Old Tom gives you one Potion of Speed", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.fisher, s);
  choose(c);
  assert.match(view(c).text, /Potion of Speed/);
  assert.equal(s.hero.inventory.filter(i => i.base === "potionSpeed").length, 1);
  assert.equal(startConversation(SCRIPTS.fisher, s).node, "again");
  assert.equal(s.hero.inventory.filter(i => i.base === "potionSpeed").length, 1);
});

test("the quest objective follows the flags", () => {
  assert.match(objective({}), /Elder Maren/);
  assert.match(objective({ questStarted: true }), /goblin chief/);
  assert.match(objective({ chiefDefeated: true }), /Return/);
  assert.match(objective({ questRewarded: true }), /Elder Maren/);
  assert.equal(objective({ questRewarded: true, kingQuestStarted: true, kingDefeated: true, kingRewarded: true }), "");
});

test("every choice in every script leads somewhere real", () => {
  for (const [name, script] of Object.entries(SCRIPTS)) {
    for (const [id, node] of Object.entries(script.nodes)) {
      for (const ch of node.choices || []) assert.ok(ch.to === null || script.nodes[ch.to], `${name}.${id} -> ${ch.to}`);
      if (node.to) assert.ok(script.nodes[node.to], `${name}.${id} -> ${node.to}`);
    }
  }
});
