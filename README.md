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

## Controls
- **Move:** 8 directions. On phones, touch anywhere on the left of the screen and a joystick appears under your thumb: push a little to walk, all the way to run. On a computer, use the arrow keys or WASD (two at once for diagonals, Shift to run). Add `?touch` to the URL to show the joystick hint on a desktop.
- **Menu:** the MENU button or Esc.
- **Sound:** the SND button mutes or unmutes music and effects (remembered on this device).
- **Talk:** walk into a person (or press Enter/Space while facing them). Pick answers by tapping, with up/down and Enter, or with number keys.
- **Inventory:** the BAG button or I. Tap an item to see what it does and how it changes your AC, to-hit and damage, then equip it, take it off or drink it.
- **Battles:** tap a monster to target it, then ATTACK, DEFEND (+2 AC until your next turn), POTION (then HEAL or DEX), 2ND WIND (heal 1d10 + level as a bonus action, once per rest) or FLEE (DEX check, DC 10).

## Look and sound
The art is in a 16-bit RPG style, drawn in code: every art pixel is a 2x2 block lit from the top left (highlights on upper edges, shadows below), with tinted rather than black outlines. The canvas is 960 x 540; menus are laid out on a 480 x 270 grid and drawn at 2x, so text stays crisp. The world camera sits at 1.5x, about 20 x 11 tiles on screen.

Music and effects are synthesised with Web Audio in an SNES-like style (a filtered lead with echo, soft bass, simple drums). Tracks are written as notes in `src/audio/tracks.js`: the village, the wild, battle and the boss, plus victory, level-up and defeat jingles. Browsers only allow sound after the first tap or key press.

## Saving
The game saves itself to the browser's local storage: after every step, when a menu, conversation or battle ends, and when the app goes into the background (phones can close a home-screen app at any time). There is no save button. The title screen offers CONTINUE, and NEW GAME asks before replacing a saved hero.

Saves carry a format number. Loading drops anything the game no longer knows (an item removed in an update) and puts you back in the village if your saved spot is now a wall, rather than failing. A save lives in one browser on one device; clearing site data deletes it.

## How it plays
- Wild areas start a fight now and then after a step (half as often on paths, and never right after a fight).
- Walking into Oakhollow is a full rest: HP and Second Wind come back.
- Losing a fight isn't the end. You wake in Oakhollow, rested, but half the gold you carry is gone (never more than 50). Gold in the bank is safe.
- Goblins sometimes drop a scimitar or a potion.
- **Quest 1, the Goblin Chief:** Elder Maren, by the Oakhollow crossroads, asks you to drive the Goblin Chief out of the cave past Goblin Rocks. A fallen oak blocks the only path. Shove it aside (STR DC 12, clears it for good) or climb over (DEX DC 14). A failed try costs 1d4 HP but never knocks you out. The chief and a goblin wait in the cave. Beat them, then go back to the Elder for 100 gold and 300 XP. It's an open world: you can beat the chief before you ever speak to her.
- **How tough is the chief?** In 3,000 simulated fights the hero won about 31% at level 1, 72% at level 2 with a +1 sword, and 79-88% at level 3.
- **Quest 2, the Goblin King:** once you've been paid for the chief, Elder Maren tells you about the Goblin King. Go back into the cave: behind the chief's throne a tunnel leads down into the Deep Warrens (a stream hall, a mushroom grotto, the hobgoblin barracks and a rat nest, with goblins, giant bats and hobgoblins). An iron gate guards the King's hall: lift it (STR DC 13, opens it for good) or squeeze through the bars (DEX DC 15). Beat the King, then go back to the Elder for 250 gold and 1,000 XP. The way out is the patch of daylight by the entrance.
- **How tough is the King?** In 3,000 simulated fights the hero won about 41% at level 3 with +1 gear, 60% at level 4, and 78% at level 4 with +2 gear. A Potion of Dexterity raises those to about 76%, 90% and 96%.
- **Megan's bow (a side quest):** Megan, a young archer in Willowmere, lost her bow in the Whispering Wood. Find it (it's hidden in a thicket in the far east of the wood) and bring it back, and she joins your party. She follows you around, takes her own turns in battle (her shortbow shoots at whatever you last attacked), and grows with your level. Monsters pick between the two of you. If she's knocked down she sits out the rest of the fight and gets back up afterwards; resting in Oakhollow heals her too. The HUD shows side quests on an ALSO line.
- **Willowmere**, south of Oakhollow down the village road, is a lake with an island, Old Tom the fisher (who gives you a Potion of Speed), an old garden and a bramble grove. Boars, wolves and rats roam there. Three chests are hidden around it, and three more in the Deep Warrens.
- **Potions:** Healing (2d4+2 HP, 20 gold), Speed (150 steps of moving half as fast again with about a third of the fights, 30 gold; drink it from the bag) and Dexterity (attack twice each turn for one fight, 40 gold; drink it before a fight or during one, which uses that turn). The HUD shows SPEED and the steps left, or DEX READY.
- The blacksmith (the house with the anvil sign, west of the crossroads) upgrades gear up to +3 (50, 100, 150 gold), sells weapons, armour and shields at SRD prices and Potions of Healing, and buys things back for half of what they cost, upgrades included. Walk into the door to go in.
- The apothecary (the house with the green bottle sign, east of the crossroads) sells all three potions and buys things back the same way.
- The bank (the house with the gold coin sign, south-east of the crossroads) keeps your gold safe. Put in or take out 10, 50 or all of it at a time.

## Layout
```
index.html, css/, manifest.webmanifest, sw.js   page shell, install and offline support
src/rules/    the d20 rules: dice, checks, character, items, combat, the bank, party companions. No Phaser, so they are unit tested.
src/data/     items, shops and monsters
src/world/    tile maps (one character per tile: overworld.js, cave.js, all listed in maps.js), 8-direction movement with collisions, and random encounters. No Phaser, so they are unit tested.
src/state/    the shared game state (hero, position, quest flags) and saving it to localStorage
src/art/      16-bit style pixel art drawn in code: the hero's walk cycles, monsters, people and 32px terrain tiles
src/scenes/   Phaser screens: Boot, Title, World (+ Hud on top), Battle, Inventory, Shop (the blacksmith and the apothecary), Bank, Dialogue
src/story/    the conversation engine and the scripts (quests, NPCs, events). No Phaser, so they are unit tested.
src/ui/       the joystick and menu widgets (buttons, paged lists)
src/audio/    synthesised music (tracks written as notes) and sound effects, no audio files
tests/        node --test suites
tools/        icon generator
```

Every release bumps `VERSION` in both `src/config.js` and `sw.js` (a test checks they match). Every new file under `src/` goes into `APP_FILES` in `sw.js` (a test checks that too).

## Status
Playable prototype: both quests can be played start to finish, and progress is saved.

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

## Credits
Rules: this work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, SIL Open Font License.

Engine: [Phaser](https://phaser.io), MIT License.
