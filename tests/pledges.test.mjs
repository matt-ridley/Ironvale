// Act 4, step 25: the sisters' pledges (the Mapmaker, the First Light, Claire's), their banners in the keep's hall,
// the Oath paths and vaults, and the last round of choices coming back (Sallow's fire potions, Snik's tunnels, Maren,
// the bard and the Emberreach's bounties).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { activeObjects, reachable } from "../src/world/map.js";
import { SCRIPTS, objective } from "../src/story/scripts.js";
import { questLog } from "../src/story/quests.js";
import { startConversation, view, choose, takeEvents } from "../src/story/dialogue.js";
import { act4Event, PLEDGE_REWARD, VAULT_REWARD, DIGGINGS_FIGHT, SHRINE_FIGHT, SHRINE_ROUNDS, sistersPledged } from "../src/story/act4.js";
import { boardFor } from "../src/story/bounties.js";
import { createCharacter, gainXp, learnRune, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty, knownSpells, partyRecords } from "../src/rules/party.js";
import { createBattle, castMonsterSpell, fireproof, allyTurnKey } from "../src/rules/combat.js";
import { chooseAllyAction, allyAction, DRAGON_ARROWS } from "../src/rules/tactics.js";
import { castSpell, makeCaster } from "../src/rules/magic.js";
import { makeItem, useItem } from "../src/rules/items.js";
import { SHOPS } from "../src/data/items.js";
import { seededRng } from "../src/rules/dice.js";
import { serialize, deserialize } from "../src/state/save.js";

const beyond = MAPS.beyond, keep = MAPS.keep;
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => { const i = labels(c).indexOf(label); assert.ok(i >= 0, `no "${label}" in ${labels(c)}`); return choose(c, i); };
const through = c => { const seen = []; while (view(c)) { seen.push(view(c).text); if (view(c).choices.length > 1) break; choose(c, 0); } return seen.join(" "); };
const hero = (...companions) => {
  const h = createCharacter({ name: "Robin", weapon: "wardenblade" });
  gainXp(h, XP_FOR_LEVEL[15], () => 0.5); h.asi = 0;
  for (const c of companions) joinParty(h, c); // the last one travels with you
  return h;
};
const Q11_DONE = { act3Complete: true, q9Started: true, doorOpened: true, seenThreshold: true, warbandFled: true, q9Done: true, wolfFollowed: true,
  claireMet: true, broodBeaten: true, claireJoined: true, q10Done: true, rachelJoined: true, meganJoined: true, robynJoined: true, oathSworn: true,
  oath: "iron", seenLastwatch: true, cindersBeaten: true, mattMet: true, q11Done: true };
const objectOn = (map, id) => map.objects.find(o => o.id === id);

test("the Mapmaker: Megan hears her da's song in the diggings; past the overseers, Dunstan, the letter, the map, the arrows, her pledge", () => {
  const without = { hero: hero("claire"), flags: { ...Q11_DONE } };
  assert.match(through(startConversation(SCRIPTS.diggings, without)), /bring her/);
  const h = hero("claire", "megan"), s = { hero: h, flags: { ...Q11_DONE } };
  const c = startConversation(SCRIPTS.diggings, s);
  assert.match(view(c).text, /surveying song/);
  pick(c, "Go in with her");
  pick(c, "Fight");
  const [e] = takeEvents(c);
  assert.deepEqual(e.foes, DIGGINGS_FIGHT);
  assert.equal(e.afterWin, "dunstanFreed");
  s.flags.diggingsCleared = true;
  const gold = h.gold;
  const text = through(startConversation(SCRIPTS.dunstanFreed, s));
  assert.match(text, /Corwin's Meg.*Ten years of maps.*Corwin's Letter.*Shoot straight.*ARROWS OF DRAGON SLAYING.*MEGAN PLEDGES.*PLEDGE: The Mapmaker/s);
  assert.ok(["corwinsLetter", "dunstansMap"].every(b => h.inventory.some(i => i.base === b)));
  assert.equal(h.companion.dragonArrows, DRAGON_ARROWS);
  assert.equal(h.gold, gold + PLEDGE_REWARD.gold);
  assert.equal(s.flags.meganPledged, true);
  assert.match(through(startConversation(SCRIPTS.diggings, s)), /quiet now/);
  assert.ok(activeObjects(beyond, s.flags).some(o => o.id === "dunstan"));
  assert.equal(deserialize(serialize({ hero: h, flags: s.flags, map: "beyond", pos: { x: 1, y: 1 } })).hero.companion.dragonArrows, DRAGON_ARROWS);
});

