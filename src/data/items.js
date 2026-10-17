// Base items. Numbers follow the 5e System Reference Document (SRD 5.1).
// A carried item is an instance: { uid, base, upgrade }, where `base` is a key below and `upgrade` is 0-3 (the blacksmith).

export const ITEMS = {
  // Weapons: damage die, and properties (finesse = may use DEX; two-handed = no shield; light).
  dagger:      { name: "Dagger",      type: "weapon", damage: "1d4",  properties: ["finesse", "light"], cost: 2 },
  shortsword:  { name: "Shortsword",  type: "weapon", damage: "1d6",  properties: ["finesse", "light"], cost: 10 },
  mace:        { name: "Mace",        type: "weapon", damage: "1d6",  properties: [], cost: 5 },
  longsword:   { name: "Longsword",   type: "weapon", damage: "1d8",  properties: [], cost: 15 },
  rapier:      { name: "Rapier",      type: "weapon", damage: "1d8",  properties: ["finesse"], cost: 25 },
  greataxe:    { name: "Greataxe",    type: "weapon", damage: "1d12", properties: ["two-handed"], cost: 30 },
  greatsword:  { name: "Greatsword",  type: "weapon", damage: "2d6",  properties: ["two-handed"], cost: 50 },

  // Armour: light = base + DEX, medium = base + DEX (max +2), heavy = base only.
  padded:      { name: "Padded Armour",  type: "armour", category: "light",  baseAc: 11, cost: 5 },
  leather:     { name: "Leather Armour", type: "armour", category: "light",  baseAc: 11, cost: 10 },
  hide:        { name: "Hide Armour",    type: "armour", category: "medium", baseAc: 12, cost: 10 },
  chainShirt:  { name: "Chain Shirt",    type: "armour", category: "medium", baseAc: 13, cost: 50 },
  chainMail:   { name: "Chain Mail",     type: "armour", category: "heavy",  baseAc: 16, cost: 75 },

  shield:      { name: "Shield", type: "shield", ac: 2, cost: 10 },

  potionHealing: { name: "Potion of Healing", type: "consumable", heal: "2d4+2", cost: 50 },
};

export const MAX_UPGRADE = 3;
