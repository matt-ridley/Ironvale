// Base items. Numbers follow the 5e System Reference Document (SRD 5.1).
// A carried item is an instance: { uid, base, upgrade }, where `base` is a key below and `upgrade` is 0-3 (the blacksmith).

export const ITEMS = {
  // Weapons: damage die, and properties (finesse = may use DEX; two-handed = no shield; light).
  dagger:      { name: "Dagger",      type: "weapon", damage: "1d4",  properties: ["finesse", "light"], cost: 2 },
  shortsword:  { name: "Shortsword",  type: "weapon", damage: "1d6",  properties: ["finesse", "light"], cost: 10 },
  mace:        { name: "Mace",        type: "weapon", damage: "1d6",  properties: [], cost: 5 },
  longsword:   { name: "Longsword",   type: "weapon", damage: "1d8",  properties: [], cost: 15 },
  rapier:      { name: "Rapier",      type: "weapon", damage: "1d8",  properties: ["finesse"], cost: 25 },
  scimitar:    { name: "Scimitar",    type: "weapon", damage: "1d6",  properties: ["finesse", "light"], cost: 25 },
  greataxe:    { name: "Greataxe",    type: "weapon", damage: "1d12", properties: ["two-handed"], cost: 30 },
  greatsword:  { name: "Greatsword",  type: "weapon", damage: "2d6",  properties: ["two-handed"], cost: 50 },

  // Bows, for a companion in your party (Megan): damage die. The hero fights up close.
  shortbow:    { name: "Shortbow", type: "bow", damage: "1d6", cost: 25 },
  longbow:     { name: "Longbow",  type: "bow", damage: "1d8", cost: 50 },

  // Armour: light = base + DEX, medium = base + DEX (max +2), heavy = base only.
  padded:      { name: "Padded Armour",  type: "armour", category: "light",  baseAc: 11, cost: 5 },
  leather:     { name: "Leather Armour", type: "armour", category: "light",  baseAc: 11, cost: 10 },
  studded:     { name: "Studded Leather", type: "armour", category: "light", baseAc: 12, cost: 45 },
  hide:        { name: "Hide Armour",    type: "armour", category: "medium", baseAc: 12, cost: 10 },
  chainShirt:  { name: "Chain Shirt",    type: "armour", category: "medium", baseAc: 13, cost: 50 },
  chainMail:   { name: "Chain Mail",     type: "armour", category: "heavy",  baseAc: 16, cost: 75 },

  shield:      { name: "Shield", type: "shield", ac: 2, cost: 10 },

  // Potions. Healing works any time you're hurt. Speed lasts a number of steps in the world: you move faster and
  // run into fewer monsters. Dexterity lasts one fight: one extra attack each time you ATTACK.
  potionHealing:   { name: "Potion of Healing",   type: "consumable", heal: "2d4+2", cost: 20 },
  potionSpeed:     { name: "Potion of Speed",     type: "consumable", effect: "speed", steps: 150, cost: 30 },
  potionDexterity: { name: "Potion of Dexterity", type: "consumable", effect: "dexterity", cost: 40 },
  // Not a potion, but used up the same way: out in the open, it takes you back to the last town (hub) you were in.
  homewardFeather: { name: "Homeward Feather", type: "consumable", effect: "homeward", cost: 50 },

  // Key items: kept for the story, never sold.
  ironSignet: { name: "Iron Signet", type: "key", cost: 0,
    about: "A heavy ring of black iron, warm to the touch. Its seal is a tower between two keys, like the crest on your sword." },
  goblinCrown: { name: "Goblin King's Crown", type: "key", cost: 0,
    about: "Bent gold set with red glass. Gaudy, and far too big for you. Somebody shinier-minded might want it." },

  // Spell scrolls (data/spells.js): anyone can read one in a fight, once. The apothecary sells them.
  scrollMagicMissile: { name: "Scroll of Magic Missile", type: "scroll", spell: "magicMissile", cost: 50 },
  scrollBurningHands: { name: "Scroll of Burning Hands", type: "scroll", spell: "burningHands", cost: 50 },
  scrollSleep:        { name: "Scroll of Sleep",         type: "scroll", spell: "sleep", cost: 50 },
  scrollCureWounds:   { name: "Scroll of Cure Wounds",   type: "scroll", spell: "cureWounds", cost: 50 },
  scrollFireball:     { name: "Scroll of Fireball",      type: "scroll", spell: "fireball", cost: 300 },
};

export const MAX_UPGRADE = 3;

// Oakhollow's shops: what each sells, in shop order, and which tabs it has (only the blacksmith upgrades).
export const SHOPS = {
  blacksmith: {
    title: "BLACKSMITH", tabs: ["upgrade", "buy", "sell"], greeting: "Steel's hot. What'll it be?", tint: 0xc8a27a,
    stock: ["dagger", "shortsword", "mace", "scimitar", "longsword", "rapier", "greataxe", "greatsword",
      "leather", "studded", "hide", "chainShirt", "chainMail", "shield", "shortbow", "longbow", "potionHealing"],
  },
  apothecary: {
    title: "APOTHECARY", tabs: ["buy", "sell"], greeting: "Bubble, bubble! Fresh potions, brewed this morning.", tint: 0x9fd18b,
    stock: ["potionHealing", "potionSpeed", "potionDexterity", "homewardFeather",
      "scrollMagicMissile", "scrollBurningHands", "scrollSleep", "scrollCureWounds", "scrollFireball"],
  },
};
export const STOCK = SHOPS.blacksmith.stock;
