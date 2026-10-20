// Magic: spell slots, cantrips, casting a spell in a fight, scrolls, and healing spells outside a fight. Built for
// companions who cast (the roster, later) and the hero's Warden runes alike: anyone who casts is described by a
// `caster` ({ name, key, level, mod, attackBonus, saveDc }) and keeps what they know and what they've used in a
// `book` ({ spells: [ids], slotsUsed: [count per slot level] }), saved with them and refilled by a long rest.
// No Phaser here, and no screen uses it yet: everything is unit tested.
import { SPELLS, SLOT_TABLE, SCROLL_POWER } from "../data/spells.js";
import { ITEMS } from "../data/items.js";
import { roll, parseDice } from "./dice.js";
import { proficiencyBonus } from "./character.js";
import { addCondition, attackMods, CONDITIONS } from "./conditions.js";
import { combatant, nameOf, acOf, battleSave, hurt, tellWoken, say, living, resolveAttack, rollText, hitText, isPlayerTurn, endPlayerAction } from "./combat.js";
import { companionStats } from "./party.js";

/* Spell slots a full caster of this level has, by slot level (index 0 = level 1 slots). */
export const slotsFor = level => SLOT_TABLE[Math.min(Math.max(level, 0), SLOT_TABLE.length - 1)];

/* Slots left in a book, by slot level (index 0 = level 1). */
export const slotsLeft = (book, level) => slotsFor(level).map((n, i) => Math.max(0, n - (book.slotsUsed?.[i] || 0)));

/* A long rest refills every slot. */
export function restoreSlots(book) { book.slotsUsed = []; }

/* A caster's numbers: spell attack bonus = proficiency + spellcasting modifier; save DC = 8 + the same. */
export function makeCaster({ name, key, level, mod }) {
  const prof = proficiencyBonus(level);
  return { name, key, level, mod, attackBonus: prof + mod, saveDc: 8 + prof + mod };
}

/* Reading a scroll uses the scroll's own attack bonus and DC (SRD), whoever reads it. Its spellcasting modifier is
   what that DC implies (for Cure Wounds and the like). */
export function scrollCaster(spell, reader) {
  const p = SCROLL_POWER[Math.min(spell.level, SCROLL_POWER.length - 1)];
  return { name: reader.name, key: reader.key, level: reader.level, mod: p.saveDc - 10, ...p };
}

/* Cantrip damage dice multiply at caster levels 5, 11 and 17. */
export const cantripTier = level => 1 + [5, 11, 17].filter(l => level >= l).length;

/* A spell's dice for this caster and slot: "1d10" Fire Bolt at level 5 is "2d10"; "3d6" Burning Hands in a level 2
   slot is "4d6". `what` is the field (damage, heal or pool) and `per` how many dice each slot level above adds. */
export function spellDice(spell, what, casterLevel, slotLevel = spell.level, per = spell.upcast?.dice || 0) {
  const d = parseDice(spell[what]);
  const count = spell.level === 0 ? d.count * cantripTier(casterLevel) : d.count + per * Math.max(0, slotLevel - spell.level);
  return `${count}d${d.sides}${d.bonus ? (d.bonus > 0 ? "+" : "") + d.bonus : ""}`;
}

/* Checks a caster can cast a spell they know (a cantrip, or with a slot of `slotLevel`, which defaults to the spell's
   level) and spends the slot. Returns { ok, slotLevel } or { ok: false, reason }. */
export function spendForSpell(book, casterLevel, spellId, slotLevel) {
  const spell = SPELLS[spellId];
  if (!spell) return { ok: false, reason: `Unknown spell: ${spellId}` };
  if (!book.spells?.includes(spellId)) return { ok: false, reason: `${spell.name} isn't a spell they know.` };
  if (spell.level === 0) return { ok: true, slotLevel: 0 };
  const level = slotLevel ?? spell.level;
  if (level < spell.level) return { ok: false, reason: `${spell.name} needs a level ${spell.level} slot.` };
  if (!(slotsLeft(book, casterLevel)[level - 1] > 0)) return { ok: false, reason: `No level ${level} spell slots left. A long rest brings them back.` };
  book.slotsUsed = [...(book.slotsUsed || [])];
  book.slotsUsed[level - 1] = (book.slotsUsed[level - 1] || 0) + 1;
  return { ok: true, slotLevel: level };
}

/* Who a spell would land on, or a reason it can't be cast. target: a monster's index for "one", "player" or "ally"
   for "friend". */
