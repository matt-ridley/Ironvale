// Turn-based combat: initiative, attack rolls against AC, and the player's actions (attack, defend, potion, flee,
// Second Wind, a bonus action that heals without using up the turn, and Action Surge, which gives you one more action
// this turn). ATTACK is one attack, or two with Extra Attack (level 5); a Potion of Dexterity, drunk before or during
// the fight, adds one more. From level 3 your attacks crit on a 19 or 20.
// Conditions (rules/conditions.js: asleep, restrained, blessed...) change attacks, AC and saves, and can take away a
// turn; they start and end with each turn. Spells and scrolls (rules/magic.js) are cast through the helpers below. A companion in your party (rules/party.js) takes their own turns:
// they shoot at the monster you last attacked, and monsters pick between you and them.
// A battle is a plain object. The player acts with playerAction(); monsters then take their turns until it is the
// player's turn again or the battle is over. Every step is written to battle.log for the screen to show.
import { d20, roll } from "./dice.js";
import { armourClass, weaponAttack, mod, gainXp, heal, SECOND_WIND, critOn, attacksPerAction, hasFeature, SAVE_PROFICIENCIES, proficiencyBonus } from "./character.js";
import { abilityCheck } from "./checks.js";
import { baseOf, makeItem, itemName, useItem, cantDrink } from "./items.js";
import { MONSTERS } from "../data/monsters.js";
import { companionStats, afterBattle } from "./party.js";
import { attackMods, conditionAc, skipsTurn, startTurn, endTurn, onDamage, conditionSave, CONDITIONS } from "./conditions.js";
import { ITEMS } from "../data/items.js";

export const DEFEND_AC_BONUS = 2;
export const FLEE_DC = 10;

export function spawnMonster(id, rng = Math.random) {
  const m = MONSTERS[id];
  if (!m) throw new Error(`Unknown monster: ${id}`);
  const hp = Math.max(1, roll(m.hp, rng).total);
  return { id, name: m.name, type: m.type, saves: { ...m.saves }, ac: m.ac, hp, maxHp: hp, dexMod: m.dexMod, attack: { ...m.attack, damageBonus: 0 }, xp: m.xp, gold: m.gold };
}

/* One attack roll. A critical hit (a natural 20, or `critOn` and up) always hits and doubles the damage dice; a natural
   1 always misses. `bonusDice` are added to the roll (Bless); `critOnHit` makes any hit a critical (on someone
   paralyzed). */
export function resolveAttack(attack, targetAc, rng = Math.random, { advantage = false, disadvantage = false, critOn = 20, bonusDice = null, critOnHit = false } = {}) {
  const { rolls, natural } = d20({ advantage, disadvantage }, rng);
  const extra = bonusDice ? roll(bonusDice, rng).total : 0;
  const total = natural + attack.bonus + extra;
  const hit = natural >= critOn || (natural !== 1 && total >= targetAc);
  const crit = natural >= critOn || (hit && critOnHit);
  let damage = 0, damageRolls = [];
  if (hit) {
    const r = roll(attack.damage, rng, { crit, extraBonus: attack.damageBonus || 0 });
    damage = Math.max(0, r.total);
    damageRolls = r.rolls;
  }
  return { rolls, natural, extra, total, targetAc, hit, crit, damage, damageRolls };
}

export const living = battle => battle.monsters.filter(m => m.hp > 0);
const playerAc = battle => armourClass(battle.player) + (battle.defending ? DEFEND_AC_BONUS : 0) + conditionAc(battle, "player");

// Everyone in a fight has a key: "player", "ally" or a monster's index.
/* The hero, companion or monster with this key. */
export const combatant = (battle, key) => (key === "player" ? battle.player : key === "ally" ? battle.ally : battle.monsters[key]);
export const nameOf = (battle, key) => (key === "player" ? "You" : key === "ally" ? battle.ally.name : `The ${battle.monsters[key].name}`);
export const acOf = (battle, key) => (key === "player" ? playerAc(battle) : combatant(battle, key).ac + conditionAc(battle, key));

/* Someone's saving throw bonus: the hero's ability modifier (+ proficiency in a fighter's STR and CON saves), a
   companion's DEX (other saves +0), or a monster's listed save. */
export function saveBonusOf(battle, key, ability) {
  if (key === "player") return mod(battle.player, ability) + (SAVE_PROFICIENCIES.includes(ability) ? proficiencyBonus(battle.player.level) : 0);
  if (key === "ally") return ability === "DEX" ? battle.ally.dexMod : 0;
  return battle.monsters[key].saves?.[ability] ?? 0;
}

/* A saving throw in a fight, with conditions (Bless, restrained) counted. */
export const battleSave = (battle, key, ability, dc, rng = Math.random) => conditionSave(battle, key, ability, dc, saveBonusOf(battle, key, ability), rng);

