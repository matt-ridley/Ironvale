// The end of Act 3: the crack in the Door, the Oath (and what each one does), "Rae?", and the keep's new rooms.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects } from "../src/world/map.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { titleOf } from "../src/story/hero.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { zoneEvent } from "../src/story/act3.js";
import { OATHS, OATH_IDS, swearOath } from "../src/rules/oaths.js";
import { createCharacter, gainXp, learnRune, runeSlots, runesLeft, shortRest, rest, mod, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { createBattle, playerAction, reactAction, isPlayerTurn, isReacting, checkEnd, IRON_SKIN } from "../src/rules/combat.js";
import { castSpell, makeCaster, DAWN_HEAL_BONUS } from "../src/rules/magic.js";
import { addCondition } from "../src/rules/conditions.js";
import { awNew, AW_BRANNOC_RATE, winPrize } from "../src/rules/minigames.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";
import { feetAt } from "../src/world/movement.js";

const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const warden = (oath, level = 12) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[level], () => 0.5); h.asi = 0;
  for (const r of ["runeStrike", "ironWard", "wardensCall", "binding"]) learnRune(h, r);
  if (oath) { swearOath(h, {}, oath); if (oath === "storm") learnRune(h, "chainLightning"); if (oath === "dawn") learnRune(h, "dawnstrike"); }
  return h;
};
const obj = (map, id) => MAPS[map].objects.find(o => o.id === id);
const myTurn = (h, foes, seed0 = 1) => {
  for (let seed = seed0; seed < seed0 + 200; seed++) {
    const rng = seededRng(seed), b = createBattle(h, foes, rng);
    if (isPlayerTurn(b)) return { b, rng };
  }
  throw new Error("never your turn");
};

test("swearing an Oath: once, for good, with its title", () => {
  const h = warden(null), flags = {};
  assert.equal(swearOath(h, flags, "iron").ok, true);
  assert.equal(h.oath, "iron");
  assert.equal(flags.oathIron, true);
  assert.equal(titleOf(flags), "Sworn of Iron");
  assert.match(swearOath(h, flags, "storm").reason, /already/);
  assert.match(swearOath(warden(null), {}, "fire").reason, /Unknown/);
  for (const id of OATH_IDS) for (const k of ["name", "title", "words", "signature", "always", "companion"]) assert.ok(OATHS[id][k], `${id}.${k}`);
  const back = deserialize(serialize({ hero: h, map: "keep", pos: feetAt(19, 29), flags, facing: "down", stepsSinceFight: 0, bestiary: {}, lastHub: "keep" }));
  assert.equal(back.hero.oath, "iron");
});

test("the Oath of Iron: Unbroken once per long rest, 3 less from weapon hits, a free Iron Ward, and Shield Ally", () => {
  const h = warden("iron");
  joinParty(h, "megan");
  const { b, rng } = myTurn(h, ["troll"]);
  b.player.hp = 0;
  assert.equal(checkEnd(b, rng), false);
  assert.equal(b.player.hp, 1);
  assert.ok(b.log.some(e => e.type === "unbroken"));
  b.player.hp = 0;
  assert.equal(checkEnd(b, rng), true); // only once
  rest(h);
  assert.equal(h.unbrokenUsed, false);
  // Weapon hits do 3 less, and your companion takes half while you stand.
  const h2 = warden("iron"); joinParty(h2, "megan");
  const r2 = myTurn(h2, ["ettin"], 50);
  r2.b.monsters[0].hp = r2.b.monsters[0].maxHp = 999;
  const used = h2.runes.used || 0;
  for (let i = 0; i < 30 && r2.b.state === "active"; i++) {
    if (isReacting(r2.b)) { reactAction(r2.b, true, r2.rng); break; }
    if (isPlayerTurn(r2.b)) playerAction(r2.b, { type: "defend" }, r2.rng);
  }
  assert.equal(h2.runes.used || 0, used, "the first Iron Ward of a fight is free");
  assert.equal(IRON_SKIN, 3);
});

