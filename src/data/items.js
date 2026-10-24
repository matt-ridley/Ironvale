// Base items. Numbers follow the 5e System Reference Document (SRD 5.1).
// A carried item is an instance: { uid, base, upgrade }, where `base` is a key below and `upgrade` is 0-3 (the blacksmith),
// or up to 5 (Brannoc's forge). A weapon or bow can also be `silvered` (Brannoc's forge), which wights don't resist.

export const ITEMS = {
  // Weapons: damage die, and properties (finesse = may use DEX; two-handed = no shield; light).
  dagger:      { name: "Dagger",      type: "weapon", damage: "1d4", damageType: "piercing",  properties: ["finesse", "light"], cost: 2 },
  shortsword:  { name: "Shortsword",  type: "weapon", damage: "1d6", damageType: "piercing",  properties: ["finesse", "light"], cost: 10 },
  mace:        { name: "Mace",        type: "weapon", damage: "1d6", damageType: "bludgeoning",  properties: [], cost: 5 },
  longsword:   { name: "Longsword",   type: "weapon", damage: "1d8", damageType: "slashing",  properties: [], cost: 15 },
  // The hero's own sword, reforged by Brannoc at the end of Act 2 (not sold anywhere). It grows with the story.
  wardenblade: { name: "Wardenblade", type: "weapon", damage: "1d10", damageType: "slashing", properties: [], cost: 0 },
  warhammer:   { name: "Warhammer",   type: "weapon", damage: "1d8", damageType: "bludgeoning",  properties: [], cost: 15 },
  rapier:      { name: "Rapier",      type: "weapon", damage: "1d8", damageType: "piercing",  properties: ["finesse"], cost: 25 },
  scimitar:    { name: "Scimitar",    type: "weapon", damage: "1d6", damageType: "slashing",  properties: ["finesse", "light"], cost: 25 },
  greataxe:    { name: "Greataxe",    type: "weapon", damage: "1d12", damageType: "slashing", properties: ["two-handed"], cost: 30 },
  greatsword:  { name: "Greatsword",  type: "weapon", damage: "2d6", damageType: "slashing",  properties: ["two-handed"], cost: 50 },

  // Bows, for a companion in your party (Megan): damage die. The hero fights up close.
  shortbow:    { name: "Shortbow", type: "bow", damage: "1d6", damageType: "piercing", cost: 25 },
  longbow:     { name: "Longbow",  type: "bow", damage: "1d8", damageType: "piercing", cost: 50 },
  sling:       { name: "Sling",    type: "bow", damage: "1d4", damageType: "bludgeoning", cost: 1 },
  lightCrossbow: { name: "Light Crossbow", type: "bow", damage: "1d8", damageType: "piercing", cost: 25 },

  // Armour: light = base + DEX, medium = base + DEX (max +2), heavy = base only.
  padded:      { name: "Padded Armour",  type: "armour", category: "light",  baseAc: 11, cost: 5 },
  leather:     { name: "Leather Armour", type: "armour", category: "light",  baseAc: 11, cost: 10 },
  studded:     { name: "Studded Leather", type: "armour", category: "light", baseAc: 12, cost: 45 },
  hide:        { name: "Hide Armour",    type: "armour", category: "medium", baseAc: 12, cost: 10 },
  chainShirt:  { name: "Chain Shirt",    type: "armour", category: "medium", baseAc: 13, cost: 50 },
  chainMail:   { name: "Chain Mail",     type: "armour", category: "heavy",  baseAc: 16, cost: 75 },
  splint:      { name: "Splint Armour",  type: "armour", category: "heavy",  baseAc: 17, cost: 200 },
  plate:       { name: "Plate Armour",   type: "armour", category: "heavy",  baseAc: 18, cost: 1500 },
  wardenPlate: { name: "Warden Plate",   type: "armour", category: "heavy",  baseAc: 20, cost: 3000 }, // Brannoc, for a Warden sworn of Iron

  shield:      { name: "Shield", type: "shield", ac: 2, cost: 10 },
  // The Oath of Iron's vault (Act 4): the Wardens' tower shield. Fire does you half while it's on your arm.
  towerShield: { name: "Wardens' Tower Shield", type: "shield", ac: 4, prize: true, cost: 0, fireproof: true },

  // Potions. Healing works any time you're hurt. Speed lasts a number of steps in the world: you move faster and
  // run into fewer monsters. Dexterity lasts one fight: one extra attack each time you ATTACK.
  potionHealing:   { name: "Potion of Healing",   type: "consumable", heal: "2d4+2", cost: 20 },
  potionGreaterHealing: { name: "Potion of Greater Healing", type: "consumable", heal: "4d4+4", cost: 50 },
  potionSpeed:     { name: "Potion of Speed",     type: "consumable", effect: "speed", steps: 150, cost: 30 },
  potionDexterity: { name: "Potion of Dexterity", type: "consumable", effect: "dexterity", cost: 40 },
  // Act 4, from Sallow's Sundries: half fire damage to you in your next fight (drink it before).
  potionFireResistance: { name: "Potion of Fire Resistance", type: "consumable", effect: "fireResist", cost: 120 },
  // Not a potion, but used up the same way: out in the open, it takes you back to the last town (hub) you were in.
  homewardFeather: { name: "Homeward Feather", type: "consumable", effect: "homeward", cost: 50 },

  // Key items: kept for the story, never sold.
  // Minigame prizes (rules/minigames.js), won once and never sold. Trinkets work from your pack.
  luckyDie: { name: "Lucky Die", type: "trinket", prize: true, cost: 0,
    about: "A bone die from the knucklebones table, worn smooth. In a fight, the first time you roll a natural 1 to attack, you roll again. Once per rest. Works from your pack." },
  brannocBracer: { name: "Brannoc's Bracer", type: "trinket", prize: true, cost: 0,
    about: "A dwarf's iron bracer, won in an arm wrestle in the keep's yard. +2 CON while it's in your pack." },
  captainsBadge: { name: "Captain's Badge", type: "trinket", prize: true, cost: 0,
    about: "Matt's old Warden captain's badge, a tower between two keys, won in an arm wrestle at Lastwatch. +2 DEX while it's in your pack." },
  oswinBelt: { name: "Oswin's Belt", type: "trinket", prize: true, cost: 0,
    about: "Big Oswin's wide leather belt, won in an arm wrestle. +2 STR while it's in your pack." },
  willowBow: { name: "Willow Longbow", type: "bow", prize: true, damage: "1d8", damageType: "piercing", cost: 50 },
  griffonBow: { name: "Griffon Longbow", type: "bow", prize: true, damage: "1d10", damageType: "piercing", cost: 100 }, // Corwin's prize
  // Fish (fishing at Willowmere and Fenwatch): sell them at any shop.
  perch: { name: "Perch", type: "fish", cost: 6, about: "A stripy little perch. A shop will give you a few coins for it." },
  pike: { name: "Pike", type: "fish", cost: 16, about: "A long, toothy pike. Worth a bit at any shop." },
  fenEel: { name: "Fen Eel", type: "fish", cost: 24, about: "A slippery black eel from the fen. Fenwatch folk love them." },
  goldenCarp: { name: "Golden Carp", type: "fish", cost: 80, about: "A carp with scales like coins. Rare, and worth a lot." },
  ironSignet: { name: "Iron Signet", type: "key", cost: 0,
    about: "A heavy ring of black iron, warm to the touch. Its seal is a tower between two keys, like the crest on your sword." },
  brannocTools: { name: "Brannoc's Tools", type: "key", cost: 0,
    about: "A dwarf-sized toolbox bound in iron, with BRANNOC burned into the lid. He'll want these back." },
  juniorBadge: { name: "Junior Warden Badge", type: "trinket", prize: true, cost: 0,
    about: "A tin badge Pip made, with JUNIOR WARDEN scratched on it. Once per rest, when you just fail a saving throw against a monster, +1 turns it into a success. Works from your pack." },
  sunCharm: { name: "Half a Sun Charm", type: "key", cost: 0,
    about: "Half of a gold charm, a sun, snapped off long ago. It was wound into a cairn of bones on the snowfield. Rachel wears the other half: a moon." },
  twinCharm: { name: "The Sun-and-Moon Charm", type: "key", cost: 0,
    about: "The twins' charm, whole again: a gold sun and a silver moon, snapped apart when they were twelve and fitted back together in Claire's grove. It's warm, and it hums when either of them is near." },
  // Act 4: the sisters' pledges and the Oath vaults.
  dunstansMap: { name: "Dunstan's Map", type: "key", cost: 0,
    about: "Ten years of kobold tunnels, drawn on the backs of their own shopping lists: Dunstan's map of the Emberdeep. One tunnel, marked in red, goes round the golems." },
  corwinsLetter: { name: "Corwin's Letter", type: "key", cost: 0,
    about: "A letter Megan's da wrote her before he went up the pass, in case he didn't come back. Dunstan carried it for ten years. Megan reads it every night." },
  stormGlass: { name: "Storm-Glass Rune Stone", type: "trinket", prize: true, cost: 0,
    about: "A rune stone of clear glass with a storm trapped inside, from the Oath of Storm's vault. Your Chain Lightning leaps once more, to the first monster still standing. Works from your pack." },
  dawnBanner: { name: "The Dawn Banner", type: "trinket", prize: true, cost: 0,
    about: "The Wardens' old banner of the Dawn, gold on white, from the Oath of Dawn's vault. Your healing light shines twice as bright. Works from your pack." },
  dragonProofHat: { name: "Dragon-Proof Hat", type: "trinket", cost: 400,
    about: "A tall felt hat with a brim, painted with a dragon looking sad. Sallow swears it's dragon-proof. It is a hat." },
  thorneMirror: { name: "Thorne's Mirror", type: "key", cost: 0,
    about: "A silver hand mirror from Thorne's camp, polished bright. Shiny. Somebody would love this." },
  oldGnasher: { name: "Old Gnasher", type: "key", cost: 0,
    about: "The legendary pike of Willowmere, older than Old Tom and twice as grumpy. Tom will want to see this." },
  goblinCrown: { name: "Goblin King's Crown", type: "key", cost: 0,
    about: "Bent gold set with red glass. Gaudy, and far too big for you. Somebody shinier-minded might want it." },

  // Spell scrolls (data/spells.js): anyone can read one in a fight, once. The apothecary sells them.
  scrollMagicMissile: { name: "Scroll of Magic Missile", type: "scroll", spell: "magicMissile", cost: 50 },
  scrollBurningHands: { name: "Scroll of Burning Hands", type: "scroll", spell: "burningHands", cost: 50 },
  scrollSleep:        { name: "Scroll of Sleep",         type: "scroll", spell: "sleep", cost: 50 },
  scrollCureWounds:   { name: "Scroll of Cure Wounds",   type: "scroll", spell: "cureWounds", cost: 50 },
  scrollFireball:     { name: "Scroll of Fireball",      type: "scroll", spell: "fireball", cost: 300 },
  scrollMistyStep:    { name: "Scroll of Misty Step",    type: "scroll", spell: "mistyStep", cost: 100 },
  scrollLightningBolt: { name: "Scroll of Lightning Bolt", type: "scroll", spell: "lightningBolt", cost: 300 },
  scrollCounterspell: { name: "Scroll of Counterspell", type: "scroll", spell: "counterspell", cost: 300 }, // for Rachel's book: it's a reaction
  runeIron: { name: "Rune-Iron", type: "key", cost: 0, about: "Blue-black ore from the Wardens' frozen forge, cold even in your hand. Brannoc would know what to do with it." },
};

