// The player character: ability scores, HP, armour class, attacks, levelling up, and the fighter's features from the
// SRD (Champion): Second Wind (L1), Action Surge (L2), Improved Critical (L3), ability score increases (L4, L6, L8...),
// Extra Attack (L5), Indomitable (L9, and a second use at L13), a Fighting Style (L10: the Champion's Additional
// Fighting Style), Extra Attack (2) (L11) and Superior Critical (L15).
import { roll } from "./dice.js";
import { baseOf, makeItem } from "./items.js";

export const ABILITIES = ["STR", "DEX", "CON"];
export const HIT_DIE = "1d10"; // a fighter's hit die
export const SECOND_WIND = "1d10"; // + level, once per rest
export const MAX_LEVEL = 20;
export const MAX_SCORE = 20; // an ability score can't go above this
export const ASI_LEVELS = [4, 6, 8, 12, 14, 16, 19]; // a fighter's ability score increases: +2 to one score
export const SAVE_PROFICIENCIES = ["STR", "CON"]; // a fighter's saving throws

// The features a fighter gains as they level up, in order.
export const FEATURES = [
  { id: "actionSurge", level: 2, name: "Action Surge", about: "Once per rest, take one more action on your turn." },
  { id: "improvedCritical", level: 3, name: "Improved Critical", about: "Your attacks score a critical hit on a 19 or 20." },
  { id: "extraAttack", level: 5, name: "Extra Attack", about: "Attack twice whenever you take the ATTACK action." },
  { id: "indomitable", level: 9, name: "Indomitable", about: "Once per long rest, roll a failed saving throw again." },
  { id: "fightingStyle", level: 10, name: "Fighting Style", about: "Pick a style: Defense (+1 AC in armour) or Dueling (+2 damage with a one-handed weapon)." },
  { id: "extraAttack2", level: 11, name: "Extra Attack (2)", about: "Attack three times whenever you take the ATTACK action." },
  { id: "indomitable2", level: 13, name: "Indomitable (two uses)", about: "Twice per long rest, roll a failed saving throw again." },
  { id: "superiorCritical", level: 15, name: "Superior Critical", about: "Your attacks score a critical hit on an 18, 19 or 20." },
];
export const hasFeature = (char, id) => char.level >= FEATURES.find(f => f.id === id).level;
export const featuresAt = level => FEATURES.filter(f => f.level === level);
/* The lowest d20 roll that's a critical hit: 18 with Superior Critical, 19 with Improved Critical, otherwise 20. */
export const critOn = char => (hasFeature(char, "superiorCritical") ? 18 : hasFeature(char, "improvedCritical") ? 19 : 20);
/* Attacks each time you take the ATTACK action (before any potion). */
export const attacksPerAction = char => (hasFeature(char, "extraAttack2") ? 3 : hasFeature(char, "extraAttack") ? 2 : 1);

// The fighting styles the level 10 pick offers (the level-up screen asks once you reach it).
export const FIGHTING_STYLES = {
  defense: { name: "Defense", about: "+1 AC while you wear armour." },
  dueling: { name: "Dueling", about: "+2 damage with a one-handed weapon." },
};
/* True once you've reached level 10 and haven't picked your fighting style yet. */
export const needsFightingStyle = char => hasFeature(char, "fightingStyle") && !FIGHTING_STYLES[char.fightingStyle];
export function pickFightingStyle(char, style) {
  if (!hasFeature(char, "fightingStyle")) return { ok: false, reason: "You pick a fighting style at level 10." };
  if (!FIGHTING_STYLES[style]) return { ok: false, reason: `Unknown fighting style: ${style}` };
  if (FIGHTING_STYLES[char.fightingStyle]) return { ok: false, reason: "You've already picked your fighting style." };
  char.fightingStyle = style;
  return { ok: true, style };
}
/* Indomitable (level 9): a failed save can be rolled again, once per long rest; twice from level 13.
   char.indomitableUsed counts the uses since the last long rest. */
