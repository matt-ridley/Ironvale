// Quest 7, the Warden's Road: Warden Colleen and the three waystones' trials, the runes they teach (Iron Ward, a
// reaction that pauses the fight; Warden's Call; the Rune of Binding), Thorne's camp, the pass's monsters (troll
// regeneration, wyvern poison, weapons that need magic), the sun charm and the wolves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachableSliding } from "../src/world/map.js";
import { feetAt } from "../src/world/movement.js";
import { safePlace, travelPoints } from "../src/world/travel.js";
import { ENCOUNTERS } from "../src/world/encounters.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { titleOf } from "../src/story/hero.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { zoneEvent, IRON_TRIAL, CALL_TRIAL, GUARDIAN_FIGHT, WAYSTONE_REWARD, ROAD_REWARD } from "../src/story/act3.js";
import { createCharacter, gainXp, learnRune, knowsRune, runesLeft, XP_FOR_LEVEL, IRON_WARD_AC } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { makeItem } from "../src/rules/items.js";
import { createBattle, playerAction, reactAction, isPlayerTurn, isReacting, adjustDamage, spawnMonster } from "../src/rules/combat.js";
import { addCondition, hasCondition } from "../src/rules/conditions.js";
import { seededRng } from "../src/rules/dice.js";
import { MONSTERS } from "../src/data/monsters.js";
import { LORE } from "../src/rules/bestiary.js";
import { simulate } from "../tools/simulate.mjs";

const pass = MAPS.pass;
const ACT3 = { kingDefeated: true, kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true,
  seenFen: true, fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true,
  varricDefeated: true, signetReturned: true, bladeReforged: true, keepHome: true, heardTremor: true, metRachel: true, rockslideOpen: true };
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const hero = (level = 9) => { const h = createCharacter({ name: "Robin", weapon: "wardenblade" }); gainXp(h, XP_FOR_LEVEL[level], () => 0.5); h.asi = 0; return h; };
const obj = id => pass.objects.find(o => o.id === id);
const talk = (s, id) => startConversation(SCRIPTS[obj(id).script], s, { object: obj(id) });
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };

/* A fight where a gargoyle's blow is about to land and Iron Ward could stop it. */
function wardMoment(h) {
  for (let seed = 1; seed < 500; seed++) {
    const rng = seededRng(seed), b = createBattle(h(), ["gargoyle"], rng);
    b.monsters[0].hp = b.monsters[0].maxHp = 999;
    for (let i = 0; i < 20 && b.state === "active" && !isReacting(b); i++) if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, rng);
    if (isReacting(b)) return { b, rng };
  }
  throw new Error("no ward moment");
}

test("Iron Ward: a blow that +5 AC would stop pauses the fight; warding spends a slot and turns it into a miss", () => {
  const mk = () => { const h = hero(); learnRune(h, "ironWard"); return h; };
  const { b, rng } = wardMoment(mk);
  const r = b.pending.roll;
  assert.ok(r.hit && !r.crit && r.total < r.targetAc + IRON_WARD_AC);
  assert.equal(isPlayerTurn(b), false);
  assert.match(playerAction(b, { type: "attack" }, rng).reason, /isn't your turn/);
  const hp = b.player.hp, slots = runesLeft(b.player);
  const res = reactAction(b, true, rng);
  assert.ok(res.ok);
  assert.equal(runesLeft(b.player), slots - 1);
  assert.ok(res.events.some(e => e.type === "ward"));
  assert.ok(b.player.hp <= hp); // the warded blow did nothing (later blows may land)
  assert.ok(!res.events.some(e => e.type === "monster-attack" && e.roll === r)); // the warded blow never lands
  // Taking it instead: the blow lands.
  const again = wardMoment(mk);
  const before = again.b.player.hp, dmg = again.b.pending.roll.damage;
  const took = reactAction(again.b, false, again.rng);
  assert.ok(took.events.some(e => e.type === "monster-attack" && e.roll.damage === dmg));
  assert.ok(again.b.player.hp <= before - dmg);
  if (!isReacting(again.b)) assert.match(reactAction(again.b, true, again.rng).reason, /nothing to react/);
});

test("Iron Ward isn't offered without the rune, without slots, or against a critical hit", () => {
  const h = hero();
  const rng = seededRng(2), b = createBattle(h, ["gargoyle"], rng);
  b.monsters[0].hp = 999;
  for (let i = 0; i < 30 && b.state === "active"; i++) if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, rng);
  assert.ok(!b.log.some(e => e.type === "ward-prompt"));
  const h2 = hero(); learnRune(h2, "ironWard"); h2.runes.used = 99;
  const b2 = createBattle(h2, ["gargoyle"], rng);
  b2.monsters[0].hp = 999;
  for (let i = 0; i < 30 && b2.state === "active"; i++) if (isPlayerTurn(b2)) playerAction(b2, { type: "defend" }, rng);
  assert.ok(!b2.log.some(e => e.type === "ward-prompt"));
});

