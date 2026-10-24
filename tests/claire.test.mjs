// Act 4, quest 10: Two Halves. Claire (the druid: Wild Shape, lingering spells, a wolf pack, calming a friend, good
// saves against magic, beasts that won't fight you), her grove, the twins' reunion, the dragon's brood, and her talks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable } from "../src/world/map.js";
import { travelPoints } from "../src/world/travel.js";
import { beastsLeave } from "../src/world/encounters.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { Q10_REWARD, BROOD_FIGHT } from "../src/story/act4.js";
import { nextTalk } from "../src/story/talks.js";
import { createCharacter, gainXp, rest, shortRest, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty, benchCompanion, partyRecords, companionStats, shapesLeft, WILD_SHAPES, COMPANIONS } from "../src/rules/party.js";
import { createBattle, isPlayerTurn, isAllyTurn, allyTurnKey, playerAction, hurt, acOf, castMonsterSpell } from "../src/rules/combat.js";
import { allyAction, chooseAllyAction, castable } from "../src/rules/tactics.js";
import { castSpell, makeCaster } from "../src/rules/magic.js";
import { addCondition, hasCondition } from "../src/rules/conditions.js";
import { makeItem } from "../src/rules/items.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";
import { feetAt } from "../src/world/movement.js";

const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const hero = (...companions) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[13], () => 0.5); h.asi = 0;
  for (const c of companions) joinParty(h, c); // the last one travels with you, the rest wait on the roster
  return h;
};
const Q9_DONE = { act3Complete: true, doorOpened: true, seenThreshold: true, warbandFled: true, q9Done: true, rachelJoined: true };
/* A fight where it's Claire's turn and you lead her. */
function claireTurn(h, foes = ["troll"]) {
  h.companion.lead = true;
  for (let seed = 1; seed < 300; seed++) {
    const copy = structuredClone(h), b = createBattle(copy, foes, seededRng(seed));
    if (allyTurnKey(b) === "ally") return b;
  }
  throw new Error("never Claire's turn");
}

test("Claire: a druid with good saves (WIS and INT proficient) who makes them with advantage against spells", () => {
  const s = companionStats(hero("claire"));
  assert.equal(s.name, "Claire");
  assert.equal(s.saves.WIS, 4 + 5);
  assert.equal(s.saves.INT, 5);
  assert.equal(s.saves.DEX, COMPANIONS.claire.dexMod);
  assert.equal(s.resistsMagic, true);
  assert.ok(s.casting.spells.includes("moonbeam") && s.casting.spells.includes("conjureAnimals"));
  const b = claireTurn(hero("claire"));
  const start = b.log.length;
  castMonsterSpell(b, 0, { name: "a test hex", save: "WIS", dc: 99, targets: "all" }, seededRng(2));
  assert.ok(b.log.slice(start).some(e => /Claire is caught \(WIS save/.test(e.text)));
  assert.equal(companionStats(hero("megan")).saves.WIS, undefined); // nobody else gets one
});

test("Wild Shape: a bear with HP of its own; she turns back unhurt when it runs out, and can't cast meanwhile", () => {
  const h = hero("claire"), b = claireTurn(h);
  const a = b.ally, myHp = a.hp;
  assert.ok(castable(b).length > 0);
  const r = allyAction(b, { type: "shape", form: "bear" }, seededRng(1));
  assert.equal(r.ok, true);
  assert.equal(r.events[0].type, "wild-shape");
  assert.equal(b.ally.src.shapesUsed, 1);
  const bear = b.ally.form ?? null;
  if (bear) { // (the troll may already have torn through it)
    assert.equal(acOf(b, "ally"), 11);
    assert.deepEqual(castable(b), []);
    hurt(b, "ally", 5);
    assert.equal(b.ally.form.hp, bear.maxHp - 5);
    assert.equal(b.ally.hp, myHp);
    assert.deepEqual(hurt(b, "ally", 999), ["a bear"]);
  }
  assert.equal(b.ally.form, null);
  assert.equal(b.ally.hp, myHp, "her own HP stays untouched");
});

test("Wild Shape twice per rest, short or long; nobody else can", () => {
  const h = hero("claire");
  assert.equal(shapesLeft(h.companion), WILD_SHAPES);
  h.companion.shapesUsed = 2;
  assert.equal(shapesLeft(h.companion), 0);
  const b = claireTurn(h);
  assert.match(allyAction(b, { type: "shape", form: "cat" }).reason, /no Wild Shape left/);
  shortRest(h, companionStats(h).maxHp);
  assert.equal(shapesLeft(h.companion), 2);
  h.companion.shapesUsed = 1; rest(h);
  assert.equal(shapesLeft(h.companion), 2);
  assert.equal(shapesLeft(hero("megan").companion), 0);
  // A save keeps what's used.
  h.companion.shapesUsed = 1;
  const s = { hero: h, flags: {}, map: "overworld", pos: feetAt(50, 31), facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" };
  assert.equal(deserialize(serialize(s)).hero.companion.shapesUsed, 1);
});

test("in beast form she mauls with the beast's attacks; the great cat hits more often", () => {
  const b = claireTurn(hero("claire"));
  allyAction(b, { type: "shape", form: "cat" }, seededRng(3));
  // Next time it's her turn, SHOOT is the cat's two attacks.
  for (let i = 0; i < 30 && b.state === "active" && allyTurnKey(b) !== "ally"; i++) if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, seededRng(10 + i));
  if (b.state !== "active" || !b.ally.form) return; // (the fight went another way)
  const r = allyAction(b, { type: "shoot", target: 0 }, seededRng(4));
  const hits = r.events.filter(e => e.type === "ally-attack");
  assert.equal(hits.length, 2);
  assert.match(hits[0].text, /The great cat \(Claire\) bites/);
  assert.equal(hits[0].roll.total - hits[0].roll.natural, 5 + 6); // proficiency + the cat's +6
});

test("Moonbeam and Call Lightning stay on their target and burn it again at the start of its turns", () => {
  const b = claireTurn(hero("claire"), ["troll", "troll"]);
  const caster = makeCaster({ name: "Claire", key: "ally", level: 13, mod: 4 });
  assert.equal(castSpell(b, caster, "moonbeam", { target: 0, slotLevel: 2 }, seededRng(1)).ok, true);
  assert.ok(hasCondition(b, 0, "moonlit"));
  assert.equal(b.conditions[0].moonlit.damage, "2d10");
  castSpell(b, caster, "callLightning", { target: 1, slotLevel: 4 }, seededRng(1));
  assert.equal(b.conditions[1].stormcalled.damage, "4d10"); // one more die from the higher slot
  for (let i = 0; i < 10 && b.state === "active"; i++) {
    if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, seededRng(20 + i));
    else if (isAllyTurn(b)) allyAction(b, { type: "auto" }, seededRng(30 + i));
  }
  assert.ok(b.log.some(e => e.type === "linger" && /The moonbeam burns the Troll/.test(e.text)));
  assert.ok(b.log.some(e => e.type === "linger" && /Lightning strikes the Troll/.test(e.text)));
});

