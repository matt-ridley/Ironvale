// Monsters, from the 5e System Reference Document (SRD 5.1), trimmed to what the game uses so far.
// `hp` is rolled when the monster appears; `gold` is rolled when it is beaten, and each `loot` entry has its own chance.
// `saves` are its saving throw bonuses (its ability modifiers), for spells; `type` is its creature type (beast,
// humanoid, undead...), which some spells care about. A monster with several `attacks` makes them all each turn
// (multiattack); an attack's `onHit` is an effect that a saving throw resists (the ghoul's paralysis). Damage types:
// `vulnerable` ones do double, `resistant` ones half, and `weaponResist: "silver"` halves weapon damage unless the
// weapon is silvered (wights).

export const MONSTERS = {
  giantRat:    { name: "Giant Rat",    ac: 12, hp: "2d6",   dexMod: 2, attack: { name: "Bite",     bonus: 4, damage: "1d4+2" }, xp: 25,  gold: "1d4",
    type: "beast", saves: { STR: -2, DEX: 2, CON: 0, WIS: 0 } },
  wolf:        { name: "Wolf",         ac: 13, hp: "2d8+2", dexMod: 2, attack: { name: "Bite",     bonus: 4, damage: "2d4+2" }, xp: 50,  gold: "0",
    type: "beast", saves: { STR: 1, DEX: 2, CON: 1, WIS: 1 } },
  goblin:      { name: "Goblin",       ac: 15, hp: "2d6",   dexMod: 2, attack: { name: "Scimitar", bonus: 4, damage: "1d6+2" }, xp: 50,  gold: "2d6",
    type: "humanoid", saves: { STR: -1, DEX: 2, CON: 0, WIS: -1 },
    loot: [{ base: "scimitar", chance: 0.2 }, { base: "potionHealing", chance: 0.15 }] },
  boar:        { name: "Boar",         ac: 11, hp: "2d8+2", dexMod: 0, attack: { name: "Tusk",     bonus: 3, damage: "1d6+1" }, xp: 50,  gold: "0",
    type: "beast", saves: { STR: 1, DEX: 0, CON: 1, WIS: -1 } },
  giantBat:    { name: "Giant Bat",    ac: 13, hp: "4d10",  dexMod: 3, attack: { name: "Bite",     bonus: 4, damage: "1d6+2" }, xp: 50,  gold: "0",
    type: "beast", saves: { STR: 2, DEX: 3, CON: 0, WIS: 1 } },
  hobgoblin:   { name: "Hobgoblin",    ac: 18, hp: "2d8+2", dexMod: 1, attack: { name: "Longsword", bonus: 3, damage: "1d8+1" }, xp: 100, gold: "2d10",
    type: "humanoid", saves: { STR: 1, DEX: 1, CON: 1, WIS: 0 },
    loot: [{ base: "potionHealing", chance: 0.25 }, { base: "potionDexterity", chance: 0.1 }] },
  goblinChief: { name: "Goblin Chief", ac: 17, hp: "6d6",   dexMod: 2, attack: { name: "Scimitar", bonus: 4, damage: "1d6+2" }, xp: 200, gold: "5d10",
    type: "humanoid", saves: { STR: 0, DEX: 2, CON: 0, WIS: -1 },
    loot: [{ base: "scimitar", upgrade: 1, chance: 1 }, { base: "potionHealing", chance: 1 }] },
  // Not in the SRD: the boss at the bottom of the Deep Warrens, built like a bugbear chief.
  goblinKing:  { name: "Goblin King",  ac: 16, hp: "8d8+8", dexMod: 2, attack: { name: "Great Club", bonus: 5, damage: "2d6+3" }, xp: 700, gold: "10d10",
    type: "humanoid", saves: { STR: 3, DEX: 2, CON: 2, WIS: 1 },
    loot: [{ base: "greatsword", upgrade: 2, chance: 1 }, { base: "potionDexterity", chance: 1 }] },

  // Greywater Fen and the grounds of Ironvale Keep (Act 2, levels 5 to 8).
  giantFrog:   { name: "Giant Frog",   ac: 11, hp: "4d8",   dexMod: 1, attack: { name: "Bite",     bonus: 3, damage: "1d6+1" }, xp: 50,  gold: "0",
    type: "beast", saves: { STR: 1, DEX: 1, CON: 0, WIS: 0 } },
  lizardfolk:  { name: "Lizardfolk",   ac: 15, hp: "4d8+4", dexMod: 0,
    attacks: [{ name: "Bite", bonus: 4, damage: "1d6+2" }, { name: "Spiked Shield", bonus: 4, damage: "1d6+2" }], xp: 100, gold: "2d8",
    type: "humanoid", saves: { STR: 2, DEX: 0, CON: 1, WIS: 1 },
    loot: [{ base: "potionHealing", chance: 0.2 }] },
  ghoul:       { name: "Ghoul",        ac: 12, hp: "5d8",   dexMod: 2,
    attack: { name: "Claws", bonus: 4, damage: "2d4+2", onHit: { condition: "paralyzed", save: "CON", dc: 10, rounds: 10 } }, xp: 200, gold: "1d10",
    type: "undead", saves: { STR: 1, DEX: 2, CON: 0, WIS: 0 } },
  willOWisp:   { name: "Will-o'-Wisp", ac: 19, hp: "9d4",   dexMod: 9, attack: { name: "Shock",    bonus: 4, damage: "2d8" },   xp: 450, gold: "0",
    type: "undead", saves: { STR: -5, DEX: 9, CON: 0, WIS: 2 },
    loot: [{ base: "potionSpeed", chance: 0.25 }] },
  // Inside Ironvale Keep: the risen garrison.
  skeleton:    { name: "Skeleton",     ac: 13, hp: "2d8+4", dexMod: 2, attack: { name: "Shortsword", bonus: 4, damage: "1d6+2" }, xp: 50,  gold: "1d6",
    type: "undead", saves: { STR: 0, DEX: 2, CON: 2, WIS: -1 }, vulnerable: ["bludgeoning"] },
  ghast:       { name: "Ghast",        ac: 13, hp: "8d8",   dexMod: 3,
    attack: { name: "Claws", bonus: 5, damage: "2d6+3", onHit: { condition: "paralyzed", save: "CON", dc: 10, rounds: 10 } }, xp: 450, gold: "2d10",
    type: "undead", saves: { STR: 3, DEX: 3, CON: 0, WIS: 0 }, resistant: ["necrotic"] },
  wight:       { name: "Wight",        ac: 14, hp: "6d8+18", dexMod: 2,
    attacks: [{ name: "Longsword", bonus: 4, damage: "1d8+2" }, { name: "Longsword", bonus: 4, damage: "1d8+2" }], xp: 700, gold: "3d10",
    type: "undead", saves: { STR: 2, DEX: 2, CON: 3, WIS: 1 }, resistant: ["necrotic"], weaponResist: "silver",
    loot: [{ base: "potionGreaterHealing", chance: 0.3 }] },
  helmedHorror: { name: "Helmed Horror", ac: 20, hp: "8d8+16", dexMod: 1,
    attacks: [{ name: "Longsword", bonus: 6, damage: "1d8+4" }, { name: "Longsword", bonus: 6, damage: "1d8+4" }], xp: 1100, gold: "0",
    type: "construct", saves: { STR: 4, DEX: 1, CON: 3, WIS: 0 },
    loot: [{ base: "plate", chance: 0.1 }] },
  // Not in the SRD: Lord Varric, the Ironbound, a wight knight in black plate, the boss of Act 2. Tuned with the battle
  // simulator (tools/simulate.mjs): see the roadmap for the numbers.
  lordVarric:  { name: "Lord Varric",  ac: 18, hp: "13d8+39", dexMod: 1,
    attacks: [{ name: "Longsword", bonus: 7, damage: "1d8+4" }, { name: "Longsword", bonus: 7, damage: "1d8+4" },
      { name: "Grave Touch", bonus: 7, damage: "2d6+2", onHit: { condition: "paralyzed", save: "CON", dc: 12, rounds: 3 } }],
    xp: 2300, gold: "20d10",
    type: "undead", saves: { STR: 4, DEX: 1, CON: 3, WIS: 2 }, resistant: ["necrotic"], weaponResist: "silver",
    loot: [{ base: "potionGreaterHealing", chance: 1 }] },
  // The Mountain Pass (Act 3, levels 9 to 12). SRD monsters, but with a sharper attack bonus (+9 to +11): by now the
  // hero's armour is +3 or better (AC 24 to 30), and at SRD bonuses they'd hardly land a blow; and about a third more HP,
  // as the hero hits three times a turn by level 11. Tuned with the simulator: see the roadmap. The wyvern's poison is
  // trimmed (5d6, not 7d6).
  // A `regen` monster heals at the start of each turn unless it took one of the `stop` damage types since its last
  // (trolls, and fire). `weaponResist: "magic"` halves weapon damage unless the weapon is magic (upgraded, or the
  // Wardenblade). An attack's `poison` is extra damage, halved by a saving throw.
  griffon:     { name: "Griffon",      ac: 12, hp: "9d10+27", dexMod: 2,
    attacks: [{ name: "Beak", bonus: 9, damage: "1d8+4" }, { name: "Claws", bonus: 9, damage: "2d6+4" }], xp: 450, gold: "0",
    type: "monstrosity", saves: { STR: 4, DEX: 2, CON: 3, WIS: 1 } },
  manticore:   { name: "Manticore",    ac: 14, hp: "10d10+30", dexMod: 3,
    attacks: [{ name: "Bite", bonus: 9, damage: "1d8+3" }, { name: "Claw", bonus: 9, damage: "1d6+3" }, { name: "Tail Spikes", bonus: 9, damage: "1d8+3" }], xp: 700, gold: "2d10",
    type: "monstrosity", saves: { STR: 3, DEX: 3, CON: 3, WIS: 1 } },
  ettin:       { name: "Ettin",        ac: 12, hp: "12d10+48", dexMod: -1,
    attacks: [{ name: "Battleaxe", bonus: 10, damage: "2d8+5" }, { name: "Morningstar", bonus: 10, damage: "2d8+5" }], xp: 1100, gold: "4d10",
    type: "giant", saves: { STR: 5, DEX: -1, CON: 3, WIS: 0 }, loot: [{ base: "potionGreaterHealing", chance: 0.3 }] },
  troll:       { name: "Troll",        ac: 15, hp: "10d10+50", dexMod: 1,
    attacks: [{ name: "Bite", bonus: 10, damage: "1d6+4" }, { name: "Claw", bonus: 10, damage: "2d6+4" }, { name: "Claw", bonus: 10, damage: "2d6+4" }], xp: 1800, gold: "3d10",
    type: "giant", saves: { STR: 4, DEX: 1, CON: 5, WIS: -1 }, regen: { hp: 10, stop: ["fire", "acid"] },
    loot: [{ base: "potionGreaterHealing", chance: 0.3 }] },
  wyvern:      { name: "Wyvern",       ac: 13, hp: "15d10+45", dexMod: 0,
    attacks: [{ name: "Bite", bonus: 10, damage: "2d6+4" }, { name: "Stinger", bonus: 10, damage: "2d6+4", poison: { save: "CON", dc: 15, damage: "5d6" } }], xp: 2300, gold: "0",
    type: "dragon", saves: { STR: 4, DEX: 0, CON: 3, WIS: 1 }, loot: [{ base: "potionGreaterHealing", chance: 0.4 }] },
  stoneGiant:  { name: "Stone Giant",  ac: 17, hp: "13d12+65", dexMod: 2,
    attacks: [{ name: "Greatclub", bonus: 11, damage: "3d8+6" }, { name: "Greatclub", bonus: 11, damage: "3d8+6" }], xp: 2900, gold: "6d10",
    type: "giant", saves: { STR: 6, DEX: 5, CON: 8, WIS: 4 }, loot: [{ base: "potionGreaterHealing", chance: 0.5 }] },
  gargoyle:    { name: "Gargoyle",     ac: 15, hp: "9d8+27", dexMod: 0,
    attacks: [{ name: "Bite", bonus: 9, damage: "1d6+4" }, { name: "Claws", bonus: 9, damage: "1d6+4" }], xp: 450, gold: "0",
    type: "elemental", saves: { STR: 2, DEX: 0, CON: 3, WIS: 0 }, weaponResist: "magic" },
  earthElemental: { name: "Earth Elemental", ac: 17, hp: "14d10+70", dexMod: -1,
    attacks: [{ name: "Slam", bonus: 10, damage: "2d8+5" }, { name: "Slam", bonus: 10, damage: "2d8+5" }], xp: 1800, gold: "0",
    type: "elemental", saves: { STR: 5, DEX: -1, CON: 5, WIS: 0 }, weaponResist: "magic", vulnerable: ["thunder"] },
  // Kobolds, digging in the empty Deep Warrens in Act 3, "for the Great One beyond the mountain" (no match for you now).
  kobold:      { name: "Kobold",       ac: 12, hp: "2d6",   dexMod: 2, attack: { name: "Dagger",   bonus: 4, damage: "1d4+2" }, xp: 25,  gold: "1d6",
    type: "humanoid", saves: { STR: -2, DEX: 2, CON: -1, WIS: -2 } },
  // The green hag of the SRD, keeper of the drowned causeway. A bit lighter than the SRD's (82 HP), as she's met at level 5.
  motherSallow: { name: "Mother Sallow", ac: 17, hp: "9d8+27", dexMod: 1, attack: { name: "Claws", bonus: 6, damage: "2d8+4" }, xp: 700, gold: "6d10",
    type: "fey", saves: { STR: 4, DEX: 1, CON: 3, WIS: 2 },
    loot: [{ base: "scrollSleep", chance: 1 }, { base: "potionHealing", chance: 1 }] },
};
