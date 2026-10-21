// The companions' quests in Act 3: Matthew's Arrows (Megan's father, Volley, archery rematches at the keep) and the
// Frozen Chapel (Robyn's Turn Undead and Spiritual Weapon), and the chapel's wraiths.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { safePlace } from "../src/world/travel.js";
import { SCRIPTS, sideObjective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { arrowsFound, CHAPEL_FIGHT, MATTHEW_REWARD } from "../src/story/act3.js";
import { createCharacter, gainXp, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty, companionStats } from "../src/rules/party.js";
import { createBattle, isAllyTurn } from "../src/rules/combat.js";
import { allyTurn, allyAction, chooseAllyAction, canVolley } from "../src/rules/tactics.js";
import { castSpell, makeCaster } from "../src/rules/magic.js";
import { hasCondition } from "../src/rules/conditions.js";
import { winPrize } from "../src/rules/minigames.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";

const pass = MAPS.pass;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const hero = (companion, level = 10) => { const h = createCharacter({ name: "Robin" }); gainXp(h, XP_FOR_LEVEL[level], () => 0.5); h.asi = 0; if (companion) joinParty(h, companion); return h; };
const obj = (map, id) => MAPS[map].objects.find(o => o.id === id);
const talk = (s, map, id) => startConversation(SCRIPTS[obj(map, id).script], s, { object: obj(map, id) });
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const ACT3 = { kingDefeated: true, signetReturned: true, varricDefeated: true, bladeReforged: true, keepHome: true, rockslideOpen: true, wardenTraining: true };

test("Matthew's arrows: only Megan knows them, and they lead to the watchtower", () => {
  const flags = { ...ACT3, matthewQuest: true }, s = { hero: hero("megan"), flags };
  assert.ok(!activeObjects(pass, { ...ACT3 }).some(o => o.id === "arrow1"));
  for (const id of ["arrow1", "arrow2", "arrow3"]) assert.ok(activeObjects(pass, flags).some(o => o.id === id));
  const alone = { hero: hero("rachel"), flags };
  assert.match(view(talk(alone, "pass", "arrow1")).text, /Megan would know whose/);
  assert.equal(arrowsFound(flags), 0);
  assert.match(view(talk(s, "pass", "arrow1")).text, /Da's. \(1 of 3\)/);
  through(talk(s, "pass", "arrow2"));
  through(talk(s, "pass", "arrow3"));
  assert.equal(arrowsFound(flags), 3);
  assert.equal(sideObjective(flags, s), "Follow Matthew's arrows up the pass, with Megan");
});

test("at the watchtower: Matthew shoots at strangers, comes out for Megan, and teaches her Volley", () => {
  const flags = { ...ACT3, matthewQuest: true }, h = hero("megan"), s = { hero: h, flags };
  assert.match(view(talk({ hero: hero("robyn"), flags }, "pass", "matthew")).text, /That's close enough/);
  const xp = h.xp;
  const all = through(talk(s, "pass", "matthew"));
  assert.match(all, /It's me! It's Meg!.*Griffons took the survey party.*Megan learned VOLLEY/s);
  assert.equal(h.companion.volley, true);
  assert.equal(flags.matthewFound, true);
  assert.equal(h.xp, xp + MATTHEW_REWARD.xp);
  assert.ok(!activeObjects(pass, flags).some(o => o.id === "matthew"));
  assert.ok(activeObjects(MAPS.keep, flags).some(o => o.id === "matthewKeep"));
  assert.equal(safePlace({ map: "pass", pos: feetAt(7, 19), flags }).id, "watchtower");
  assert.ok(questLog(flags).find(q => q.id === "matthew").done);
  const back = deserialize(serialize({ hero: h, map: "keep", pos: feetAt(19, 29), flags, facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" }));
  assert.equal(back.hero.companion.volley, true);
});

test("Volley: once a fight, a shot at every monster; by herself, Megan looses it when there's more than one", () => {
  const h = hero("megan");
  h.companion.volley = true;
  for (let seed = 1; seed < 100; seed++) {
    const rng = seededRng(seed), b = createBattle(h, ["griffon", "griffon"], rng);
    if (b.state !== "active") continue;
    for (const m of b.monsters) m.hp = m.maxHp = 999;
    b.volleyUsed = false; // (she may already have had a turn before yours)
    assert.ok(canVolley(b));
    assert.deepEqual(chooseAllyAction(b), { type: "volley" });
    const start = b.log.length;
    allyTurn(b, rng);
    const shots = b.log.slice(start).filter(e => e.type === "ally-attack");
    assert.equal(shots.length, 2);
    assert.deepEqual(new Set(shots.map(e => e.target)), new Set([0, 1]));
    assert.equal(canVolley(b), false);
    return;
  }
});

test("Matthew's rematches at the keep: archery against his 40, and his griffon longbow goes to Megan", () => {
  const flags = { ...ACT3, matthewFound: true }, h = hero("megan"), s = { hero: h, flags };
  const c = talk(s, "keep", "matthewKeep");
  pick(c, "Archery!");
  assert.deepEqual(takeEvents(c).find(e => e.type === "minigame"), { type: "minigame", key: "Archery", data: { rival: "matthew" } });
  const bow = winPrize(h, flags, "archeryMatthew");
  assert.equal(bow.base, "griffonBow");
  assert.equal(h.companion.gear.bow, bow);
  assert.equal(bow.upgrade, 2);
  assert.equal(winPrize(h, flags, "archeryMatthew"), null); // once
  // With Rachel: something Matthew saw, years back.
  const r = { hero: hero("rachel"), flags };
  const c2 = talk(r, "keep", "matthewKeep");
  pick(c2, "Seen anything strange up there?");
  assert.match(through(c2), /Had your face, scholar.*must be mistaken/s);
});

test("the Frozen Chapel: cold without Robyn; with her, the dead rise, and she learns Turn Undead and Spiritual Weapon", () => {
  const flags = { ...ACT3, chapelQuest: true }, h = hero("robyn"), s = { hero: h, flags };
  assert.match(view(talk({ hero: hero("megan"), flags }, "pass", "iceAltar")).text, /need a priest/);
  const c = talk(s, "pass", "iceAltar");
  pick(c, "Light it.");
  through(c);
  const fight = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(fight.foes, CHAPEL_FIGHT);
  flags.chapelCleared = true;
  assert.match(through(startConversation(SCRIPTS[fight.afterWin], s)), /It ANSWERED.*TURN UNDEAD/s);
  assert.equal(flags.chapelLit, true);
  assert.ok(companionStats(h).casting.spells.includes("turnUndead"));
  assert.ok(companionStats(h).casting.spells.includes("spiritualWeapon"));
  assert.ok(activeObjects(pass, flags).some(o => o.id === "chapelBrazier"));
  assert.equal(safePlace({ map: "pass", pos: feetAt(40, 32), flags }).id, "chapel");
  assert.ok(questLog(flags).find(q => q.id === "chapel").done);
});

test("Turn Undead touches only the undead, which lose their turns until hurt; Robyn turns them first by herself", () => {
  const h = hero("robyn");
  h.companion.spells = ["sacredFlame", "cureWounds", "healingWord", "bless", "turnUndead", "spiritualWeapon"];
  const rng = seededRng(5);
  const b = createBattle(h, ["wraith", "griffon"], rng);
  const caster = { ...makeCaster({ name: "Robyn", key: "ally", level: 10, mod: 3 }), saveDc: 99 };
  assert.ok(castSpell(b, caster, "turnUndead", {}, rng).ok);
  assert.ok(hasCondition(b, 0, "turned"));
  assert.ok(!hasCondition(b, 1, "turned")); // the griffon isn't undead
  const none = createBattle(h, ["griffon"], rng);
  assert.match(castSpell(none, caster, "turnUndead", {}, rng).reason, /nothing here/);
  const fresh = createBattle(h, ["wraith"], rng);
  fresh.conditions = {}; // (she may already have turned it, if she went before you)
  h.companion.slotsUsed = [];
  assert.equal(chooseAllyAction(fresh).spell, "turnUndead");
});
