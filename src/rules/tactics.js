// Your companion's turn in a fight. By themselves they follow their TACTICS (rules/party.js):
// - attack: a caster uses their best damage spell they have a slot for (one that hits every monster, when there's
//   more than one), else a damage cantrip; anyone else shoots the monster you last attacked.
// - heal: first, if you or they are at half HP or less, heal whoever's worse off (a healing spell, or a Potion of
//   Healing from your pack); otherwise as attack, but a caster keeps their slots for healing (cantrips only).
// - save: as attack, but cantrips only, so spell slots last.
// When you lead them (battle.leadAlly, or leadAlly2 for a second companion), their turn waits for allyAction() with
// what you picked. Each helper takes the companion's key ("ally" or "ally2"); their own record is `src` on them.
// Rachel's owl, Quill, flies at a monster once per fight (quillFlyby): your next attack has advantage. It costs her
// nothing: by herself she sends him on her first turn; when you lead her, it's the FLYBY button. Megan, once her father
// has taught her, can VOLLEY once per fight: one shot at every monster (by herself, when there's more than one). A cleric
// who knows Turn Undead turns the undead first, by herself.
// Claire (a druid with Wild Shape) calms a friend who's frightened, paralyzed or held first, then heals if she's on
// HEAL and someone needs it; otherwise she takes a beast form while she has one left (a bear: her own HP stays safe
// behind its own) and mauls with it; out of forms, she casts (her wolf pack first, if it isn't out already).
// No Phaser here, so it can be tested.
import { SPELLS } from "../data/spells.js";
import { roll } from "./dice.js";
import { baseOf } from "./items.js";
import { attackMods, addCondition, removeCondition, skipsTurn, hasCondition, CONDITIONS } from "./conditions.js";
import { shapesLeft, makeForm, FORMS } from "./party.js";
import { acOf, hurt, tellWoken, say, living, resolveAttack, adjustRoll, rollText, hitText, isAllyTurn, allyTurnKey, endAllyAction, partyKeys, allyKeys, combatant } from "./combat.js";
import { makeCaster, castSpell, slotsLeft, spendForSpell } from "./magic.js";

/* A companion as a caster (their spell attack bonus and DC at your level), or null if they don't cast. */
export function allyCaster(battle, key = "ally") {
  const a = battle[key];
  return a?.casting ? makeCaster({ name: a.name, key, level: a.level, mod: a.casting.mod }) : null;
}

/* The lowest slot level (at or above `level`) a companion has left, or 0. */
function freeSlot(battle, level, key = "ally") {
  const a = battle[key], left = slotsLeft(a.src, a.level);
  for (let l = Math.max(level, 1); l <= left.length; l++) if (left[l - 1] > 0) return l;
  return 0;
}

/* Spells a companion knows that they could cast right now, with the slot they'd use (0 for a cantrip). */
export function castable(battle, key = "ally") {
  const a = battle[key];
  if (!a?.casting || a.form) return []; // no casting in beast form
  return a.casting.spells.filter(id => SPELLS[id].kind !== "reaction").map(id => ({ id, spell: SPELLS[id], slotLevel: SPELLS[id].level ? freeSlot(battle, SPELLS[id].level, key) : 0 }))
    .filter(s => s.spell.level === 0 || s.slotLevel > 0);
}

const isDamage = s => !!s.damage;
const potionsLeft = battle => battle.player.inventory.filter(i => i.base === "potionHealing").length;

