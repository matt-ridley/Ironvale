// The player character: ability scores, HP, armour class, attacks, levelling up, and the fighter's features from the
// SRD (Champion): Second Wind (L1), Action Surge (L2), Improved Critical (L3), ability score increases (L4, L6, L8...)
// and Extra Attack (L5).
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
];
export const hasFeature = (char, id) => char.level >= FEATURES.find(f => f.id === id).level;
export const featuresAt = level => FEATURES.filter(f => f.level === level);
/* The lowest d20 roll that's a critical hit: 19 with Improved Critical, otherwise 20. */
export const critOn = char => (hasFeature(char, "improvedCritical") ? 19 : 20);
/* Attacks each time you take the ATTACK action (before any potion). */
export const attacksPerAction = char => (hasFeature(char, "extraAttack") ? 2 : 1);
// Warden runes: the hero's own magic, learned from the story. Rune slots come back with a long rest, like spell slots.
export const RUNES = {
  runeStrike: { name: "Rune Strike", about: "After you hit, your blade's rune flares: 2d8 radiant damage, 3d8 against the undead." },
};
/* How many rune slots the hero has (none until they learn a rune). */
export const runeSlots = char => (char.runes?.known?.length ? (char.level >= 9 ? 3 : 2) : 0);
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
export const TRINKET_BONUS = { oswinBelt: { STR: 2 } };
export const trinketBonus = (char, ability) => Object.entries(TRINKET_BONUS)
  .reduce((sum, [base, b]) => sum + (b[ability] && char.inventory?.some(i => i.base === base) ? b[ability] : 0), 0);
/* An ability score with any trinket bonus. */
export const abilityScore = (char, ability) => char.abilities[ability] + trinketBonus(char, ability);
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
  return {
    name: base.name,
    bonus: ability + proficiencyBonus(char.level) + w.upgrade,
    damage: base.damage,
    damageBonus: ability + w.upgrade,
    damageType: base.damageType, silvered: !!w.silvered,
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
  char.luckUsed = false; // the Lucky Die
  char.fishCaught = 0; // the fish bite again
  if (char.companion) char.companion.hurt = 0;
  if (char.companion?.slotsUsed) char.companion.slotsUsed = [];
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
  let companionHealed = 0;
  const c = char.companion;
  if (c && companionMax) {
    const hurt = c.hurt || 0, cap = companionMax - Math.floor(companionMax / 2); // the most hurt they can stay
    companionHealed = Math.max(0, hurt - cap);
    c.hurt = hurt - companionHealed;
  }
  return { healed, secondWind, actionSurge, companionHealed };
}

export function heal(char, amount) {
  const before = char.hp;
  char.hp = Math.min(char.maxHp, char.hp + amount);
  return char.hp - before;
}

export const xpToNextLevel = char => (char.level >= MAX_LEVEL ? 0 : XP_FOR_LEVEL[char.level + 1] - char.xp);
