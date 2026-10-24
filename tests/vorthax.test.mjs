// Act 4, step 27: Vorthax and the ending. The dragon's rules (flying, breath recharge, lair actions, legendary
// resistance, Frightful Presence and its true name, Thorne's binding, no running), Claire's rally, the three phases in a
// row with tag-in between, Colleen's last appearance, the ending in the keep, the title, the credits and free play.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects } from "../src/world/map.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { act4Event, VORTHAX_PHASES, pledgedTeam } from "../src/story/act4.js";
import { titleOf } from "../src/story/hero.js";
import { createCharacter, gainXp, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty, partyRecords } from "../src/rules/party.js";
import { createBattle, playerAction, battleSave, castMonsterSpell, isPlayerTurn } from "../src/rules/combat.js";
import { attackMods, hasCondition } from "../src/rules/conditions.js";
import { allyAction, chooseAllyAction, canRally } from "../src/rules/tactics.js";
import { MONSTERS } from "../src/data/monsters.js";
import { TRACKS, compile } from "../src/audio/tracks.js";
import { creditLines } from "../src/story/credits.js";
import { playVorthax } from "../tools/simulate.mjs";
import { seededRng } from "../src/rules/dice.js";

const keep = MAPS.keep;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const hero = (...companions) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[16], () => 0.5); h.asi = 0;
  for (const c of companions) joinParty(h, c);
  return h;
};
const READY = { act3Complete: true, q9Started: true, q9Done: true, rachelHeard: true, meganHeard: true, robynHeard: true, claireJoined: true, q10Done: true, rachelJoined: true, meganJoined: true, robynJoined: true,
  oathSworn: true, oath: "iron", q11Done: true, trueName: true, meganPledged: true, clairePledged: true, brannocPledged: true, q12Done: true,
  signetReturned: true, keepHome: true, bladeReforged: true };

test("in the sky, Vorthax is hard to reach with a blade (disadvantage), but not with a bow or a spell", () => {
  const b = createBattle(hero("megan"), ["vorthaxSky"], seededRng(1));
  b.conditions = {}; // (in case its Frightful Presence went first)
  assert.equal(b.monsters[0].flying, true);
  assert.equal(attackMods(b, "player", 0).disadvantage, true);
  assert.equal(attackMods(b, "ally", 0, { melee: false }).disadvantage, false);
  const ground = createBattle(hero("megan"), ["vorthaxGround"], seededRng(1));
  ground.conditions = {};
  assert.equal(attackMods(ground, "player", 0).disadvantage, false);
});

test("its breath recharges on a 5 or 6; its Frightful Presence fails against the true name", () => {
  const b = createBattle(hero(), ["vorthaxGround"], seededRng(2));
  b.monsters[0].spellsLeft["Fire Breath"] = 0;
  let back = false;
  for (let seed = 1; seed < 30 && !back; seed++) {
    const c = structuredClone(b);
    const fight = createBattle(hero(), ["vorthaxGround"], seededRng(seed));
    fight.monsters[0].spellsLeft["Fire Breath"] = 0;
    for (let i = 0; i < 6 && fight.state === "active"; i++) playerAction(fight, { type: "defend" }, seededRng(seed + i));
    back = fight.log.some(e => e.type === "recharge");
    void c;
  }
  assert.ok(back, "it never recharged");
  const fear = MONSTERS.vorthaxSky.spells.find(s => s.frightful);
  const scared = createBattle(hero(), ["vorthaxSky"], seededRng(3));
  castMonsterSpell(scared, 0, { ...fear, dc: 99 }, seededRng(3));
  assert.ok(hasCondition(scared, "player", "frightened"));
  const brave = createBattle(hero(), ["vorthaxSky"], seededRng(3), { trueName: true });
  castMonsterSpell(brave, 0, { ...fear, dc: 99 }, seededRng(3));
  assert.ok(!hasCondition(brave, "player", "frightened"));
  assert.ok(brave.log.some(e => e.type === "true-name"));
});