export const indomitableUses = char => (hasFeature(char, "indomitable2") ? 2 : hasFeature(char, "indomitable") ? 1 : 0);
export const canIndomitable = char => (char.indomitableUsed || 0) < indomitableUses(char);
// Warden runes: the hero's own magic, learned from the story. Rune slots come back with a long rest, like spell slots.
export const RUNES = {
  runeStrike: { name: "Rune Strike", about: "After you hit, your blade's rune flares: 2d8 radiant damage, 3d8 against the undead." },
  // Act 3: the three waystones on the Warden's Road.
  ironWard: { name: "Iron Ward", about: "When a monster's attack would hit you, spend a slot for +5 AC against it: it may miss." },
  wardensCall: { name: "Warden's Call", about: "Your action: you and your companion heal 2d8 + your level and shake off paralysis, fear and sleep." },
  binding: { name: "Rune of Binding", about: "Your action: a monster makes a CON save against your rune, or loses its next turn." },
  // The Oaths' signature runes (rules/oaths.js), learned when you swear.
  chainLightning: { name: "Chain Lightning", about: "Your action: lightning leaps to every monster (6d8, a DEX save halves it)." },
  dawnstrike: { name: "Dawnstrike", about: "After you hit, the Dawn burns through your blade: 3d8 radiant, double against the undead and fiends." },
  // Act 4: Matt teaches it at Lastwatch (Thorne's old rune, the Wardens' before it was his).
  breakingRune: { name: "the Breaking Rune", about: "Your action: the rune hits every monster like a hammer (5d8 force, a DEX save halves it)." },
};
export const IRON_WARD_AC = 5;
/* The DC of the hero's runes that monsters save against: 8 + proficiency + STR. */
export const runeDc = char => 8 + proficiencyBonus(char.level) + mod(char, "STR");
/* How many rune slots the hero has (none until they learn a rune): 2, 3 from level 9, and one more once Brannoc has
   worked rune-iron into the Wardenblade (its second form, `bladeForm` 2), and two more for the Oath of Storm. */
export const runeSlots = char => (char.runes?.known?.length ? (char.level >= 9 ? 3 : 2) + (char.bladeForm >= 2 ? 1 : 0) + (char.oath === "storm" ? 2 : 0) : 0);
export const runesLeft = char => Math.max(0, runeSlots(char) - (char.runes?.used || 0));
export const knowsRune = (char, id) => !!char.runes?.known?.includes(id);
export function learnRune(char, id) {
  char.runes = { known: [...new Set([...(char.runes?.known || []), id])], used: char.runes?.used || 0 };
}

/* Brannoc reforges the sword with the crest into the Wardenblade (keeping its upgrades), silvered. Returns it. */
export function reforgeBlade(char) {
  const all = [char.equipment.weapon, ...char.inventory].filter(Boolean);
  let blade = all.find(i => i.crest);
  if (!blade) { blade = makeItem("wardenblade", { crest: true }); char.inventory.push(blade); }
  blade.base = "wardenblade";
  blade.silvered = true;
  return blade;
}

/* How many ability score increases a character of this level has earned. */
export const asiEarned = level => ASI_LEVELS.filter(l => l <= level).length;

// XP needed to reach each level (index = level), from the 5e table.
export const XP_FOR_LEVEL = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export const abilityMod = score => Math.floor((score - 10) / 2);
export const proficiencyBonus = level => 2 + Math.floor((level - 1) / 4);
// Trinkets that raise an ability while they're in your pack (minigame prizes). Each counts once, however many you carry.
export const TRINKET_BONUS = { oswinBelt: { STR: 2 }, brannocBracer: { CON: 2 }, captainsBadge: { DEX: 2 } };
export const trinketBonus = (char, ability) => Object.entries(TRINKET_BONUS)
  .reduce((sum, [base, b]) => sum + (b[ability] && char.inventory?.some(i => i.base === base) ? b[ability] : 0), 0);
/* An ability score with any trinket bonus. */
// The hero only has STR, DEX and CON; anything else (a WIS save against a hag's curse) counts as an ordinary 10.
export const abilityScore = (char, ability) => (char.abilities[ability] ?? 10) + trinketBonus(char, ability);
export const mod = (char, ability) => abilityMod(abilityScore(char, ability));