/* Takes HP off someone (never below 0) and wakes them if they were asleep. Call it before logging the hit (each log
   entry records everyone's HP), then tellWoken() after. Returns the names of conditions the damage ended. */
export function hurt(battle, key, damage) {
  const c = combatant(battle, key);
  c.hp = Math.max(0, c.hp - Math.max(0, damage));
  return damage > 0 && c.hp > 0 ? onDamage(battle, key) : [];
}
export function tellWoken(battle, key, ended) {
  for (const name of ended) say(battle, "condition-end", `${nameOf(battle, key)} ${key === "player" ? "are" : "is"} no longer ${name}.`);
}

/* Rolls initiative (d20 + DEX; ties go to the higher DEX, then the player) and plays monster turns up to the player's. */
export function createBattle(player, monsterIds, rng = Math.random) {
  const monsters = monsterIds.map(id => spawnMonster(id, rng));
  const ally = companionStats(player);
  const entries = [
    { who: "player", init: d20({}, rng).natural + mod(player, "DEX"), dex: mod(player, "DEX"), tie: 2 },
    ...(ally ? [{ who: "ally", init: d20({}, rng).natural + ally.dexMod, dex: ally.dexMod, tie: 1 }] : []),
    ...monsters.map((m, i) => ({ who: i, init: d20({}, rng).natural + m.dexMod, dex: m.dexMod, tie: 0 })),
  ];
  entries.sort((a, b) => b.init - a.init || b.dex - a.dex || b.tie - a.tie);
  // A Potion of Dexterity drunk before the fight is used up by it.
  const quick = !!player.effects?.dexterity;
  if (quick) player.effects = { ...player.effects, dexterity: false };
  const battle = { player, ally, focus: 0, monsters, order: entries, turn: 0, round: 1, defending: false, quick, state: "active", log: [], rewards: null, conditions: {} };
  const names = entries.map(e => (e.who === "player" ? "You" : e.who === "ally" ? ally.name : monsters[e.who].name) + ` (${e.init})`);
  say(battle, "start", `${monsters.map(m => m.name).join(", ")} ${monsters.length > 1 ? "appear" : "appears"}! Initiative: ${names.join(", ")}.`);
  if (quick) say(battle, "quick", "Your Potion of Dexterity makes you quick: one extra attack each time you ATTACK.");
  runMonsterTurns(battle, rng);
  return battle;
}

export const isPlayerTurn = battle => battle.state === "active" && battle.order[battle.turn].who === "player";

/* action: { type: "attack", target } | { type: "defend" } | { type: "potion", base } | { type: "flee" } | { type: "secondWind" }
   | { type: "actionSurge" } | { type: "allyPotion" } (give your companion a Potion of Healing; it gets them back up if
   they've been knocked down).
   A potion's base defaults to the Potion of Healing. */