test("Conjure Animals: a wolf pack bites every monster at the start of her turn, for three rounds", () => {
  const b = claireTurn(hero("claire"), ["troll", "troll"]);
  const r = allyAction(b, { type: "cast", spell: "conjureAnimals", slotLevel: 3 }, seededRng(1));
  assert.equal(r.ok, true);
  assert.deepEqual(b.pack && { by: b.pack.by, rounds: b.pack.rounds }, { by: "ally", rounds: 3 });
  for (let i = 0; i < 30 && b.state === "active" && b.pack; i++) {
    if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, seededRng(40 + i));
    else if (isAllyTurn(b)) allyAction(b, { type: "shoot", target: 0 }, seededRng(50 + i));
  }
  const rushes = b.log.filter(e => e.type === "pack");
  assert.ok(rushes.length >= 1 && rushes.length <= 3);
  assert.ok(b.log.some(e => e.type === "pack-bite" && /A wolf bites the Troll/.test(e.text)));
});

test("Claire calms a friend who's frightened, paralyzed or held, by herself or when you ask", () => {
  const b = claireTurn(hero("claire"));
  assert.match(allyAction(b, { type: "calm" }).reason, /No one needs calming/);
  addCondition(b, "player", "frightened", { rounds: 3 });
  assert.deepEqual(chooseAllyAction(b, "ally"), { type: "calm", on: "player" });
  const r = allyAction(b, { type: "calm" }, seededRng(1));
  assert.match(r.events[0].text, /Claire lays a hand on you.*no longer frightened/);
  assert.equal(hasCondition(b, "player", "frightened"), false);
});

test("by herself she takes a bear's shape first, and casts once she's out of forms", () => {
  const b = claireTurn(hero("claire"));
  b.ally.tactics = "attack";
  assert.deepEqual(chooseAllyAction(b, "ally"), { type: "shape", form: "bear" });
  b.ally.src.shapesUsed = WILD_SHAPES;
  assert.equal(chooseAllyAction(b, "ally").spell, "conjureAnimals");
  b.pack = { by: "ally", rounds: 2, attack: {} };
  assert.equal(chooseAllyAction(b, "ally").type, "cast");
});

test("with Claire in your party, beasts won't fight you", () => {
  assert.equal(beastsLeave(["wolf", "wolf"], "claire"), true);
  assert.equal(beastsLeave(["wolf", "goblin"], "claire"), false);
  assert.equal(beastsLeave(["wolf"], "rachel"), false);
});

