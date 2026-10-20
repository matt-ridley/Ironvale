import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, titleOf, callName, DEFAULT_NAME, MAX_NAME } from "../src/story/hero.js";
import { createCharacter } from "../src/rules/character.js";
import { makeItem, describeItem, groupPack } from "../src/rules/items.js";
import { sellItem } from "../src/rules/gear.js";
import { state, newGame } from "../src/state/game.js";
import { serialize, deserialize } from "../src/state/save.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { startConversation, view } from "../src/story/dialogue.js";

const fresh = (name, flags = {}) => ({ hero: createCharacter({ name }), flags, pos: { x: 5.5, y: 5.85 } });

test("names are tidied: letters, spaces, hyphens and apostrophes, capitalised, at most 10 long", () => {
  assert.equal(cleanName("MARY"), "Mary");
  assert.equal(cleanName("  mARY-jane "), "Mary-Jane");
  assert.equal(cleanName("o'brien"), "O'Brien");
  assert.equal(cleanName("Sir  Lancelot du Lac"), "Sir Lancel");
  assert.equal(cleanName("R2D2!"), "Rd");
  assert.equal(cleanName(""), DEFAULT_NAME);
  assert.equal(cleanName("  "), DEFAULT_NAME);
  assert.equal(cleanName(undefined), DEFAULT_NAME);
  assert.ok(cleanName("abcdefghijklmnop").length <= MAX_NAME);
});

test("a new game uses the name you picked", () => {
  newGame("ROBIN");
  assert.equal(state.hero.name, "Robin");
  newGame();
  assert.equal(state.hero.name, "Hero");
});

test("titles: a Traveller, then the Hero of Oakhollow once the Goblin King falls", () => {
  assert.equal(titleOf({}), "Traveller");
  assert.equal(titleOf({ chiefDefeated: true }), "Traveller");
  assert.equal(titleOf({ kingDefeated: true }), "Hero of Oakhollow");
  assert.equal(callName({ name: "Hero" }), "");
  assert.equal(callName({ name: "Robin" }), "Robin");
});

test("people use your name and title once you've earned it, and read well without a name", () => {
  const done = { questStarted: true, logCleared: true, chiefDefeated: true, questRewarded: true, kingQuestStarted: true, kingDefeated: true, kingRewarded: true };
  assert.match(view(startConversation(SCRIPTS.elder, fresh("Robin", done))).text, /^Robin, Hero of Oakhollow!/);
  assert.match(view(startConversation(SCRIPTS.elder, fresh("Hero", done))).text, /^Hero of Oakhollow!/);
  assert.match(view(startConversation(SCRIPTS.journal, fresh("Robin", done))).text, /written Robin, Hero of Oakhollow, in the village book/);
  assert.match(view(startConversation(SCRIPTS.journal, fresh("Hero", done))).text, /our hero's name in the village book/);
  assert.match(view(startConversation(SCRIPTS.villager, fresh("Robin", done))).text, /Goblin KING, Robin\?/);
  assert.match(view(startConversation(SCRIPTS.inn, fresh("Robin", done))).text, /^Robin, Hero of Oakhollow, in my inn/);
  const thanks = startConversation(SCRIPTS.elder, fresh("Robin", { questStarted: true, chiefDefeated: true }));
  assert.match(view(thanks).text, /You did it, Robin!/);
});

test("the sword you start with has a worn crest: it says so, never stacks, and can't be sold", () => {
  const c = createCharacter({ potions: 0 });
  const sword = c.equipment.weapon;
  assert.equal(sword.crest, true);
  assert.match(describeItem(sword), /worn crest is stamped on the pommel/);
  assert.doesNotMatch(describeItem(makeItem("longsword")), /crest/);
  c.equipment.weapon = null;
  c.inventory.push(sword, makeItem("longsword"));
  assert.equal(groupPack(c.inventory).length, 2);
  assert.match(sellItem(c, sword.uid).reason, /rather keep it/);
  assert.equal(sellItem(c, c.inventory[1].uid).ok, true);
});

test("saves keep the crest; older saves put it on their first longsword, and names are tidied", () => {
  const hero = createCharacter();
  const s = { hero, map: "overworld", pos: { x: 15.5, y: 20.85 }, facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "oakhollow" };
  assert.equal(deserialize(serialize(s)).hero.equipment.weapon.crest, true);
  const old = JSON.parse(serialize(s));
  old.format = 4;
  delete old.state.hero.equipment.weapon.crest;
  old.state.hero.name = "  sAM ";
  const loaded = deserialize(JSON.stringify(old)).hero;
  assert.equal(loaded.equipment.weapon.crest, true);
  assert.equal(loaded.name, "Sam");
  // A hero who swapped to a greatsword: the crest goes on the longsword in their pack.
  old.state.hero.equipment.weapon = { uid: "g", base: "greatsword", upgrade: 0 };
  old.state.hero.inventory = [{ uid: "l", base: "longsword", upgrade: 1 }];
  assert.equal(deserialize(JSON.stringify(old)).hero.inventory[0].crest, true);
  // No longsword at all: nothing gets one.
  old.state.hero.inventory = [];
  assert.equal(deserialize(JSON.stringify(old)).hero.equipment.weapon.crest, undefined);
});
