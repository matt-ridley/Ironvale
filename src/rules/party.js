// Friends who join your party and fight beside you. A companion acts on their own turn (attacking the monster you
// last aimed at), levels up with you, and is carried on the hero as { id, hurt, gear } (hurt = damage taken, so a
// rest only has to set it to 0). If a companion falls in a fight they sit out the rest of it and get up afterwards.
// A companion has their own gear: a bow and light armour, which you swap from your pack and the blacksmith upgrades.
// One companion travels with you (hero.companion); the others wait on the roster (hero.roster), and you swap them at
// an inn. Each has TACTICS for when they act by themselves: attack, heal (look after whoever's badly hurt first) or,
// for casters, save magic (cantrips only, keeping spell slots). In a fight you can also lead them yourself
// (companion.lead): rules/tactics.js plays their turns.
// Some fights have a second companion beside you (Act 4): someone from the roster, or a guest who isn't on it (Rachel,
// when Claire comes back). createBattle takes their record as `second`; guestCompanion makes a guest's.
// Claire, the druid (Act 4), has Wild Shape: twice per rest (short or long) she becomes a bear or a great cat (FORMS),
// with HP of its own; she can't cast in beast form, and turns back when the beast's HP runs out, her own untouched.
// She makes her saving throws against spells with advantage.
// A wizard (Rachel) keeps a spellbook that grows: give her a spell scroll and she copies it in for good (copySpell), and
// a short rest at a camp brings back some of her spell slots (arcaneRecovery).
import { proficiencyBonus } from "./character.js";
import { makeItem, baseOf, isPotion } from "./items.js";
import { roll } from "./dice.js";
import { SPELLS } from "../data/spells.js";
import { ITEMS } from "../data/items.js";

export const COMPANIONS = {
  // Megan, a young ranger from Willowmere: light armour, a bow and quick hands.
  megan: { name: "Megan", dexMod: 2, hpBase: 8, hpPerLevel: 5, startGear: { bow: "shortbow", armour: "leather" } },
  // A caster also has `casting: { mod, spells }`: their spellcasting modifier and the spells they know (data/spells.js).
  // Robyn, a cleric from Fenwatch's shrine: a sling for when the magic runs out, and her prayers (WIS +3).
  robyn: { name: "Robyn", dexMod: 1, hpBase: 9, hpPerLevel: 6, startGear: { bow: "sling", armour: "leather" },
    casting: { mod: 3, spells: ["sacredFlame", "cureWounds", "healingWord", "bless"] } },
  // Rachel, a scholar of the Wardens' runes and Thorne's old apprentice: a wizard (INT +3) in padded armour, with a light
  // crossbow for when the magic runs out, a spellbook that grows (`wizard`), and Quill, her owl.
  rachel: { name: "Rachel", dexMod: 2, hpBase: 7, hpPerLevel: 4, startGear: { bow: "lightCrossbow", armour: "padded" },
    casting: { mod: 3, spells: ["fireBolt", "magicMissile", "shield", "sleep"], wizard: true } },
  // Claire, Rachel's twin, a druid who grew up wild beyond the Door (WIS +4): a sling and leather, and Wild Shape. Her
  // WIS and INT saves are proficient (`saves`: modifier, and whether she's proficient), and she resists magic.
  claire: { name: "Claire", dexMod: 2, hpBase: 8, hpPerLevel: 5, startGear: { bow: "sling", armour: "leather" },
    casting: { mod: 4, spells: ["produceFlame", "cureWounds", "entangle", "faerieFire", "moonbeam", "callLightning", "conjureAnimals"] },
    saves: { WIS: [4, true], INT: [0, true] }, resistsMagic: true, wildShape: true },
};

// Wild Shape's beasts, at the druid's level: AC, HP and attacks (to hit: proficiency + `hit`).
export const FORMS = {
  bear: { name: "bear", ac: 11, hp: level => 8 + 4 * level, hit: 4, attacks: [{ name: "Bite", damage: "1d8+4" }, { name: "Claws", damage: "2d6+4" }] },
  cat: { name: "great cat", ac: 13, hp: level => 6 + 3 * level, hit: 6, attacks: [{ name: "Bite", damage: "1d10+5" }, { name: "Claws", damage: "2d6+5" }] },
};
export const WILD_SHAPES = 2; // per rest
/* How many Wild Shapes a companion has left (0 for anyone but a druid). */
export const shapesLeft = c => (COMPANIONS[c?.id]?.wildShape ? Math.max(0, WILD_SHAPES - (c.shapesUsed || 0)) : 0);
/* A beast form for a fight: { id, name, ac, hp, maxHp, attacks }. */
export function makeForm(id, level) {
  const f = FORMS[id], hp = f.hp(level);
  return { id, name: f.name, ac: f.ac, hp, maxHp: hp, attacks: f.attacks.map(a => ({ ...a, bonus: proficiencyBonus(level) + f.hit, damageBonus: 0, damageType: "slashing" })) };
}

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
    ? { name: baseOf(bow).name, bonus: base.dexMod + proficiencyBonus(level) + up, damage: baseOf(bow).damage, damageBonus: base.dexMod + up, damageType: baseOf(bow).damageType, silvered: !!bow.silvered, magic: up > 0 }
    : { name: "Fist", bonus: base.dexMod + proficiencyBonus(level), damage: "1d4", damageBonus: 0, damageType: "bludgeoning" };
  return { ac, attack };
}