test("Megan's Arrows of Dragon Slaying: only on a dragon, a CON save or 6d10 more, and each one used up", () => {
  const h = hero("megan");
  h.companion.dragonArrows = 3;
  h.companion.lead = true; // her turn waits for us
  let saw = false;
  for (let seed = 1; seed < 200 && !saw; seed++) {
    const copy = structuredClone(h), b = createBattle(copy, ["youngRedDragon"], seededRng(seed));
    if (allyTurnKey(b) !== "ally") continue;
    const before = b.log.length;
    allyAction(b, { type: "shoot", target: 0 }, seededRng(seed));
    const line = b.log.slice(before).find(x => x.type === "ally-attack");
    if (line.roll.hit) { assert.match(line.text, /Arrow of Dragon Slaying.*2 left/); assert.equal(copy.companion.dragonArrows, 2); saw = true; }
    else assert.equal(copy.companion.dragonArrows, 3);
  }
  assert.ok(saw, "never hit");
  for (let seed = 1; seed < 100; seed++) {
    const copy = structuredClone(h), b = createBattle(copy, ["troll"], seededRng(seed));
    if (allyTurnKey(b) !== "ally") continue;
    allyAction(b, { type: "shoot", target: 0 }, seededRng(seed));
    assert.equal(copy.companion.dragonArrows, 3, "not wasted on a troll");
    break;
  }
});

test("the First Light: Robyn opens the shrine, holds the light for four rounds, learns Mass Healing Word and pledges", () => {
  const h = hero("robyn"), s = { hero: h, flags: { ...Q11_DONE } };
  const c = startConversation(SCRIPTS.dawnDoor, s);
  pick(c, "Open the door");
  assert.match(view(c).text, /vampire spawn, and a wraith/);
  choose(c, 0);
  pick(c, "Hold the line");
  const [e] = takeEvents(c);
  assert.deepEqual(e.foes, SHRINE_FIGHT);
  assert.equal(e.surviveRounds, SHRINE_ROUNDS);
  assert.equal(e.afterWin, "firstLight");
  assert.match(through(startConversation(SCRIPTS.firstLight, s)), /always ours.*MASS HEALING WORD.*ROBYN PLEDGES.*PLEDGE: The First Light/s);
  assert.ok(knownSpells(h.companion).includes("massHealingWord"));
  assert.ok(!activeObjects(beyond, s.flags).some(o => o.id === "dawnDoor"));
  h.hp = 10; h.companion.hurt = 20;
  through(startConversation(SCRIPTS.dawnLamp, s));
  assert.equal(h.hp, h.maxHp);
  assert.equal(h.companion.hurt, 0);
});

test("Mass Healing Word heals everyone in the party, and Robyn says it by herself when two of you are badly hurt", () => {
  const h = hero("claire", "robyn");
  h.companion.spells = [...knownSpells(h.companion), "massHealingWord"];
  h.companion.tactics = "heal";
  const b = createBattle(h, ["troll"], seededRng(3), { second: partyRecords(h, ["claire"])[0] });
  for (const k of ["player", "ally", "ally2"]) { const c = k === "player" ? b.player : b[k]; c.hp = Math.floor(c.maxHp / 3); }
  assert.deepEqual(chooseAllyAction(b, "ally").spell, "massHealingWord");
  const before = [b.player.hp, b.ally.hp, b.ally2.hp];
  castSpell(b, makeCaster({ name: "Robyn", key: "ally", level: 15, mod: 3 }), "massHealingWord", {}, seededRng(1));
  [b.player.hp, b.ally.hp, b.ally2.hp].forEach((hp, i) => assert.ok(hp > before[i]));
  b.ally2.hp = b.ally2.maxHp; b.player.hp = b.player.maxHp;
  assert.notEqual(chooseAllyAction(b, "ally").spell, "massHealingWord"); // one hurt: a single heal will do
});

