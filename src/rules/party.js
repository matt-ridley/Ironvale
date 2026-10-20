// Friends who join your party and fight beside you. A companion acts on their own turn (attacking the monster you
// last aimed at), levels up with you, and is carried on the hero as { id, hurt, gear } (hurt = damage taken, so a
// rest only has to set it to 0). If a companion falls in a fight they sit out the rest of it and get up afterwards.
// A companion has their own gear: a bow and light armour, which you swap from your pack and the blacksmith upgrades.
// One companion travels with you (hero.companion); the others wait on the roster (hero.roster), and you swap them at
// an inn. Each has TACTICS for when they act by themselves: attack, heal (look after whoever's badly hurt first) or,
// for casters, save magic (cantrips only, keeping spell slots). In a fight you can also lead them yourself
// (companion.lead): rules/tactics.js plays their turns.
import { proficiencyBonus } from "./character.js";
import { makeItem, baseOf, isPotion } from "./items.js";
import { roll } from "./dice.js";

export const COMPANIONS = {
  // Megan, a young ranger from Willowmere: light armour, a bow and quick hands.
  megan: { name: "Megan", dexMod: 2, hpBase: 8, hpPerLevel: 5, startGear: { bow: "shortbow", armour: "leather" } },
  // A caster also has `casting: { mod, spells }`: their spellcasting modifier and the spells they know (data/spells.js).
  // Robyn, a cleric from Fenwatch's shrine: a sling for when the magic runs out, and her prayers (WIS +3).
  robyn: { name: "Robyn", dexMod: 1, hpBase: 9, hpPerLevel: 6, startGear: { bow: "sling", armour: "leather" },
    casting: { mod: 3, spells: ["sacredFlame", "cureWounds", "healingWord", "bless"] } },
};

export const TACTICS = { attack: "ATTACK", heal: "HEAL", save: "SAVE MAGIC" };
/* The tactics a companion can use: saving magic only means something to a caster. */
export const tacticsFor = id => (COMPANIONS[id]?.casting ? ["attack", "heal", "save"] : ["attack", "heal"]);

// A companion's gear slots, and what goes in each.
export const COMPANION_SLOTS = ["bow", "armour"];

export const companionMaxHp = (id, level) => COMPANIONS[id].hpBase + COMPANIONS[id].hpPerLevel * (level - 1);

/* AC, to-hit and damage from the companion's gear (light armour: base + DEX; no bow: a 1d4 punch). */
function gearStats(base, gear, level) {
  const armour = gear.armour, bow = gear.bow;
  const ac = armour ? baseOf(armour).baseAc + base.dexMod + armour.upgrade : 10 + base.dexMod;
  const up = bow ? bow.upgrade : 0;
  const attack = bow
    ? { name: baseOf(bow).name, bonus: base.dexMod + proficiencyBonus(level) + up, damage: baseOf(bow).damage, damageBonus: base.dexMod + up, damageType: baseOf(bow).damageType, silvered: !!bow.silvered }
    : { name: "Fist", bonus: base.dexMod + proficiencyBonus(level), damage: "1d4", damageBonus: 0, damageType: "bludgeoning" };
  return { ac, attack };
}

/* The companion's fighting stats at the hero's level, as the battle uses them, or null with no companion. */
export function companionStats(hero) {
  const c = hero.companion, base = c && COMPANIONS[c.id];
  if (!base) return null;
  const maxHp = companionMaxHp(c.id, hero.level);
  return {
    id: c.id, name: base.name, level: hero.level, dexMod: base.dexMod, maxHp,
    hp: Math.max(1, maxHp - (c.hurt || 0)),
    ...gearStats(base, c.gear || {}, hero.level),
    tactics: tacticsFor(c.id).includes(c.tactics) ? c.tactics : "attack",
    casting: base.casting || null,
  };
}

/* Switches your companion to their next tactic. Returns it. */
export function cycleTactics(hero) {
  const c = hero.companion;
  if (!c) return null;
  const all = tacticsFor(c.id), now = Math.max(0, all.indexOf(c.tactics)); // none set yet means attack
  c.tactics = all[(now + 1) % all.length];
  return c.tactics;
}

/* Asks your companion to wait on the roster (at an inn). */
export function benchCompanion(hero) {
  if (!hero.companion) return { ok: false, reason: "No one is in your party." };
  const c = hero.companion;
  hero.roster = [...(hero.roster || []), c];
  delete hero.companion;
  return { ok: true, id: c.id };
}

/* Brings a companion from the roster into the party, rested (they've been at the inn). Whoever was with you takes
   their place on the roster. */
