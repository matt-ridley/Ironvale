// Turn-based combat: initiative, attack rolls against AC, and the player's actions (attack, defend, potion, flee).
// A battle is a plain object. The player acts with playerAction(); monsters then take their turns until it is the
// player's turn again or the battle is over. Every step is written to battle.log for the screen to show.
import { d20, roll } from "./dice.js";
import { armourClass, weaponAttack, mod, gainXp, heal } from "./character.js";
import { abilityCheck } from "./checks.js";
import { baseOf } from "./items.js";
import { MONSTERS } from "../data/monsters.js";

export const DEFEND_AC_BONUS = 2;
export const FLEE_DC = 10;

export function spawnMonster(id, rng = Math.random) {
  const m = MONSTERS[id];
  if (!m) throw new Error(`Unknown monster: ${id}`);
  const hp = Math.max(1, roll(m.hp, rng).total);
  return { id, name: m.name, ac: m.ac, hp, maxHp: hp, dexMod: m.dexMod, attack: { ...m.attack, damageBonus: 0 }, xp: m.xp, gold: m.gold };
}

/* One attack roll. A natural 20 always hits and doubles the damage dice; a natural 1 always misses. */
export function resolveAttack(attack, targetAc, rng = Math.random, { advantage = false, disadvantage = false } = {}) {
  const { rolls, natural } = d20({ advantage, disadvantage }, rng);
  const total = natural + attack.bonus;
  const crit = natural === 20;
  const hit = crit || (natural !== 1 && total >= targetAc);
  let damage = 0, damageRolls = [];
  if (hit) {
    const r = roll(attack.damage, rng, { crit, extraBonus: attack.damageBonus || 0 });
    damage = Math.max(0, r.total);
    damageRolls = r.rolls;
  }
  return { rolls, natural, total, targetAc, hit, crit, damage, damageRolls };
}

const living = battle => battle.monsters.filter(m => m.hp > 0);
const playerAc = battle => armourClass(battle.player) + (battle.defending ? DEFEND_AC_BONUS : 0);

/* Rolls initiative (d20 + DEX; ties go to the higher DEX, then the player) and plays monster turns up to the player's. */
export function createBattle(player, monsterIds, rng = Math.random) {
  const monsters = monsterIds.map(id => spawnMonster(id, rng));
  const entries = [
    { who: "player", init: d20({}, rng).natural + mod(player, "DEX"), dex: mod(player, "DEX"), tie: 1 },
    ...monsters.map((m, i) => ({ who: i, init: d20({}, rng).natural + m.dexMod, dex: m.dexMod, tie: 0 })),
  ];
  entries.sort((a, b) => b.init - a.init || b.dex - a.dex || b.tie - a.tie);
  const battle = { player, monsters, order: entries, turn: 0, round: 1, defending: false, state: "active", log: [], rewards: null };
  const names = entries.map(e => (e.who === "player" ? "You" : monsters[e.who].name) + ` (${e.init})`);
  say(battle, "start", `${monsters.map(m => m.name).join(", ")} ${monsters.length > 1 ? "appear" : "appears"}! Initiative: ${names.join(", ")}.`);
  runMonsterTurns(battle, rng);
  return battle;
}

export const isPlayerTurn = battle => battle.state === "active" && battle.order[battle.turn].who === "player";

