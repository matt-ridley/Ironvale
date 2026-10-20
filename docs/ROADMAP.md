# Ironvale roadmap

The plan for the rest of the game: how the story carries on after the Goblin King, the rules and systems it needs, and the order to build them in. Nothing here is built yet. Decisions marked **decided** have been agreed; **open** ones are still to settle. Update this file as things are built or change.

## The shape of the game

| Act | Levels | Region | Hub | Threat | The hero becomes |
|---|---|---|---|---|---|
| 1 Goblins (built) | 1-4 | Oakhollow, Whispering Wood, Goblin Rocks, Willowmere, the Deep Warrens | Oakhollow | The Goblin Chief and the Goblin King | Hero of Oakhollow |
| 2 Ironvale | 5-8 | Greywater Fen, Ironvale Keep (the mountain pass is seen but blocked) | Fenwatch | Mother Sallow, Lord Varric the Ironbound and the risen garrison | Ironvale's Heir |
| 3 The Pass | 9-12 | The mountain pass and the door | Ironvale Keep, rebuilt | A rival who wants the Wardens' power | Warden-in-training |
| 4 Beyond the Door | 13-16+ | Beyond the door | Ironvale Keep | Whatever has been pushing on the door (a dragon fits the SRD at these levels) | Warden of Ironvale |

Each act unlocks more of the world through a story barrier (the Iron Road gate, the rockslide in the pass, the door), never an invisible wall. The world map shows locked regions as dark silhouettes marked ???, so you can see the world is bigger than you can reach yet.

## Act 2: Ironvale

### What the Goblin King leaves behind

Once `kingDefeated` is set, the King's hall shows three things:

1. **The Iron Signet**, on the throne among the stolen treasure: a black iron seal ring with a crest Elder Maren knows, the arms of **Ironvale Keep**, a fortress past the marshes, empty for a hundred years.
2. **Brannoc**, a dwarf smith chained behind the throne. The goblins made him forge for them, which is where the hobgoblins' armour "that turns most blades" came from (Maren's journal already says so).
3. **The King's last words:** *"The bones... they walk. They took our home."*

**The twist:** the goblins lived in the foothills by Ironvale. They broke into the keep's tomb and stole the Signet, the seal that kept the old garrison at rest. The dead rose and drove the goblins out, and the goblins fled into the Warrens and started raiding Oakhollow. The treasure you take from the King caused the whole goblin arc.

### Main quests

| Quest | What happens |
|---|---|
| **Q3 The Iron Signet** | Show the ring to Maren; she tells you about Ironvale. Brannoc, back in Oakhollow, knows the old Iron Road east. Reach Greywater Fen and Fenwatch. |
| **Q4 The Drowned Causeway** | The road to the keep is flooded. **Mother Sallow**, a marsh hag (the SRD green hag, played a little comic), controls the water. The game's first real choice: fight her (CR 3), or trade her the Goblin King's crown and she raises the causeway. The bargain comes back in Act 3. |
| **Q5 Ironvale Keep** | A ruined courtyard, chapel and armoury, each with a lever or seal (the existing `obstacle()` helper with STR/DEX checks). Below them is the tomb of **Lord Varric, the Ironbound**, a wight knight who thinks you're one more thief with his Signet. |
| **Ending** | Beat Varric and put the Signet back: the dead sleep again. As he falls, Varric says *"Warden's blood... at last."* The tomb carvings show the Signet sealed a **door in the mountain pass**, and something beyond it has been pushing. The pass is the Act 3 hook. |

**Side quests:** Brannoc's Forge (find his tools in the keep's armoury), the goblin refugee camp outside Fenwatch (help them and a goblin trader opens, and it pays off in Act 3), Fenwatch's ferryman (treasure hints, like Old Tom), and a Megan subplot (perhaps her father was a Fenwatch archer).

### The region

Like Act 1 (the overworld plus the Deep Warrens), Act 2 is one outdoor map and one dungeon:

- **`src/world/ironvale.js`** (about 64 x 60): Greywater Fen in the south (reeds, shallow water, boardwalks, dead trees) with Fenwatch at its edge, the keep's outer walls in the middle, and the mountain pass in the north, blocked by a rockslide until Act 3. Zones: `fenwatch` (safe), `fen`, `keepGrounds`, `pass`.
- **`src/world/keep.js`**: the keep inside and the tomb. Zones: `keep`, `tomb`.
- **Getting there:** a back passage behind the King's throne climbs up to the fen ("the way the goblins came"). Once you're through, the **Iron Road gate** on the overworld's east edge opens from the far side as a permanent shortcut.
- **New tiles:** reeds, shallow water (walkable, slow), mud, boardwalk, dead tree, flagstone, rubble, broken wall, portcullis, scree, cliff. All baked neighbour-aware like the rest in `terrain.js`.
- **New music:** `fen` (slow, minor, triangle lead, heavy echo), `keep` (square lead, organ-like, sparse drums) and a `wight` boss track.