test("in the hoard: three legendary resistances, lair actions, and Thorne's binding holds it for the first round", () => {
  const b = createBattle(hero(), ["vorthaxHoard"], seededRng(4), { bindFirst: true });
  assert.ok(b.log.some(e => e.type === "door-binding"));
  assert.ok(b.log.some(e => e.type === "skip" && /bound/.test(e.text)) || hasCondition(b, 0, "bound"));
  const saves = Array.from({ length: 4 }, () => battleSave(b, 0, "CON", 99, seededRng(1)));
  assert.deepEqual(saves.map(s => s.success), [true, true, true, false]);
  assert.equal(b.monsters[0].legendaryLeft, 0);
  const lair = createBattle(hero("megan"), ["vorthaxHoard"], seededRng(5));
  for (let i = 0; i < 4 && lair.state === "active"; i++) playerAction(lair, { type: "defend" }, seededRng(5 + i));
  assert.ok(lair.log.some(e => e.type === "lair"));
});

test("no running from Vorthax", () => {
  const b = createBattle(hero(), ["vorthaxSky"], seededRng(6), { noFlee: true });
  if (!isPlayerTurn(b)) return;
  assert.match(playerAction(b, { type: "flee" }, seededRng(6)).reason, /no running/);
});

test("Claire's rally: once a fight, she gets a fallen friend back up with a quarter of their HP", () => {
  const h = hero("rachel", "claire");
  const b = createBattle(h, ["vorthaxGround"], seededRng(7), { allies: partyRecords(h, ["claire", "rachel"]), rally: true });
  const claire = b.ally.id === "claire" ? "ally" : "ally2", rachel = claire === "ally" ? "ally2" : "ally";
  b[rachel].hp = 0;
  assert.equal(canRally(b, claire), true);
  assert.equal(chooseAllyAction(b, claire).type, "rally");
  b.turn = b.order.findIndex(o => o.who === claire);
  b[claire].src.lead = false;
  allyAction(b, { type: "rally" }, seededRng(1));
  assert.equal(b[rachel].hp, Math.ceil(b[rachel].maxHp / 4));
  assert.equal(canRally(b, claire), false, "once");
  const noPledge = createBattle(h, ["vorthaxGround"], seededRng(7), { allies: partyRecords(h, ["claire", "rachel"]) });
  noPledge[rachel === "ally" ? "ally" : "ally2"].hp = 0;
  assert.equal(canRally(noPledge, claire), false);
});