test("Warden's Call heals you both and shakes off paralysis; the Rune of Binding costs a monster its turn", () => {
  const h = hero();
  joinParty(h, "megan");
  learnRune(h, "wardensCall");
  learnRune(h, "binding");
  for (let seed = 1; seed < 200; seed++) {
    const rng = seededRng(seed), b = createBattle(h, ["troll"], rng);
    if (!isPlayerTurn(b)) continue;
    b.player.hp = 10; b.ally.hp = 5;
    addCondition(b, "ally", "paralyzed", { rounds: 5 });
    const slots = runesLeft(b.player);
    const r = playerAction(b, { type: "wardensCall" }, rng);
    assert.ok(r.ok);
    assert.ok(b.player.hp > 10 + 9 - 1 && b.ally.hp > 5);
    assert.ok(r.events.some(e => e.type === "call-heal" && /no longer paralyzed/.test(e.text)));
    assert.equal(runesLeft(b.player), slots - 1);
    break;
  }
  // Binding: the troll's CON save is +5; at DC 99 it can't make it.
  h.abilities.STR = 99;
  for (let seed = 1; seed < 200; seed++) {
    const rng = seededRng(seed), b = createBattle(hero(), ["troll"], rng);
    learnRune(b.player, "binding");
    if (!isPlayerTurn(b)) continue;
    b.player.abilities.STR = 99;
    b.monsters[0].hp = b.monsters[0].maxHp = 999;
    const r = playerAction(b, { type: "binding", target: 0 }, rng);
    assert.ok(r.events.some(e => e.type === "condition" && e.condition === "bound"));
    assert.ok(r.events.some(e => e.type === "skip" && e.who === 0)); // it loses its turn
    assert.ok(!hasCondition(b, 0, "bound")); // and only that one
    break;
  }
});

test("pass monsters: trolls regenerate unless burned, wyverns poison, and gargoyles shrug off plain weapons", () => {
  const troll = spawnMonster("troll", seededRng(1));
  assert.deepEqual(troll.regen, { hp: 10, stop: ["fire", "acid"] });
  adjustDamage(troll, 10, "fire");
  assert.equal(troll.regenBlocked, true);
  // A fight: the troll heals at the start of its turn.
  for (let seed = 1; seed < 100; seed++) {
    const rng = seededRng(seed), b = createBattle(hero(), ["troll"], rng);
    if (!isPlayerTurn(b)) continue;
    b.monsters[0].hp = 20;
    b.monsters[0].maxHp = 999;
    playerAction(b, { type: "defend" }, rng);
    assert.ok(b.log.some(e => e.type === "regen"));
    break;
  }
  const garg = spawnMonster("gargoyle", seededRng(1));
  assert.equal(adjustDamage(garg, 10, "slashing").damage, 5);
  assert.equal(adjustDamage(garg, 10, "slashing", { magic: true }).damage, 10);
  assert.equal(adjustDamage(garg, 10, "fire").damage, 10);
  assert.ok(MONSTERS.wyvern.attacks.some(a => a.poison));
  for (const id of ["griffon", "manticore", "ettin", "troll", "wyvern", "stoneGiant", "gargoyle", "earthElemental"]) assert.ok(LORE[id], id);
});

test("a waystone's trial: hold out for its rounds, and whatever's left crumbles", () => {
  for (let seed = 1; seed < 50; seed++) {
    const rng = seededRng(seed), b = createBattle(hero(), IRON_TRIAL, rng, { surviveRounds: 3 });
    for (const m of b.monsters) m.hp = m.maxHp = 999;
    for (let i = 0; i < 40 && b.state === "active"; i++) {
      if (b.pending) reactAction(b, false, rng);
      else if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, rng);
    }
    if (b.state !== "won") continue; // (you might fall, in theory)
    assert.ok(b.log.some(e => e.type === "survived"));
    assert.equal(b.round, 4);
    return;
  }
  assert.fail("no trial was survived");
});