### Monsters and XP

Levels 5 to 8 take 6,500 to 34,000 XP. Act 1's monsters give 50-100 XP, so Act 2 needs SRD CR 1-4 monsters:

| Where | Monsters (XP) |
|---|---|
| Fen | lizardfolk (100), giant frog (50), ghoul (200), will-o'-wisp (450) |
| Keep | skeleton pairs (100), ghast (450), wight (700), helmed horror (1,100) |
| Bosses | Mother Sallow (700), Lord Varric (about 2,300; custom, like the Goblin King) |

Quest rewards of about 1,500, 3,000 and 5,000 XP cover about a third of the climb, and the bounty board (below) gives the rest a purpose. Add a battle simulator to `tools/` before tuning the bosses: the README quotes simulated win rates, but no simulator is in the repo.

## Safe places, resting and travel (decided)

### Hubs and camps

| | **Hub** (one per act) | **Camp** (a few per region) |
|---|---|---|
| Examples | Oakhollow (Act 1), Fenwatch (Act 2), Ironvale Keep (Act 3+) | Old Tom's hut, a campfire at Goblin Rocks, the Keep Gate |
| No monsters | yes | yes |
| Rest | long rest at the inn, **costs gold** | short rest at the campfire, free |
| Fast travel from here | yes | yes |
| Shops, bank, tavern | yes | no (perhaps one pedlar) |
| Side quests, minigames, companions | yes | no |

- **Fast travel only works while standing in a hub or a camp**, to any hub or camp you've found. No more travelling from anywhere outdoors.
- **Homeward Feather** (consumable, about 50 gold): takes you to your last hub from anywhere outdoors, but not underground.
- **Walking into Oakhollow no longer heals you.** Rest at an inn instead.
- **Old Tom's bed stays free** (a long rest), a kindness to Act 1 players.
- **Fainting** wakes you at your last hub's inn (free, you were carried in), still losing half the gold you carry (at most 50). Uses a new `state.lastHub` instead of always the Oakhollow spawn.
- **The bank is one account** across every hub (`hero.bank` already works this way).
- Each hub's shops sell what suits its act rather than copying Oakhollow: Oakhollow keeps the basics (smith up to +3, the apothecary); Fenwatch has Brannoc's forge (up to +5, silvering, Splint AC 17, Plate AC 18 at 1,500 gold), Greater Healing and the tavern.
- Hubs change as the story moves on: new lines, maybe a statue of you in Oakhollow.

### Short and long rests

