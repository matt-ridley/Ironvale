import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPANIONS, joinParty, benchCompanion, takeCompanion, cycleTactics, tacticsFor, companionStats } from "../src/rules/party.js";
import { createBattle, playerAction, isPlayerTurn, isAllyTurn } from "../src/rules/combat.js";
import { chooseAllyAction, allyAction, castable } from "../src/rules/tactics.js";
import { createCharacter, rest } from "../src/rules/character.js";
import { makeItem } from "../src/rules/items.js";
import { seededRng } from "../src/rules/dice.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { serialize, deserialize } from "../src/state/save.js";

// A wizard companion, only for these tests: no one in the game casts yet.
COMPANIONS.testWizard = { name: "Wiz", dexMod: 1, hpBase: 6, hpPerLevel: 4, startGear: { bow: "shortbow", armour: "padded" },
  casting: { mod: 3, spells: ["fireBolt", "magicMissile", "burningHands", "cureWounds"] } };

const withFriend = (id = "megan", opts = {}) => { const h = createCharacter(opts); joinParty(h, id); return h; };

/* A fight that starts on the given turn ("player" or "ally"), with the monsters made tough. */
function fight(hero, foes, turn, { lead = false, hp = 40 } = {}) {
  if (lead) hero.companion.lead = true;
  for (let seed = 1; seed <= 300; seed++) {
    const b = createBattle(structuredClone(hero), foes, seededRng(seed));
    if ((turn === "ally" ? isAllyTurn(b) : isPlayerTurn(b)) && b.log.length === 1) {
      b.monsters.forEach(m => { m.hp = m.maxHp = hp; });
      return b;
    }
  }
  throw new Error(`no seed starts on the ${turn}'s turn`);
}
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));
const state = hero => ({ hero, flags: {}, pos: { x: 6.5, y: 5.85 } });

