// The bestiary: every monster you've met, how many you've beaten, and, once you've beaten one, its stats. The
// counts live in state.bestiary ({ id: { seen, beaten } }); the Quests screen's BESTIARY tab shows bestiaryEntries.
import { MONSTERS } from "../data/monsters.js";
import { ENCOUNTERS } from "../world/encounters.js";

const AREAS = { forest: "Whispering Wood", rocks: "Goblin Rocks", meadow: "Willowmere", warrens: "The Deep Warrens" };
const LAIRS = { goblinChief: "The goblin cave", goblinKing: "The Goblin King's Hall" }; // bosses don't roam

export const LORE = {
  giantRat: "A rat the size of a dog. Alone it's a nuisance; it's the bite that festers.",
  wolf: "Grey hunters that come out of the trees. They keep off the paths when they can.",
  goblin: "Small, quick and greedy, with a scimitar and a grin. They raid Oakhollow for pots, sacks and anything shiny.",
  boar: "Bad-tempered and all tusk. It charges first and thinks about it never.",
  giantBat: "Lives in the dark of the Deep Warrens and drops on you from the ceiling. Tough for its size.",
  hobgoblin: "A goblin's big, disciplined cousin, in mail with a sword and shield. Its armour turns most blades.",
  goblinChief: "The goblin who led the raids on Oakhollow, in a dented helmet and a stolen red cloak.",
  goblinKing: "Twice a goblin's size, on a throne of stolen treasure, with a club like a tree trunk.",
};

/* Where a monster turns up, from the encounter tables. */
export function habitat(id) {
  if (LAIRS[id]) return LAIRS[id];
  return Object.entries(ENCOUNTERS).filter(([, a]) => a.table.some(e => e.foes.includes(id))).map(([zone]) => AREAS[zone] || zone).join(", ");
}

/* Counts everyone in a finished battle as seen, and those knocked out as beaten. */
export function recordBattle(bestiary, battle) {
  for (const m of battle.monsters) {
    const e = (bestiary[m.id] ||= { seen: 0, beaten: 0 });
    e.seen++;
    if (m.hp <= 0) e.beaten++;
  }
}

const average = dice => {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(dice);
  return m ? Math.floor(Number(m[1]) * (Number(m[2]) + 1) / 2 + Number(m[3] || 0)) : null;
};

/* Every monster in the game, in order: { id, name, seen, beaten, known, studied, about, where, stats }. `known`: you've
   met it (its name and picture show). `studied`: you've beaten one (its stats show). */
export function bestiaryEntries(bestiary = {}) {
  return Object.entries(MONSTERS).map(([id, m]) => {
    const { seen = 0, beaten = 0 } = bestiary[id] || {};
    const a = m.attack;
    return {
      id, name: m.name, seen, beaten, known: seen > 0, studied: beaten > 0,
      about: LORE[id] || "", where: habitat(id),
      stats: [
        `AC ${m.ac}   HP ${m.hp} (about ${average(m.hp)})`,
        `${a.name}: +${a.bonus} to hit, ${a.damage} damage`,
        `${m.xp} XP${m.gold !== "0" ? `, ${m.gold} gold` : ""}`,
      ],
    };
  });
}

/* Keeps only counts for monsters the game knows (for loading a save). */
export function cleanBestiary(b) {
  if (!b || typeof b !== "object") return {};
  const ok = n => Number.isInteger(n) && n >= 0;
  return Object.fromEntries(Object.entries(b).filter(([id, e]) => MONSTERS[id] && e && ok(e.seen) && ok(e.beaten)).map(([id, e]) => [id, { seen: e.seen, beaten: e.beaten }]));
}