export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_FOR_LEVEL[level + 1]) level++;
  return level;
}

export function createCharacter({
  name = "Hero",
  abilities = { STR: 15, DEX: 13, CON: 14 },
  weapon = "longsword", shield = "shield", armour = "chainMail", // a 5e fighter's starting kit
  gold = 25, potions = 2,
} = {}) {
  const char = {
    name, level: 1, xp: 0, gold, bank: 0, abilities: { ...abilities },
    maxHp: 0, hp: 0,
    secondWind: true, // used up until the next rest
    actionSurge: true, // the same (from level 2)
    asi: 0, // ability score increases earned but not picked yet (the level-up screen asks)
    equipment: { weapon: null, shield: null, armour: null },
    inventory: [],
    effects: { speed: 0, dexterity: false }, // from potions: speed (steps left), dexterity (until the next fight)
  };
  char.maxHp = Math.max(1, 10 + mod(char, "CON")); // level 1: the hit die's maximum + CON
  char.hp = char.maxHp;
  if (weapon) char.equipment.weapon = makeItem(weapon, { crest: true }); // the sword you start with (rules/items.js)
  if (shield) char.equipment.shield = makeItem(shield);
  if (armour) char.equipment.armour = makeItem(armour);
  for (let i = 0; i < potions; i++) char.inventory.push(makeItem("potionHealing"));
  return char;
}

export function armourClass(char) {
  const dex = mod(char, "DEX");
  const { armour, shield } = char.equipment;
  let ac = 10 + dex;
  if (armour) {
    const a = baseOf(armour);
    ac = a.category === "heavy" ? a.baseAc : a.category === "medium" ? a.baseAc + Math.min(dex, 2) : a.baseAc + dex;
    ac += armour.upgrade;
    if (char.fightingStyle === "defense") ac += 1;
  }
  if (shield) ac += baseOf(shield).ac + shield.upgrade;
  return ac;
}

/* To-hit bonus and damage for the equipped weapon (or a fist). Finesse weapons use the better of STR and DEX. */
export function weaponAttack(char) {
  const w = char.equipment.weapon;
  const str = mod(char, "STR"), dex = mod(char, "DEX");
  if (!w) return { name: "Fist", bonus: str + proficiencyBonus(char.level), damage: "1", damageBonus: str, damageType: "bludgeoning" };
  const base = baseOf(w);
  const ability = base.properties.includes("finesse") ? Math.max(str, dex) : str;
  const dueling = char.fightingStyle === "dueling" && !base.properties.includes("two-handed") ? 2 : 0;
  return {
    name: base.name,
    bonus: ability + proficiencyBonus(char.level) + w.upgrade,
    damage: base.damage,
    damageBonus: ability + w.upgrade + dueling,
    damageType: base.damageType, silvered: !!w.silvered, magic: w.upgrade > 0 || w.base === "wardenblade",
  };
}

/* Adds XP and levels up as many times as it now allows. Each level adds 1d10 + CON HP (at least 1), any new
   features, and at ASI_LEVELS an ability score increase to pick. */
export function gainXp(char, amount, rng = Math.random) {
  char.xp += amount;
  const levelUps = [];
  const target = levelForXp(char.xp);
  while (char.level < target) {
    char.level++;
    const hpGain = Math.max(1, roll(HIT_DIE, rng).total + mod(char, "CON"));
    char.maxHp += hpGain;
    char.hp += hpGain;
    const asi = ASI_LEVELS.includes(char.level);
    if (asi) char.asi = (char.asi || 0) + 1;
    levelUps.push({ level: char.level, hpGain, proficiency: proficiencyBonus(char.level), features: featuresAt(char.level).map(f => f.name), asi });
  }
  return { xp: char.xp, levelUps };
}

/* Spends an ability score increase: +2 to STR, DEX or CON (at most MAX_SCORE). A higher CON modifier raises your
   maximum HP by 1 for every level, as in 5e. */