export const SILVER_COST = 100; // silvering a weapon at Brannoc's forge (the SRD's price)
export const MAX_UPGRADE = 3; // Oakhollow's blacksmith; Brannoc's forge goes to +5 (a shop's maxUpgrade)

// The shops: what each sells, in shop order, and which tabs it has (only smiths upgrade, up to their maxUpgrade).
// Oakhollow has the blacksmith and the apothecary; Fenwatch has Brannoc's forge and the herbalist.
export const SHOPS = {
  blacksmith: {
    title: "BLACKSMITH", tabs: ["upgrade", "buy", "sell"], greeting: "Steel's hot. What'll it be?", tint: 0xc8a27a,
    stock: ["dagger", "shortsword", "mace", "scimitar", "longsword", "rapier", "greataxe", "greatsword",
      "leather", "studded", "hide", "chainShirt", "chainMail", "shield", "shortbow", "longbow", "potionHealing"],
  },
  forge: {
    title: "BRANNOC'S FORGE", tabs: ["upgrade", "silver", "buy", "sell"], maxUpgrade: 5, tint: 0xd0684e,
    greeting: "Proper steel, at last! I can take your gear past +3. Up to +5, if you've the coin.",
    stock: ["longsword", "warhammer", "rapier", "greataxe", "greatsword", "studded", "chainMail", "splint", "plate", "shield",
      "longbow", "lightCrossbow", "sling", "potionHealing"],
  },
  herbalist: {
    title: "FEN HERBALIST", tabs: ["buy", "sell"], tint: 0x7bc96f,
    greeting: "Wren's remedies! Bog myrtle, frogspawn and a little magic. Greater Healing's my speciality.",
    stock: ["potionHealing", "potionGreaterHealing", "potionSpeed", "potionDexterity", "homewardFeather", "scrollCureWounds", "scrollSleep"],
  },
  // Act 3: Grub's stall (the goblin refugees' trader: cheap, and doesn't ask where things came from), and Sallow's
  // Sundries at the rockslide camp (the pass's only pedlar, at hag prices). `markup` multiplies the price.
  // Brannoc's forge, for a Warden sworn of Iron: the same, and Warden plate.
  forgeIron: {
    title: "BRANNOC'S FORGE", tabs: ["upgrade", "silver", "buy", "sell"], maxUpgrade: 5, tint: 0xd0684e,
    greeting: "Sworn of Iron! Now THAT'S a Warden. I've made you something: Warden plate, the first in a hundred years.",
    stock: ["wardenPlate", "longsword", "warhammer", "greatsword", "chainMail", "splint", "plate", "shield", "longbow", "lightCrossbow", "potionHealing"],
  },
  // Rachel's rune library in the keep: scrolls for her book, at cost. Thorne's notes (after the gatehouse) add more.
  library: {
    title: "THE RUNE LIBRARY", tabs: ["buy"], tint: 0x4a4f9a,
    greeting: "Rachel's library! Scrolls I've copied out of the Wardens' books. You can't read them all. She can.",
    stock: ["scrollMagicMissile", "scrollBurningHands", "scrollSleep", "scrollMistyStep", "scrollLightningBolt"],
  },
  libraryFull: {
    title: "THE RUNE LIBRARY", tabs: ["buy"], tint: 0x4a4f9a,
    greeting: "With Thorne's notes, Rachel's worked out a few more. She won't say it, but she's pleased.",
    stock: ["scrollMagicMissile", "scrollBurningHands", "scrollSleep", "scrollMistyStep", "scrollLightningBolt", "scrollFireball", "scrollCounterspell"],
  },
  goblinTrader: {
    title: "GRUB'S GOODS", tabs: ["buy", "sell"], tint: 0x6aa84f, markup: 0.8,
    greeting: "Grub's goods! Cheap! Don't ask where from. Grub doesn't ask either.",
    stock: ["potionHealing", "potionGreaterHealing", "potionSpeed", "potionDexterity", "homewardFeather", "scrollMagicMissile", "scrollSleep", "scrollMistyStep"],
  },
  sundries: {
    title: "SALLOW'S SUNDRIES", tabs: ["buy", "sell"], tint: 0x5d7a3e, markup: 1.5,
    greeting: "Mother's shop! Everything a hero needs on a cold mountain, dearie, at Mother's prices. Which are fair. For Mother.",
    stock: ["potionGreaterHealing", "potionSpeed", "homewardFeather", "scrollMistyStep", "scrollLightningBolt", "scrollFireball", "scrollCounterspell"],
  },
  // Act 4: Sallow's had word of a dragon. Fire potions at hag prices, and a hat.
  sundriesDragon: {
    title: "SALLOW'S SUNDRIES", tabs: ["buy", "sell"], tint: 0x5d7a3e, markup: 1.5,
    greeting: "A DRAGON, dearie? Mother has just the thing. Several things. Fire-proof potions, fresh from... somewhere. And a hat.",
    stock: ["potionFireResistance", "dragonProofHat", "potionGreaterHealing", "potionSpeed", "homewardFeather", "scrollLightningBolt", "scrollFireball", "scrollCounterspell"],
  },
  apothecary: {
    title: "APOTHECARY", tabs: ["buy", "sell"], greeting: "Bubble, bubble! Fresh potions, brewed this morning.", tint: 0x9fd18b,
    stock: ["potionHealing", "potionSpeed", "potionDexterity", "homewardFeather",
      "scrollMagicMissile", "scrollBurningHands", "scrollSleep", "scrollCureWounds", "scrollFireball"],
  },
};
export const STOCK = SHOPS.blacksmith.stock;
