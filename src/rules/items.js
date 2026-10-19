// Item instances, equipping, and blacksmith upgrades. Functions change the character in place and return what happened.
import { ITEMS, MAX_UPGRADE } from "../data/items.js";
import { roll } from "./dice.js";

export const SLOTS = ["weapon", "shield", "armour"];

let nextUid = 1;
export function makeItem(base, { upgrade = 0 } = {}) {
  if (!ITEMS[base]) throw new Error(`Unknown item: ${base}`);
  return { uid: `i${Date.now().toString(36)}${(nextUid++).toString(36)}`, base, upgrade };
}

export const baseOf = item => ITEMS[item.base];
export const itemName = item => baseOf(item).name + (item.upgrade ? ` +${item.upgrade}` : "");
export const isTwoHanded = item => !!item && (baseOf(item).properties || []).includes("two-handed");
export const isPotion = item => baseOf(item).type === "consumable";
export const isHealing = item => isPotion(item) && !!baseOf(item).heal;

/* One line about what an item does, e.g. "1d8 damage, finesse. +1 to hit and damage." */
export function describeItem(item) {
  const b = baseOf(item), up = item.upgrade ? ` +${item.upgrade}` : "";
  const props = b.properties?.length ? `, ${b.properties.join(", ")}` : "";
  if (b.type === "weapon") return `${b.damage} damage${props}.${up && ` ${up.trim()} to hit and damage.`}`;
  if (b.type === "shield") return `+${b.ac} AC.${up && ` ${up.trim()} more AC.`}`;
  if (b.type === "armour") {
    const dex = b.category === "light" ? " + DEX" : b.category === "medium" ? " + DEX (max 2)" : "";
    return `${b.category[0].toUpperCase()}${b.category.slice(1)} armour: AC ${b.baseAc}${dex}.${up && ` ${up.trim()} AC.`}`;
  }
  if (b.heal) return `Drink to heal ${b.heal} HP.`;
  if (b.effect === "speed") return `Move faster and meet fewer monsters for ${b.steps} steps.`;
  if (b.effect === "dexterity") return "Attack twice each turn for one fight. Drink it before or during a battle.";
  return "";
}

/* Pack items stacked by kind and upgrade, for lists: [{ item, items, count, name }] in pack order. */
export function groupPack(inventory) {
  const groups = new Map();
  for (const item of inventory) {
    const key = `${item.base}+${item.upgrade}`;
    if (!groups.has(key)) groups.set(key, { item, items: [], count: 0, name: itemName(item) });
    const g = groups.get(key);
    g.items.push(item);
    g.count++;
  }
  return [...groups.values()];
}

/* Why a potion can't be drunk right now, or null if it can. */
export function cantDrink(char, item) {
  const b = baseOf(item);
  if (b.heal && char.hp >= char.maxHp) return "You're already at full health.";
  if (b.effect === "dexterity" && char.effects?.dexterity) return "You've already drunk one. It lasts until your next fight.";
  return null;
}

/* Drinks a potion from the pack. Healing heals now; the others set an effect in char.effects:
   speed (steps left) or dexterity (true until the next fight starts). */
export function useItem(char, uid, rng = Math.random) {
  const item = char.inventory.find(i => i.uid === uid);
  if (!item || !isPotion(item)) return { ok: false, reason: "You can't use that." };
  const reason = cantDrink(char, item);
  if (reason) return { ok: false, reason };
  char.inventory = char.inventory.filter(i => i !== item);
  const b = baseOf(item);
  if (b.heal) {
    const before = char.hp;
    char.hp = Math.min(char.maxHp, char.hp + roll(b.heal, rng).total);
    return { ok: true, item, healed: char.hp - before };
  }
  char.effects = { ...char.effects, [b.effect]: b.effect === "speed" ? b.steps : true };
  return { ok: true, item, effect: b.effect };
}

/* What drinking a potion did, in a sentence. */
export function drinkText(r) {
  if (r.effect === "speed") return "You feel light on your feet! Fewer monsters can catch you.";
  if (r.effect === "dexterity") return "Your hands feel quick! You'll attack twice each turn in your next fight.";
  return `You drink the potion and recover ${r.healed} HP.`;
}

/* Moves an item from the pack into its slot; whatever was there goes back to the pack. */
export function equip(char, uid) {
  const item = char.inventory.find(i => i.uid === uid);
  if (!item) return { ok: false, reason: "That item isn't in your pack." };
  const slot = baseOf(item).type;
  if (!SLOTS.includes(slot)) return { ok: false, reason: `${itemName(item)} can't be equipped.` };
  if (slot === "shield" && isTwoHanded(char.equipment.weapon)) {
    return { ok: false, reason: `You need both hands for your ${itemName(char.equipment.weapon)}.` };
  }
  const moved = [];
  char.inventory = char.inventory.filter(i => i !== item);
  if (char.equipment[slot]) { char.inventory.push(char.equipment[slot]); moved.push(char.equipment[slot]); }
  char.equipment[slot] = item;
  // A two-handed weapon takes the shield hand too.
  if (slot === "weapon" && isTwoHanded(item) && char.equipment.shield) {
    char.inventory.push(char.equipment.shield);
    moved.push(char.equipment.shield);
    char.equipment.shield = null;
  }
  return { ok: true, item, unequipped: moved };
}

export function unequip(char, slot) {
  const item = char.equipment[slot];
  if (!item) return { ok: false, reason: "Nothing is equipped there." };
  char.equipment[slot] = null;
  char.inventory.push(item);
  return { ok: true, item };
}

/* Gold to raise an item one tier: 50, 100, 150, or null once it is at the top tier. */
export function upgradeCost(item) {
  return item.upgrade >= MAX_UPGRADE ? null : 50 * (item.upgrade + 1);
}

/* The blacksmith. Works on equipped or carried items. Each tier is +1 to hit and damage (weapons) or +1 AC. */
export function upgradeItem(char, uid) {
  const item = [...Object.values(char.equipment), ...char.inventory].find(i => i && i.uid === uid);
  if (!item) return { ok: false, reason: "You don't have that item." };
  if (!SLOTS.includes(baseOf(item).type)) return { ok: false, reason: `${itemName(item)} can't be upgraded.` };
  const cost = upgradeCost(item);
  if (cost === null) return { ok: false, reason: `${itemName(item)} can't be improved further.` };
  if (char.gold < cost) return { ok: false, reason: `That costs ${cost} gold. You have ${char.gold}.` };
  char.gold -= cost;
  item.upgrade += 1;
  return { ok: true, item, cost };
}
