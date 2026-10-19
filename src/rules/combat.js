// Turn-based combat: initiative, attack rolls against AC, and the player's actions (attack, defend, potion, flee,
// and Second Wind, a bonus action that heals without using up the turn). A Potion of Dexterity, drunk before or
// during the fight, makes every ATTACK two attacks.
// A battle is a plain object. The player acts with playerAction(); monsters then take their turns until it is the
// player's turn again or the battle is over. Every step is written to battle.log for the screen to show.
import { d20, roll } from "./dice.js";
import { armourClass, weaponAttack, mod, gainXp, heal, SECOND_WIND } from "./character.js";
import { abilityCheck } from "./checks.js";
import { baseOf, makeItem, itemName, useItem, cantDrink } from "./items.js";
import { MONSTERS } from "../data/monsters.js";
import { ITEMS } from "../data/items.js";

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
  // A Potion of Dexterity drunk before the fight is used up by it.
  const quick = !!player.effects?.dexterity;
  if (quick) player.effects = { ...player.effects, dexterity: false };
  const battle = { player, monsters, order: entries, turn: 0, round: 1, defending: false, quick, state: "active", log: [], rewards: null };
  const names = entries.map(e => (e.who === "player" ? "You" : monsters[e.who].name) + ` (${e.init})`);
  say(battle, "start", `${monsters.map(m => m.name).join(", ")} ${monsters.length > 1 ? "appear" : "appears"}! Initiative: ${names.join(", ")}.`);
  if (quick) say(battle, "quick", "Your Potion of Dexterity makes you quick: you attack twice each turn.");
  runMonsterTurns(battle, rng);
  return battle;
}

export const isPlayerTurn = battle => battle.state === "active" && battle.order[battle.turn].who === "player";

/* action: { type: "attack", target } | { type: "defend" } | { type: "potion", base } | { type: "flee" } | { type: "secondWind" }
   A potion's base defaults to the Potion of Healing. */
export function playerAction(battle, action, rng = Math.random) {
  if (!isPlayerTurn(battle)) return { ok: false, reason: "It isn't your turn." };
  const start = battle.log.length;
  const p = battle.player;

  if (action.type === "attack") {
    let target = battle.monsters[action.target ?? battle.monsters.indexOf(living(battle)[0])];
    if (!target || target.hp <= 0) return { ok: false, reason: "Pick a monster that's still standing." };
    const atk = weaponAttack(p);
    for (let n = 0; n < (battle.quick ? 2 : 1) && target; n++) {
      const r = resolveAttack(atk, target.ac, rng);
      target.hp = Math.max(0, target.hp - r.damage);
      const t = battle.monsters.indexOf(target);
      say(battle, "attack", `${n ? "Again! You swing" : "You swing"} your ${atk.name} at the ${target.name}: ${rollText(r, atk.bonus)} ${hitText(r)}`, { roll: r, target: t });
      if (target.hp === 0) {
        say(battle, "defeat", `The ${target.name} falls.`, { target: t });
        target = living(battle)[0]; // the second attack goes to the next monster
      }
    }
  } else if (action.type === "defend") {
    battle.defending = true;
    say(battle, "defend", `You raise your guard (+${DEFEND_AC_BONUS} AC until your next turn).`);
  } else if (action.type === "potion") {
    const base = action.base || "potionHealing";
    const potion = p.inventory.find(i => i.base === base);
    if (!potion) return { ok: false, reason: base === "potionHealing" ? "You have no potions." : `You have no ${ITEMS[base]?.name ?? "potion like that"}.` };
    const b = baseOf(potion);
    if (b.effect === "speed") return { ok: false, reason: "A Potion of Speed is for travelling. Drink it from your bag." };
    if (b.effect === "dexterity" && battle.quick) return { ok: false, reason: "You're already as quick as you can be." };
    const reason = cantDrink(p, potion);
    if (reason) return { ok: false, reason };
    const r = useItem(p, potion.uid, rng);
    if (r.effect === "dexterity") {
      p.effects = { ...p.effects, dexterity: false }; // used up by this fight
      battle.quick = true;
      say(battle, "quick", "You gulp down a Potion of Dexterity. From your next turn, you attack twice!");
    } else {
      say(battle, "potion", `You drink a ${b.name} and recover ${r.healed} HP (${p.hp}/${p.maxHp}).`, { heal: r.healed });
    }
  } else if (action.type === "secondWind") {
    if (!p.secondWind) return { ok: false, reason: "You've used your Second Wind. Rest to get it back." };
    if (p.hp >= p.maxHp) return { ok: false, reason: "You're already at full health." };
    p.secondWind = false;
    const healed = heal(p, roll(SECOND_WIND, rng).total + p.level);
    say(battle, "second-wind", `You catch your Second Wind and recover ${healed} HP (${p.hp}/${p.maxHp}). You can still act.`, { heal: healed });
    return { ok: true, events: battle.log.slice(start) }; // a bonus action: still your turn
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
      say(battle, "monster-attack", `The ${m.name} attacks with its ${m.attack.name}: ${rollText(r, m.attack.bonus)} ${hitText(r, true)}`, { roll: r, actor: battle.monsters.indexOf(m) });
      if (checkEnd(battle, rng)) return;
    }
    nextTurn(battle);
  }
  if (battle.state === "active") battle.defending = false; // the guard lasts until the start of the player's turn
}

/* Each monster's loot table is rolled separately. */
export function rollLoot(monsters, rng = Math.random) {
  const found = [];
  for (const m of monsters) for (const l of MONSTERS[m.id].loot || []) if (rng() < l.chance) found.push(makeItem(l.base, { upgrade: l.upgrade || 0 }));
  return found;
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
    const loot = rollLoot(battle.monsters, rng);
    battle.player.inventory.push(...loot);
    const { levelUps } = gainXp(battle.player, xp, rng);
    battle.rewards = { xp, gold, levelUps, loot: loot.map(itemName) };
    say(battle, "won", `Victory! You gain ${xp} XP and ${gold} gold.`);
    for (const name of battle.rewards.loot) say(battle, "loot", `You find a ${name}.`);
    for (const l of levelUps) say(battle, "level-up", `You reach level ${l.level}! +${l.hpGain} max HP.`, { level: l.level });
    return true;
  }
  return false;
}

/* Each log entry carries everyone's HP right after it happened, so a screen can play the fight back step by step.
   extra: roll (an attack roll), target / actor (monster index), heal (HP recovered). */
function say(battle, type, text, extra = {}) {
  const hp = { player: battle.player.hp, monsters: battle.monsters.map(m => m.hp) };
  battle.log.push({ round: battle.round, type, text, hp, level: battle.player.level, ...extra });
}

const rollText = (r, bonus) => `${r.natural} ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)} = ${r.total} vs AC ${r.targetAc}.`;
const hitText = (r, onYou) =>
  !r.hit ? "Miss." : `${r.crit ? "Critical hit!" : "Hit!"} ${r.damage} damage${onYou ? " to you" : ""}.`;