test("the roster: leave your companion at an inn, and bring them back rested", () => {
  const h = withFriend();
  h.companion.hurt = 5;
  assert.deepEqual(benchCompanion(h), { ok: true, id: "megan" });
  assert.equal(h.companion, undefined);
  assert.deepEqual(h.roster.map(r => r.id), ["megan"]);
  assert.match(benchCompanion(h).reason, /No one/);
  assert.match(takeCompanion(h, "testWizard").reason, /isn't waiting/);
  assert.equal(takeCompanion(h, "megan").ok, true);
  assert.equal(h.companion.hurt, 0);
  assert.deepEqual(h.roster, []);
  // Taking one while another travels with you swaps them.
  h.roster = [{ id: "testWizard", hurt: 3, gear: {}, slotsUsed: [2] }];
  takeCompanion(h, "testWizard");
  assert.equal(h.companion.id, "testWizard");
  assert.deepEqual(h.companion.slotsUsed, []);
  assert.deepEqual(h.roster.map(r => r.id), ["megan"]);
});

test("Nell keeps the roster: ask your companion to wait, and bring them back", () => {
  const s = state(withFriend());
  const c = startConversation(SCRIPTS.inn, s);
  assert.ok(labels(c).includes("Ask Megan to wait here"));
  assert.ok(!labels(c).includes("Bring Megan along"));
  pick(c, "Ask Megan to wait here");
  assert.match(view(c).text, /Megan takes a seat/);
  assert.equal(s.hero.companion, undefined);
  const again = startConversation(SCRIPTS.inn, s);
  assert.ok(labels(again).includes("Bring Megan along"));
  pick(again, "Bring Megan along");
  assert.equal(s.hero.companion.id, "megan");
  assert.match(view(again).text, /rested and ready\.$/);
});

test("tactics: attack and heal for everyone, save magic only for casters", () => {
  assert.deepEqual(tacticsFor("megan"), ["attack", "heal"]);
  assert.deepEqual(tacticsFor("testWizard"), ["attack", "heal", "save"]);
  const h = withFriend();
  assert.equal(companionStats(h).tactics, "attack");
  assert.equal(cycleTactics(h), "heal");
  assert.equal(cycleTactics(h), "attack");
  h.companion.tactics = "save"; // not one of Megan's
  assert.equal(companionStats(h).tactics, "attack");
});

test("the roster, tactics and leading are saved", () => {
  const h = withFriend();
  h.companion.tactics = "heal";
  h.companion.lead = true;
  h.roster = [{ id: "testWizard", hurt: 2, gear: {}, slotsUsed: [1], tactics: "save" }, { id: "megan", hurt: 0, gear: {} }, { id: "dragon" }];
  const s = { hero: h, map: "overworld", pos: { x: 15.5, y: 20.85 }, facing: "down", stepsSinceFight: 0, flags: {}, bestiary: {}, lastHub: "oakhollow" };
  const loaded = deserialize(serialize(s)).hero;
  assert.equal(loaded.companion.tactics, "heal");
  assert.equal(loaded.companion.lead, true);
  assert.deepEqual(loaded.roster.map(r => [r.id, r.tactics, r.slotsUsed]), [["testWizard", "save", [1]]]); // no duplicate Megan, no dragon
  delete h.roster;
  assert.equal("roster" in deserialize(serialize(s)).hero, false);
});

test("Megan on ATTACK shoots the monster you last hit", () => {
  const b = fight(withFriend(), ["goblin", "goblin"], "player");
  b.focus = 1;
  assert.deepEqual(chooseAllyAction(b), { type: "shoot", target: 1 });
  b.monsters[1].hp = 0;
  assert.deepEqual(chooseAllyAction(b), { type: "shoot", target: 0 });
});

test("Megan on HEAL gives a potion to whoever's at half HP or less, else shoots", () => {
  const h = withFriend();
  h.companion.tactics = "heal";
  const b = fight(h, ["goblin"], "player");
  assert.equal(chooseAllyAction(b).type, "shoot");
  b.player.hp = 3;
  assert.deepEqual(chooseAllyAction(b), { type: "potion", on: "player" });
  b.ally.hp = 1; // worse off than you
  assert.deepEqual(chooseAllyAction(b), { type: "potion", on: "ally" });
  b.player.inventory = [];
  assert.equal(chooseAllyAction(b).type, "shoot");
});

test("a caster on ATTACK: area spells against a crowd, their best single spell otherwise, cantrips when out of slots", () => {
  const h = withFriend("testWizard");
  const crowd = fight(h, ["goblin", "goblin"], "player");
  assert.deepEqual(chooseAllyAction(crowd), { type: "cast", spell: "burningHands", slotLevel: 1 });
  const one = fight(h, ["goblin"], "player");
  assert.deepEqual(chooseAllyAction(one), { type: "cast", spell: "magicMissile", target: 0, slotLevel: 1 });
  one.player.companion.slotsUsed = [2];
  assert.deepEqual(chooseAllyAction(one), { type: "cast", spell: "fireBolt", target: 0, slotLevel: 0 });
  assert.deepEqual(castable(one).map(c => c.id), ["fireBolt"]);
});

test("a caster on SAVE MAGIC uses cantrips only; on HEAL, a healing spell first", () => {
  const h = withFriend("testWizard");
  h.companion.tactics = "save";
  const b = fight(h, ["goblin", "goblin"], "player");
  assert.equal(chooseAllyAction(b).spell, "fireBolt");
  b.player.companion.tactics = b.ally.tactics = "heal";
  b.player.hp = 2;
  assert.deepEqual(chooseAllyAction(b), { type: "cast", spell: "cureWounds", target: "player", slotLevel: 1 });
  b.player.hp = b.player.maxHp;
  assert.equal(chooseAllyAction(b).spell, "fireBolt", "heal keeps slots: cantrips while no one needs healing");
});

test("a companion casting spends a slot, refilled by a long rest; a bad target costs nothing", () => {
  const h = withFriend("testWizard");
  const b = fight(h, ["goblin"], "ally", { lead: true });
  assert.ok(isAllyTurn(b));
  assert.match(allyAction(b, { type: "cast", spell: "cureWounds", target: 7, slotLevel: 1 }).reason, /yourself or a friend/);
  assert.deepEqual(b.player.companion.slotsUsed ?? [], []);
  const r = allyAction(b, { type: "cast", spell: "magicMissile", target: 0, slotLevel: 1 }, seededRng(3));
  assert.equal(r.ok, true);
  assert.equal(r.events.filter(e => e.type === "spell-hit").length, 3);
  assert.deepEqual(b.player.companion.slotsUsed, [1]);
  rest(b.player);
  assert.deepEqual(b.player.companion.slotsUsed, []);
});

test("leading your companion: their turn waits for you, then the fight goes on", () => {
  const b = fight(withFriend(), ["goblin"], "ally", { lead: true });
  assert.ok(isAllyTurn(b) && !isPlayerTurn(b));
  assert.match(playerAction(b, { type: "attack" }).reason, /isn't your turn/);
  const r = allyAction(b, { type: "shoot", target: 0 }, seededRng(5));
  assert.equal(r.ok, true);
  assert.equal(r.events[0].type, "ally-attack");
  assert.ok(isPlayerTurn(b) || isAllyTurn(b) || b.state !== "active");
  assert.match(allyAction(fight(withFriend(), ["goblin"], "player"), { type: "shoot" }).reason, /isn't Megan's turn/);
});

test("AUTO lets them follow their tactics; potions from your pack work for them too", () => {
  const h = withFriend();
  h.inventory = [makeItem("potionHealing")];
  const b = fight(h, ["goblin"], "ally", { lead: true });
  b.player.hp = 2;
  b.ally.tactics = "heal";
  const r = allyAction(b, { type: "auto" }, seededRng(1));
  assert.equal(r.events[0].type, "ally-heal");
  assert.ok(r.events[0].heal >= 4); // 2d4+2 (the goblin may hit you straight after)
  assert.equal(b.player.inventory.length, 0);
});

test("without leading, your companion's turns play by themselves as before", () => {
  const b = fight(withFriend(), ["goblin"], "player");
  assert.equal(b.leadAlly, false);
  playerAction(b, { type: "defend" }, seededRng(2));
  assert.ok(isPlayerTurn(b) || b.state !== "active");
});
