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
- **Move:** arrow keys or WASD. On phones, use the on-screen D-pad (add `?touch` to the URL to show it on a desktop).
- **Menu:** the MENU button or Esc.
- **Battles:** tap a monster to target it, then ATTACK, DEFEND (+2 AC until your next turn), POTION, 2ND WIND (heal 1d10 + level as a bonus action, once per rest) or FLEE (DEX check, DC 10).

## How it plays
- Wild areas start a fight now and then after a step (half as often on paths, and never right after a fight).
- Walking into Oakhollow is a full rest: HP and Second Wind come back.
- Losing a fight isn't the end. You wake in Oakhollow, rested, but half your gold is gone.

## Layout
```
index.html, css/, manifest.webmanifest, sw.js   page shell, install and offline support
src/rules/    the d20 rules: dice, checks, character, items, combat. No Phaser, so they are unit tested.
src/data/     items and monsters
src/world/    tile maps (one character per tile), grid movement and random encounters. No Phaser, so they are unit tested.
src/state/    the shared game state: the hero and where they are
src/art/      placeholder pixel art and terrain tiles drawn in code, until real sprite sheets arrive
src/scenes/   Phaser screens: Boot, Title, World, Battle
src/ui/       on-screen controls
tests/        node --test suites
tools/        icon generator
```

Every release bumps `VERSION` in both `src/config.js` and `sw.js` (a test checks they match). Every new file under `src/` goes into `APP_FILES` in `sw.js` (a test checks that too).

## Status
Early prototype.

- [x] M0 Skeleton: Phaser title screen, installable PWA, offline support, GitHub Pages
- [x] M1 Rules engine: dice, ability checks, AC, attacks, levelling, equipment, blacksmith upgrades, turn-based combat
- [x] M2 World: tile map, walking, collisions, camera, touch controls
- [x] M3 Battle screen and random encounters in the Whispering Wood and Goblin Rocks
- [ ] M4 Inventory and blacksmith screens
- [ ] M5 Story: village elder quest, dialogue, skill-check events, Goblin Chief
- [ ] M6 Save/load and polish

## Credits
Rules: this work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) by CodeMan38, SIL Open Font License.

Engine: [Phaser](https://phaser.io), MIT License.