test("quest 7: Colleen and the three waystones, the stolen Binding, and Warden-in-training", () => {
  const h = hero(), flags = { ...ACT3 }, s = { hero: h, flags, map: "pass", pos: feetAt(15, 65) };
  joinParty(h, "megan");
  learnRune(h, "runeStrike");
  assert.equal(objective(flags), "Climb the pass to the first waystone");
  assert.ok(questLog(flags).some(q => q.id === "road"));
  // The first stone: Iron.
  let c = talk(s, "colleen1");
  assert.match(through(c), /crest was my son's/);
  pick(c, "Who are you?");
  assert.match(through(c), /last Warden of Ironvale/);
  pick(c, "I'm ready.");
  const iron = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(iron.foes, IRON_TRIAL);
  assert.equal(iron.surviveRounds, 3);
  const xp = h.xp;
  through(startConversation(SCRIPTS[iron.afterWin], s));
  assert.ok(knowsRune(h, "ironWard"));
  assert.equal(h.xp, xp + WAYSTONE_REWARD.xp);
  assert.equal(titleOf(flags), "Warden-in-training");
  assert.ok(activeObjects(pass, flags).some(o => o.id === "waystone1Lit" || o.id === "fire1"));
  assert.ok(travelPoints(flags).find(p => p.id === "waystone1").found === false); // until you've walked the slopes
  assert.equal(safePlace({ map: "pass", pos: feetAt(14, 66), flags }).id, "waystone1");
  // The second stone: the Call (keep Megan standing).
  c = talk(s, "colleen2");
  assert.match(view(c).text, /Keep Megan on their feet/);
  pick(c, "I'm ready.");
  const call = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(call.foes, CALL_TRIAL);
  assert.equal(call.guardAlly, true);
  assert.match(view(startConversation(SCRIPTS[call.afterFail], s)).text, /Megan fell/);
  assert.ok(!flags.waystoneCall);
  through(startConversation(SCRIPTS[call.afterWin], s));
  assert.ok(knowsRune(h, "wardensCall"));
  // Alone, the Call's trial is five rounds instead.
  const alone = { ...s, hero: hero(), flags: { ...flags, waystoneCall: false } };
  c = talk(alone, "colleen2");
  pick(c, "I'm ready.");
  assert.equal(takeEvents(c).find(e => e.type === "battle").surviveRounds, 5);
  // The third stone: stripped bare.
  c = talk(s, "colleen3");
  through(c);
  assert.equal(flags.bindingStolen, true);
  assert.equal(objective(flags), "Take the Binding back from Thorne's camp, east");
  c = talk(s, "thorneGuardian");
  pick(c, "Fight!");
  const guard = takeEvents(c).find(e => e.type === "battle");
  assert.deepEqual(guard.foes, GUARDIAN_FIGHT);
  flags.guardianBeaten = true;
  through(startConversation(SCRIPTS[guard.afterWin], s));
  assert.ok(knowsRune(h, "binding"));
  const before = h.xp;
  through(talk(s, "colleen3"));
  assert.equal(flags.wardensRoad, true);
  assert.equal(h.xp, before + WAYSTONE_REWARD.xp + ROAD_REWARD.xp);
  assert.ok(questLog(flags).find(q => q.id === "road").done);
  assert.equal(objective(flags), "Open the Wardens' gatehouse, at the top");
});

test("Thorne's camp, the sun charm and the wolves", () => {
  const h = hero(), flags = { ...ACT3 }, s = { hero: h, flags };
  joinParty(h, "rachel");
  assert.match(through(talk(s, "thorneNotes")), /Rachel would understand.*margins/s);
  through(talk(s, "thorneMirror"));
  assert.ok(h.inventory.some(i => i.base === "thorneMirror"));
  const c = talk(s, "boneCairn");
  pick(c, "Take the charm");
  assert.match(view(c).text, /half-moon at her throat/);
  assert.ok(h.inventory.some(i => i.base === "sunCharm"));
  assert.deepEqual(zoneEvent(s, "heights"), { script: "wolves" });
  assert.equal(zoneEvent(s, "heights"), null);
  assert.match(through(startConversation(SCRIPTS.wolves, s)), /Wolves don't DO that/);
});

test("everything on the Warden's Road can be reached, sliding the ice included", () => {
  const from = reachableSliding(pass, pass.spawn);
  const near = o => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`));
  for (const o of pass.objects) assert.ok(near(o), `${o.id} can't be reached`);
});

test("the simulator: the pass's fights are winnable at the levels you'd meet them", () => {
  const runes = ["runeStrike", "ironWard"];
  const at = { slopes: { level: 9, upgrade: 3 }, snowfield: { level: 10, upgrade: 4 }, heights: { level: 11, upgrade: 4 } };
  for (const [zone, gear] of Object.entries(at)) {
    for (const e of ENCOUNTERS[zone].table) {
      const won = simulate({ ...gear, potions: 3, greater: 2, weapon: "wardenblade", silvered: true, companion: "rachel", runes }, e.foes, { fights: 60 });
      assert.ok(won >= 0.8, `${zone}: ${e.foes.join("+")} only ${Math.round(won * 100)}%`);
    }
  }
});