/* action: { type: "attack", target } | { type: "defend" } | { type: "potion" } | { type: "flee" } */
export function playerAction(battle, action, rng = Math.random) {
  if (!isPlayerTurn(battle)) return { ok: false, reason: "It isn't your turn." };
  const start = battle.log.length;
  const p = battle.player;

  if (action.type === "attack") {
    const target = battle.monsters[action.target ?? battle.monsters.indexOf(living(battle)[0])];
    if (!target || target.hp <= 0) return { ok: false, reason: "Pick a monster that's still standing." };
    const atk = weaponAttack(p);
    const r = resolveAttack(atk, target.ac, rng);
    target.hp = Math.max(0, target.hp - r.damage);
    say(battle, "attack", `You swing your ${atk.name} at the ${target.name}: ${rollText(r, atk.bonus)} ${hitText(r)}`, r);
    if (target.hp === 0) say(battle, "defeat", `The ${target.name} falls.`);
  } else if (action.type === "defend") {
    battle.defending = true;
    say(battle, "defend", `You raise your guard (+${DEFEND_AC_BONUS} AC until your next turn).`);
  } else if (action.type === "potion") {
    const potion = p.inventory.find(i => baseOf(i).type === "consumable" && baseOf(i).heal);
    if (!potion) return { ok: false, reason: "You have no potions." };
    if (p.hp >= p.maxHp) return { ok: false, reason: "You're already at full health." };
    p.inventory = p.inventory.filter(i => i !== potion);
    const r = roll(baseOf(potion).heal, rng);
    const healed = heal(p, r.total);
    say(battle, "potion", `You drink a ${baseOf(potion).name} and recover ${healed} HP (${p.hp}/${p.maxHp}).`);
  } else if (action.type === "flee") {
    const c = abilityCheck(p, "DEX", FLEE_DC, rng);
    if (c.success) {
      battle.state = "fled";
      say(battle, "fled", `You run for it (DEX ${c.total} vs DC ${FLEE_DC}) and get away.`);
      return { ok: true, events: battle.log.slice(start) };
    }
    say(battle, "flee-fail", `You try to run (DEX ${c.total} vs DC ${FLEE_DC}) but can't get clear.`);
  } else {
    return { ok: false, reason: `Unknown action: ${action.type}` };
  }

  if (!checkEnd(battle, rng)) {
    nextTurn(battle);
    runMonsterTurns(battle, rng);
  }
  return { ok: true, events: battle.log.slice(start) };
}

function runMonsterTurns(battle, rng) {
  while (battle.state === "active" && battle.order[battle.turn].who !== "player") {
    const m = battle.monsters[battle.order[battle.turn].who];
    if (m.hp > 0) {
      const r = resolveAttack(m.attack, playerAc(battle), rng);
      battle.player.hp = Math.max(0, battle.player.hp - r.damage);
      say(battle, "monster-attack", `The ${m.name} attacks with its ${m.attack.name}: ${rollText(r, m.attack.bonus)} ${hitText(r, true)}`, r);
      if (checkEnd(battle, rng)) return;
    }
    nextTurn(battle);
  }
  if (battle.state === "active") battle.defending = false; // the guard lasts until the start of the player's turn
}

function nextTurn(battle) {
  battle.turn++;
  if (battle.turn >= battle.order.length) { battle.turn = 0; battle.round++; }
}

function checkEnd(battle, rng) {
  if (battle.player.hp <= 0) {
    battle.state = "lost";
    say(battle, "lost", "You fall to the ground. Darkness takes you.");
    return true;
  }
  if (living(battle).length === 0) {
    battle.state = "won";
    const xp = battle.monsters.reduce((s, m) => s + m.xp, 0);
    const gold = battle.monsters.reduce((s, m) => s + roll(m.gold, rng).total, 0);
    battle.player.gold += gold;
    const { levelUps } = gainXp(battle.player, xp, rng);
    battle.rewards = { xp, gold, levelUps };
    say(battle, "won", `Victory! You gain ${xp} XP and ${gold} gold.`);
    for (const l of levelUps) say(battle, "level-up", `You reach level ${l.level}! +${l.hpGain} max HP.`);
    return true;
  }
  return false;
}

function say(battle, type, text, rolled) {
  battle.log.push({ round: battle.round, type, text, ...(rolled ? { roll: rolled } : {}) });
}

const rollText = (r, bonus) => `${r.natural} ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)} = ${r.total} vs AC ${r.targetAc}.`;
const hitText = (r, onYou) =>
  !r.hit ? "Miss." : `${r.crit ? "Critical hit!" : "Hit!"} ${r.damage} damage${onYou ? " to you" : ""}.`;