/* The friend most in need: the one with the lowest share of their HP, if that's half or less. */
function neediest(battle) {
  const friends = partyKeys(battle).map(k => [k, combatant(battle, k)]).filter(([, c]) => c.hp > 0);
  const [key, c] = friends.sort(([, a], [, b]) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  return c.hp <= c.maxHp / 2 ? key : null;
}

export const CALM_ENDS = ["frightened", "paralyzed", "restrained"]; // what Claire's touch ends

/* The first of you (you, then your companions) who's frightened, paralyzed or held, or null. */
export const afflicted = battle => partyKeys(battle).find(k => combatant(battle, k).hp > 0 && CALM_ENDS.some(id => hasCondition(battle, k, id))) || null;

/* What a companion does by themselves this turn, as an allyAction action. */
export function chooseAllyAction(battle, key = "ally") {
  const a = battle[key], focus = battle.monsters[battle.focus];
  const target = focus?.hp > 0 ? battle.focus : battle.monsters.indexOf(living(battle)[0]);
  const spells = castable(battle, key);
  if (canVolley(battle, key) && living(battle).length > 1) return { type: "volley" };
  if (a.wildShape && !a.form && afflicted(battle)) return { type: "calm", on: afflicted(battle) };
  const turn = spells.find(s => s.id === "turnUndead");
  const untouched = living(battle).filter(m => m.type === "undead" && !battle.conditions?.[battle.monsters.indexOf(m)]?.turned);
  if (turn && a.tactics !== "save" && untouched.length) return { type: "cast", spell: "turnUndead", slotLevel: turn.slotLevel };
  if (a.tactics === "heal") {
    const who = neediest(battle);
    const heal = spells.filter(s => s.spell.kind === "heal").sort((x, y) => x.spell.level - y.spell.level)[0];
    if (who && heal) return { type: "cast", spell: heal.id, target: who, slotLevel: heal.slotLevel };
    if (who && potionsLeft(battle)) return { type: "potion", on: who };
  }
  if (a.form) return { type: "shoot", target }; // the beast mauls
  if (a.wildShape && shapesLeft(a.src) > 0) return { type: "shape", form: "bear" };
  const pack = spells.find(s => s.spell.kind === "pack");
  if (pack && a.tactics === "attack" && !battle.pack) return { type: "cast", spell: pack.id, slotLevel: pack.slotLevel };
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

/* Does an action for a companion. Returns { ok } or { ok: false, reason }; doesn't end their turn. action.on (a
   potion) is who drinks it: "player" or a companion's key. */
function doAllyAction(battle, action, rng, key = "ally") {
  const a = battle[key];
  if (action.type === "auto") return doAllyAction(battle, chooseAllyAction(battle, key), rng, key);
  if (action.type === "shoot") {
    const target = battle.monsters[action.target]?.hp > 0 ? battle.monsters[action.target] : living(battle)[0];
    if (!target) return { ok: false, reason: "There's nothing left to shoot." };
    if (a.form) maul(battle, target, rng, key); else shoot(battle, target, rng, key);
    return { ok: true };
  }
  if (action.type === "shape") {
    if (!a.wildShape) return { ok: false, reason: `${a.name} can't do that.` };
    if (a.form) return { ok: false, reason: `${a.name} is already a ${a.form.name}.` };
    if (!shapesLeft(a.src)) return { ok: false, reason: `${a.name} has no Wild Shape left. A rest brings it back.` };
    if (!FORMS[action.form]) return { ok: false, reason: `Unknown form: ${action.form}` };
    a.src.shapesUsed = (a.src.shapesUsed || 0) + 1;
    a.form = makeForm(action.form, a.level);
    say(battle, "wild-shape", `${a.name} drops to all fours, and where she was there's a ${a.form.name}! (${a.form.hp} HP of its own)`, { who: key, form: action.form });
    return { ok: true };
  }
  if (action.type === "calm") {
    if (!a.wildShape || a.form) return { ok: false, reason: a.form ? `A ${a.form.name} can't do that.` : `${a.name} can't do that.` };
    const on = action.on ?? afflicted(battle), c = on !== null && combatant(battle, on);
    const ends = c ? CALM_ENDS.filter(id => hasCondition(battle, on, id)) : [];
    if (!ends.length) return { ok: false, reason: "No one needs calming." };
    for (const id of ends) removeCondition(battle, on, id);
    say(battle, "calm", `${a.name} lays a hand on ${on === "player" ? "you" : c.name} and hums something old: ${on === "player" ? "you're" : `${c.name} is`} no longer ${ends.map(id => CONDITIONS[id].name).join(" or ")}.`, { who: on });
    return { ok: true };
  }
  if (action.type === "volley") {
    if (!canVolley(battle, key)) return { ok: false, reason: "No volley left this fight." };
    battle.volleyUsed = true;
    say(battle, "volley", `${a.name} nocks three arrows at once and looses them in one breath!`, { by: key });
    for (const m of living(battle)) shoot(battle, m, rng, key);
    return { ok: true };
  }
  if (action.type === "potion") {
    const potion = battle.player.inventory.find(i => i.base === "potionHealing");
    if (!potion) return { ok: false, reason: "You have no Potions of Healing." };
    const on = action.on === "player" ? "player" : battle[action.on] ? action.on : key;
    const c = combatant(battle, on), self = on === key;
    if (c.hp >= c.maxHp) return { ok: false, reason: `${on === "player" ? "You're" : c.name + " is"} already at full health.` };
    battle.player.inventory = battle.player.inventory.filter(i => i !== potion);
    const healed = Math.min(c.maxHp - c.hp, roll(baseOf(potion).heal, rng).total);
    c.hp += healed;
    const to = self ? `drinks a Potion of Healing and recovers ${healed} HP`
      : on === "player" ? `gives you a Potion of Healing: you recover ${healed} HP` : `gives ${c.name} a Potion of Healing: ${c.name} recovers ${healed} HP`;
    say(battle, "ally-heal", `${a.name} ${to} (${c.hp}/${c.maxHp}).`, { who: on, heal: healed });
    return { ok: true };
  }
  if (action.type === "cast") {
    const caster = allyCaster(battle, key);
    if (!caster) return { ok: false, reason: `${a.name} doesn't cast spells.` };
    // Spend the slot on a copy first, and keep it only if the spell goes off (a bad target costs nothing).
    const c = a.src, trial = { spells: a.casting.spells, slotsUsed: c.slotsUsed };
    const paid = spendForSpell(trial, a.level, action.spell, action.slotLevel);
    if (!paid.ok) return paid;
    const r = castSpell(battle, caster, action.spell, { target: action.target, slotLevel: paid.slotLevel }, rng);
    if (!r.ok) return r;
    c.slotsUsed = trial.slotsUsed;
    return { ok: true };
  }
  return { ok: false, reason: `Unknown action: ${action.type}` };
}

/* Rachel's key in this fight ("ally" or "ally2"), or null if she isn't here. */
const rachelKey = battle => allyKeys(battle).find(k => battle[k].id === "rachel") || null;

/* True if Quill can still fly at a monster this fight. */
export const canFlyby = battle => { const k = rachelKey(battle); return !!k && battle[k].hp > 0 && !battle.flyby && living(battle).length > 0; };

/* Quill swoops at the monster you're fighting: your next attack has advantage (the Help action). Once per fight, and it
   doesn't use up Rachel's turn. Returns { ok, events } or { ok: false, reason }. */
export function quillFlyby(battle) {
  if (!canFlyby(battle)) return { ok: false, reason: battle.flyby ? "Quill has already flown this fight." : "Quill isn't here." };
  const start = battle.log.length;
  battle.flyby = true;
  addCondition(battle, "player", "helped", {});
  const t = battle.monsters[battle.focus]?.hp > 0 ? battle.monsters[battle.focus] : living(battle)[0];
  say(battle, "flyby", `Quill swoops at ${t.the}'s eyes, hooting! Your next attack has advantage.`, { target: battle.monsters.indexOf(t) });
  return { ok: true, events: battle.log.slice(start) };
}

/* One shot (or sling stone, or bolt) from a companion at a monster. */
function shoot(battle, target, rng, key = "ally") {
  const a = battle[key], t = battle.monsters.indexOf(target);
  const r = adjustRoll(resolveAttack(a.attack, acOf(battle, t), rng, attackMods(battle, key, t, { melee: false })), target, a.attack);
  const woke = hurt(battle, t, r.damage);
  say(battle, "ally-attack", `${a.name} attacks ${target.the} with a ${a.attack.name}: ${rollText(r, a.attack.bonus)} ${hitText(r)}`, { roll: r, target: t, by: key });
  tellWoken(battle, t, woke);
  if (target.hp === 0) say(battle, "defeat", `${target.The} falls.`, { target: t });
}

/* A companion in beast form mauls a monster: each of the beast's attacks, in melee. */
function maul(battle, target, rng, key) {
  const a = battle[key], t = battle.monsters.indexOf(target);
  for (const atk of a.form.attacks) {
    if (target.hp <= 0) break;
    const r = adjustRoll(resolveAttack(atk, acOf(battle, t), rng, attackMods(battle, key, t)), target, atk);
    const woke = hurt(battle, t, r.damage);
    say(battle, "ally-attack", `The ${a.form.name} (${a.name}) ${atk.name === "Bite" ? "bites" : "rakes"} ${target.the}: ${rollText(r, atk.bonus)} ${hitText(r)}`, { roll: r, target: t, by: key });
    tellWoken(battle, t, woke);
    if (target.hp === 0) say(battle, "defeat", `${target.The} falls.`, { target: t });
  }
}

/* True if this companion can still VOLLEY this fight (Megan, once Corwin has taught her). */
export const canVolley = (battle, key = "ally") => !!battle[key]?.src?.volley && battle[key].hp > 0 && !battle.volleyUsed && living(battle).length > 0;

/* The key of a companion who could COUNTER a spell now (Rachel: she knows Counterspell, has a level 3 slot or higher
   left, and can act), or null. */
export function counterKey(battle) {
  const k = rachelKey(battle), a = k && battle[k];
  return a && a.hp > 0 && !skipsTurn(battle, k) && a.casting?.spells.includes("counterspell") && freeSlot(battle, 3, k) > 0 ? k : null;
}
export const canCounter = battle => !!counterKey(battle);

/* Rachel's COUNTER: spends her lowest slot of level 3 or more. A spell of 3rd level or lower just stops; a higher one
   needs her check (d20 + INT against 10 + its level). Returns true if the spell is stopped. */
export function counter(battle, spell, rng = Math.random) {
  const k = counterKey(battle), a = battle[k], c = a.src, slot = freeSlot(battle, 3, k);
  c.slotsUsed = [...(c.slotsUsed || [])];
  c.slotsUsed[slot - 1] = (c.slotsUsed[slot - 1] || 0) + 1;
  const level = spell.level || 1;
  if (level <= Math.max(3, slot)) {
    say(battle, "counter", `${a.name} snaps her fingers: COUNTERSPELL! ${spell.name[0].toUpperCase() + spell.name.slice(1)} fizzles into nothing.`);
    return true;
  }
  const roll20 = 1 + Math.floor(rng() * 20), total = roll20 + a.casting.mod, dc = 10 + level;
  const ok = total >= dc;
  say(battle, ok ? "counter" : "counter-fail", ok ? `${a.name} snaps her fingers: COUNTERSPELL! (${total} vs DC ${dc}) It fizzles into nothing.`
    : `${a.name} tries to COUNTER it (${total} vs DC ${dc}), but it's too strong!`);
  return ok;
}

/* A companion's turn when they act by themselves. */
export function allyTurn(battle, rng = Math.random, key = "ally") {
  if (key === rachelKey(battle) && canFlyby(battle)) quillFlyby(battle);
  doAllyAction(battle, chooseAllyAction(battle, key), rng, key);
}

/* Your pick for a companion's turn (whoever's turn it is), when you lead them: { type: "shoot", target } | { type:
   "potion", on: "player" | "ally" | "ally2" } | { type: "cast", spell, target, slotLevel } | { type: "auto" } (let them
   decide). Returns { ok, events } or { ok: false, reason }, like playerAction. */
export function allyAction(battle, action, rng = Math.random) {
  if (!isAllyTurn(battle)) return { ok: false, reason: `It isn't ${battle.ally?.name ?? "your companion"}'s turn.` };
  const start = battle.log.length, key = allyTurnKey(battle);
  const r = doAllyAction(battle, action, rng, key);
  if (!r.ok) return r;
  return endAllyAction(battle, start, rng);
}
