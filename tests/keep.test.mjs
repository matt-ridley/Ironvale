import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, exitAt, isWalkable, reachable, zoneAt } from "../src/world/map.js";
import { rollEncounter } from "../src/world/encounters.js";
import { feetAt } from "../src/world/movement.js";
import { SCRIPTS, objective, KEEP_CHECKS, LOCK_CHECKS, locksOpen } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { createCharacter, weaponAttack } from "../src/rules/character.js";
import { makeItem, silverItem, itemName, describeItem } from "../src/rules/items.js";
import { adjustDamage, spawnMonster } from "../src/rules/combat.js";
import { SILVER_COST, SHOPS } from "../src/data/items.js";
import { MONSTERS } from "../src/data/monsters.js";
import { simulate } from "../tools/simulate.mjs";
import { faces } from "./helpers.mjs";

const keep = MAPS.keep, fen = MAPS.ironvale;
const obj = id => keep.objects.find(o => o.id === id);
const near = (from, o) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`));
const fresh = (flags = {}) => ({ hero: createCharacter({ name: "Robin" }), flags: { ...flags }, pos: feetAt(19, 30) });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));

test("the portcullis: up with STR or the winch with DEX, then it leads into the keep and back out", () => {
  assert.ok(activeObjects(fen, {}).some(o => o.id === "keepGate"));
  const s = fresh({ causewayRaised: true });
  const c = startConversation(SCRIPTS.keepGate, s, { rng: faces("2/20", "12/20") });
  pick(c, `Heave it up (STR, DC ${KEEP_CHECKS.lift.dc})`);
  assert.match(view(c).text, /says no/);
  pick(c, `Find the winch (DEX, DC ${KEEP_CHECKS.winch.dc})`); // 12 + 1
  assert.equal(s.flags.keepGateOpened, true);
  assert.ok(!activeObjects(fen, s.flags).some(o => o.id === "keepGate"));
  const into = exitAt(fen, 31, 26);
  assert.equal(into.to, "keep");
  assert.ok(isWalkable(keep, into.at.x, into.at.y));
  const out = keep.exits[0];
  assert.equal(out.to, "ironvale");
  assert.ok(isWalkable(fen, out.at.x, out.at.y, { causewayRaised: true }));
  assert.equal(exitAt(fen, out.at.x, out.at.y), null);
});

test("inside the keep you can reach every lock, chest and the tools; the tomb only once its door opens", () => {
  const from = reachable(keep, keep.spawn, {});
  for (const id of ["courtyardLever", "chapelSeal", "armouryLever", "brannocTools", "chapelChest", "courtyardChest", "tombDoor"]) assert.ok(near(from, obj(id)), `can't reach ${id}`);
  assert.ok(!near(from, obj("sarcophagus")), "the tomb should be shut");
  assert.ok(near(reachable(keep, keep.spawn, { tombOpen: true }), obj("sarcophagus")));
  assert.equal(zoneAt(keep, 19, 3).id, "tomb");
  assert.equal(zoneAt(keep, 5, 20).id, "chapel");
  assert.equal(zoneAt(keep, 33, 20).id, "armoury");
  assert.ok(rollEncounter("courtyard", "flagstone", 99, () => 0));
  assert.equal(rollEncounter("tomb", "flagstone", 99, () => 0), null);
});

