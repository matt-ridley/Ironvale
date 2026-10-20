// Gear decisions for the inventory and blacksmith screens: what equipping something would change, and buying/selling.
import { ITEMS, STOCK } from "../data/items.js";
import { baseOf, equip, unequip, makeItem, itemName } from "./items.js";
import { armourClass, weaponAttack } from "./character.js";
import { parseDice } from "./dice.js";

const stats = char => {
  const a = weaponAttack(char);
  return { ac: armourClass(char), bonus: a.bonus, damage: a.damage, damageBonus: a.damageBonus };
};

/* Your AC and attack now, and after equipping `uid` (tried on a copy, so nothing changes). */
export function compareEquip(char, uid) {
  const copy = structuredClone(char);
  const r = equip(copy, uid);
  return { ok: r.ok, reason: r.reason, before: stats(char), after: r.ok ? stats(copy) : null };
}

/* The same, for taking off whatever is in `slot`. */
export function compareUnequip(char, slot) {
  const copy = structuredClone(char);
  const r = unequip(copy, slot);
  return { ok: r.ok, reason: r.reason, before: stats(char), after: r.ok ? stats(copy) : null };
}

/* Average damage of an attack, for saying whether a swap is better: "1d8" + 2 is 6.5. */
export function averageDamage(attack) {
  const d = parseDice(attack.damage);
  return d.count * (d.sides + 1) / 2 + d.bonus + attack.damageBonus;
}

export function buyItem(char, base, stock = STOCK) {
  if (!stock.includes(base)) return { ok: false, reason: "The shop doesn't sell that." };
  const cost = ITEMS[base].cost;
  if (char.gold < cost) return { ok: false, reason: `That costs ${cost} gold. You have ${char.gold}.` };
  char.gold -= cost;
  const item = makeItem(base);
  char.inventory.push(item);
  return { ok: true, item, cost };
}

/* Half of what it cost, including what was spent on upgrades (50 + 100 + 150 for +3). */
export function sellPrice(item) {
  const upgrades = 25 * item.upgrade * (item.upgrade + 1);
  return Math.floor((baseOf(item).cost + upgrades) / 2);
}

/* Only items in the pack can be sold; take something off first to sell it. */
export function sellItem(char, uid) {
  const item = char.inventory.find(i => i.uid === uid);
  if (!item) return { ok: false, reason: "Take it off before you sell it." };
  if (baseOf(item).type === "key") return { ok: false, reason: "You can't sell that. It matters too much." };
  if (item.crest) return { ok: false, reason: "You've carried this sword since the very start. You'd rather keep it." };
  const price = sellPrice(item);
  char.inventory = char.inventory.filter(i => i !== item);
  char.gold += price;
  return { ok: true, item, price, name: itemName(item) };
}
