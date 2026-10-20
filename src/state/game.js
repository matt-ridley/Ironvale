// The one game state every scene shares: the hero, where they are, quest progress and the bestiary. save.js writes it out.
import { createCharacter, rest } from "../rules/character.js";
import { OVERWORLD } from "../world/overworld.js";
import { saveGame, loadGame } from "./save.js";
import { feetAt } from "../world/movement.js";
import { MAPS } from "../world/maps.js";
import { hubById, FIRST_HUB } from "../world/travel.js";
import { cleanName } from "../story/hero.js";

export const state = {};

/* A fresh game, with the hero's name (from the name screen; "Hero" if none). */
export function newGame(name) {
  state.hero = createCharacter({ name: cleanName(name) });
  state.map = OVERWORLD.name;
  state.pos = feetAt(OVERWORLD.spawn.x, OVERWORLD.spawn.y); // in tiles, at the hero's feet
  state.facing = "down";
  state.stepsSinceFight = 0;
  state.flags = {}; // quest progress, e.g. questStarted, logCleared, chiefDefeated, questRewarded, and seenForest (map)
  state.bestiary = {}; // monsters met and beaten: { goblin: { seen: 3, beaten: 2 } }
  state.lastHub = FIRST_HUB; // the last town you were in: you wake at its inn if you faint
}

export const FAINT_MAX_LOSS = 50;

/* Losing a fight isn't the end: someone carries you to your last town's inn, where you wake rested (for free), but
   half the gold you carry is gone (never more than FAINT_MAX_LOSS). Gold in the bank is safe. */
export function faint() {
  const lost = Math.min(Math.floor(state.hero.gold / 2), FAINT_MAX_LOSS);
  state.hero.gold -= lost;
  rest(state.hero);
  const hub = hubById(state.lastHub), inn = MAPS[hub.inn];
  state.map = inn.name;
  state.pos = feetAt(inn.spawn.x, inn.spawn.y);
  state.facing = "down";
  state.stepsSinceFight = 0;
  return { goldLost: lost, hub: hub.id };
}

/* Writes the current state to the save slot. Quietly does nothing where storage isn't available. */
export const autosave = () => saveGame(state);

/* Replaces the state with the saved game, if there is one. */
export function restoreSave() {
  const saved = loadGame();
  if (!saved) return false;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, saved);
  return true;
}

newGame();