test("the tomb door's three locks: each one counts, and the third opens the door", () => {
  const s = fresh({ keepGateOpened: true });
  const open = (id, dice) => {
    const c = startConversation(SCRIPTS.lock, s, { object: obj(id), rng: faces(dice) });
    pick(c, `Force it (STR, DC ${LOCK_CHECKS.force.dc})`);
    return view(c).text;
  };
  assert.match(open("courtyardLever", "15/20"), /1 of the tomb's three locks/);
  assert.match(open("chapelSeal", "2/20"), /doesn't give/);
  assert.match(open("chapelSeal", "12/20"), /2 of the tomb's three locks/);
  assert.equal(objective({ ...s.flags, ...q5 }), "Open the tomb's three locks in the keep (2/3)");
  assert.match(open("armouryLever", "20/20"), /the tomb door is open/);
  assert.equal(s.flags.tombOpen, true);
  assert.equal(locksOpen(s.flags), 3);
  assert.equal(startConversation(SCRIPTS.lock, s, { object: obj("chapelSeal") }).node, "done");
  assert.ok(!activeObjects(keep, s.flags).some(o => o.id === "tombDoor"));
});
const q5 = { questStarted: true, chiefDefeated: true, questRewarded: true, kingQuestStarted: true, kingDefeated: true, kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true, fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true };

test("quest 5 in the log and on the HUD", () => {
  assert.equal(objective({ ...q5, keepGateOpened: false }), "Open the portcullis of Ironvale Keep");
  assert.equal(objective({ ...q5, tombOpen: true }), "Go down into Lord Varric's tomb");
  const steps = f => questLog(f).find(q => q.id === "keep").steps.map(st => (st.done ? "x" : st.current ? ">" : "."));
  assert.deepEqual(steps({ causewayRaised: true }), [">", ".", ".", ".", ".", "."]);
  assert.deepEqual(steps({ ...q5, courtyardLever: true, chapelSeal: true, armouryLever: true, tombOpen: true, seenTomb: true }), ["x", "x", "x", "x", "x", ">"]);
});

test("damage types: skeletons crumble to bludgeoning, wights shrug off unsilvered weapons, ghasts resist necrotic", () => {
  const skeleton = spawnMonster("skeleton", () => 0.5), wight = spawnMonster("wight", () => 0.5), ghast = spawnMonster("ghast", () => 0.5);
  assert.deepEqual(adjustDamage(skeleton, 7, "bludgeoning"), { damage: 14, note: "weak" });
  assert.deepEqual(adjustDamage(skeleton, 7, "slashing"), { damage: 7, note: null });
  assert.deepEqual(adjustDamage(wight, 9, "slashing"), { damage: 4, note: "resists" });
  assert.deepEqual(adjustDamage(wight, 9, "slashing", { silvered: true }), { damage: 9, note: null });
  assert.deepEqual(adjustDamage(wight, 9, "radiant"), { damage: 9, note: null });
  assert.deepEqual(adjustDamage(ghast, 9, "necrotic"), { damage: 4, note: "resists" });
  assert.equal(weaponAttack(createCharacter()).damageType, "slashing");
  assert.equal(weaponAttack(createCharacter({ weapon: "warhammer" })).damageType, "bludgeoning");
});

test("silvering at Brannoc's forge: 100 gold, weapons and bows only, once", () => {
  assert.ok(SHOPS.forge.tabs.includes("silver"));
  const c = createCharacter({ gold: 250 });
  const sword = c.equipment.weapon;
  assert.match(silverItem(c, c.equipment.armour.uid).reason, /Only weapons/);
  assert.equal(silverItem(c, sword.uid).ok, true);
  assert.equal(c.gold, 250 - SILVER_COST);
  assert.equal(itemName(sword), "Silvered Longsword");
  assert.match(describeItem(sword), /Silvered/);
  assert.match(silverItem(c, sword.uid).reason, /already silvered/);
  assert.equal(weaponAttack(c).silvered, true);
  c.gold = 10;
  c.inventory.push(makeItem("mace"));
  assert.match(silverItem(c, c.inventory.at(-1).uid).reason, /costs 100/);
});

test("Brannoc's tools: found in the armoury, and he silvers your weapon for them", () => {
  const s = fresh({ keepGateOpened: true, brannocFreed: true });
  startConversation(SCRIPTS.brannocTools, s);
  assert.equal(s.flags.toolsFound, true);
  assert.ok(s.hero.inventory.some(i => i.base === "brannocTools"));
  const c = startConversation(SCRIPTS.brannocForge, s);
  choose(c);
  pick(c, "Give Brannoc his tools");
  assert.equal(s.flags.toolsReturned, true);
  assert.equal(s.hero.equipment.weapon.silvered, true);
  assert.match(view(c).text, /My tools!.*silvers your/);
  assert.ok(questLog(s.flags).find(q => q.id === "tools").done);
});

test("the keep's monsters, and what the simulator says about them", () => {
  for (const id of ["skeleton", "ghast", "wight", "helmedHorror"]) assert.equal(MONSTERS[id].type === "construct" || MONSTERS[id].type === "undead", true, id);
  // A level 6 hero with +3 gear and Robyn should handle the keep's fights, and a wight hurts without silver.
  const plain = simulate({ level: 6, upgrade: 3, potions: 3 }, ["wight"], { fights: 300 });
  const silver = simulate({ level: 6, upgrade: 3, potions: 3, silvered: true }, ["wight"], { fights: 300 });
  assert.ok(silver >= plain, `silver (${silver}) should help against a wight (${plain})`);
  assert.ok(simulate({ level: 6, upgrade: 3, potions: 3, companion: "robyn" }, ["skeleton", "skeleton"], { fights: 300 }) > 0.9);
});
