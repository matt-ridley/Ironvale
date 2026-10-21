// The battle simulator: plays thousands of fights with the real rules engine and reports how often the hero wins.
// Use it before tuning a boss. `npm run sim` prints the standard table; or import simulate() in a test or a script.
//
// The hero plays sensibly: Action Surge on the first turn, Second Wind or a healing potion (greater first) at a third
// of their HP or less, otherwise ATTACK at the first monster standing (with Rune Strike while there are slots, if they
// know it). Iron Ward always goes up when it can. A companion plays by their tactics.
import { createBattle, playerAction, isPlayerTurn, isAllyTurn, reactAction } from "../src/rules/combat.js";
import { allyAction } from "../src/rules/tactics.js";
import { createCharacter, gainXp, increaseAbility, learnRune, runesLeft, knowsRune, XP_FOR_LEVEL } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { makeItem } from "../src/rules/items.js";
import { seededRng } from "../src/rules/dice.js";

/* A hero of `level` (ability increases into STR), with gear at +`upgrade` (weapon, armour, shield), `potions` Potions
   of Healing and `greater` Greater ones, and a `companion` (an id) or none. `weapon`/`silvered` swap the sword; `runes`
   are the Warden's runes they know. */
export function makeHero({ level = 1, upgrade = 0, potions = 2, greater = 0, companion = null, weapon = "longsword", silvered = false, armour = "chainMail", runes = [] } = {}) {
  const h = createCharacter({ potions, weapon, armour });
  gainXp(h, XP_FOR_LEVEL[level], () => 0.5);
  while (h.asi > 0 && h.abilities.STR < 20) increaseAbility(h, "STR");
  h.asi = 0;
  for (const slot of ["weapon", "armour", "shield"]) if (h.equipment[slot]) h.equipment[slot].upgrade = upgrade;
  if (silvered) h.equipment.weapon.silvered = true;
  for (let i = 0; i < greater; i++) h.inventory.push(makeItem("potionGreaterHealing"));
  if (companion) joinParty(h, companion);
  for (const r of runes) learnRune(h, r);
  return h;
}

/* One fight to the end. Returns "won", "lost" or "fled". */
export function playFight(hero, foes, rng) {
  const b = createBattle(hero, foes, rng);
  for (let i = 0; i < 400 && b.state === "active"; i++) {
    if (b.pending) { reactAction(b, true, rng); continue; }
    if (isAllyTurn(b)) { allyAction(b, { type: "auto" }, rng); continue; }
    if (!isPlayerTurn(b)) break;
    const p = b.player, low = p.hp <= p.maxHp / 3;
    const potion = ["potionGreaterHealing", "potionHealing"].find(base => p.inventory.some(it => it.base === base));
    let action = { type: knowsRune(p, "runeStrike") && runesLeft(p) > (knowsRune(p, "ironWard") ? 1 : 0) ? "runeStrike" : "attack" };
    if (b.round === 1 && p.actionSurge && p.level >= 2 && !b.surging) action = { type: "actionSurge" };
    else if (low && p.secondWind) action = { type: "secondWind" };
    else if (low && potion) action = { type: "potion", base: potion };
    if (!playerAction(b, action, rng).ok) playerAction(b, { type: "attack" }, rng);
  }
  return b.state;
}

/* Plays `fights` fights (seeded, so the same run gives the same answer) and returns the share won, 0 to 1. */
export function simulate(heroOpts, foes, { fights = 2000, seed = 1 } = {}) {
  let won = 0;
  for (let i = 0; i < fights; i++) if (playFight(makeHero(heroOpts), foes, seededRng(seed + i)) === "won") won++;
  return won / fights;
}

// The standard table: every boss, at the levels and gear you'd likely meet them with.
export const SCENARIOS = [
  ["Goblin Chief, L1", { level: 1 }, ["goblinChief", "goblin"]],
  ["Goblin Chief, L2 +1", { level: 2, upgrade: 1 }, ["goblinChief", "goblin"]],
  ["Goblin King, L3 +1", { level: 3, upgrade: 1 }, ["goblinKing"]],
  ["Goblin King, L4 +2, Megan", { level: 4, upgrade: 2, companion: "megan" }, ["goblinKing"]],
  ["Mother Sallow, L5 +2", { level: 5, upgrade: 2 }, ["motherSallow"]],
  ["Mother Sallow, L5 +2, Megan", { level: 5, upgrade: 2, companion: "megan" }, ["motherSallow"]],
  ["Lord Varric, L6 +3", { level: 6, upgrade: 3, potions: 3 }, ["lordVarric"]],
  ["Lord Varric, L6 +3 silvered", { level: 6, upgrade: 3, potions: 3, silvered: true }, ["lordVarric"]],
  ["Lord Varric, L6 +3 silvered, Robyn", { level: 6, upgrade: 3, potions: 3, silvered: true, companion: "robyn" }, ["lordVarric"]],
  // Act 3: the pass. The hero carries the Wardenblade and knows Rune Strike and Iron Ward.
  ...[
    ["Iron trial (gargoyles), L9 +3, Rachel", { level: 9, upgrade: 3 }, ["gargoyle", "gargoyle"]],
    ["Call trial (griffons), L10 +3, Megan", { level: 10, upgrade: 3, companion: "megan" }, ["griffon", "griffon"]],
    ["Troll and griffon, L10 +4, Rachel", { level: 10, upgrade: 4 }, ["troll", "griffon"]],
    ["Thorne's guardian, L10 +4, Rachel", { level: 10, upgrade: 4 }, ["earthElemental", "gargoyle"]],
    ["Stone giant, L11 +4, Rachel", { level: 11, upgrade: 4 }, ["stoneGiant"]],
  ].map(([label, h, foes]) => [label, { companion: "rachel", potions: 3, greater: 2, weapon: "wardenblade", silvered: true, runes: ["runeStrike", "ironWard"], ...h }, foes]),
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) { // (either slash: Windows too)
  const fights = Number(process.argv[2]) || 2000;
  for (const [label, hero, foes] of SCENARIOS) console.log(label.padEnd(40), `${Math.round(100 * simulate(hero, foes, { fights }))}%`);
}