function targetsFor(battle, spell, caster, target) {
  if (spell.targets === "one") {
    const t = target ?? battle.monsters.indexOf(living(battle)[0]);
    return battle.monsters[t]?.hp > 0 ? { keys: [t] } : { reason: "Pick a monster that's still standing." };
  }
  if (spell.targets === "all") return { keys: living(battle).map(m => battle.monsters.indexOf(m)) };
  if (spell.targets === "self") return { keys: [caster.key] };
  if (spell.targets === "party") return { keys: ["player", ...(battle.ally?.hp > 0 ? ["ally"] : [])] };
  const t = target ?? caster.key;
  if (t === "ally" && !battle.ally) return { reason: "No one is in your party." };
  return t === "player" || t === "ally" ? { keys: [t] } : { reason: "Pick yourself or a friend." };
}

/* Casts a spell in a fight: rolls it, deals damage, heals, and adds conditions, writing each step to the battle log.
   It doesn't spend slots or end anyone's turn: the caller does (spendForSpell, endPlayerAction). opts: { target,
   slotLevel }. Returns { ok } or { ok: false, reason }. */
export function castSpell(battle, caster, spellId, { target, slotLevel } = {}, rng = Math.random) {
  const spell = SPELLS[spellId];
  if (!spell) return { ok: false, reason: `Unknown spell: ${spellId}` };
  const slot = slotLevel ?? spell.level;
  const { keys, reason } = targetsFor(battle, spell, caster, target);
  if (!keys) return { ok: false, reason };
  const who = caster.key === "player" ? "You" : caster.name;
  say(battle, "spell", `${who} ${caster.key === "player" ? "cast" : "casts"} ${spell.name}${slot > spell.level && spell.level ? ` (as a level ${slot} spell)` : ""}!`, { spell: spellId, caster: caster.key });
  const fallen = t => { if (typeof t === "number" && combatant(battle, t).hp === 0) say(battle, "defeat", `The ${battle.monsters[t].name} falls.`, { target: t }); };
  const condition = (t, c) => {
    addCondition(battle, t, c.id, { rounds: c.rounds, untilTurnStart: c.untilTurnStart, saveEnds: c.saveEnds && { ability: c.saveEnds, dc: caster.saveDc } });
    if (CONDITIONS[c.id].once) return; // a passing effect (mocked) needs no line of its own
    say(battle, "condition", `${nameOf(battle, t)} ${t === "player" ? "are" : "is"} ${CONDITIONS[c.id].name}.`, { who: t, condition: c.id });
  };

  if (spell.kind === "attack") {
    const t = keys[0];
    const r = resolveAttack({ bonus: caster.attackBonus, damage: spellDice(spell, "damage", caster.level, slot), damageBonus: 0 }, acOf(battle, t), rng,
      attackMods(battle, caster.key, t, { melee: false }));
    const woke = hurt(battle, t, r.damage);
    say(battle, "spell-attack", `${spell.name} at the ${battle.monsters[t].name}: ${rollText(r, caster.attackBonus)} ${hitText(r)}`, { roll: r, target: t, spell: spellId });
    tellWoken(battle, t, woke);
    fallen(t);
  } else if (spell.kind === "save") {
    for (const t of keys) {
      const s = battleSave(battle, t, spell.save, caster.saveDc, rng);
      const full = spell.damage ? roll(spellDice(spell, "damage", caster.level, slot), rng).total : 0;
      const dmg = s.success ? (spell.half ? Math.floor(full / 2) : 0) : full;
      const woke = hurt(battle, t, dmg);
      const saved = `${s.ability} save ${s.total} vs DC ${s.dc}`;
      say(battle, "spell-save", `The ${battle.monsters[t].name} ${s.success ? "resists" : "is caught"} (${saved})${spell.damage ? `: ${dmg} ${spell.damageType} damage` : ""}.`, { target: t, save: s, damage: dmg, spell: spellId });
      tellWoken(battle, t, woke);
      fallen(t);
      if (!s.success && spell.condition && combatant(battle, t).hp > 0) condition(t, spell.condition);
    }
  } else if (spell.kind === "darts") {
    let t = keys[0];
    const darts = spell.darts + (spell.upcast?.darts || 0) * Math.max(0, slot - spell.level);
    for (let n = 0; n < darts && t !== undefined; n++) {
      const dmg = roll(spell.damage, rng).total;
      const woke = hurt(battle, t, dmg);
      say(battle, "spell-hit", `A glowing dart strikes the ${battle.monsters[t].name}: ${dmg} ${spell.damageType} damage.`, { target: t, damage: dmg, spell: spellId });
      tellWoken(battle, t, woke);
      fallen(t);
      if (combatant(battle, t).hp === 0) { // the rest fly at the next monster standing
        const next = living(battle)[0];
        t = next ? battle.monsters.indexOf(next) : undefined;
      }
    }
  } else if (spell.kind === "sleep") {
    let pool = roll(spellDice(spell, "pool", caster.level, slot, spell.upcast?.pool || 0), rng).total;
    const sleepers = keys.filter(t => !battle.conditions?.[t]?.asleep).sort((a, b) => battle.monsters[a].hp - battle.monsters[b].hp || a - b);
    let any = false;
    for (const t of sleepers) {
      const hp = battle.monsters[t].hp;
      if (hp > pool) break;
      pool -= hp;
      any = true;
      condition(t, spell.condition);
    }
    if (!any) say(battle, "spell-fizzle", "A drowsy haze drifts over them, but no one is weak enough to drop off.", { spell: spellId });
  } else if (spell.kind === "heal") {
    const t = keys[0], c = combatant(battle, t), down = c.hp === 0;
    const amount = Math.max(1, roll(spellDice(spell, "heal", caster.level, slot), rng).total + caster.mod);
    const healed = Math.min(c.maxHp - c.hp, amount);
    c.hp += healed;
    say(battle, "spell-heal", `${nameOf(battle, t)} ${t === "player" ? "recover" : "recovers"} ${healed} HP (${c.hp}/${c.maxHp})${down && healed ? " and gets back up!" : "."}`, { who: t, heal: healed, revived: down && healed > 0, spell: spellId });
  } else if (spell.kind === "buff") {
    for (const t of keys) condition(t, spell.condition);
  }
  return { ok: true };
}

