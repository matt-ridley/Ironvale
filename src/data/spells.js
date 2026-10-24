// Spells, from the 5e System Reference Document (SRD 5.1), trimmed to what a fight here needs. A fight has no range
// or positions, so an area spell (Burning Hands, Fireball) catches every monster, and Bless every friend.
//
// level: 0 for a cantrip (cast at will; its damage dice grow at character levels 5, 11 and 17), otherwise the slot
//   level it needs. `upcast` is what each slot level above that adds: more damage or healing dice (`dice`), more darts
//   (`darts`) or a bigger Sleep pool (`pool`, in dice).
// kind, and what it uses:
// - attack: a spell attack roll against AC (`damage`).
// - save: each target makes a saving throw (`save`) against the caster's DC: on a failure they take `damage` and get
//   `condition`; on a success, half damage if `half`, else nothing.
// - darts: `darts` missiles that always hit, `damage` each (Magic Missile).
// - sleep: rolls `pool` and sends monsters to sleep, the weakest first, while it lasts.
// - heal: `heal` + the caster's spellcasting modifier, to one friend. `bonusAction`: it doesn't use up your turn.
// - buff: gives `condition` to `targets` ("self" or "party").
// targets: "one" (a monster you pick), "all" (every monster; `onlyType` narrows it to one creature type), "friend" (you
// or your companion), "self" or "party".
// condition: { id (in CONDITIONS), rounds, untilTurnStart, saveEnds: ability (the same DC as the spell) }.
// linger (a save spell): { id, rounds }: the spell stays on its target and hurts it again (the same dice and save) at
//   the start of each of its turns, for that many rounds (Moonbeam, Call Lightning; no concentration here).
// - pack: summons a wolf pack (`damage` a bite, at the caster's spell attack bonus) that bites every monster at the
//   start of the caster's turn for `rounds` rounds (Conjure Animals).
// classes: which casters can learn it (scrolls work for anyone). short: its name on a battle button.