/* The companion's fighting stats at the hero's level, as the battle uses them, or null with no companion. */
export const companionStats = hero => statsOf(hero.companion, hero.level);

/* A companion record's fighting stats at a level, or null if there's no such companion. */
export function statsOf(c, level) {
  const base = c && COMPANIONS[c.id];
  if (!base) return null;
  const maxHp = companionMaxHp(c.id, level);
  const saves = { DEX: base.dexMod, ...Object.fromEntries(Object.entries(base.saves || {}).map(([ab, [m, prof]]) => [ab, m + (prof ? proficiencyBonus(level) : 0)])) };
  return {
    id: c.id, name: base.name, level, dexMod: base.dexMod, maxHp, saves,
    ...(base.resistsMagic && { resistsMagic: true }), ...(base.wildShape && { wildShape: true }),
    hp: Math.max(1, maxHp - (c.hurt || 0)),
    ...gearStats(base, c.gear || {}, level),
    tactics: tacticsFor(c.id).includes(c.tactics) ? c.tactics : "attack",
    casting: base.casting ? { ...base.casting, spells: knownSpells(c) } : null,
  };
}

/* A companion who fights beside you without being on your roster (for one quest), rested and in their starting gear. */
export const guestCompanion = id => ({ id, hurt: 0, gear: startingGear(id), guest: true });

/* The records for a fight's own party (Q10: the twins, whoever's travelling with you): each one's from your party or
   roster if they're there, else a guest's. */
export const partyRecords = (hero, ids) => ids.map(id => (hero.companion?.id === id ? hero.companion : hero.roster?.find(r => r.id === id) || guestCompanion(id)));

/* The record for a second companion in a fight: theirs from the roster if they're waiting there (their wounds and
   spent slots carry on), else a guest's. Null if they're the one already travelling with you, or unknown. */
export function secondCompanion(hero, id) {
  if (!COMPANIONS[id] || hero.companion?.id === id) return null;
  return hero.roster?.find(r => r.id === id) || guestCompanion(id);
}

/* The spells a caster companion knows: their class's to start with, and for a wizard, whatever they've copied in. */
export const knownSpells = c => c.spells || COMPANIONS[c.id]?.casting?.spells || [];
export const COPY_COST = 50; // gold of ink per spell level, as in the SRD

/* Why your wizard can't copy this scroll into their book, or null if they can. */
export function cantCopy(hero, item) {
  const c = hero.companion, base = COMPANIONS[c?.id];
  if (!base?.casting?.wizard) return "Only a wizard can copy a scroll into a spellbook.";
  const spell = SPELLS[ITEMS[item.base]?.spell];
  if (!spell) return "That isn't a spell scroll.";
  if (!spell.classes.includes("wizard")) return `${spell.name} isn't a wizard's spell.`;
  if (knownSpells(c).includes(ITEMS[item.base].spell)) return `${base.name} already knows ${spell.name}.`;
  if (hero.gold < COPY_COST * spell.level) return `Copying it takes ${COPY_COST * spell.level} gold of ink.`;
  return null;
}

/* Your wizard copies a scroll from your pack into their spellbook, for good (the scroll is used up, and the ink costs
   COPY_COST gold per spell level). Returns { ok, spell, cost } or { ok: false, reason }. */
export function copySpell(hero, uid) {
  const item = hero.inventory.find(i => i.uid === uid);
  if (!item) return { ok: false, reason: "That isn't in your pack." };
  const reason = cantCopy(hero, item);
  if (reason) return { ok: false, reason };
  const id = ITEMS[item.base].spell, cost = COPY_COST * SPELLS[id].level;
  hero.inventory = hero.inventory.filter(i => i !== item);
  hero.gold -= cost;
  hero.companion.spells = [...knownSpells(hero.companion), id];
  return { ok: true, spell: SPELLS[id], cost };
}

/* Arcane Recovery: once between long rests, a short rest gives your wizard back spell slots whose levels add up to half
   their level (rounded up), the highest first, none above level 5. Returns how many slots came back. */
export function arcaneRecovery(hero) {
  const c = hero.companion;
  if (!COMPANIONS[c?.id]?.casting?.wizard || c.recovered || !c.slotsUsed?.some(n => n > 0)) return 0;
  let budget = Math.ceil(hero.level / 2), got = 0;
  const used = [...c.slotsUsed];
  for (let lvl = Math.min(5, used.length); lvl >= 1; lvl--) {
    while (used[lvl - 1] > 0 && budget >= lvl) { used[lvl - 1]--; budget -= lvl; got++; }
  }
  c.slotsUsed = used;
  c.recovered = true;
  return got;
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
  delete c.recovered;
  delete c.shapesUsed;
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

/* After a fight: keep each companion's wounds (at least 1 HP left; a fallen friend gets back up), on the record they
   came from (`src`: yours, a roster one, or a guest's). */
export function afterBattle(hero, ...allies) {
  for (const a of allies) {
    const c = a && (a.src || hero.companion);
    if (c) c.hurt = a.maxHp - Math.max(1, a.hp);
  }
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
