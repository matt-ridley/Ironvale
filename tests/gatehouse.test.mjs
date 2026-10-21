// Quest 8, the Wardens' Gatehouse: the door that wants all three runes, the rune doors, rune-iron and the Wardenblade's
// second form, Rachel's COUNTER, Thorne and his shield guardian, and his fate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachableSliding } from "../src/world/map.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { THORNE_FIGHT, GATEHOUSE_REWARD, allThreeRunes } from "../src/story/act3.js";
import { createCharacter, gainXp, learnRune, runeSlots, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { createBattle, reactAction, isReacting, isPlayerTurn, playerAction, acOf, GUARD_AC } from "../src/rules/combat.js";
import { canCounter } from "../src/rules/tactics.js";
import { hasCondition } from "../src/rules/conditions.js";
import { seededRng } from "../src/rules/dice.js";
import { MONSTERS } from "../src/data/monsters.js";
import { serialize, deserialize } from "../src/state/save.js";
import { feetAt } from "../src/world/movement.js";
import { makeHero, playFight } from "../tools/simulate.mjs";

const gate = MAPS.gatehouse, pass = MAPS.pass;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const hero = (level = 11) => { const h = createCharacter({ name: "Robin", weapon: "wardenblade" }); gainXp(h, XP_FOR_LEVEL[level], () => 0.5); h.asi = 0; return h; };
const obj = (map, id) => MAPS[map].objects.find(o => o.id === id);
const talk = (s, map, id) => startConversation(SCRIPTS[obj(map, id).script], s, { object: obj(map, id) });
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const ROAD = { kingDefeated: true, kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true,
  seenFen: true, fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, heardTremor: true, metRachel: true,
  metColleen: true, bindingStolen: true, signetReturned: true, varricDefeated: true, bladeReforged: true, keepHome: true, rockslideOpen: true, wardenTraining: true,
  waystoneIron: true, waystoneCall: true, bindingRecovered: true, waystoneBinding: true, wardensRoad: true };
const warden = () => { const h = hero(); for (const r of ["runeStrike", "ironWard", "wardensCall", "binding"]) learnRune(h, r); return h; };

test("the gatehouse door opens only for a Warden who knows all three runes", () => {
  const flags = { ...ROAD }, h = hero(), s = { hero: h, flags };
  learnRune(h, "ironWard");
  assert.equal(allThreeRunes(h), false);
  assert.match(view(talk(s, "pass", "gatehouseDoor")).text, /none of them glows/);
  learnRune(h, "wardensCall"); learnRune(h, "binding");
  const c = talk(s, "pass", "gatehouseDoor");
  pick(c, "Raise the Wardenblade");
  assert.equal(flags.gatehouseOpen, true);
  assert.ok(!activeObjects(pass, flags).some(o => o.id === "gatehouseDoor"));
  assert.equal(pass.exits.find(e => e.to === "gatehouse").y, 3);
  assert.ok(questLog(flags).some(q => q.id === "gatehouse"));
  assert.equal(objective(flags), "Get through the gatehouse's rune doors");
});

test("the rune doors: the right rune opens each; a wrong one bites; Rachel reads which", () => {
  const flags = { ...ROAD, gatehouseOpen: true }, h = warden(), s = { hero: h, flags };
  let c = talk(s, "gatehouse", "runeDoor1");
  assert.match(view(c).text, /stand where the wall stands/);
  const hp = h.hp;
  pick(c, "Touch the blade to the Call");
  assert.match(view(c).text, /wrong rune/);
  assert.ok(h.hp < hp && h.hp >= 1);
  pick(c, "Try again");
  pick(c, "Touch the blade to Iron");
  assert.equal(flags.runeDoor1, true);
  joinParty(h, "rachel");
  assert.match(view(talk(s, "gatehouse", "runeDoor2")).text, /That's the Call/);
  for (const [id, rune] of [["runeDoor2", "the Call"], ["runeDoor3", "the Binding"]]) pick(talk(s, "gatehouse", id), `Touch the blade to ${rune}`);
  assert.ok(flags.runeDoor2 && flags.runeDoor3);
  // With the doors open, everything inside can be reached from the way in (ice and all).
  const from = reachableSliding(gate, gate.spawn, flags);
  for (const o of activeObjects(gate, flags)) assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`)), o.id);
  // ...but not past a shut door.
  assert.ok(!reachableSliding(gate, gate.spawn, { ...flags, runeDoor1: false }).has("20,20"));
});

test("rune-iron from the frozen forge: Brannoc makes the Wardenblade's second form, one more rune slot", () => {
  const flags = { ...ROAD, gatehouseOpen: true }, h = warden(), s = { hero: h, flags };
  through(talk(s, "gatehouse", "oreBin"));
  assert.ok(h.inventory.some(i => i.base === "runeIron"));
  const slots = runeSlots(h);
  const c = startConversation(SCRIPTS.keepForge, s);
  pick(c, "Show Brannoc the rune-iron");
  through(c);
  assert.equal(h.bladeForm, 2);
  assert.equal(runeSlots(h), slots + 1);
  assert.ok(!h.inventory.some(i => i.base === "runeIron"));
  assert.ok(questLog(flags).find(q => q.id === "runeIron").done);
  const back = deserialize(serialize({ hero: h, map: "keep", pos: feetAt(19, 29), flags, facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" }));
  assert.equal(back.hero.bladeForm, 2);
});

test("Thorne: his guardian wards him (+3 AC while it stands), and with Rachel there he loses his first turn", () => {
  const h = warden();
  joinParty(h, "rachel");
  const rng = seededRng(3), b = createBattle(h, THORNE_FIGHT, rng);
  assert.equal(acOf(b, 0), MONSTERS.thorne.ac + GUARD_AC);
  b.monsters[1].hp = 0;
  assert.equal(acOf(b, 0), MONSTERS.thorne.ac);
  assert.ok(b.log.some(e => e.type === "hesitate"));
  const alone = createBattle(warden(), THORNE_FIGHT, rng);
  assert.ok(!alone.log.some(e => e.type === "hesitate"));
});

test("COUNTER: when a monster starts a spell and Rachel can, the fight asks; it stops a 3rd-level spell outright", () => {
  const mk = () => { const h = warden(); joinParty(h, "rachel"); h.companion.spells = ["fireBolt", "magicMissile", "shield", "sleep", "counterspell"]; return h; };
  // Find a fight where Thorne casts his Rune of Frost (3rd level) while Rachel can answer.
  for (let seed = 1; seed < 400; seed++) {
    const rng = seededRng(seed), b = createBattle(mk(), THORNE_FIGHT, rng);
    for (const m of b.monsters) m.hp = m.maxHp = 999;
    for (let i = 0; i < 40 && b.state === "active" && !(isReacting(b) && b.pending.kind === "counter" && b.pending.spell.level === 3); i++) {
      if (b.pending) reactAction(b, false, rng);
      else if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, rng);
      else break;
    }
    if (!(isReacting(b) && b.pending.kind === "counter" && b.pending.spell.level === 3)) continue;
    assert.ok(canCounter(b));
    const hp = b.player.hp, allyHp = b.ally.hp;
    const r = reactAction(b, true, rng);
    assert.ok(r.events.some(e => e.type === "counter"));
    assert.ok(!r.events.some(e => e.type === "monster-spell"));
    assert.ok(b.player.companion.slotsUsed.some(n => n > 0)); // a slot spent
    return;
  }
  assert.fail("Thorne never cast a 3rd-level spell before your turn");
});

test("COUNTER isn't offered without Counterspell, and never against a breath", () => {
  const h = warden();
  joinParty(h, "rachel");
  const rng = seededRng(1), b = createBattle(h, ["chimera"], rng);
  assert.equal(canCounter(b), false); // she doesn't know it yet
  assert.ok(MONSTERS.chimera.spells.every(sp => sp.breath));
});

test("after Thorne: spare him or leave him to the mountain; quest 8 pays either way", () => {
  for (const choice of ["Spare him: chain him, take him to the keep", "Leave him to the mountain"]) {
    const flags = { ...ROAD, gatehouseOpen: true, runeDoor1: true, runeDoor2: true, runeDoor3: true }, h = warden(), s = { hero: h, flags };
    joinParty(h, "rachel");
    const c = talk(s, "gatehouse", "thorne");
    assert.match(through(c), /Don't you DARE/);
    pick(c, "Fight!");
    const fight = takeEvents(c).find(e => e.type === "battle");
    assert.deepEqual(fight.foes, THORNE_FIGHT);
    assert.equal(fight.music, "thorne");
    flags.thorneDefeated = true;
    const xp = h.xp, after = startConversation(SCRIPTS[fight.afterWin], s);
    through(after);
    pick(after, choice);
    through(after);
    assert.equal(flags.gatehouseDone, true);
    assert.equal(h.xp - xp >= GATEHOUSE_REWARD.xp, true);
    assert.equal(!!flags.thorneSpared, choice.startsWith("Spare"));
    assert.equal(!!flags.thorneLeft, !choice.startsWith("Spare"));
    assert.equal(objective(flags), "Face the Door");
    assert.ok(questLog(flags).find(q => q.id === "gatehouse").done);
  }
});

test("the simulator: Thorne is beatable at level 11 with +4 gear, easier with Rachel and her COUNTER", () => {
  const runes = ["runeStrike", "ironWard", "wardensCall", "binding"];
  const rate = (companion, counter) => {
    let won = 0;
    for (let i = 0; i < 120; i++) {
      const h = makeHero({ level: 11, upgrade: 4, potions: 3, greater: 3, weapon: "wardenblade", silvered: true, runes, companion });
      h.bladeForm = 2;
      if (counter) h.companion.spells = ["fireBolt", "magicMissile", "shield", "sleep", "fireball", "counterspell"];
      if (playFight(h, THORNE_FIGHT, seededRng(i + 1)) === "won") won++;
    }
    return won / 120;
  };
  const withRachel = rate("rachel", true), withMegan = rate("megan", false);
  assert.ok(withRachel >= 0.9, `Rachel: ${withRachel}`);
  assert.ok(withMegan >= 0.6, `Megan: ${withMegan}`);
  assert.ok(withRachel > withMegan);
});
