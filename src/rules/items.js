// Item instances, equipping, and blacksmith upgrades. Functions change the character in place and return what happened.
import { ITEMS, MAX_UPGRADE } from "../data/items.js";

export const SLOTS = ["weapon", "shield", "armour"];

let nextUid = 1;
export function makeItem(base, { upgrade = 0 } = {}) {
  if (!ITEMS[base]) throw new Error(`Unknown item: ${base}`);
  return { uid: `i${Date.now().toString(36)}${(nextUid++).toString(36)}`, base, upgrade };
}

export const baseOf = item => ITEMS[item.base];
export const itemName = item => baseOf(item).name + (item.upgrade ? ` +${item.upgrade}` : "");
export const isTwoHanded = item => !!item && (baseOf(item).properties || []).includes("two-handed");

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
