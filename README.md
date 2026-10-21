# Ironvale

A pixel-art medieval adventure that uses d20 rules for checks and combat. It runs in the browser and installs on iPhone and Android.

"Ironvale" is a placeholder name.

## Overview
You explore an open world, follow a story, fight monsters in turn-based battles, level up, and customise your weapon, shield and armour. Checks and combat follow the 5e System Reference Document (SRD 5.1): roll a d20, add a modifier, and beat a DC or an armour class.

The game has no build step and no npm dependencies. Phaser 3 loads from a CDN, the game code is plain ES modules, and a service worker makes it installable and playable offline.

## Setup
Serve the folder with any static web server, then open it in a browser:

```bash
py -m http.server 8780
```

Then go to http://localhost:8780. To install it on a phone, open the GitHub Pages site and use **Add to Home Screen** (Safari on iPhone) or **Install app** (Chrome on Android).

## Scripts
Node 20 or later is needed only for these dev tools.

| Command | What it does |
|---|---|
| `npm test` | Runs the rules engine and offline-install tests |
| `npm run icons` | Redraws the app icons in `icons/` |
| `npm run sim` | The battle simulator: win rates for every boss, at the levels you'd meet them |

GitHub Actions runs `npm test` on every pull request and every push to `main`, so a pull request shows a green check before it's merged.