test("Claire pledges at Matt's fire once every sister with you has; then all four banners hang in the keep's hall", () => {
  const s = { hero: hero("claire"), flags: { ...Q11_DONE, meganPledged: true } };
  assert.equal(sistersPledged(s.flags), false);
  assert.equal(act4Event(s, "lastwatchHold"), null);
  s.flags.robynPledged = true;
  assert.equal(act4Event(s, "lastwatchHold").script, "clairePledge");
  assert.match(through(startConversation(SCRIPTS.clairePledge, s)), /All four.*CLAIRE PLEDGES/s);
  assert.equal(act4Event(s, "lastwatchHold"), null);
  const banners = activeObjects(keep, s.flags).filter(o => o.script === "pledgeBanner").map(o => o.who);
  assert.deepEqual(banners, ["rachel", "megan", "robyn", "claire"]);
  assert.deepEqual(activeObjects(keep, { q10Done: true }).filter(o => o.script === "pledgeBanner").map(o => o.who), ["rachel"]);
  assert.match(through(startConversation(SCRIPTS.pledgeBanner, s, { object: objectOn(keep, "bannerMegan") })), /SHOOT STRAIGHT/);
});

test("the Oath of Iron's path: hold the span up three times running (a slip costs HP), and the vault's tower shield", () => {
  const h = hero(), s = { hero: h, flags: { ...Q11_DONE } };
  learnRune(h, "runeStrike");
  let opened = false;
  for (let seed = 1; seed < 40 && !opened; seed++) {
    const c = startConversation(SCRIPTS.gorgeEdge, s, { rng: seededRng(seed) });
    pick(c, "Hold up the span");
    for (let i = 0; i < 8 && view(c); i++) {
      if (labels(c).includes("Try again")) { assert.match(view(c).text, /-10 HP/); break; }
      choose(c, 0);
    }
    opened = !!s.flags.ironVault;
  }
  assert.ok(opened);
  assert.ok(h.inventory.some(i => i.base === "towerShield"));
  assert.deepEqual(labels(startConversation(SCRIPTS.gorgeEdge, s)), ["Leave it"]);
  assert.deepEqual(labels(startConversation(SCRIPTS.gorgeEdge, { hero: hero(), flags: { ...Q11_DONE, oath: "storm" } })), ["Leave it"]);
});

test("the Oath of Storm's path: blink to the islet in the lava lake; nobody else can reach it", () => {
  const s = { hero: hero(), flags: { ...Q11_DONE, oath: "storm" } };
  assert.ok(!reachable(beyond, beyond.spawn, s.flags).has("76,7"), "the islet is in the lava");
  const xp = s.hero.xp;
  const c = startConversation(SCRIPTS.stormStone, s);
  pick(c, "Blink across");
  assert.match(view(c).text, /STORM-GLASS.*OATH VAULT FOUND/s);
  assert.equal(s.hero.xp, xp + VAULT_REWARD.xp);
  assert.ok(!activeObjects(beyond, s.flags).some(o => o.id === "stormVault"));
  assert.match(view(startConversation(SCRIPTS.stormStone, s)).text, /friendly/);
  assert.match(view(startConversation(SCRIPTS.stormStone, { hero: hero(), flags: { ...Q11_DONE } })).text, /too far to jump/);
});

test("the Oath of Dawn's path: the cursed gate burns anyone else, and opens for the Dawn onto the vault", () => {
  const iron = { hero: hero(), flags: { ...Q11_DONE } }, hp = iron.hero.hp;
  assert.match(through(startConversation(SCRIPTS.cursedGate, iron)), /burns like a forge/);
  assert.equal(iron.hero.hp, hp - 8);
  assert.ok(!reachable(beyond, beyond.spawn, iron.flags).has("87,24"));
  const s = { hero: hero(), flags: { ...Q11_DONE, oath: "dawn" } };
  assert.match(through(startConversation(SCRIPTS.cursedGate, s)), /swings open/);
  assert.ok(reachable(beyond, beyond.spawn, s.flags).has("87,24"));
  assert.match(through(startConversation(SCRIPTS.oathVault, s, { object: objectOn(beyond, "dawnVault") })), /DAWN BANNER/);
  assert.ok(s.hero.inventory.some(i => i.base === "dawnBanner"));
  assert.equal(s.flags.dawnVault, true);
});