export function increaseAbility(char, ability) {
  if (!(char.asi > 0)) return { ok: false, reason: "You have no ability score increase to spend." };
  if (!ABILITIES.includes(ability)) return { ok: false, reason: `Unknown ability: ${ability}` };
  const before = char.abilities[ability];
  if (before >= MAX_SCORE) return { ok: false, reason: `Your ${ability} is already ${MAX_SCORE}, as high as it goes.` };
  const oldMod = mod(char, ability);
  char.abilities[ability] = Math.min(MAX_SCORE, before + 2);
  char.asi--;
  let hpGain = 0;
  if (ability === "CON") {
    hpGain = (mod(char, "CON") - oldMod) * char.level;
    char.maxHp += hpGain;
    char.hp += hpGain;
  }
  return { ok: true, ability, from: before, to: char.abilities[ability], hpGain };
}

/* What raising an ability would change, tried on a copy: { ok, reason, from, to, ac, hit, damage, hp, init } as
   differences (hit and damage are the weapon's to-hit and damage bonus; init is initiative and fleeing). */
export function previewIncrease(char, ability) {
  const copy = structuredClone(char);
  copy.asi = Math.max(1, copy.asi || 0);
  const r = increaseAbility(copy, ability);
  if (!r.ok) return { ok: false, reason: r.reason };
  const a = weaponAttack(char), b = weaponAttack(copy);
  return {
    ok: true, from: r.from, to: r.to,
    ac: armourClass(copy) - armourClass(char),
    hit: b.bonus - a.bonus,
    damage: b.damageBonus - a.damageBonus,
    hp: r.hpGain,
    init: ability === "DEX" ? mod(copy, "DEX") - mod(char, "DEX") : 0,
  };
}

/* A long rest (an inn, Old Tom's bed): full HP, Second Wind, Action Surge and spell slots back, for your companion too. */
export function rest(char) {
  char.hp = char.maxHp;
  char.secondWind = true;
  char.actionSurge = true;
  if (char.slotsUsed) char.slotsUsed = [];
  if (char.runes) char.runes.used = 0;
  char.indomitableUsed = 0;
  char.badgeUsed = false; // Pip's Junior Warden badge
  char.unbrokenUsed = false; // the Oath of Iron
  char.luckUsed = false; // the Lucky Die
  char.fishCaught = 0; // the fish bite again
  if (char.companion) char.companion.hurt = 0;
  if (char.companion?.slotsUsed) char.companion.slotsUsed = [];
  if (char.companion) delete char.companion.recovered; // Arcane Recovery
  if (char.companion) delete char.companion.shapesUsed; // Wild Shape
}

/* A short rest (a camp's fire): back up to at least half your maximum HP, and Second Wind and Action Surge back.
   Your companion gets back up to half theirs (`companionMax` is their maximum HP). Resting again does nothing more,
   so a free campfire is never as good as a bed. Returns what it gave: { healed, secondWind, actionSurge, companionHealed }. */
export function shortRest(char, companionMax = 0) {
  const healed = Math.max(0, Math.floor(char.maxHp / 2) - char.hp);
  char.hp += healed;
  const secondWind = !char.secondWind;
  char.secondWind = true;
  const actionSurge = hasFeature(char, "actionSurge") && !char.actionSurge;
  char.actionSurge = true;
  // The Oath of Storm: half your rune slots come back.
  let runes = 0;
  if (char.oath === "storm" && char.runes?.used) {
    runes = Math.min(char.runes.used, Math.ceil(runeSlots(char) / 2));
    char.runes.used -= runes;
  }
  let companionHealed = 0;
  const c = char.companion;
  if (c) delete c.shapesUsed; // a druid's Wild Shape comes back on a short rest too
  if (c && companionMax) {
    const hurt = c.hurt || 0, cap = companionMax - Math.floor(companionMax / 2); // the most hurt they can stay
    companionHealed = Math.max(0, hurt - cap);
    c.hurt = hurt - companionHealed;
  }
  return { healed, secondWind, actionSurge, companionHealed, runes };
}

export function heal(char, amount) {
  const before = char.hp;
  char.hp = Math.min(char.maxHp, char.hp + amount);
  return char.hp - before;
}

export const xpToNextLevel = char => (char.level >= MAX_LEVEL ? 0 : XP_FOR_LEVEL[char.level + 1] - char.xp);