export function playerAction(battle, action, rng = Math.random) {
  if (!isPlayerTurn(battle)) return { ok: false, reason: "It isn't your turn." };
  const start = battle.log.length;
  const p = battle.player;

  if (action.type === "attack") {
    let target = battle.monsters[action.target ?? battle.monsters.indexOf(living(battle)[0])];
    if (!target || target.hp <= 0) return { ok: false, reason: "Pick a monster that's still standing." };
    battle.focus = battle.monsters.indexOf(target); // your companion shoots at the same one
    const atk = weaponAttack(p);
    for (let n = 0; n < attacksThisAction(battle) && target; n++) {
      const t = battle.monsters.indexOf(target);
      const r = resolveAttack(atk, acOf(battle, t), rng, { critOn: critOn(p), ...attackMods(battle, "player", t) });
      const woke = hurt(battle, t, r.damage);
      say(battle, "attack", `${n ? "Again! You swing" : "You swing"} your ${atk.name} at the ${target.name}: ${rollText(r, atk.bonus)} ${hitText(r)}`, { roll: r, target: t });
      tellWoken(battle, t, woke);
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
    if (b.effect === "homeward") return { ok: false, reason: "There's no flying home from the middle of a fight!" };
    if (b.effect === "dexterity" && battle.quick) return { ok: false, reason: "You're already as quick as you can be." };
    const reason = cantDrink(p, potion);
    if (reason) return { ok: false, reason };
    const r = useItem(p, potion.uid, rng);
    if (r.effect === "dexterity") {
      p.effects = { ...p.effects, dexterity: false }; // used up by this fight
      battle.quick = true;
      say(battle, "quick", "You gulp down a Potion of Dexterity. From now on, every ATTACK is one attack more!");
    } else {
      say(battle, "potion", `You drink a ${b.name} and recover ${r.healed} HP (${p.hp}/${p.maxHp}).`, { heal: r.healed });
    }
  } else if (action.type === "allyPotion") {
    const a = battle.ally;
    if (!a) return { ok: false, reason: "No one is in your party." };
    const potion = p.inventory.find(i => i.base === "potionHealing");
    if (!potion) return { ok: false, reason: "You have no potions." };
    if (a.hp >= a.maxHp) return { ok: false, reason: `${a.name} is already at full health.` };
    p.inventory = p.inventory.filter(i => i !== potion);
    const down = a.hp === 0;
    const healed = Math.min(a.maxHp - a.hp, roll(baseOf(potion).heal, rng).total);
    a.hp += healed;
    say(battle, "ally-potion", `You give ${a.name} a ${baseOf(potion).name}. She recovers ${healed} HP (${a.hp}/${a.maxHp})${down ? " and gets back up!" : "."}`, { heal: healed, revived: down });
  } else if (action.type === "secondWind") {
    if (!p.secondWind) return { ok: false, reason: "You've used your Second Wind. Rest to get it back." };
    if (p.hp >= p.maxHp) return { ok: false, reason: "You're already at full health." };
    p.secondWind = false;
    const healed = heal(p, roll(SECOND_WIND, rng).total + p.level);
    say(battle, "second-wind", `You catch your Second Wind and recover ${healed} HP (${p.hp}/${p.maxHp}). You can still act.`, { heal: healed });
    return { ok: true, events: battle.log.slice(start) }; // a bonus action: still your turn
  } else if (action.type === "actionSurge") {
    if (!hasFeature(p, "actionSurge")) return { ok: false, reason: "You learn Action Surge at level 2." };
    if (battle.surging) return { ok: false, reason: "You've already surged this turn." };
    if (!p.actionSurge) return { ok: false, reason: "You've used your Action Surge. Rest to get it back." };
    p.actionSurge = false;
    battle.surging = true;
    say(battle, "surge", "Action Surge! You push yourself: after this action, you get one more.");
    return { ok: true, events: battle.log.slice(start) }; // still your turn
  } else if (action.type === "flee") {
    const c = abilityCheck(p, "DEX", FLEE_DC, rng);
    if (c.success) {
      battle.state = "fled";
      afterBattle(p, battle.ally);
      say(battle, "fled", `You run for it (DEX ${c.total} vs DC ${FLEE_DC}) and get away.`);
      return { ok: true, events: battle.log.slice(start) };
    }
    say(battle, "flee-fail", `You try to run (DEX ${c.total} vs DC ${FLEE_DC}) but can't get clear.`);
  } else {
    return { ok: false, reason: `Unknown action: ${action.type}` };
  }

  return endPlayerAction(battle, start, rng);
}

/* After an action that uses your turn: the fight may be over; Action Surge may give you another action; otherwise
   your turn ends and everyone else's turns play out. Returns playerAction's result (rules/magic.js uses it too). */
export function endPlayerAction(battle, start, rng = Math.random) {
  if (!checkEnd(battle, rng)) {
    if (battle.surging) { // Action Surge: one more action before your turn ends
      battle.surging = false;
      say(battle, "surge-again", "Your surge carries you on: act again!");
      return { ok: true, events: battle.log.slice(start) };
    }
    finishTurn(battle, "player", rng);
    nextTurn(battle);
    runMonsterTurns(battle, rng);
  }
  return { ok: true, events: battle.log.slice(start) };
}

/* Attacks in one ATTACK action: one, two with Extra Attack, and one more with a Potion of Dexterity. */
export const attacksThisAction = battle => attacksPerAction(battle.player) + (battle.quick ? 1 : 0);

const isAre = key => (key === "player" ? "are" : "is");

/* The end of someone's turn: their conditions count down, and they may save their way out of one. */
function finishTurn(battle, key, rng) {
  for (const e of endTurn(battle, key, ability => saveBonusOf(battle, key, ability), rng)) {
    const how = e.save ? ` (${e.save.ability} save ${e.save.total} vs DC ${e.save.dc})` : "";
    say(battle, "condition-end", `${nameOf(battle, key)} ${isAre(key)} no longer ${e.name}${how}.`, { who: key });
  }
}

/* Plays everyone else's turns (your companion's and the monsters') until it is yours again or the fight is over.
   Anyone whose conditions take their turn away (asleep, paralyzed) just has their conditions tick on, you included. */
function runMonsterTurns(battle, rng) {
  while (battle.state === "active") {
    const key = battle.order[battle.turn].who;
    if (combatant(battle, key).hp > 0) {
      for (const name of startTurn(battle, key)) say(battle, "condition-end", `${nameOf(battle, key)} ${isAre(key)} no longer ${name}.`, { who: key });
      if (skipsTurn(battle, key)) {
        const why = Object.keys(battle.conditions[key]).filter(id => CONDITIONS[id].skips).map(id => CONDITIONS[id].name).join(" and ");
        say(battle, "skip", `${nameOf(battle, key)} ${isAre(key)} ${why} and can't act.`, { who: key });
        finishTurn(battle, key, rng);
      } else if (key === "player") break; // your turn
      else {
        if (key === "ally") allyTurn(battle, rng); else monsterTurn(battle, key, rng);
        if (checkEnd(battle, rng)) return;
        finishTurn(battle, key, rng);
      }
    }
    nextTurn(battle);
  }
  if (battle.state === "active") battle.defending = false; // the guard lasts until the start of the player's turn
}

/* A monster attacks. With a companion standing, it picks one of you at random. */
function monsterTurn(battle, i, rng) {
  const m = battle.monsters[i], a = battle.ally;
  const onAlly = !!(a && a.hp > 0 && rng() < 0.5);
  const key = onAlly ? "ally" : "player";
  const r = resolveAttack(m.attack, acOf(battle, key), rng, attackMods(battle, i, key));
  const woke = hurt(battle, key, r.damage);
  if (onAlly) say(battle, "monster-attack", `The ${m.name} attacks ${a.name} with its ${m.attack.name}: ${rollText(r, m.attack.bonus)} ${hitText(r)}`, { roll: r, actor: i, onAlly: true });
  else say(battle, "monster-attack", `The ${m.name} attacks with its ${m.attack.name}: ${rollText(r, m.attack.bonus)} ${hitText(r, true)}`, { roll: r, actor: i });
  tellWoken(battle, key, woke);
  if (onAlly && a.hp === 0) say(battle, "ally-down", `${a.name} is knocked down! She'll be back on her feet after the fight.`);
}

/* Your companion shoots at the monster you last attacked (or the first one standing). */
function allyTurn(battle, rng) {
  const a = battle.ally;
  const focus = battle.monsters[battle.focus];
  const target = focus?.hp > 0 ? focus : living(battle)[0];
  if (!target) return;
  const t = battle.monsters.indexOf(target);
  const r = resolveAttack(a.attack, acOf(battle, t), rng, attackMods(battle, "ally", t, { melee: false }));
  const woke = hurt(battle, t, r.damage);
  say(battle, "ally-attack", `${a.name} shoots her ${a.attack.name} at the ${target.name}: ${rollText(r, a.attack.bonus)} ${hitText(r)}`, { roll: r, target: t });
  tellWoken(battle, t, woke);
  if (target.hp === 0) say(battle, "defeat", `The ${target.name} falls.`, { target: t });
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

export function checkEnd(battle, rng) {
  if (battle.player.hp <= 0) {
    battle.state = "lost";
    afterBattle(battle.player, battle.ally);
    say(battle, "lost", "You fall to the ground. Darkness takes you.");
    return true;
  }
  if (living(battle).length === 0) {
    battle.state = "won";
    afterBattle(battle.player, battle.ally);
    const xp = battle.monsters.reduce((s, m) => s + m.xp, 0);
    const gold = battle.monsters.reduce((s, m) => s + roll(m.gold, rng).total, 0);
    battle.player.gold += gold;
    const loot = rollLoot(battle.monsters, rng);
    battle.player.inventory.push(...loot);
    const { levelUps } = gainXp(battle.player, xp, rng);
    battle.rewards = { xp, gold, levelUps, loot: loot.map(itemName) };
    say(battle, "won", `Victory! You gain ${xp} XP and ${gold} gold.`);
    for (const name of battle.rewards.loot) say(battle, "loot", `You find a ${name}.`);
    for (const l of levelUps) {
      const news = [...l.features, ...(l.asi ? ["an ability score increase"] : [])];
      say(battle, "level-up", `You reach level ${l.level}! +${l.hpGain} max HP.${news.length ? ` New: ${news.join(", ")}.` : ""}`, { level: l.level });
      if (battle.ally) say(battle, "ally-level-up", `${battle.ally.name} reaches level ${l.level} too!`);
    }
    return true;
  }
  return false;
}

/* Each log entry carries everyone's HP right after it happened, so a screen can play the fight back step by step.
   extra: roll (an attack roll), target / actor (monster index), heal (HP recovered), onAlly (a monster hit your companion). */
export function say(battle, type, text, extra = {}) {
  const hp = { player: battle.player.hp, ally: battle.ally ? battle.ally.hp : null, monsters: battle.monsters.map(m => m.hp) };
  battle.log.push({ round: battle.round, type, text, hp, level: battle.player.level, ...extra });
}

export const rollText = (r, bonus) => `${r.natural} ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)}${r.extra ? ` + ${r.extra}` : ""} = ${r.total} vs AC ${r.targetAc}.`;
export const hitText = (r, onYou) =>
  !r.hit ? "Miss." : `${r.crit ? "Critical hit!" : "Hit!"} ${r.damage} damage${onYou ? " to you" : ""}.`;
