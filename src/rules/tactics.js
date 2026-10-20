// Your companion's turn in a fight. By themselves they follow their TACTICS (rules/party.js):
// - attack: a caster uses their best damage spell they have a slot for (one that hits every monster, when there's
//   more than one), else a damage cantrip; anyone else shoots the monster you last attacked.
// - heal: first, if you or they are at half HP or less, heal whoever's worse off (a healing spell, or a Potion of
//   Healing from your pack); otherwise as attack, but a caster keeps their slots for healing (cantrips only).
// - save: as attack, but cantrips only, so spell slots last.
// When you lead them (battle.leadAlly), their turn waits for allyAction() with what you picked.
// No Phaser here, so it can be tested.
import { SPELLS } from "../data/spells.js";
import { roll } from "./dice.js";
import { baseOf } from "./items.js";
import { attackMods } from "./conditions.js";
import { acOf, hurt, tellWoken, say, living, resolveAttack, adjustRoll, rollText, hitText, isAllyTurn, endAllyAction } from "./combat.js";
import { makeCaster, castSpell, slotsLeft, spendForSpell } from "./magic.js";

/* Your companion as a caster (their spell attack bonus and DC at your level), or null if they don't cast. */
export function allyCaster(battle) {
  const a = battle.ally;
  return a?.casting ? makeCaster({ name: a.name, key: "ally", level: a.level, mod: a.casting.mod }) : null;
}

/* The lowest slot level (at or above `level`) your companion has left, or 0. */
function freeSlot(battle, level) {
  const left = slotsLeft(battle.player.companion, battle.ally.level);
  for (let l = Math.max(level, 1); l <= left.length; l++) if (left[l - 1] > 0) return l;
  return 0;
}

/* Spells your companion knows that they could cast right now, with the slot they'd use (0 for a cantrip). */
export function castable(battle) {
  const a = battle.ally;
  if (!a?.casting) return [];
  return a.casting.spells.map(id => ({ id, spell: SPELLS[id], slotLevel: SPELLS[id].level ? freeSlot(battle, SPELLS[id].level) : 0 }))
    .filter(s => s.spell.level === 0 || s.slotLevel > 0);
}

const isDamage = s => !!s.damage;
const potionsLeft = battle => battle.player.inventory.filter(i => i.base === "potionHealing").length;

/* The friend most in need: the one with the lowest share of their HP, if that's half or less. */
function neediest(battle) {
  const friends = [["player", battle.player], ["ally", battle.ally]].filter(([, c]) => c && c.hp > 0);
  const [key, c] = friends.sort(([, a], [, b]) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  return c.hp <= c.maxHp / 2 ? key : null;
}

/* What your companion does by themselves this turn, as an allyAction action. */
export function chooseAllyAction(battle) {
  const a = battle.ally, focus = battle.monsters[battle.focus];
  const target = focus?.hp > 0 ? battle.focus : battle.monsters.indexOf(living(battle)[0]);
  const spells = castable(battle);
  if (a.tactics === "heal") {
    const who = neediest(battle);
    const heal = spells.filter(s => s.spell.kind === "heal").sort((x, y) => x.spell.level - y.spell.level)[0];
    if (who && heal) return { type: "cast", spell: heal.id, target: who, slotLevel: heal.slotLevel };
    if (who && potionsLeft(battle)) return { type: "potion", on: who };
  }
  const useSlots = a.tactics === "attack";
  const damage = spells.filter(s => isDamage(s.spell) && (useSlots || s.spell.level === 0));
  if (living(battle).length > 1) {
    const area = damage.filter(s => s.spell.targets === "all").sort((x, y) => y.spell.level - x.spell.level)[0];
    if (area) return { type: "cast", spell: area.id, slotLevel: area.slotLevel };
  }
  const single = damage.filter(s => s.spell.targets === "one").sort((x, y) => y.spell.level - x.spell.level)[0];
  if (single) return { type: "cast", spell: single.id, target, slotLevel: single.slotLevel };
  return { type: "shoot", target };
}

/* Does an action for your companion. Returns { ok } or { ok: false, reason }; doesn't end their turn. */
function doAllyAction(battle, action, rng) {
  const a = battle.ally;
  if (action.type === "auto") return doAllyAction(battle, chooseAllyAction(battle), rng);
  if (action.type === "shoot") {
    const target = battle.monsters[action.target]?.hp > 0 ? battle.monsters[action.target] : living(battle)[0];
    if (!target) return { ok: false, reason: "There's nothing left to shoot." };
    const t = battle.monsters.indexOf(target);
    const r = adjustRoll(resolveAttack(a.attack, acOf(battle, t), rng, attackMods(battle, "ally", t, { melee: false })), target, a.attack);
    const woke = hurt(battle, t, r.damage);
    say(battle, "ally-attack", `${a.name} attacks the ${target.name} with a ${a.attack.name}: ${rollText(r, a.attack.bonus)} ${hitText(r)}`, { roll: r, target: t });
    tellWoken(battle, t, woke);
    if (target.hp === 0) say(battle, "defeat", `The ${target.name} falls.`, { target: t });
    return { ok: true };
  }
  if (action.type === "potion") {
    const potion = battle.player.inventory.find(i => i.base === "potionHealing");
    if (!potion) return { ok: false, reason: "You have no Potions of Healing." };
    const c = action.on === "ally" ? a : battle.player;
    if (c.hp >= c.maxHp) return { ok: false, reason: `${action.on === "ally" ? a.name + " is" : "You're"} already at full health.` };
    battle.player.inventory = battle.player.inventory.filter(i => i !== potion);
    const healed = Math.min(c.maxHp - c.hp, roll(baseOf(potion).heal, rng).total);
    c.hp += healed;
    const to = action.on === "ally" ? `drinks a Potion of Healing and recovers ${healed} HP` : `gives you a Potion of Healing: you recover ${healed} HP`;
    say(battle, "ally-heal", `${a.name} ${to} (${c.hp}/${c.maxHp}).`, { who: action.on === "ally" ? "ally" : "player", heal: healed });
    return { ok: true };
  }
  if (action.type === "cast") {
    const caster = allyCaster(battle);
    if (!caster) return { ok: false, reason: `${a.name} doesn't cast spells.` };
    // Spend the slot on a copy first, and keep it only if the spell goes off (a bad target costs nothing).
    const c = battle.player.companion, trial = { spells: a.casting.spells, slotsUsed: c.slotsUsed };
    const paid = spendForSpell(trial, a.level, action.spell, action.slotLevel);
    if (!paid.ok) return paid;
    const r = castSpell(battle, caster, action.spell, { target: action.target, slotLevel: paid.slotLevel }, rng);
    if (!r.ok) return r;
    c.slotsUsed = trial.slotsUsed;
    return { ok: true };
  }
  return { ok: false, reason: `Unknown action: ${action.type}` };
}

/* Your companion's turn when they act by themselves. */
export function allyTurn(battle, rng = Math.random) {
  doAllyAction(battle, chooseAllyAction(battle), rng);
}

/* Your pick for your companion's turn, when you lead them: { type: "shoot", target } | { type: "potion", on: "player"
   | "ally" } | { type: "cast", spell, target, slotLevel } | { type: "auto" } (let them decide). Returns { ok, events }
   or { ok: false, reason }, like playerAction. */
export function allyAction(battle, action, rng = Math.random) {
  if (!isAllyTurn(battle)) return { ok: false, reason: `It isn't ${battle.ally?.name ?? "your companion"}'s turn.` };
  const start = battle.log.length;
  const r = doAllyAction(battle, action, rng);
  if (!r.ok) return r;
  return endAllyAction(battle, start, rng);
}