test("fire resistance (Sallow's potion for one fight, or the tower shield) halves fire; the vaults' stone and banner work", () => {
  const breath = { name: "Fire Breath", breath: true, save: "DEX", dc: 99, damage: "10d6", damageType: "fire", half: true, targets: "all" };
  const hit = h => { const b = createBattle(h, ["youngRedDragon"], seededRng(2)); const hp = b.player.hp; castMonsterSpell(b, 0, breath, seededRng(5)); return [hp - b.player.hp, b]; };
  const [plain] = hit(hero());
  const h = hero();
  h.inventory.push(makeItem("potionFireResistance"));
  assert.equal(useItem(h, h.inventory.at(-1).uid).effect, "fireResist");
  const [halved, b] = hit(h);
  assert.equal(halved, Math.floor(plain / 2));
  assert.equal(fireproof(b), true);
  assert.equal(h.effects.fireResist, false, "used up by the fight");
  const shield = hero();
  shield.equipment.shield = makeItem("towerShield");
  assert.equal(hit(shield)[0], Math.floor(plain / 2));
  assert.ok(SHOPS.sundriesDragon.stock.includes("potionFireResistance") && SHOPS.sundriesDragon.stock.includes("dragonProofHat"));
});

test("choices come back: Sallow sells for the dragon, Snik's found the kobolds' tunnels, Maren and the bard have new lines", () => {
  const s = { hero: hero(), flags: { ...Q11_DONE, sallowBargain: true, refugeesHelped: true } };
  const shop = startConversation(SCRIPTS.sundries, s);
  assert.match(view(shop).text, /DRAGON/);
  pick(shop, "Let's see");
  assert.equal(takeEvents(shop)[0].shop, "sundriesDragon");
  const snik = startConversation(SCRIPTS.mineMouth, s);
  assert.match(view(snik).text, /right into the dragon's mountain/);
  assert.equal(s.flags.snikTunnels, true);
  assert.match(view(startConversation(SCRIPTS.elder, s)).text, /Wardens' homeland/);
  assert.match(view(startConversation(SCRIPTS.bard, s)).text, /DRAGON/);
  const board = boardFor(4).map(b => b.id);
  assert.ok(["griffons", "hellHounds", "mummies", "rocs"].every(id => board.includes(id)));
  assert.ok(!boardFor(3).includes(boardFor(4).find(b => b.id === "rocs")));
});

test("the pledges in the quest log and on the HUD", () => {
  const story = { kingRewarded: true, signetTaken: true, brannocFreed: true, signetShown: true, askedBrannoc: true, passageCleared: true, seenFen: true,
    fenReported: true, metSallow: true, causewayRaised: true, keepGateOpened: true, tombOpen: true, seenTomb: true, varricDefeated: true, heardTremor: true,
    metRachel: true, rockslideOpen: true, metColleen: true, waystoneIron: true, waystoneCall: true, bindingRecovered: true, wardensRoad: true,
    kingDefeated: true, signetReturned: true, bladeReforged: true, keepHome: true, raeHeard: true, gatehouseOpen: true, runeDoor1: true, runeDoor2: true,
    runeDoor3: true, thorneDefeated: true, gatehouseDone: true, ...Q11_DONE };
  const steps = [
    [{}, "Take Megan to the kobolds' diggings, over the bridge from Lastwatch"],
    [{ diggingsCleared: true, meganPledged: true }, "Take Robyn to the shrine of the Dawn, south-east of Lastwatch"],
    [{ robynPledged: true }, "Claire's waiting at Lastwatch"],
    [{ clairePledged: true }, "Find the Emberdeep's gate, at the top of the aeries"],
  ];
  let flags = { ...story };
  for (const [more, line] of steps) { flags = { ...flags, ...more }; assert.equal(objective(flags), line); }
  const log = questLog(flags);
  assert.equal(log.find(q => q.id === "mapmaker").done, true);
  assert.equal(log.find(q => q.id === "firstLight").done, true);
  assert.equal(log.find(q => q.id === "oathVault").done, false);
  assert.equal(questLog({ ...flags, ironVault: true }).find(q => q.id === "oathVault").done, true);
});
