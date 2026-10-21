// The bestiary: every monster you've met, how many you've beaten, and, once you've beaten one, its stats. The
// counts live in state.bestiary ({ id: { seen, beaten } }); the Quests screen's BESTIARY tab shows bestiaryEntries.
import { MONSTERS } from "../data/monsters.js";
import { ENCOUNTERS } from "../world/encounters.js";

const AREAS = { forest: "Whispering Wood", rocks: "Goblin Rocks", meadow: "Willowmere", warrens: "The Deep Warrens", fen: "Greywater Fen", keepGrounds: "Ironvale Keep's grounds",
  courtyard: "Ironvale Keep's courtyard", chapel: "Ironvale Keep's chapel", armoury: "Ironvale Keep's armoury",
  slopes: "The pass's slopes", snowfield: "The snowfield", heights: "The heights", watchtower: "The old watchtower", thorneCamp: "Thorne's camp",
  gatehouseApproach: "Below the gatehouse", frozenChapel: "The Frozen Chapel" };
const LAIRS = { goblinChief: "The goblin cave", goblinKing: "The Goblin King's Hall", motherSallow: "Her hut in Greywater Fen", lordVarric: "His tomb, under Ironvale Keep",
  kobold: "Digging in the Deep Warrens", crownedSallow: "The drowned causeway, collecting tolls", nightHag: "A crooked hut on the pass's slopes" }; // bosses (and Pip's kobolds) don't roam

export const LORE = {
  giantRat: "A rat the size of a dog. Alone it's a nuisance; it's the bite that festers.",
  wolf: "Grey hunters that come out of the trees. They keep off the paths when they can.",
  goblin: "Small, quick and greedy, with a scimitar and a grin. They raid Oakhollow for pots, sacks and anything shiny.",
  boar: "Bad-tempered and all tusk. It charges first and thinks about it never.",
  giantBat: "Lives in the dark of the Deep Warrens and drops on you from the ceiling. Tough for its size.",
  hobgoblin: "A goblin's big, disciplined cousin, in mail with a sword and shield. Its armour turns most blades.",
  goblinChief: "The goblin who led the raids on Oakhollow, in a dented helmet and a stolen red cloak.",
  goblinKing: "Twice a goblin's size, on a throne of stolen treasure, with a club like a tree trunk.",
  giantFrog: "A frog the size of a pony, all mouth. It sits so still in the reeds you'd swear it was a log.",
  lizardfolk: "Cold-eyed fen hunters with spiked shields. They don't hate you; they just think you'd be good to eat.",
  ghoul: "Something that was a soldier once, hungry now. Its claws can freeze you stiff where you stand.",
  willOWisp: "A pale light over the water that leads travellers astray, and feeds on their fear. Very hard to hit.",
  skeleton: "What's left of Ironvale's garrison, still on watch. Blades skitter off them; a mace or a hammer smashes them flat.",
  ghast: "A ghoul's bigger, fouler cousin. The stink is the least of it: its claws freeze you where you stand.",
  wight: "A dead knight with cold eyes, who remembers how to fight. Plain steel only half-bites it. Silver does the job.",
  helmedHorror: "A suit of armour with nothing inside, still guarding the armoury. Very hard to hit, and it hits back twice.",
  lordVarric: "The Ironbound: the last lord of Ironvale, a wight knight in black plate. Plain steel only half-bites him, and his touch can freeze you.",
  griffon: "Half eagle, half lion, all appetite. They nest on the pass's cliffs, and they're very fond of horses. And heroes.",
  manticore: "A lion with a man's face, bat wings and a tail full of spikes. It talks, mostly about eating you.",
  ettin: "A two-headed giant who argues with itself about which head gets to hit you. Both win.",
  troll: "Long-armed, green and always hungry. Cut it and the wound closes before your eyes: only fire stops it.",
  wyvern: "A cousin of the dragons with a sting in its tail. The poison burns; a hardy hero shrugs off half of it.",
  stoneGiant: "Grey as the mountain and nearly as big. It throws boulders for fun, and clubs anything that isn't a boulder.",
  gargoyle: "A stone thing with wings that sits so still you'd swear it was carved. Thorne's runes are burned into these. Only magic weapons bite deep.",
  earthElemental: "The mountain, walking. Ordinary weapons only chip it; a magic blade does the job.",
  wraith: "A Warden who died in the cold and stayed: a hooded shadow with eyes like coals. Its touch drains the warmth from you, and the courage.",
  specter: "The pale, wailing shape of someone lost on the pass. Weak alone, but they come in twos.",
  crownedSallow: "Mother Sallow, in the Goblin King's crown, calling herself the Queen of the Fen. Tougher than before, and she breathes swamp gas.",
  nightHag: "Auntie Nettle, Mother Sallow's sister: a night hag with hair like a dandelion clock. She curses, she sickens, and she's still owed money.",
  kobold: "A little rust-red lizard-dog with a pick and a candle on its head. It digs for \"the Great One beyond the mountain\", and won't say who that is.",
  motherSallow: "A marsh hag with weed in her hair and a laugh like a drain. She keeps the causeway under water, and she loves a bargain.",
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
    const attacks = m.attacks || [m.attack];
    return {
      id, name: m.name, seen, beaten, known: seen > 0, studied: beaten > 0,
      about: LORE[id] || "", where: habitat(id),
      stats: [
        `AC ${m.ac}   HP ${m.hp} (about ${average(m.hp)})`,
        ...attacks.map(a => `${a.name}: +${a.bonus} to hit, ${a.damage} damage${a.onHit ? ` (${a.onHit.save} save DC ${a.onHit.dc} or ${a.onHit.condition})` : ""}`),
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