test("the Oath of Storm: two more rune slots, Blink, Chain Lightning, and runes back on a short rest", () => {
  const plain = warden(null), h = warden("storm");
  assert.equal(runeSlots(h), runeSlots(plain) + 2);
  const { b, rng } = myTurn(h, ["griffon", "griffon"]);
  for (const m of b.monsters) m.hp = m.maxHp = 999;
  const r = playerAction(b, { type: "chainLightning" }, rng);
  assert.ok(r.ok);
  assert.equal(r.events.filter(e => e.type === "spell-save").length, 2);
  for (let i = 0; i < 20 && !b.log.some(e => e.type === "blink"); i++) if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, rng); else if (b.pending) reactAction(b, false, rng);
  assert.ok(b.log.some(e => e.type === "blink"));
  assert.equal(b.log.filter(e => e.type === "blink").length, 1);
  h.runes.used = 4;
  const s = shortRest(h);
  assert.ok(s.runes > 0 && h.runes.used < 4);
});

test("the Oath of Dawn: Dawnstrike doubles on the undead, a healing light, no fear, and a companion's heals heal more", () => {
  const h = warden("dawn");
  joinParty(h, "robyn");
  const { b, rng } = myTurn(h, ["wraith"]);
  b.monsters[0].hp = b.monsters[0].maxHp = 999;
  b.monsters[0].ac = -99; // it can't miss
  const r = playerAction(b, { type: "dawnstrike", target: 0 }, rng);
  assert.ok(r.events.some(e => e.rune && /Dawn blazes/.test(e.text)));
  // The healing light comes at the start of your turn, when you're hurt.
  b.player.hp = 10;
  for (let i = 0; i < 10 && !b.log.some(e => e.type === "dawn-light"); i++) if (isPlayerTurn(b)) playerAction(b, { type: "defend" }, rng); else if (b.pending) reactAction(b, false, rng);
  assert.ok(b.log.some(e => e.type === "dawn-light"));
  // Fear can't take hold.
  const { b: b2, rng: rng2 } = myTurn(warden("dawn"), ["wraith"]);
  const start = b2.log.length;
  b2.monsters[0].attacks[0].bonus = 99;
  b2.monsters[0].attacks[0].onHit.dc = 99;
  for (let i = 0; i < 10 && !b2.log.slice(start).some(e => /fear can't/.test(e.text)); i++) if (isPlayerTurn(b2)) playerAction(b2, { type: "defend" }, rng2); else if (b2.pending) reactAction(b2, false, rng2);
  assert.ok(!b2.conditions.player?.frightened);
  // Robyn's Cure Wounds heals DAWN_HEAL_BONUS more.
  const caster = makeCaster({ name: "Robyn", key: "ally", level: 12, mod: 3 });
  b.player.hp = 1;
  const before = b.player.hp;
  castSpell(b, caster, "cureWounds", { target: "player" }, () => 0); // every die a 1
  assert.equal(b.player.hp - before, 1 + 3 + DAWN_HEAL_BONUS);
});

test("the end of Act 3: Thorne's last rune cracks the Door, Colleen asks for your Oath, and someone calls 'Rae?'", () => {
  const flags = { thorneSpared: true, gatehouseDone: true, rachelJoined: true }, h = warden(null), s = { hero: h, flags };
  joinParty(h, "rachel");
  assert.ok(activeObjects(MAPS.gatehouse, flags).some(o => o.id === "colleenDoor"));
  const c = startConversation(SCRIPTS.greatDoor, s, { object: obj("gatehouse", "greatDoor") });
  assert.match(view(startConversation(SCRIPTS.greatDoor, s, { object: obj("gatehouse", "greatDoor") })).text, /Breaking Rune/);
  assert.match(through(c), /Breaking Rune.*golden eye.*Swear it/s); // its one answer is "Swear the Oath"
  assert.ok(takeEvents(c).some(e => e.type === "oath"));
  swearOath(h, flags, "dawn");
  const after = startConversation(SCRIPTS.afterOath, s);
  assert.match(through(after), /What is dead shall not pass.*Hold it better than I did.*RAE\?.*Claire\?.*ACT 3 COMPLETE/s);
  assert.equal(flags.raeHeard, true);
  assert.equal(flags.act3Complete, true);
  const story = { kingDefeated: true, kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true,
    seenFen: true, fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, varricDefeated: true,
    signetReturned: true, bladeReforged: true, keepHome: true, heardTremor: true, metRachel: true, rockslideOpen: true, metColleen: true, waystoneIron: true,
    waystoneCall: true, bindingStolen: true, bindingRecovered: true, wardensRoad: true, gatehouseOpen: true, runeDoor3: true, thorneDefeated: true };
  assert.equal(objective({ ...story, ...flags }), "ACT 3 COMPLETE. Act 4 is coming: beyond the Door");
  assert.ok(questLog(flags).find(q => q.id === "door").done);
  assert.match(view(startConversation(SCRIPTS.greatDoor, s, { object: obj("gatehouse", "greatDoor") })).text, /dawn-gold/);
});

test("if Rachel wasn't at the Door, she comes running when you get home", () => {
  const flags = { act3Complete: true, rachelJoined: true }, h = warden("iron"), s = { hero: h, flags };
  joinParty(h, "megan");
  assert.deepEqual(zoneEvent(s, "courtyard"), { script: "raeNews" });
  through(startConversation(SCRIPTS.raeNews, s));
  assert.equal(zoneEvent(s, "courtyard"), null);
});

test("home: Rachel's library, Brannoc's arm-wrestling in the yard, Thorne in the crypt, and each Oath's mark", () => {
  const keep = MAPS.keep, base = { rachelJoined: true, rockslideOpen: true, gatehouseDone: true, oathSworn: true, thorneSpared: true };
  const ids = flags => activeObjects(keep, flags).map(o => o.id);
  for (const id of ["runeLibrary", "trainingYard", "thorneCell"]) assert.ok(ids(base).includes(id), id);
  assert.ok(!ids({ ...base, thorneSpared: false, thorneLeft: true }).includes("thorneCell"));
  assert.ok(ids({ ...base, oathIron: true }).includes("guard1"));
  assert.ok(ids({ ...base, oathDawn: true }).includes("keepGhost"));
  const s = { hero: warden("iron"), flags: { ...base, oath: "iron", oathIron: true } };
  let c = startConversation(SCRIPTS.runeLibrary, s);
  pick(c, "Browse the scrolls");
  assert.deepEqual(takeEvents(c).find(e => e.type === "shop"), { type: "shop", shop: "libraryFull" });
  c = startConversation(SCRIPTS.trainingYard, s);
  assert.match(view(c).text, /sparring ring/);
  pick(c, "Arm wrestle Brannoc");
  assert.deepEqual(takeEvents(c).find(e => e.type === "minigame").data, { rival: "brannoc" });
  c = startConversation(SCRIPTS.keepForge, s);
  assert.match(view(c).text, /Warden plate/);
  pick(c, "Let's see the forge");
  assert.equal(takeEvents(c).find(e => e.type === "shop").shop, "forgeIron");
  assert.match(view(startConversation(SCRIPTS.shrine, { hero: warden("dawn"), flags: { oath: "dawn" } })).text, /temple/);
  // Thorne has a line for each visit, and one for Rachel.
  const seen = new Set();
  for (let i = 0; i < 3; i++) seen.add(view(startConversation(SCRIPTS.thorneCell, s)).text);
  assert.equal(seen.size, 3);
  const r = warden("iron"); joinParty(r, "rachel");
  assert.match(through(startConversation(SCRIPTS.thorneCell, { hero: r, flags: s.flags })), /find your sister/);
  // Brannoc's bracer: he pushes harder than Oswin, and his prize is +2 CON.
  assert.ok(awNew(warden(null), AW_BRANNOC_RATE).foe > awNew(warden(null)).foe);
  const h = warden(null), con = mod(h, "CON");
  assert.equal(winPrize(h, {}, "armBrannoc").base, "brannocBracer");
  assert.equal(mod(h, "CON"), con + 1);
});
