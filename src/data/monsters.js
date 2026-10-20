// Monsters, from the 5e System Reference Document (SRD 5.1), trimmed to what the game uses so far.
// `hp` is rolled when the monster appears; `gold` is rolled when it is beaten, and each `loot` entry has its own chance.
// `saves` are its saving throw bonuses (its ability modifiers), for spells; `type` is its creature type (beast,
// humanoid, undead...), which some spells care about.

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
};
