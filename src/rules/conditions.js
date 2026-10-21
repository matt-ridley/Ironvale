// Conditions: what spells (and, later, monsters like the ghoul) do to someone in a fight besides damage. They live on
// the battle, not on the hero, so nothing carries over after a fight: battle.conditions[key] = { id: { rounds, ... } },
// where key is "player", "ally" or a monster's index. No Phaser here.
//
// Each condition says what it changes:
// - skips: they lose their turns (asleep, paralyzed).
// - attackedWith: "advantage" (or "disadvantage") for attacks against them; `meleeCrits`: a melee hit on them is a
//   critical hit.
// - attacksWith: "disadvantage" (or "advantage") on their own attacks; `once`: it ends after their next attack.
// - bonusDice: added to their attack rolls and saving throws (Bless's 1d4).
// - ac: added to their AC.
// - badSaves: saving throws they make with disadvantage.
// - wakesOnDamage: any damage ends it.
// How long: `rounds` counts down at the end of each of their turns; `untilTurnStart` ends it when their next turn
// starts; `saveEnds` ({ ability, dc }) lets them try a saving throw at the end of each of their turns to end it.
import { d20, roll } from "./dice.js";

export const CONDITIONS = {
  asleep:     { name: "asleep", skips: true, attackedWith: "advantage", wakesOnDamage: true },
  paralyzed:  { name: "paralyzed", skips: true, attackedWith: "advantage", meleeCrits: true, badSaves: ["STR", "DEX"] },
  restrained: { name: "restrained", attackedWith: "advantage", attacksWith: "disadvantage", badSaves: ["DEX"] },
  outlined:   { name: "outlined in light", attackedWith: "advantage" },
  mocked:     { name: "rattled", attacksWith: "disadvantage", once: true },
  blessed:    { name: "blessed", bonusDice: "1d4" },
  shielded:   { name: "shielded", ac: 5 },
  blinked:    { name: "out of reach", attackedWith: "disadvantage" }, // Misty Step
  helped:     { name: "helped", attacksWith: "advantage", once: true }, // Quill's flyby
};

const of = (battle, key) => (battle.conditions ||= {})[key] ||= {};
export const hasCondition = (battle, key, id) => !!battle.conditions?.[key]?.[id];
const active = (battle, key) => Object.keys(battle.conditions?.[key] || {}).map(id => CONDITIONS[id]);

/* Gives `key` a condition. opts: { rounds, untilTurnStart, saveEnds: { ability, dc } }. A new one replaces the old. */
export function addCondition(battle, key, id, opts = {}) {
  if (!CONDITIONS[id]) throw new Error(`Unknown condition: ${id}`);
  of(battle, key)[id] = { ...opts };
}

export function removeCondition(battle, key, id) {
  if (battle.conditions?.[key]) delete battle.conditions[key][id];
}

/* True if their conditions take away their turn. */
export const skipsTurn = (battle, key) => active(battle, key).some(c => c.skips);

/* Extra AC from conditions (Shield). */
export const conditionAc = (battle, key) => active(battle, key).reduce((s, c) => s + (c.ac || 0), 0);

/* Dice added to their attack rolls and saves (Bless), or null. */
export const bonusDice = (battle, key) => active(battle, key).find(c => c.bonusDice)?.bonusDice || null;

/* How an attack from `attacker` on `target` is rolled: { advantage, disadvantage, critOnHit, bonusDice }.
   `melee`: a melee attack (a hit on someone paralyzed is a critical hit). Uses up a once-only condition (mocked). */
export function attackMods(battle, attacker, target, { melee = true } = {}) {
  const on = active(battle, target), by = active(battle, attacker);
  const mods = {
    advantage: on.some(c => c.attackedWith === "advantage") || by.some(c => c.attacksWith === "advantage"),
    disadvantage: by.some(c => c.attacksWith === "disadvantage") || on.some(c => c.attackedWith === "disadvantage"),
    critOnHit: melee && on.some(c => c.meleeCrits),
    bonusDice: bonusDice(battle, attacker),
  };
  for (const id of Object.keys(battle.conditions?.[attacker] || {})) if (CONDITIONS[id].once) removeCondition(battle, attacker, id);
  return mods;
}

/* A saving throw for anyone in the fight: d20 + `bonus` (+ Bless), with disadvantage where a condition says so.
   Returns { ability, dc, rolls, natural, bonus, extra, total, success }. */
export function conditionSave(battle, key, ability, dc, bonus, rng = Math.random) {
  const disadvantage = active(battle, key).some(c => c.badSaves?.includes(ability));
  const { rolls, natural } = d20({ disadvantage }, rng);
  const dice = bonusDice(battle, key);
  const extra = dice ? roll(dice, rng).total : 0;
  const total = natural + bonus + extra;
  return { ability, dc, rolls, natural, bonus, extra, total, success: total >= dc };
}

/* Damage wakes a sleeper. Returns the names of the conditions it ended. */
export function onDamage(battle, key) {
  const ended = [];
  for (const id of Object.keys(battle.conditions?.[key] || {})) {
    if (CONDITIONS[id].wakesOnDamage) { removeCondition(battle, key, id); ended.push(CONDITIONS[id].name); }
  }
  return ended;
}

/* At the start of their turn: conditions that last until then end. Returns the names of those that ended. */
export function startTurn(battle, key) {
  const ended = [];
  for (const [id, c] of Object.entries(battle.conditions?.[key] || {})) {
    if (c.untilTurnStart) { removeCondition(battle, key, id); ended.push(CONDITIONS[id].name); }
  }
  return ended;
}

/* At the end of their turn: rounds count down and they can try to save their way out. `saveBonus(ability)` is their
   saving throw bonus. Returns [{ id, name, save }] for each condition that ended (`save` if a saving throw ended it). */
export function endTurn(battle, key, saveBonus, rng = Math.random) {
  const ended = [];
  for (const [id, c] of Object.entries(battle.conditions?.[key] || {})) {
    let save = null;
    if (c.saveEnds) save = conditionSave(battle, key, c.saveEnds.ability, c.saveEnds.dc, saveBonus(c.saveEnds.ability), rng);
    if (c.rounds !== undefined) c.rounds--;
    if (save?.success || c.rounds <= 0 || CONDITIONS[id].once) {
      removeCondition(battle, key, id);
      ended.push({ id, name: CONDITIONS[id].name, save });
    }
  }
  return ended;
}