export const SPELLS = {
  // Cantrips
  fireBolt:       { name: "Fire Bolt", short: "BOLT", level: 0, classes: ["wizard"], kind: "attack", targets: "one", damage: "1d10", damageType: "fire" },
  sacredFlame:    { name: "Sacred Flame", short: "HOLY", level: 0, classes: ["cleric"], kind: "save", save: "DEX", targets: "one", damage: "1d8", damageType: "radiant" },
  produceFlame:   { name: "Produce Flame", short: "FLARE", level: 0, classes: ["druid"], kind: "attack", targets: "one", damage: "1d8", damageType: "fire" },
  viciousMockery: { name: "Vicious Mockery", short: "MOCK", level: 0, classes: ["bard"], kind: "save", save: "WIS", targets: "one", damage: "1d4", damageType: "psychic",
    condition: { id: "mocked" } },

  // Level 1
  magicMissile:   { name: "Magic Missile", short: "DARTS", level: 1, classes: ["wizard"], kind: "darts", targets: "one", darts: 3, damage: "1d4+1", damageType: "force", upcast: { darts: 1 } },
  burningHands:   { name: "Burning Hands", short: "FLAMES", level: 1, classes: ["wizard"], kind: "save", save: "DEX", half: true, targets: "all", damage: "3d6", damageType: "fire", upcast: { dice: 1 } },
  sleep:          { name: "Sleep", short: "SLEEP", level: 1, classes: ["wizard", "bard"], kind: "sleep", targets: "all", pool: "5d8", upcast: { pool: 2 },
    condition: { id: "asleep", rounds: 10 } },
  shield:         { name: "Shield", short: "SHIELD", level: 1, classes: ["wizard"], kind: "buff", targets: "self", condition: { id: "shielded", untilTurnStart: true } },
  cureWounds:     { name: "Cure Wounds", short: "CURE", level: 1, classes: ["cleric", "druid", "bard"], kind: "heal", targets: "friend", heal: "1d8", upcast: { dice: 1 } },
  healingWord:    { name: "Healing Word", short: "WORD", level: 1, classes: ["cleric", "druid", "bard"], kind: "heal", targets: "friend", heal: "1d4", bonusAction: true, upcast: { dice: 1 } },
  bless:          { name: "Bless", short: "BLESS", level: 1, classes: ["cleric"], kind: "buff", targets: "party", condition: { id: "blessed", rounds: 10 } },
  entangle:       { name: "Entangle", short: "VINES", level: 1, classes: ["druid"], kind: "save", save: "STR", targets: "all",
    condition: { id: "restrained", rounds: 10, saveEnds: "STR" } },
  faerieFire:     { name: "Faerie Fire", short: "FAERIE", level: 1, classes: ["druid", "bard"], kind: "save", save: "DEX", targets: "all", condition: { id: "outlined", rounds: 10 } },

  // Level 2
  spiritualWeapon: { name: "Spiritual Weapon", short: "SPIRIT", level: 2, classes: ["cleric"], kind: "attack", targets: "one", damage: "2d8", damageType: "force", upcast: { dice: 1 } },
  // Channel Divinity, here as a level 2 spell: every undead monster makes a WIS save or flees in terror (loses its turns
  // until it's hurt). `onlyType`: an area spell that only touches that kind of creature.
  turnUndead:     { name: "Turn Undead", short: "TURN", level: 2, classes: ["cleric"], kind: "save", save: "WIS", targets: "all", onlyType: "undead",
    condition: { id: "turned", rounds: 10 } },
  mistyStep:      { name: "Misty Step", short: "MIST", level: 2, classes: ["wizard"], kind: "buff", targets: "self", bonusAction: true,
    condition: { id: "blinked", untilTurnStart: true } },

  // Level 3
  lightningBolt:  { name: "Lightning Bolt", short: "LIGHTNING", level: 3, classes: ["wizard"], kind: "save", save: "DEX", half: true, targets: "all", damage: "8d6", damageType: "lightning", upcast: { dice: 1 } },
  // Claire's (the druid's): beams and storms that stay on their target, and a wolf pack.
  moonbeam:       { name: "Moonbeam", short: "MOON", level: 2, classes: ["druid"], kind: "save", save: "CON", half: true, targets: "one", damage: "2d10", damageType: "radiant",
    upcast: { dice: 1 }, linger: { id: "moonlit", rounds: 2 } },
  callLightning:  { name: "Call Lightning", short: "STORM", level: 3, classes: ["druid"], kind: "save", save: "DEX", half: true, targets: "one", damage: "3d10", damageType: "lightning",
    upcast: { dice: 1 }, linger: { id: "stormcalled", rounds: 2 } },
  conjureAnimals: { name: "Conjure Animals", short: "WOLVES", level: 3, classes: ["druid"], kind: "pack", targets: "self", damage: "2d6+2", rounds: 3 },
  // A reaction (Rachel's COUNTER, when a monster starts casting): stops a spell of 3rd level or lower outright; a higher
  // one needs a check (d20 + her INT against 10 + its level). Never cast on your own turn.
  // Act 4: Robyn's, from the shrine of the Dawn (her pledge): everyone in the party at once.
  massHealingWord: { name: "Mass Healing Word", short: "MASS", level: 3, classes: ["cleric"], kind: "heal", targets: "party", heal: "1d4", bonusAction: true, upcast: { dice: 1 } },
  counterspell:   { name: "Counterspell", short: "COUNTER", level: 3, classes: ["wizard"], kind: "reaction" },
  fireball:       { name: "Fireball", short: "BLAST", level: 3, classes: ["wizard"], kind: "save", save: "DEX", half: true, targets: "all", damage: "8d6", damageType: "fire", upcast: { dice: 1 } },
};

// Spell slots per long rest for a full caster (wizard, cleric, druid, bard), from the SRD: index = character level,
// each row = slots of level 1, 2, 3...
export const SLOT_TABLE = [
  [],
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// A spell scroll's own attack bonus and save DC, by the spell's level (SRD): anyone can read one, once.
export const SCROLL_POWER = [
  { attackBonus: 5, saveDc: 13 }, // cantrip
  { attackBonus: 5, saveDc: 13 },
  { attackBonus: 5, saveDc: 13 },
  { attackBonus: 7, saveDc: 15 },
  { attackBonus: 7, saveDc: 15 },
  { attackBonus: 9, saveDc: 17 },
];