| | **Short rest** (camp) | **Long rest** (inn, Old Tom's bed) |
|---|---|---|
| Cost | free | gold (about 10 in Act 1, about 25 in Act 2) |
| HP | half your maximum | full |
| Second Wind, Action Surge | back | back |
| Spell and rune slots | no (perhaps a little, like the wizard's Arcane Recovery) | all back |

### Fenwatch, the Act 2 hub

A stilt-town on boardwalks at the edge of the fen.

- **The Drowned Duck**, the tavern: a rumour and **bounty board** (repeatable hunts, e.g. "clear 4 ghouls from the causeway: 300 gold, 600 XP"), long rests for gold, the companion roster, and a dice table.
- Brannoc's Forge (once he's rescued), a bank branch, and a fen herbalist (potions).
- The goblin refugee camp at its edge.

### Minigames (later, one small PR each)

Quick to play with taps, each with a one-off reward so they aren't a gold farm:

- **Knucklebones** (dice, at the tavern), using the dice engine. Prize: a Lucky Die trinket (reroll one natural 1 per rest).
- **Arm wrestling** (STR contest with timed taps). Prize: a belt that adds STR.
- **Archery contest** (Megan's, timed taps). Prize: a new bow for her.
- **Fishing** at Willowmere and Fenwatch (Old Tom could run it). Rare fish sell well or cook into food.

## Companions

**Decided:** one companion in the party at a time; the rest wait on a **roster** you can swap at any inn (later, at the rebuilt keep). `party.js` already keys companions by id in `COMPANIONS`, so `hero.companion` stays the active slot and a new `hero.roster` holds the others.

**Decided: companion control is option C.** Companions act by themselves, each with a **TACTICS** switch (Attack / Heal / Save Magic), and you can tap a companion to take over their turn.

Companions to add:

- **Megan** (built): the archer. Keeps her place.
- **Claire, Rachel and Robyn**: the owner wants all three. Roles **open**. Things to settle: their class (they could be the wizard, cleric and druid, or one could fight up close), when you meet them (one per act, or two in Act 2 and one in Act 3), a recruit quest each (like Megan's bow), and a walking sprite each (like `megan.js`). One of them could be the hero's rune mentor or the rival in Act 3.
- **Candidates:** Brannoc (dwarf tank with a warhammer; *protect* gives you disadvantage against the next hit), Snik (goblin scout; *sneak attack* adds damage to a target someone else has already hit), Wren (fen herbalist who heals instead of attacking).

## Magic

Companions can be wizards and other casters; the hero gets magic of their own through Warden runes (below). Both use the same engine.

- **Cantrips:** unlimited; damage grows at levels 5, 11 and 17 (Fire Bolt, Sacred Flame).
- **Spell slots:** a number per long rest by level, from the SRD tables (slot levels 1-4 cover levels 1-8).
- **Spells known:** about 4-6 per caster, picked at level-up or found (spellbooks in chests, a tutor in a hub).
- **Scrolls and wands for anyone:** any character can read a scroll once (Scroll of Fireball, Scroll of Cure Wounds), a fun bend of the 5e rules. Wands have a few charges that come back at a long rest.

| Class | Spells | Why it suits Ironvale |
|---|---|---|
| Wizard | Fire Bolt, Magic Missile, Sleep, Burning Hands, Shield, Misty Step, Fireball at level 5 | Burst damage; hitting every monster at once is new |
| Cleric | Sacred Flame, Cure Wounds, Bless, Healing Word, Spiritual Weapon, Turn Undead | Built for Act 2's skeletons and wights |
| Druid | Produce Flame, Entangle, Goodberry, Moonbeam | Suits the fen |
| Bard | Vicious Mockery, Healing Word, Faerie Fire, Hypnotic Pattern | Helps the party; could tie into the tavern |

**New rules engine work:** saving throws against a spell's DC; spells that hit every monster in the fight; conditions (asleep, held, blessed, turned) that also cover ghoul paralysis; healing allies in battle and from the bag; slots saved with each caster and refilled by rests.

## The hero's arc: from traveller to Warden of Ironvale

**Decided:** the hero is the main character and grows over the whole game into the most powerful person in the land. Power comes from the story as well as from levels.

**The secret (open: see questions):** the hero is the last heir of the **Wardens**, who held the door in the pass with rune magic woven into iron. The line was thought dead.

- **Act 1 plant:** the hero's starting longsword gets a worn crest on its pommel. Nobody mentions it yet.
- **Act 2, the discovery:** the Signet doesn't curse the hero. Brannoc sees the sword: *"Where did you get this? That's Ironvale steel."* Varric names the blood as he falls. Brannoc reforges the sword into a **named blade that grows with the story**. The first rune.
- **Act 3, training and choice:** a mentor at the pass door, a rival who wants the Wardens' power, more runes, and the **Oath**.
- **Act 4, mastery:** the Oath at full power, the sword's final form, and the hero rules Ironvale Keep as its Warden.

### Fighter features (levels 2-8)

Today the hero has only Second Wind. Add, from the SRD fighter (Champion): **Action Surge** (L2), **Improved Critical** (L3, crits on 19-20), **ability score increases** (L4, L6, L8: +2 to STR, DEX or CON, picked on the level-up screen; saves already at L4+ get one to pick), **Extra Attack** (L5).

**Extra Attack breaks the Potion of Dexterity**, which is "attack twice." Rework it into "+1 attack each turn" (three attacks after level 5): in `combat.js` the `quick` flag becomes an attack count.

**Damage types:** skeletons are vulnerable to bludgeoning (the mace finally matters); wights resist weapons that aren't silvered (Brannoc silvers them). **Monster abilities:** multiattack (ogre, wight), ghoul paralysis (CON save or lose your turn), wight life drain.

### Warden runes

- **Rune slots** come back at a long rest, like spell slots, so towns matter to the hero too.
- **First rune (Act 2), Rune Strike:** after you hit, spend a slot for extra damage (2d8, more against undead). One button.
- **More runes come from the story, not shops:** carvings in the keep, the mentor, boss rewards. Ideas: *Iron Ward* (a reaction: +5 AC once), *Warden's Call* (heals and steadies the party), *Rune of Binding* (a monster loses its turn), *Breaking Rune* (an attack that hits every monster).

### The Oath (end of Act 3; open: three or one)

| Oath | Style | Signature |
|---|---|---|
| Oath of Iron | The unbreakable defender | Heavy armour mastery, protects allies |
| Oath of Storm | The spellblade | More rune slots, lightning runes that hit every monster |
| Oath of Dawn | The holy warrior (like the SRD paladin) | Healing, smiting, crushing undead |

### The world notices

- **Titles:** NPCs call you by the title you've earned (Traveller, Hero of Oakhollow, Ironvale's Heir, Warden-in-training, Warden of Ironvale). Pip's lines grow with you.
- **Looks:** the hero's sprite changes with progress (a cape in Act 2, glowing runes on the sword, Oath colours), drawn in code in `hero.js`.
- **Choices come back:** Mother Sallow's bargain and the goblin refugees return in Act 3.
- **Ironvale Keep becomes your home** after Act 2: rescued NPCs and spare companions move in (the roster lives here), and rooms unlock over the acts (Brannoc's forge, a rune library, a training yard for the minigames). By the end, the traveller who walked into Oakhollow with nothing rules the keep.

## Code that has to change

`maps.js` takes a new map in one line, but other places assume the overworld is the only outdoor map:

- **`src/world/travel.js`:** `TRAVEL_POINTS` gets `{ map, kind: "hub" | "camp", act }`; `canFastTravel(state)` becomes "you're standing in a safe zone or a camp".
- **Zones get `safe: true`** (no encounters, fast travel allowed) and a **`music`** field; `World.js` only picks between `village` and `wild` today.
- **`src/scenes/WorldMap.js`:** draws only the overworld; needs a page per region and silhouettes for locked ones.
- **Map objects:** only `goneWhen` exists. The Signet and Brannoc need the opposite, `shownWhen`.
- **`state.lastHub`** for fainting and the Homeward Feather; `faint()` in `src/state/game.js` always uses the Oakhollow spawn today.
- **`src/rules/party.js`:** `hero.roster`, tactics, and companions that cast.
- **`src/rules/combat.js`:** attack counts, conditions, saving throws, multi-target spells, damage types, rune and spell slots.
- **Saves:** bump the save format and migrate (pending ability score increases, the roster, slots, `lastHub`).
- **Act 1 changes** so the new rules apply everywhere: Oakhollow gets an inn and stops healing for free, Goblin Rocks gets a campfire camp, Tom's hut is a camp with a free bed, and the README is updated.

## Build order

One pull request each, with a minor version bump.

1. **Safe places:** hubs and camps, paid inn rest, short and long rests, `lastHub`, the Homeward Feather, the Act 1 changes.
2. **Fighter features** (L2-8), the Potion of Dexterity rework, saving throws.
3. **Magic engine:** slots, cantrips, multi-target spells, conditions, scrolls. Rules only and unit-tested, built for both companions and hero runes.
4. **Companion roster** and tactics (option C); Megan moves onto it.
5. **Act 1 plant:** the crest on the sword, and support for titles.
6. **The King's hall:** the Signet, Brannoc, the King's last words, `shownWhen`, Q3.
7. **Multi-map travel** and the world map by region.
8. **Fenwatch:** the tavern, bounty board, Brannoc's forge, and the first of Claire, Rachel and Robyn.
9. **Greywater Fen:** tileset, map, `fen` track, new monsters, Mother Sallow and her choice.
10. **Ironvale Keep:** the dungeon, damage types and silvering, Lord Varric, the first rune, the reforged blade, the ending.
11. **The keep as your hub** (start of Act 3).
12. **Later:** minigames and the other companions, one at a time.

## Open questions

1. **The hero's secret:** the last Warden heir, or power from somewhere else (chosen by the Signet, or earned with no bloodline)?
2. **Oaths:** three to choose from, or one fixed path that's simpler to build?
3. **A name for the hero:** let the player pick one at NEW GAME? Today they're "Hero", and titles and story moments would mean more with a name.
4. **Claire, Rachel and Robyn:** their roles, when you meet them, and whether one is the mentor or the rival.
5. **Inn prices:** about 10 gold in Act 1 and 25 in Act 2 is a guess; tune once the economy is clearer.