## Controls
- **Move:** 8 directions. On phones, touch anywhere on the left of the screen and a joystick appears under your thumb: push a little to walk, all the way to run. On a computer, use the arrow keys or WASD (two at once for diagonals, Shift to run). Add `?touch` to the URL to show the joystick hint on a desktop.
- **Menu:** the MENU button or Esc.
- **Sound:** the SND button mutes or unmutes music and effects (remembered on this device).
- **Talk:** walk into a person or a thing (or press Enter/Space while facing them). The meeting screen opens: your party on the left, them on the right, what they say at the bottom and your answers as big buttons on the right. Pick answers by tapping, with up/down and Enter, or with number keys. A chest opens on screen and shows each thing inside before you close it. A finger already on the screen when it opens (your thumb on the joystick) doesn't count as a tap when it lets go.
- **Quests:** the QUESTS button or Q opens the quest log: every quest you've heard of, unfinished ones first. Tap one to see what it's about, which steps are done (ticked), the next step (in gold) and the reward.
- **Bestiary:** the BESTIARY tab in the quest log (or the right arrow key) lists every monster. Ones you haven't met are ???. Once you've met one you see its picture, where it lives and a line about it, and how many you've met and beaten; beat one to learn its stats (AC, HP, attack, XP and gold).
- **Map:** the MAP button or M shows the world, a region per tab. THE VALE (Oakhollow and around) has the places you haven't been yet under fog and a blinking marker where you are; the regions you can't reach yet are dark shapes marked ???, with a hint. Once you've set foot in Oakhollow, Willowmere or Goblin Rocks, tap its name to fast-travel there. You can only travel from a safe place: Oakhollow (or one of its houses), Old Tom's hut and the ground around it, or the Goblin Rocks campfire.
- **Houses:** walk into a house door to go inside, and onto the doormat to come back out.
- **Inventory:** the BAG button or I. With nothing picked, your tab shows your name and title (a Traveller, until the Goblin King falls). Tap an item to see what it does and how it changes your AC, to-hit and damage, then equip it, take it off or drink it.
- **Battles:** tap a monster to target it, then ATTACK, DEFEND (+2 AC until your next turn), ITEMS (then HEAL or DEX for you, your companion's name to give them a Potion of Healing, which also gets them back up if they've been knocked down, or SCROLL to read a spell scroll), 2ND WIND (heal 1d10 + level as a bonus action, once per rest), SURGE (Action Surge, from level 2: one more action this turn, once per rest) or FLEE (DEX check, DC 10). Once you know a rune, SURGE moves into SKILLS, next to RUNE: Rune Strike attacks, and on a hit adds 2d8 radiant (3d8 against the undead). You have two rune slots (three from level 9), back with a long rest; a miss costs none.
- **Your companion in battle:** they act by themselves, following their tactics (set on their tab in the bag: ATTACK, or HEAL, where they give whoever's at half HP or less a Potion of Healing from your pack first). Tap them to lead them instead: on their turn you pick SHOOT, a potion for YOU or them, or AUTO. Tap them again to hand back. The game remembers which you chose.
- **Levelling up:** the hero is a fighter. Level 2 brings Action Surge, level 3 Improved Critical (your attacks crit on a 19 or 20), and level 5 Extra Attack (ATTACK swings twice), level 9 Indomitable (a failed saving throw against a monster is rolled again, once per long rest), level 10 a fighting style (Defense: +1 AC in armour, or Dueling: +2 damage with a one-handed weapon, picked on the level-up screen) and level 11 Extra Attack (2) (three swings). At levels 4, 6, 8 and 12 the level-up screen opens and you raise STR, DEX or CON by 2; it shows what each would change. A higher CON adds HP for every level you have. Heroes saved at level 4 or higher before 0.19.0 get their pick the next time they play.

## Look and sound
The art is in a 16-bit RPG style, drawn in code: every art pixel is a 2x2 block lit from the top left (highlights on upper edges, shadows below), with tinted rather than black outlines. The canvas is 960 x 540; menus are laid out on a 480 x 270 grid and drawn at 2x, so text stays crisp. The world camera sits at 1.5x, about 20 x 11 tiles on screen.

Each map's ground is baked into one picture the first time you visit it (`src/art/terrain.js`). Every tile gets its own dice, so the grass never repeats, and tiles are drawn knowing their neighbours: rivers and the lake have earthy banks with ripples, paths fray into the grass, walls cast shadows, roofs have ridges and eaves, and cave walls have a lit ledge. Woods mix three kinds of tree whose canopies overlap, and rocky ground is heaped with boulders. The goblin, goblin chief, hobgoblin, wolf, boar and giant bat are traced from a painted reference lineup into the same text pixel art, each with its own palette (`src/art/monsters.js`), and stand a little smaller than the hero on the battle stage, as in the reference. The giant rat and the Goblin King are still hand-drawn.

Music and effects are synthesised with Web Audio in an SNES-like style (a filtered lead with echo, soft bass, simple drums). Tracks are written as notes in `src/audio/tracks.js`: the village, the wild, battle and the boss, plus victory, level-up and defeat jingles. Browsers only allow sound after the first tap or key press.

## Saving
The game saves itself to the browser's local storage: after every step, when a menu, conversation or battle ends, and when the app goes into the background (phones can close a home-screen app at any time). There is no save button. The title screen offers CONTINUE, and NEW GAME asks before replacing a saved hero, then asks your hero's name (tap the letters, or type; leave it empty to be called Hero). RENAME, on your tab in the bag, changes it later.

Saves carry a format number. Loading drops anything the game no longer knows (an item removed in an update) and puts you back in the village if your saved spot is now a wall, rather than failing. A save lives in one browser on one device; clearing site data deletes it.

## How it plays
- Wild areas start a fight now and then after a step: on average about every 30 steps off the path and every 50 on it, and never in the first 12 steps after a fight.
- **Safe places:** a hub is a whole town (Oakhollow, for now) and a camp is a small safe spot in the wild (Old Tom's hut in Willowmere, and the campfire at Goblin Rocks). No monsters come into either, and fast travel works only from one to another.
- **Resting:** a long rest brings back all your HP, Second Wind and Action Surge. Nell at the Sleeping Fox, Oakhollow's inn, lets you a bed for 10 gold, and Old Tom's spare bed is free. A short rest by the Goblin Rocks campfire is free, but only brings you up to half your HP (and Second Wind and Action Surge back). Walking into Oakhollow no longer heals you.
- **Homeward Feather** (50 gold at the apothecary): use it from the bag anywhere out in the open (not indoors or underground) to fly back to the last town you were in.
- Losing a fight isn't the end. You're carried to the inn of the last town you were in and wake there, rested for free, but half the gold you carry is gone (never more than 50). Gold in the bank is safe.
- Goblins sometimes drop a scimitar or a potion.
- **Quest 1, the Goblin Chief:** Elder Maren, by the Oakhollow crossroads, asks you to drive the Goblin Chief out of the cave past Goblin Rocks. A fallen oak blocks the only path. Shove it aside (STR DC 12, clears it for good) or climb over (DEX DC 14). A failed try costs 1d4 HP but never knocks you out. The chief and a goblin wait in the cave. Beat them, then go back to the Elder for 100 gold and 300 XP. It's an open world: you can beat the chief before you ever speak to her.
- **How tough is the chief?** (These win rates are from before 0.19.0: Action Surge, Improved Critical and the ability score increase make both bosses a little easier now.) In 3,000 simulated fights the hero won about 31% at level 1, 72% at level 2 with a +1 sword, and 79-88% at level 3.
- **Quest 2, the Goblin King:** once you've been paid for the chief, Elder Maren tells you about the Goblin King. Go back into the cave: behind the chief's throne a tunnel leads down into the Deep Warrens (a stream hall, a mushroom grotto, the hobgoblin barracks and a rat nest, with goblins, giant bats and hobgoblins). An iron gate guards the King's hall: lift it (STR DC 13, opens it for good) or squeeze through the bars (DEX DC 15). Beat the King, then go back to the Elder for 250 gold and 1,000 XP. The way out is the patch of daylight by the entrance.
- **How tough is the King?** In 3,000 simulated fights the hero won about 41% at level 3 with +1 gear, 60% at level 4, and 78% at level 4 with +2 gear. A Potion of Dexterity raises those to about 76%, 90% and 96%.
- **Quest 3, the Iron Signet (the start of Act 2):** when the Goblin King falls he gasps his last words, and his hall changes: a ring of black iron lies on his throne, with the same crest as your sword, and Brannoc the dwarf smith is chained behind it (smash the chain, STR DC 12, or pick the lock, DEX DC 12; try as often as you like). Show the ring to Elder Maren, then ask Brannoc, who waits by the smithy, about Ironvale. Come back to him and he's cleared the goblins' back passage, behind the King's throne: it climbs to Greywater Fen. Tell Maren what you found there for 150 gold and 1,500 XP. The King's crown lies in his hall too.
- **Greywater Fen** is reeds, pools and mud (wading is slow; boardwalks are safer), with a campfire camp where you arrive. Giant frogs, lizardfolk (two attacks a turn), ghouls (their claws can paralyse: CON save DC 10, and again each turn to break free) and will-o'-wisps (very hard to hit) live there. Fenwatch's gate is shut for now.
- **Quest 4, the Drowned Causeway:** the road north to Ironvale Keep runs under Mother Sallow's water. The marsh hag will raise it for something shiny, like the Goblin King's crown, or you can fight her (a real boss: about 77% at level 5 alone, 97% with Megan). Either way: 200 gold and 3,000 XP. Then the portcullis of Ironvale Keep: heave it up (STR DC 15) or find the gatehouse winch (DEX DC 13).
- **Ironvale Keep (quest 5):** a ruined courtyard, the chapel and the armoury, walked by the risen garrison: skeletons (weak to bludgeoning: a mace or warhammer hits them double), ghasts (paralysing claws), wights (they shrug off half of any weapon that isn't silvered) and helmed horrors (AC 20, two swords). Lord Varric's tomb lies behind a great iron door with three locks: a lever in the courtyard, a seal on the chapel altar, and a lever in the armoury (STR or DEX DC 14 each). In the tomb, Lord Varric rises: he takes you for a thief with his Signet (AC 18, two longsword swings and a paralysing Grave Touch, and he shrugs off half of any weapon that isn't silvered: about 34% at level 6 with +3 gear, 83% silvered, 96% silvered with Robyn). As he falls he calls you Warden. Put the Signet back on his tomb for 500 gold and 5,000 XP, then tell Brannoc: he reforges your crested sword into the **Wardenblade** (1d10, silvered, keeping its upgrades) and burns your first rune into it. That's the end of Act 2, and you're now Ironvale's Heir.
- **Act 3** begins once the blade is reforged and the keep is home. Going back to the old places, monsters that are five or more levels too weak for you run off about half the time ("A Wolf takes one look at the Wardenblade and bolts"), for a quarter of their XP. The rest still fight.
- **Campfire talks:** in Act 3, resting (a campfire, an inn, your bed) with a companion can play a short talk afterwards: three each, told in order, and each waits for the story to get far enough. A companion's third talk opens their own quest. They also say a line the first time you walk somewhere new together.
- **Minigames** (tap anywhere to play; LEAVE to stop). Each has a prize for your first win:
  - **Knucklebones** with Wat at the Sleeping Fox or Sal at the Drowned Duck: 10 gold a game, the winner takes 20. Drop each die you roll into one of your three columns; matching dice in a column multiply, and a match knocks your opponent's out. Prize: the **Lucky Die** (in a fight, your first natural 1 to attack is rolled again, once per rest).
  - **Arm wrestling** with Big Oswin at the Sleeping Fox: tap while the marker's in the green to push, and don't tap outside it. Prize: **Oswin's Belt** (+2 STR while it's in your pack).
  - **Megan's archery contest** at the target in Oakhollow, once Megan's with you or waiting at an inn: five arrows, tap as your drifting aim crosses the middle, and beat her 34. Prize: a **Willow Longbow +1** for Megan.
  - **Fishing** with Old Tom's rod at Willowmere or the jetty in Fenwatch: wait for the float to dip, tap to strike, then tap fast to reel it in. Perch, pike, fen eels and the rare golden carp sell at any shop. The fish stop biting after five catches until you sleep.
- **Home: Ironvale Keep.** Once the Signet is back the dead sleep, and the keep is your hub: no monsters in any room, fast travel, and fainting wakes you here. Hild, the steward (up from the Drowned Duck's kitchen), keeps your bed (free) and the companions who aren't with you. Brannoc moves his forge into the keep once he's reforged your blade. **Brannoc's Tools** (a side quest) are in the armoury: take them back to him and he silvers your weapon for free. Otherwise his forge's SILVER tab does it for 100 gold.
- **Fenwatch**, the stilt-town in the south-east of the fen, is Act 2's town (a hub): no monsters, fast travel, and fainting wakes you there once you've been. The Drowned Duck tavern is its inn (Gully lets a bed for 25 gold, and keeps the companions who aren't with you), with the **bounty board**: take one hunt at a time (frogs, lizardfolk, ghouls or will-o'-wisps), beat that many, and come back for gold and XP; take it again as often as you like. Brannoc moves his forge here once you've arrived: he upgrades gear up to +5 (200 and 250 gold for the last two) and sells splint (AC 17) and plate (AC 18, 1,500 gold), a warhammer, a light crossbow and a sling. The herbalist sells Potions of Greater Healing (4d4+4 HP, 50 gold; GREAT in a fight's ITEMS), and there's a bank branch (one account, as ever).
- **The Restless Dead (a side quest):** Robyn, a young cleric at Fenwatch's shrine, says the fen's old graves keep giving up ghouls. Beat the two that claw out of the mud at the cairn (west, near the goblins' passage), and she joins your party: she fights with a sling but mostly prays, with Sacred Flame, Cure Wounds, Healing Word and Bless, and uses all three tactics (ATTACK, HEAL, SAVE MAGIC). If Megan's with you, Megan waits at an inn: swap them at any inn under "Your companions".
- **Megan's bow (a side quest):** Megan, a young archer in Willowmere, lost her bow in the Whispering Wood. Find it (it's hidden in a thicket in the far east of the wood) and bring it back, and she joins your party. She follows you around, takes her own turns in battle (her shortbow shoots at whatever you last attacked), and levels up with you. She has her own gear: a bow and light armour (she starts with a Shortbow and Leather Armour). In the bag, the HERO / MEGAN switch shows her stats and lets you give her a bow or light armour from your pack. The blacksmith sells a Longbow (1d8) and Studded Leather (AC 12), and upgrades her gear to +3 like yours. Monsters pick between the two of you. If she's knocked down she sits out the rest of the fight and gets back up afterwards; a night at the inn or in Old Tom's bed heals her too, and the campfire gets her back up to half her HP, and on her tab in the bag you can give her a Potion of Healing from your pack. The HUD shows side quests on an ALSO line.
- **Willowmere**, south of Oakhollow down the village road, is a lake with an island, Old Tom the fisher (who gives you a Potion of Speed), an old garden and a bramble grove. Boars, wolves and rats roam there. Three chests are hidden around it, and three more in the Deep Warrens.
- **Potions:** Healing (2d4+2 HP, 20 gold), Speed (150 steps of moving half as fast again with about a third of the fights, 30 gold; drink it from the bag) and Dexterity (one extra attack every time you ATTACK, for one fight, 40 gold; drink it before a fight or during one, which uses that turn). The HUD shows SPEED and the steps left, or DEX READY.
- The blacksmith (the house with the anvil sign, west of the crossroads) upgrades gear up to +3 (50, 100, 150 gold), sells weapons, armour and shields at SRD prices and Potions of Healing, and buys things back for half of what they cost, upgrades included. Walk into the door to go in.
- The apothecary (the house with the green bottle sign, east of the crossroads) sells all three potions, the Homeward Feather and spell scrolls (Magic Missile, Burning Hands, Sleep and Cure Wounds at 50 gold, Fireball at 300), and buys things back the same way. Anyone can read a scroll once, in a fight: an attack spell goes at the monster you've picked, Cure Wounds to whichever of you is worse off.
- **The roster:** one companion travels with you. Ask Nell at the Sleeping Fox and they'll wait there; bring them back any time, rested. More companions are coming.
- The bank (the house with the gold coin sign, south-east of the crossroads) keeps your gold safe. Put in or take out 10, 50 or all of it at a time.
- **Houses:** four houses open their doors. The Sleeping Fox, Oakhollow's inn, is north-east of the crossroads, across the path from Elder Maren's: Nell lets you a bed for the night. Elder Maren's (north of the crossroads) has her journal, which follows the quests and drops a hint for the next one. In Pip's house (south-west of the crossroads), his mum Hazel gives you a Potion of Healing the first time you visit. Old Tom's hut in Willowmere has a spare bed: once you've met Tom, sleeping in it is a full rest, for free. There are no monsters indoors.

## Layout
```
index.html, css/, manifest.webmanifest, sw.js   page shell, install and offline support
src/rules/    the d20 rules: dice, checks and saving throws, character (with the fighter's features), items, combat, conditions (asleep, restrained, blessed...), magic (spell slots, casting, scrolls), the bank, party companions, the bestiary. No Phaser, so they are unit tested.
src/data/     items, shops, monsters and spells
src/world/    tile maps (one character per tile: overworld.js, cave.js, houses.js, ironvale.js, all listed in maps.js), 8-direction movement with collisions, random encounters, and travel.js: the map's fog, the safe places (hubs and camps) and fast travel between them. No Phaser, so they are unit tested.
src/state/    the shared game state (hero, position, quest flags) and saving it to localStorage
src/art/      16-bit style pixel art drawn in code: the hero's and Megan's walk cycles, monsters (monsters.js: traced ones with their own palettes), people, 32px terrain tiles, and terrain.js, which bakes each map's ground into one picture
src/scenes/   Phaser screens: Boot, Title, World (+ Hud on top), Battle, Meet (talking to people and things), Inventory, Quests (the quest log and bestiary), WorldMap, Shop (the blacksmith and the apothecary), Bank, LevelUp (picking an ability score increase), Dialogue (the cave entrance), and the minigames (minigames.js)
src/story/    the conversation engine, the scripts (quests, NPCs, events) and the quest log. No Phaser, so they are unit tested.
src/ui/       the joystick, menu widgets (buttons, paged lists) and the side-on stage that Battle and Meet share
src/audio/    synthesised music (tracks written as notes) and sound effects, no audio files
tests/        node --test suites
tools/        icon generator, and the battle simulator (simulate.mjs)
```

Every release bumps `VERSION` in both `src/config.js` and `sw.js` (a test checks they match). Every new file under `src/` goes into `APP_FILES` in `sw.js` (a test checks that too).

## Status
Playable prototype: both quests can be played start to finish, and progress is saved.

What comes next (Act 2 and beyond, magic, companions, hubs) is planned in [docs/ROADMAP.md](docs/ROADMAP.md).

- [x] M0 Skeleton: Phaser title screen, installable PWA, offline support, GitHub Pages
- [x] M1 Rules engine: dice, ability checks, AC, attacks, levelling, equipment, blacksmith upgrades, turn-based combat
- [x] M2 World: tile map, walking, collisions, camera, touch controls
- [x] M3 Battle screen and random encounters in the Whispering Wood and Goblin Rocks
- [x] M4 Inventory, blacksmith (upgrade, buy, sell) and loot drops
- [x] M5 Story: Elder Maren's quest, dialogue, the fallen-oak skill check, the Goblin Chief
- [x] M6 Save/load, a real title screen (Continue / New Game), and polish
- [x] M7 16-bit art, bigger hero, 8-direction movement with a joystick, smoother animation, music and sound
- [x] M8 (0.8.0) Potions of Speed and Dexterity, cheaper healing (20 gold), the apothecary, Willowmere, the Deep Warrens and the Goblin King
- [x] 0.9.0 The bank; fainting costs at most 50 gold
- [x] 0.10.0 Megan's side quest, and a companion who joins your party and fights beside you
- [x] 0.11.0 Megan's own gear (bows and light armour) and level, shown in the bag
- [x] 0.11.1 Megan redrawn to match the hero; she can drink Potions of Healing (from the bag or in battle) and rests in Oakhollow; a thumb held on the joystick no longer taps Close
- [x] 0.13.0 The meeting screen for people and things, and chests that open on screen
- [x] 0.13.1 The HUD's gold and HP update straight after the bank, shops and the bag
- [x] 0.31.0 Act 3 groundwork: the fighter's levels 9-12 (Indomitable, a fighting style, Extra Attack (2)), weak monsters running from you in the old places, campfire talks and remarks
- [x] 0.30.1 A boss's last words (and the Signet's reward) no longer replay on every trip after the fight
- [x] 0.30.0 Minigames: knucklebones, arm wrestling, Megan's archery contest and fishing, each with a prize
- [x] 0.29.0 Ironvale Keep becomes your home (Act 3's hub): a free bed, Hild the steward, Brannoc's forge
- [x] 0.28.0 The end of Act 2: Lord Varric, the Warden bloodline, the Signet's return, the Wardenblade and Rune Strike
- [x] 0.27.0 Ironvale Keep: the courtyard, chapel, armoury and the tomb's three locks; skeletons, ghasts, wights and helmed horrors; damage types (bludgeoning, silver) and silvering at Brannoc's forge; a battle simulator in tools/
- [x] 0.26.0 Fenwatch: the Act 2 town, with the Drowned Duck (inn, bounty board), Brannoc's forge (to +5, splint and plate), the herbalist (Greater Healing), and Robyn the cleric, who joins after The Restless Dead
- [x] 0.25.0 Greywater Fen: the goblins' passage opens, a new region with its own tiles, music and camp, four new monsters (multiattack, paralysis), the end of quest 3 and quest 4 with Mother Sallow's choice
- [x] 0.24.0 The world map by region (the Vale, and Ironvale, the Mountain Pass and Beyond the Door as ??? for now), fast travel and music ready for more maps, and the rubble in the goblins' back passage
- [x] 0.23.0 The start of Act 2: the Goblin King's last words, the Iron Signet, Brannoc the smith, and quest 3, with the first hints of who the hero really is
- [x] 0.22.0 Name your hero at NEW GAME (or RENAME from the bag); titles (Traveller, Hero of Oakhollow) that Elder Maren, Pip, Nell and the journal use; a worn crest on your starting sword
- [x] 0.21.0 The companion roster (swap at the inn), tactics (ATTACK / HEAL, and SAVE MAGIC for casters), leading your companion in battle by tapping them, and spell scrolls at the apothecary, read from the battle's ITEMS menu
- [x] 0.20.0 The magic engine, under the hood: spell slots, cantrips that grow with level, upcasting, 14 SRD spells (damage, saving throws, area spells, Sleep, healing, Bless, Shield), conditions that change attacks, saves and turns, and spell scrolls. Nothing in the game casts yet: companions and the hero's runes will
- [x] 0.19.0 Fighter features: Action Surge (L2), Improved Critical (L3), ability score increases picked on a new level-up screen (L4, L6, L8), Extra Attack (L5); the Potion of Dexterity is now one extra attack; saving throws in the rules
- [x] 0.18.0 Safe places: hubs and camps, the Sleeping Fox inn (a long rest for 10 gold), a free short rest at the Goblin Rocks campfire, fast travel only from a safe place, the Homeward Feather, and fainting wakes you at your last town's inn
- [x] 0.17.0 New monster art for the goblin, chief, hobgoblin, wolf, boar and giant bat, traced from a reference lineup
- [x] 0.16.0 The world map, with fog and fast travel between Oakhollow, Willowmere and Goblin Rocks; the bestiary
- [x] 0.15.1 Random fights about half as often
- [x] 0.15.0 Graphics: a baked, neighbour-aware ground (banks, path edges, shadows, roof ridges, mixed overlapping trees, boulders) and bigger, more detailed monsters
- [x] 0.14.0 Houses you can go into (Elder Maren's, Pip's, Old Tom's hut), Hazel, Tom's spare bed, and the quest log; area names show again after changing map

## Credits
Rules: this work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, SIL Open Font License.

Engine: [Phaser](https://phaser.io), MIT License.