export function takeCompanion(hero, id) {
  const c = hero.roster?.find(r => r.id === id);
  if (!c) return { ok: false, reason: `${COMPANIONS[id]?.name ?? "They"} isn't waiting here.` };
  hero.roster = hero.roster.filter(r => r !== c);
  if (hero.companion) hero.roster.push(hero.companion);
  c.hurt = 0;
  if (c.slotsUsed) c.slotsUsed = [];
  hero.companion = c;
  return { ok: true, id };
}

export const startingGear = id => Object.fromEntries(COMPANION_SLOTS.map(s => [s, makeItem(COMPANIONS[id].startGear[s])]));

/* Someone new joins your party; whoever was travelling with you goes to wait on the roster (at an inn). Returns the
   id of whoever went to wait, if anyone. */
export function joinParty(hero, id) {
  const before = hero.companion;
  if (before) hero.roster = [...(hero.roster || []), before];
  hero.companion = { id, hurt: 0, gear: startingGear(id) };
  return before?.id || null;
}

/* After a fight: keep the companion's wounds (at least 1 HP left; a fallen friend gets back up). */
export function afterBattle(hero, ally) {
  if (hero.companion && ally) hero.companion.hurt = ally.maxHp - Math.max(1, ally.hp);
}

/* Why your companion can't drink this potion now, or null if they can. Only healing works on them (the other
   potions' effects are yours). */
export function companionCantDrink(hero, item) {
  const s = companionStats(hero);
  if (!s) return "No one is in your party.";
  if (!baseOf(item).heal) return `Only you can use a ${baseOf(item).name}.`;
  if (s.hp >= s.maxHp) return `${s.name} is already at full health.`;
  return null;
}

/* Your companion drinks a healing potion from your pack: { ok, item, healed, name } or { ok: false, reason }. */
export function companionDrink(hero, uid, rng = Math.random) {
  const item = hero.inventory.find(i => i.uid === uid);
  if (!item || !isPotion(item)) return { ok: false, reason: "You can't use that." };
  const reason = companionCantDrink(hero, item);
  if (reason) return { ok: false, reason };
  hero.inventory = hero.inventory.filter(i => i !== item);
  const before = companionStats(hero).hp;
  hero.companion.hurt = Math.max(0, (hero.companion.hurt || 0) - roll(baseOf(item).heal, rng).total);
  const s = companionStats(hero);
  return { ok: true, item, healed: s.hp - before, name: s.name };
}

/* Which of the companion's slots an item goes in, or why it can't. */
export function companionSlotFor(hero, item) {
  const name = COMPANIONS[hero.companion?.id]?.name ?? "Your friend";
  const b = baseOf(item);
  if (b.type === "bow") return { slot: "bow" };
  if (b.type === "armour") return b.category === "light" ? { slot: "armour" } : { reason: `${name} can only wear light armour.` };
  return { reason: `${name} only uses bows and light armour.` };
}

/* Moves an item from your pack onto your companion; whatever they had goes back in your pack. */
export function equipCompanion(hero, uid) {
  const c = hero.companion;
  if (!c) return { ok: false, reason: "No one is in your party." };
  const item = hero.inventory.find(i => i.uid === uid);
  if (!item) return { ok: false, reason: "That item isn't in your pack." };
  const { slot, reason } = companionSlotFor(hero, item);
  if (!slot) return { ok: false, reason };
  c.gear = { ...c.gear };
  hero.inventory = hero.inventory.filter(i => i !== item);
  const old = c.gear[slot];
  if (old) hero.inventory.push(old);
  c.gear[slot] = item;
  return { ok: true, item, unequipped: old ? [old] : [] };
}

export function unequipCompanion(hero, slot) {
  const item = hero.companion?.gear?.[slot];
  if (!item) return { ok: false, reason: "Nothing is equipped there." };
  hero.companion.gear = { ...hero.companion.gear, [slot]: null };
  hero.inventory.push(item);
  return { ok: true, item };
}

const stats = hero => { const s = companionStats(hero); return { ac: s.ac, bonus: s.attack.bonus, damage: s.attack.damage, damageBonus: s.attack.damageBonus }; };

/* Your companion's AC and attack now, and after equipping `uid` from your pack (tried on a copy). */
export function compareCompanionEquip(hero, uid) {
  const copy = structuredClone(hero);
  const r = equipCompanion(copy, uid);
  return { ok: r.ok, reason: r.reason, before: stats(hero), after: r.ok ? stats(copy) : null };
}

export function compareCompanionUnequip(hero, slot) {
  const copy = structuredClone(hero);
  const r = unequipCompanion(copy, slot);
  return { ok: r.ok, reason: r.reason, before: stats(hero), after: r.ok ? stats(copy) : null };
}

export const companionGear = hero => (hero.companion ? COMPANION_SLOTS.map(s => hero.companion.gear?.[s]).filter(Boolean) : []);