/* Reads a spell scroll from your pack on your turn: anyone can, once. Uses up your turn, unless the spell is a bonus
   action (Healing Word). Returns what playerAction returns: { ok, events } or { ok: false, reason }. */
export function readScroll(battle, uid, { target, slotLevel } = {}, rng = Math.random) {
  if (!isPlayerTurn(battle)) return { ok: false, reason: "It isn't your turn." };
  const p = battle.player;
  const item = p.inventory.find(i => i.uid === uid);
  const spell = item && SPELLS[ITEMS[item.base].spell];
  if (!spell) return { ok: false, reason: "That isn't a scroll." };
  const check = targetsFor(battle, spell, { key: "player" }, target);
  if (!check.keys) return { ok: false, reason: check.reason };
  p.inventory = p.inventory.filter(i => i !== item);
  const start = battle.log.length;
  say(battle, "scroll", `You read the ${ITEMS[item.base].name}. The words burn away as you speak them.`);
  castSpell(battle, scrollCaster(spell, { name: "You", key: "player", level: p.level }), ITEMS[item.base].spell, { target, slotLevel }, rng);
  if (spell.bonusAction) return { ok: true, events: battle.log.slice(start) };
  return endPlayerAction(battle, start, rng);
}

/* A healing spell outside a fight (from the bag), on the hero ("hero") or your companion ("ally"). Doesn't spend
   anything: the caller does. Returns { ok, healed } or { ok: false, reason }. */
export function healOutsideBattle(hero, caster, spellId, target, { slotLevel } = {}, rng = Math.random) {
  const spell = SPELLS[spellId];
  if (spell?.kind !== "heal") return { ok: false, reason: "Only healing spells can be cast outside a fight." };
  const amount = Math.max(1, roll(spellDice(spell, "heal", caster.level, slotLevel ?? spell.level), rng).total + caster.mod);
  if (target === "ally") {
    const s = companionStats(hero);
    if (!s) return { ok: false, reason: "No one is in your party." };
    if (s.hp >= s.maxHp) return { ok: false, reason: `${s.name} is already at full health.` };
    const before = s.hp;
    hero.companion.hurt = Math.max(0, hero.companion.hurt - amount);
    return { ok: true, healed: companionStats(hero).hp - before };
  }
  if (hero.hp >= hero.maxHp) return { ok: false, reason: "You're already at full health." };
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + amount);
  return { ok: true, healed: hero.hp - before };
}