test("the wolf leads you up the trail to Claire's grove", () => {
  const flags = { ...Q9_DONE };
  const grove = MAPS.beyond.zones.find(z => z.id === "grove");
  const inGrove = f => [...reachable(MAPS.beyond, MAPS.beyond.spawn, f)].some(k => { const [x, y] = k.split(",").map(Number); return x >= grove.x0 && x <= grove.x1 && y >= grove.y0 && y <= 11; });
  assert.equal(inGrove(flags), false);
  const s = { hero: hero("rachel"), flags };
  assert.match(through(startConversation(SCRIPTS.wolfTrail, s)), /clearing full of birdsong/);
  assert.equal(flags.wolfFollowed, true);
  assert.equal(inGrove(flags), true);
  assert.equal(objective({ kingRewarded: true, signetTaken: true, ...flags }).length > 0, true);
});

test("the reunion with Rachel in your party and the sun half: the charm is made whole, then the brood attacks", () => {
  const h = hero("rachel"), s = { hero: h, flags: { ...Q9_DONE, wolfFollowed: true } };
  h.inventory.push(makeItem("sunCharm"));
  const c = startConversation(SCRIPTS.claireMeet, s);
  assert.match(through(c), /my mother's voice.*Clary\?.*click together, whole.*Rae\..*young red dragon/s);
  assert.equal(s.flags.charmMended, true);
  assert.ok(h.inventory.some(i => i.base === "twinCharm") && !h.inventory.some(i => i.base === "sunCharm"));
  const fight = takeEvents(c).find(e => e.type === "battle"); // (its one answer, "Fight beside the twins", was taken)
  assert.deepEqual({ foes: fight.foes, party: fight.party, winFlag: fight.winFlag, afterWin: fight.afterWin }, { foes: BROOD_FIGHT, party: ["rachel", "claire"], winFlag: "broodBeaten", afterWin: "claireJoins" });
  assert.equal(labels(startConversation(SCRIPTS.claireMeet, s)).includes("Fight beside the twins"), true); // lost or fled: try again
});

test("without the sun half the scar proves it; without Rachel along, she follows you and comes as a guest", () => {
  const h = hero("rachel", "megan"), s = { hero: h, flags: { ...Q9_DONE, wolfFollowed: true } };
  assert.match(through(startConversation(SCRIPTS.claireMeet, s)), /followed you through the Door.*as a guest.*You bit me when we were six/s);
  assert.equal(s.flags.charmMended, undefined);
  // The brood fight's party is the twins: Rachel's own roster record, and Claire as a guest. Megan sits it out.
  const [rachel, claire] = partyRecords(h, ["rachel", "claire"]);
  assert.equal(rachel, h.roster.find(r => r.id === "rachel"));
  assert.equal(claire.guest, true);
  const b = createBattle(h, BROOD_FIGHT, seededRng(1), { allies: [rachel, claire] });
  assert.deepEqual([b.ally.id, b.ally2.id], ["rachel", "claire"]);
  assert.ok(b.monsters.every(m => m.immune.includes("fire")));
});

test("after the brood: Claire joins, Rachel goes to the roster, the grove becomes a camp, and quest 10 pays once", () => {
  const h = hero("rachel"), s = { hero: h, flags: { ...Q9_DONE, wolfFollowed: true, claireMet: true, broodBeaten: true } };
  const xp = h.xp;
  assert.match(through(startConversation(SCRIPTS.claireJoins, s)), /I'm coming with you.*Father will want to see you.*Rachel will wait for you at any inn.*QUEST COMPLETE: Two Halves/s);
  assert.equal(h.companion.id, "claire");
  assert.ok(h.roster.some(r => r.id === "rachel"));
  assert.equal(h.xp, xp + Q10_REWARD.xp);
  const on = id => activeObjects(MAPS.beyond, s.flags).some(o => o.id === id);
  assert.equal(on("claire"), false);
  assert.equal(on("groveFire") && on("raven"), true);
  assert.equal(on("thicket"), false);
  assert.ok(reachable(MAPS.beyond, MAPS.beyond.spawn, s.flags).has("4,13"), "the hidden glade, through the thicket");
  assert.equal(travelPoints({ ...s.flags, seenGrove: true }).find(p => p.id === "grove").found, true);
  assert.match(view(startConversation(SCRIPTS.raven, s)).text, /He draws maps for them/);
  const q = questLog(s.flags).find(x => x.id === "twoHalves");
  assert.equal(q.done, true);
  assert.equal(nextTalk(s).id, "claire1");
});

test("finding the sun half after Claire's joined puts the charm straight back together", () => {
  const h = hero("claire"), s = { hero: h, flags: { claireJoined: true } };
  const c = startConversation(SCRIPTS.boneCairn, s);
  pick(c, "Take the charm");
  assert.match(view(c).text, /click, whole/);
  assert.ok(h.inventory.some(i => i.base === "twinCharm"));
  assert.equal(s.flags.charmMended, true);
});
