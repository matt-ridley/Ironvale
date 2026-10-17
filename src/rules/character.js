// The player character: ability scores, HP, armour class, attacks and levelling up.
import { roll } from "./dice.js";
import { baseOf, makeItem } from "./items.js";

export const ABILITIES = ["STR", "DEX", "CON"];
export const HIT_DIE = "1d10"; // a fighter's hit die
export const MAX_LEVEL = 20;

// XP needed to reach each level (index = level), from the 5e table.
export const XP_FOR_LEVEL = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export const abilityMod = score => Math.floor((score - 10) / 2);
export const proficiencyBonus = level => 2 + Math.floor((level - 1) / 4);
export const mod = (char, ability) => abilityMod(char.abilities[ability]);

export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_FOR_LEVEL[level + 1]) level++;
  return level;
}

export function createCharacter({
  name = "Hero",
  abilities = { STR: 15, DEX: 13, CON: 14 },
  weapon = "longsword", shield = "shield", armour = "leather",
  gold = 25, potions = 2,
} = {}) {
  const char = {
    name, level: 1, xp: 0, gold, abilities: { ...abilities },
    maxHp: 0, hp: 0,
    equipment: { weapon: null, shield: null, armour: null },
    inventory: [],
  };
  char.maxHp = Math.max(1, 10 + mod(char, "CON")); // level 1: the hit die's maximum + CON
  char.hp = char.maxHp;
  if (weapon) char.equipment.weapon = makeItem(weapon);
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
  if (!w) return { name: "Fist", bonus: str + proficiencyBonus(char.level), damage: "1", damageBonus: str };
  const base = baseOf(w);
  const ability = base.properties.includes("finesse") ? Math.max(str, dex) : str;
  return {
    name: base.name,
    bonus: ability + proficiencyBonus(char.level) + w.upgrade,
    damage: base.damage,
    damageBonus: ability + w.upgrade,
  };
}

/* Adds XP and levels up as many times as it now allows. Each level adds 1d10 + CON HP (at least 1). */
export function gainXp(char, amount, rng = Math.random) {
  char.xp += amount;
  const levelUps = [];
  const target = levelForXp(char.xp);
  while (char.level < target) {
    char.level++;
    const hpGain = Math.max(1, roll(HIT_DIE, rng).total + mod(char, "CON"));
    char.maxHp += hpGain;
    char.hp += hpGain;
    levelUps.push({ level: char.level, hpGain, proficiency: proficiencyBonus(char.level) });
  }
  return { xp: char.xp, levelUps };
}

export function heal(char, amount) {
  const before = char.hp;
  char.hp = Math.min(char.maxHp, char.hp + amount);
  return char.hp - before;
}

export const xpToNextLevel = char => (char.level >= MAX_LEVEL ? 0 : XP_FOR_LEVEL[char.level + 1] - char.xp);