test("the hoard's doors: Matt holds the door, you pick who stands beside you, and each phase leads to the next", () => {
  const s = { hero: hero("claire"), flags: { ...READY, thorneBinding: true, vorthaxSky: true } };
  const c = startConversation(SCRIPTS.hoardDoor, s);
  pick(c, "Go in");
  assert.match(view(c).text, /Nothing gets in behind you.*an afternoon/s);
  assert.equal(s.flags.vorthaxSky, false, "the fight starts again from the sky");
  choose(c, 0);
  assert.deepEqual(labels(c), ["Claire", "Rachel", "Megan"], "Robyn hasn't pledged");
  assert.deepEqual(pledgedTeam(s.flags), ["claire", "rachel", "megan"]);
  pick(c, "Claire");
  assert.deepEqual(labels(c), ["Rachel", "Megan"]);
  pick(c, "Megan");
  let [e] = takeEvents(c);
  assert.deepEqual([e.foes, e.party, e.winFlag, e.afterWin, e.music, e.noFlee, e.trueName, e.rally, e.bindFirst],
    [["vorthaxSky"], ["claire", "megan"], "vorthaxSky", "vorthaxWing", "dragon", true, true, true, false]);
  const g = startConversation(SCRIPTS.vorthaxWing, s);
  assert.match(view(g).text, /wing tears.*brood/s);
  choose(g, 0);
  pick(g, "Rachel");
  pick(g, "Megan");
  [e] = takeEvents(g);
  assert.deepEqual([e.foes, e.afterWin, e.music], [VORTHAX_PHASES[1].foes, "vorthaxLast", "dragon2"]);
  const h = startConversation(SCRIPTS.vorthaxLast, s);
  assert.match(view(h).text, /Thorne's pattern/);
  choose(h, 0);
  pick(h, "Claire");
  pick(h, "Rachel");
  [e] = takeEvents(h);
  assert.deepEqual([e.foes, e.winFlag, e.afterWin, e.music, e.bindFirst], [["vorthaxHoard"], "vorthaxDefeated", "vorthaxFalls", "dragon3", true]);
  for (const id of ["dragon", "dragon2", "dragon3"]) assert.ok(TRACKS[id] && compile(id).length > 0, id);
});

test("Vorthax falls: Colleen's last appearance, home through the open Door, and the ending in the keep's hall", () => {
  const s = { hero: hero("claire"), flags: { ...READY, vorthaxDefeated: true, matthewFound: true, refugeesHelped: true, pipRewarded: true } };
  const c = startConversation(SCRIPTS.vorthaxFalls, s);
  const text = through(c);
  assert.match(text, /fire goes out.*Colleen.*A hundred years late.*very first waystone.*My blood.*You did/s);
  assert.deepEqual(takeEvents(c).at(-1), { type: "travel", map: "keep", at: { x: 19, y: 22 } });
  assert.equal(act4Event(s, "courtyard").script, "ending");
  const end = startConversation(SCRIPTS.ending, s);
  assert.match(through(end), /Corwin, hugging Dunstan.*Snik.*a real sword.*keys.*WARDEN OF IRONVALE.*ACT 4 COMPLETE/s);
  assert.equal(takeEvents(end).at(-1).type, "credits");
  assert.equal(s.flags.act4Complete, true);
  assert.equal(titleOf(s.flags), "Warden of Ironvale");
  assert.equal(act4Event(s, "courtyard"), null);
  assert.ok(activeObjects(keep, s.flags).some(o => o.id === "mattKeep") && activeObjects(keep, s.flags).some(o => o.id === "keepBrannocHome"));
  assert.match(through(startConversation(SCRIPTS.mattHome, s)), /Colleen's room/);
  assert.match(view(startConversation(SCRIPTS.hoardDoor, s)).text, /dead dragon/);
  const lines = creditLines(s);
  assert.ok(lines.includes("Robin, Warden of Ironvale") && lines.includes("Dunstan, mapmaker") && lines.includes("Snik and Grub, goblins"));
  assert.match(through(startConversation(SCRIPTS.thorneCell, { hero: hero(), flags: { ...s.flags, thorneSpared: true } })), /I'd like to help/);
});

test("the Great One in the quest log, and the HUD to the end", () => {
  let flags = { ...READY, seenTunnels: true, golemsBeaten: true, lostForgeFound: true, brannocAtForge: true, bladeFinalForm: true, hoardGuardsBeaten: true, robynPledged: true };
  const story = { kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true,
    fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, varricDefeated: true, heardTremor: true,
    metRachel: true, rockslideOpen: true, metColleen: true, waystoneIron: true, waystoneCall: true, bindingRecovered: true, wardensRoad: true,
    kingDefeated: true, raeHeard: true, gatehouseOpen: true, runeDoor1: true, runeDoor2: true, runeDoor3: true, thorneDefeated: true, gatehouseDone: true,
    q9Started: true, doorOpened: true, seenThreshold: true, warbandFled: true, wolfFollowed: true, claireMet: true, broodBeaten: true, seenLastwatch: true,
    cindersBeaten: true, mattMet: true };
  flags = { ...story, ...flags };
  assert.equal(objective(flags), "Go through the hoard's doors, and face the Great One");
  assert.equal(objective({ ...flags, vorthaxDefeated: true }), "Go home to Ironvale Keep");
  assert.equal(objective({ ...flags, vorthaxDefeated: true, act4Complete: true }), "The Emberreach is yours: free play");
  assert.equal(questLog({ ...flags, vorthaxDefeated: true, act4Complete: true }).find(q => q.id === "greatOne").done, true);
});

test("tuned: a level 16 Warden with +5 gear and all four sisters beats Vorthax almost every time", () => {
  const runes = ["runeStrike", "ironWard", "wardensCall", "binding", "breakingRune"];
  let won = 0;
  for (let i = 0; i < 60; i++) if (playVorthax({ level: 16, upgrade: 5, potions: 2, greater: 2, weapon: "wardenblade", silvered: true, runes }, ["claire", "rachel", "megan", "robyn"], seededRng(i + 1)) === "won") won++;
  assert.ok(won >= 48, `won ${won} of 60`);
});
