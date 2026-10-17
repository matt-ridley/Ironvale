// Monsters, from the 5e System Reference Document (SRD 5.1), trimmed to what the game uses so far.
// `hp` is rolled when the monster appears; `gold` is rolled when it is beaten, and each `loot` entry has its own chance.

export const MONSTERS = {
  giantRat:    { name: "Giant Rat",    ac: 12, hp: "2d6",   dexMod: 2, attack: { name: "Bite",     bonus: 4, damage: "1d4+2" }, xp: 25,  gold: "1d4" },
  wolf:        { name: "Wolf",         ac: 13, hp: "2d8+2", dexMod: 2, attack: { name: "Bite",     bonus: 4, damage: "2d4+2" }, xp: 50,  gold: "0" },
  goblin:      { name: "Goblin",       ac: 15, hp: "2d6",   dexMod: 2, attack: { name: "Scimitar", bonus: 4, damage: "1d6+2" }, xp: 50,  gold: "2d6",
    loot: [{ base: "scimitar", chance: 0.2 }, { base: "potionHealing", chance: 0.15 }] },
  goblinChief: { name: "Goblin Chief", ac: 17, hp: "6d6",   dexMod: 2, attack: { name: "Scimitar", bonus: 4, damage: "1d6+2" }, xp: 200, gold: "5d10",
    loot: [{ base: "scimitar", upgrade: 1, chance: 1 }, { base: "potionHealing", chance: 1 }] },
};
